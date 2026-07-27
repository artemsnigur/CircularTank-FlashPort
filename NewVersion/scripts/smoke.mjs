/**
 * Does the app actually load?
 *
 * The one question a green suite cannot answer. 1413 unit tests, a clean
 * typecheck, a clean lint and a successful production build were all true while
 * the browser refused to start the app — because "the modules compile" and "the
 * page runs" are different claims, and only the first was ever enforced.
 *
 * So this opens a real headless Chromium, loads the page, and fails on:
 *   - any uncaught page error (the module-graph failure that prompted this)
 *   - any console error
 *   - the main menu not rendering within the timeout (a boot that strands)
 *
 * That last one matters: `BootScene` failing to hand off produces no error at
 * all — the UI simply shows "Loading" forever. An error-only check would pass.
 *
 * Usage:
 *   npm run smoke              against an already-running dev server
 *   npm run smoke -- --build   build, preview, and smoke the production bundle
 *
 * Deliberately NOT in pre-push: it needs a server and ~5s, and a gate that slow
 * gets bypassed. It is a `npm run smoke` you run after touching the boot path,
 * and the thing to run before saying "this works".
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const useBuild = process.argv.includes('--build');
const URL = useBuild ? 'http://localhost:4173/' : 'http://localhost:5173/';
const BOOT_TIMEOUT_MS = 20_000;

/** Waits for a server to answer, rather than sleeping a guessed interval. */
async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await delay(250);
  }
  return false;
}

async function main() {
  let preview = null;

  if (useBuild) {
    preview = spawn('npm', ['run', 'preview', '--', '--port', '4173'], {
      stdio: 'ignore',
      shell: true,
    });
  }

  if (!(await waitForServer(URL))) {
    console.error(`[smoke] nothing answering at ${URL}.`);
    console.error(
      useBuild ? '        the preview server did not start.' : '        start it with: npm run dev',
    );
    preview?.kill();
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  // The menu only renders once Boot has handed off to Preload and Preload has
  // finished, so waiting for it exercises the whole startup chain rather than
  // just the module graph.
  let booted = true;
  try {
    await page.getByRole('button', { name: /play|continue/i }).waitFor({
      timeout: BOOT_TIMEOUT_MS,
      state: 'visible',
    });
  } catch {
    booted = false;
  }

  const title = await page.title();
  await browser.close();
  preview?.kill();

  const problems = [];
  if (pageErrors.length > 0) problems.push(`uncaught page errors:\n  ${pageErrors.join('\n  ')}`);
  if (consoleErrors.length > 0) {
    problems.push(`console errors:\n  ${consoleErrors.join('\n  ')}`);
  }
  if (!booted) {
    problems.push(
      `the main menu never rendered within ${BOOT_TIMEOUT_MS / 1000}s — ` +
        'the boot chain stranded, which produces no error of its own',
    );
  }

  if (problems.length > 0) {
    console.error(`[smoke] FAILED against ${URL}`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }

  console.log(`[smoke] ok — ${URL} loaded "${title}", menu rendered, no errors.`);
}

main().catch((error) => {
  console.error('[smoke] threw:', error);
  process.exit(1);
});
