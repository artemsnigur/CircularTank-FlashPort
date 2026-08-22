/**
 * Does the packaged desktop build actually run?
 *
 * The same question `smoke.mjs` asks of the web build, and it needs asking
 * separately because **none of the web checks cover the packaging step.** A
 * green `npm run build` proves the modules compile and the browser runs them
 * from a dev server; it says nothing about whether the same files load over
 * `file://` inside Electron, which is a different protocol, a different origin
 * and a different asset-resolution rule. The classic failure — absolute asset
 * URLs from a default `base: '/'` — produces a build that is perfectly green
 * and a window that is perfectly blank.
 *
 * So this launches the **real packaged executable**, not a dev harness, and
 * fails on:
 *   - the app not starting, or opening no window
 *   - any uncaught page error
 *   - any console error
 *   - the main menu not rendering within the timeout
 *
 * That last one is the one that matters most, for the reason `smoke.mjs` gives:
 * a `BootScene` that never hands off produces no error at all. The window just
 * says "Loading" for ever, and an error-only check calls that a pass.
 *
 * Usage:
 *   npm run desktop:smoke                 smoke the built unpacked app
 *   npm run desktop:smoke -- --exe PATH   smoke a specific executable
 */
import { _electron as electron } from 'playwright';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Where `electron-builder --dir` leaves the unpacked app. */
const DEFAULT_EXE = resolve(HERE, '..', '..', 'release', 'win-unpacked', 'Circular Tank.exe');

const BOOT_TIMEOUT_MS = 40_000;

function exePath() {
  const flag = process.argv.indexOf('--exe');
  return flag === -1 ? DEFAULT_EXE : resolve(process.argv[flag + 1]);
}

async function main() {
  const executablePath = exePath();

  if (!existsSync(executablePath)) {
    console.error(`[desktop-smoke] no executable at ${executablePath}`);
    console.error('[desktop-smoke] run `npm run desktop:pack` first.');
    process.exitCode = 1;
    return;
  }

  const app = await electron.launch({ executablePath });
  const problems = [];
  let title = '(none)';

  try {
    const page = await app.firstWindow({ timeout: BOOT_TIMEOUT_MS });

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // The menu only renders once Boot has handed off and Preload has finished,
    // so this doubles as an assertion that the whole chain survived packaging.
    let menuRendered = true;
    try {
      await page
        .getByRole('button', { name: /play|continue/i })
        .waitFor({ timeout: BOOT_TIMEOUT_MS, state: 'visible' });
    } catch {
      menuRendered = false;
    }

    title = await page.title();

    if (pageErrors.length > 0) problems.push(`page errors:\n    ${pageErrors.join('\n    ')}`);
    if (consoleErrors.length > 0) {
      problems.push(`console errors:\n    ${consoleErrors.join('\n    ')}`);
    }
    if (!menuRendered) {
      problems.push(
        `the main menu never rendered within ${BOOT_TIMEOUT_MS / 1000}s — the boot ` +
          'chain did not complete inside the packaged app',
      );
    }

    /*
     * The canvas is checked separately from the menu because they fail apart.
     * The menu is React DOM and renders whether or not WebGL came up; a
     * packaged build with a broken renderer shows a working menu over a canvas
     * of zero size. Asking for both is what tells those two apart.
     */
    // Measured through Playwright's own API rather than a `page.evaluate` over
    // `document`: the box comes back in the same units either way, and this
    // script stays code that a Node linter can actually read.
    const canvas = page.locator('canvas').first();
    if ((await canvas.count()) === 0) {
      problems.push('no <canvas> in the packaged window');
    } else {
      const box = await canvas.boundingBox();
      if (box === null) problems.push('the canvas is present but not rendered');
      else if (box.width === 0 || box.height === 0) {
        problems.push(`the canvas has no size (${box.width}x${box.height})`);
      }
    }
  } finally {
    await app.close();
  }

  if (problems.length > 0) {
    console.error(`[desktop-smoke] FAILED against ${executablePath}`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[desktop-smoke] ok — launched "${title}", menu rendered, canvas sized, no errors.`);
}

await main();
