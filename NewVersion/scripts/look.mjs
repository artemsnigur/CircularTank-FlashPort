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
 *   npm run look -- --particles — impacts, deaths and cues, then a resolved level
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
  const args = { out: resolve(ROOT, '.look'), hold: 6000, secondaries: false, save: false, slots: false, particles: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = resolve(argv[i + 1]);
    if (argv[i] === '--hold') args.hold = Number(argv[i + 1]);
    if (argv[i] === '--secondaries') args.secondaries = true;
    if (argv[i] === '--save') args.save = true;
    if (argv[i] === '--slots') args.slots = true;
    if (argv[i] === '--particles') args.particles = true;
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

/**
 * Wait for the game to reach a state, not for a duration.
 *
 * The last of the timing class. Three of seven instrument failures came from a
 * fixed delay chosen without reference to what the game was waiting on: a tap
 * lost between frames, a burst photographed after it left the screen, and a
 * storage read taken before the post-win timer had run the thing that writes it.
 * The burst narrows that window; this closes it, for anything with an
 * observable end state.
 *
 * Returns false on timeout rather than throwing — this script reports, it does
 * not assert, and a caller that wants to capture the failure state still can.
 */
async function waitFor(label, predicate, timeoutMs = 20_000, everyMs = 250) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await delay(everyMs);
  }
  console.log(`[look] timed out waiting for ${label} after ${timeoutMs}ms`);
  return false;
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


/**
 * The save round trip, driven end to end: win a level, reload, check it stuck.
 *
 * Reported here rather than asserted, like everything else in this file. The
 * unit tests cover encode/decode; what they cannot see is whether banking is
 * reached and whether the write lands in real storage — which is the seam, and
 * the thing a pass once got wrong in both directions.
 *
 * **Read storage only after the level has finished.** `finished` waits on a
 * post-win delay timer, so a dump taken the moment the last enemy dies shows an
 * empty store and reads as "nothing saves". That is exactly what happened.
 */
async function saveRoundTrip() {
  const keys = () => page.evaluate(() => Object.keys(localStorage));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  console.log('[look] storage before:', (await keys()).join(', ') || '(empty)');

  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(2200);

  await page.mouse.down();
  for (let i = 0; i < 30; i += 1) {
    const a = (i / 30) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(a) * 280, 400 + Math.sin(a) * 280);
    await delay(650);
  }
  await page.mouse.up();

  // Wait for the write rather than guessing how long the hand-over takes —
  // guessing is what produced "nothing is saved".
  await waitFor('the save to be written', async () => (await keys()).length > 0);
  await shot('save-1-after-win');
  console.log('[look] storage after win:', (await keys()).join(', ') || '(empty)');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await delay(3000);
  await shot('save-2-after-reload');
  console.log('[look] storage after reload:', (await keys()).join(', ') || '(empty)');
  const labels = (await page.locator('button:visible').allTextContents()).map((t) => t.trim());
  console.log('[look] menu after reload:', labels.filter(Boolean).join(' | '));
}


/**
 * The slot picker, empty and occupied.
 *
 * "New Game" rendered over a real save is the failure this is guarding, and only
 * a picture shows it — the store and the screen can each be individually right
 * while the row is drawn from the wrong slot.
 */
async function slotScreen() {
  const open = async (tag) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /save slots/i }).waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /save slots/i }).click();
    await delay(600);
    await shot(tag);
    console.log(`[look] ${tag}:`,
      (await page.locator('.slot-grid__cell').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' // '));
  };

  await open('slots-1-empty');

  // Close the picker first: the menu hides while it is open, so Play is not
  // reachable until it does. (It was not, and this run stopped here.)
  await page.getByRole('button', { name: /back/i }).first().click();
  await delay(400);

  // Play a level so slot 1 has a real save, then look again.
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(2200);
  await page.mouse.down();
  for (let i = 0; i < 30; i += 1) {
    const a = (i / 30) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(a) * 280, 400 + Math.sin(a) * 280);
    await delay(650);
  }
  await page.mouse.up();
  await delay(5000);

  await open('slots-2-occupied');

  // Delete flow: the row flips to "Delete slot?" in place, then Confirm clears
  // it and the row goes back to "New Game".
  await page.getByRole('button', { name: /delete slot 1/i }).click();
  await delay(400);
  await shot('slots-3-confirm');
  console.log('[look] confirming:',
    (await page.locator('.slot-grid__cell').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' // '));

  await page.getByRole('button', { name: /^confirm$/i }).click();
  await delay(600);
  await shot('slots-4-deleted');
  console.log('[look] after delete:',
    (await page.locator('.slot-grid__cell').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' // '));
}

if (args.slots) {
  await slotScreen();
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.save) {
  await saveRoundTrip();
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.particles) {
  // Impacts, deaths and the strength/weakness cues — the whole particle layer.
  //
  // Two things here cannot be seen any other way. Debris takes the *enemy's*
  // own colour, so wrong wiring produces plausible-looking output in the wrong
  // colour — which is why this uses the all-enemy arena rather than 1-1. And
  // `handleParticles` runs outside the AS3's level-done gate, so the last
  // capture deliberately happens *after* a level resolves: particles frozen
  // mid-flight on the results screen is the failure this catches.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  // The all-enemy arena: three of every type, so one fight covers many colours.
  await page.getByRole('button', { name: /all-enemy test level/i }).click();
  await delay(3500);
  await shot('p-01-arena');

  // Let them close in first. Firing at a fixed bearing three seconds in put
  // every round into empty ground — the arena is wide and the enemies start at
  // its edges, so the first capture showed a working weapon and no impacts at
  // all. Enemies chase the tank, so waiting is what produces targets.
  await delay(9000);
  await shot('p-02-closed-in');

  // Now sweep a full circle at close range with the button held, capturing
  // throughout. At this distance a sweep cannot miss, and the circle covers
  // several different enemy types — which is the point: debris takes the
  // enemy's own colour, so one type would not show a mis-wire.
  await page.locator('canvas').hover({ position: { x: 900, y: 400 } });
  await page.mouse.move(900, 400);
  await page.mouse.down();
  for (let step = 0; step < 12; step += 1) {
    const angle = (step / 12) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(angle) * 240, 400 + Math.sin(angle) * 240, { steps: 4 });
    await shot(`p-03-sweep-${String(step).padStart(2, '0')}`);
  }
  await burst('p-04-deaths', 10, 150);
  await page.mouse.up();
  await delay(400);
  await shot('p-05-settling');

  // ── The check no unit test can make ──────────────────────────────────────
  // `handleParticles` runs OUTSIDE `if(!levelDone)` at `:2839`, so debris keeps
  // moving and fading while the results screen sits over it. Wiring it beside
  // the gameplay systems instead — the natural-looking wrong answer — freezes
  // every particle mid-flight the instant a level resolves, and looks entirely
  // fine in every other frame this script takes.
  //
  // Driven by the kill dev-aid rather than by winning: 1-1 did not resolve
  // inside 90s of held fire on one bearing, and a resolution that never arrives
  // proves nothing either way. Defeat reaches the same `levelDone` state.
  // Fire into the swarm first: the point is to have debris *airborne* when the
  // level resolves, and the previous attempt pressed the key 600ms after the
  // last impact, by which time everything had faded. Nothing to freeze is not
  // evidence that nothing freezes.
  await page.locator('canvas').hover({ position: { x: 760, y: 400 } });
  await page.mouse.move(760, 400);
  await page.mouse.down();
  await delay(1200);
  await page.keyboard.press('k');
  // Frames from the instant of death, so the burst thrown by the tank's own
  // destruction is still in the air when the results screen appears. Positions
  // changing across these frames is the pass condition; identical frames with
  // particles present is the failure.
  await burst('p-06-after-level', 12, 100);
  await page.mouse.up();

  console.log(`[look] frames -> ${args.out}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
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
