/**
 * Drive the running game and dump frames to look at.
 *
 * **Not a test. It asserts nothing and never fails on what it sees** — that is
 * deliberate. Its job is to make visual faults findable by a human (or by
 * whatever is reading the frames), not to encode a judgement about them.
 *
 * It exists because "look at the running game" became a standing conclusion and
 * was costing a from-scratch script every time. Four faults in the background
 * props were found in one look after months of green suites; the seam survey
 * found eight subsystems where a *broken call* goes unnoticed, and the visual
 * survey found seven places where a *wrong-looking result* does. Neither is
 * reachable from unit tests, and both are reachable from here.
 *
 *   npm run look                 — default sequence, frames to .look/
 *   npm run look -- --out DIR    — somewhere else
 *   npm run look -- --hold 8000  — linger longer before the last frame
 *
 * Frames land in a gitignored directory. Run it when a subsystem lands, then
 * actually open them.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PORT = 5199;
const URL = `http://127.0.0.1:${PORT}/`;

function parseArgs(argv) {
  const args = { out: resolve(ROOT, '.look'), hold: 6000, secondaries: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = resolve(argv[i + 1]);
    if (argv[i] === '--hold') args.hold = Number(argv[i + 1]);
    if (argv[i] === '--secondaries') args.secondaries = true;
  }
  return args;
}

/** All twelve, driven one per page load via the `?secondary=` dev aid. */
const SECONDARIES = [
  'Mine', 'Shield', 'Grenade', 'Ice Grenade', 'Poison Grenade', 'Icicles',
  'Poison Spikes', 'Magic Bunny', 'Rockets', 'Ice Ball', 'Lava Ball', 'Crazy Cheese',
];

async function serverUp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* not yet */
    }
    await delay(400);
  }
  return false;
}

const args = parseArgs(process.argv.slice(2));
rmSync(args.out, { recursive: true, force: true });
mkdirSync(args.out, { recursive: true });

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: ROOT,
  shell: true,
  stdio: 'ignore',
});
const stop = () => {
  try {
    vite.kill();
  } catch {
    /* already gone */
  }
};
process.once('exit', stop);
process.once('SIGINT', () => {
  stop();
  process.exit(130);
});

if (!(await serverUp(URL, 60_000))) {
  stop();
  throw new Error(`vite did not come up on ${URL}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});

const shot = (name) => page.screenshot({ path: `${args.out}/${name}.png` });

/**
 * A short burst instead of one frame at a fixed delay.
 *
 * Three of the six instrument traps so far were timing or framing: a tap lost
 * between frames, and a radial burst photographed 500 ms after release, by
 * which point it had left the frame entirely and read as "the weapon does not
 * fire". A single screenshot answers "what did it look like at exactly T", which
 * is almost never the question. Six frames over ~600 ms answers "what happened",
 * and costs one extra second.
 */
async function burst(name, frames = 6, everyMs = 100) {
  for (let i = 0; i < frames; i += 1) {
    await shot(`${name}-${String(i).padStart(2, '0')}`);
    if (i < frames - 1) await delay(everyMs);
  }
}

/** The HUD strip, where the weapon and secondary readouts live. */
const hud = (name) =>
  page.screenshot({ path: `${args.out}/${name}.png`, clip: { x: 0, y: 720, width: 1280, height: 80 } });

/**
 * One weapon, one page load: equip via `?secondary=`, reach gameplay, fire it
 * held, then move off the spot before capturing.
 *
 * Both steps matter. A tap can fall between frames and be lost entirely, and a
 * secondary that drops at the tank's own centre is hidden under the sprite — so
 * a naive press-and-screenshot reports "does not fire" for weapons that do.
 */
async function driveSecondary(name) {
  const slug = name.toLowerCase().replace(/ /g, '-');
  await page.goto(`${URL}?secondary=${encodeURIComponent(name)}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(2500);

  await page.locator('canvas').hover({ position: { x: 900, y: 260 } });
  await page.mouse.move(900, 260);
  await shot(`s-${slug}-0-before`);

  await page.keyboard.down('Space');
  await delay(120);
  // Burst from the moment of fire: a fan at speed 20 clears the frame in under
  // half a second, so a single late frame shows an empty screen.
  await burst(`s-${slug}-1-fired`);
  await page.keyboard.up('Space');

  await page.keyboard.down('a');
  await delay(1500);
  await page.keyboard.up('a');
  await delay(400);
  await shot(`s-${slug}-2-moved`);
}

if (args.secondaries) {
  for (const name of SECONDARIES) {
    await driveSecondary(name);
    console.log(`[look] ${name}`);
  }
  console.log(`[look] frames -> ${args.out}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
await shot('01-menu');

await page.getByRole('button', { name: /play|continue/i }).first().click();
await delay(3000);
await shot('02-gameplay');
await hud('02-hud');

// Aim, then hold fire while moving — bullets, enemies and the tank in one frame.
await page.locator('canvas').hover({ position: { x: 950, y: 260 } });
await page.mouse.move(950, 260);
await page.mouse.down();
await page.keyboard.down('d');
await delay(2500);
await shot('03-firing');
await page.keyboard.up('d');
await page.mouse.up();

// The secondary, with the HUD before and after: the readout goes from
// "<name> [SPACE]" to "<name> Ns" only if the press actually fired.
await hud('04-hud-before-secondary');
// Held, not tapped. `secondaryPressed` is read once per frame, so a
// down+up inside one frame is simply never observed — a tap can be lost
// entirely, which looks exactly like a weapon that does not fire.
await page.keyboard.down('Space');
await delay(300);
await page.keyboard.up('Space');
await delay(600);
await shot('05-secondary');
await hud('05-hud-after-secondary');

// Then move off the spot. A secondary that drops something *at the tank* — Mine
// does — is completely hidden under the tank sprite until you leave, so a frame
// taken on the press alone cannot tell "did not fire" from "fired underneath".
await page.keyboard.down('a');
await delay(1400);
await page.keyboard.up('a');
await shot('05b-secondary-revealed');

await delay(args.hold);
await shot('06-later');
await hud('06-hud-later');

console.log(`[look] frames -> ${args.out}`);
console.log(problems.length ? `[look] page problems:\n  ${problems.join('\n  ')}` : '[look] no page errors');

await browser.close();
stop();
