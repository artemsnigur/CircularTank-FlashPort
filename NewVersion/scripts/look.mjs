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
  const args = { out: resolve(ROOT, '.look'), hold: 6000, secondaries: false, save: false, slots: false, particles: false, money: false, baseline: false, sound: false, soundSweep: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = resolve(argv[i + 1]);
    if (argv[i] === '--hold') args.hold = Number(argv[i + 1]);
    if (argv[i] === '--secondaries') args.secondaries = true;
    if (argv[i] === '--save') args.save = true;
    if (argv[i] === '--slots') args.slots = true;
    if (argv[i] === '--particles') args.particles = true;
    if (argv[i] === '--money') args.money = true;
    if (argv[i] === '--baseline') args.baseline = true;
    if (argv[i] === '--sound') args.sound = true;
    if (argv[i] === '--sound-sweep') args.soundSweep = true;
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

if (args.soundSweep) {
  // MEASURE coverage, do not count call sites.
  //
  // A grep counts what a regex matches; this counts what actually fired. The
  // two have disagreed three times in this project and the harness was right
  // every time. Anything this reports as missing is either genuinely unwired
  // or on a path the scenario did not reach — and the second case is listed
  // explicitly rather than inferred from silence.
  const names = () => page.evaluate(() => globalThis.__soundQueue?.names() ?? []);
  const peak = (n) => page.evaluate((x) => globalThis.__soundQueue?.peakPerFrame(x) ?? -1, n);
  const clear = () => page.evaluate(() => globalThis.__soundQueue?.clear());

  const fired = new Set();
  const collect = async () => {
    for (const n of await names()) fired.add(n);
  };

  // One page load per primary: `?secondary=` grants a secondary, and the
  // weapon cycle key (Q) walks the equipped slots.
  const SECONDARIES = ['Grenade', 'Mine', 'Shield', 'Rockets', 'Icicles', 'Crazy Cheese', 'Ice Ball', 'Magic Bunny'];

  for (const secondary of SECONDARIES) {
    await page.goto(`${URL}?secondary=${encodeURIComponent(secondary)}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /all-enemy test level/i }).click();
    await delay(7000);
    await clear();

    await page.locator('canvas').hover({ position: { x: 760, y: 400 } });
    await page.mouse.down();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      await page.mouse.move(640 + Math.cos(a) * 220, 400 + Math.sin(a) * 220);
      await delay(280);
      // Held, never tapped — a sub-frame press is simply not observed.
      if (i % 3 === 0) {
        await page.keyboard.down('Space');
        await delay(180);
        await page.keyboard.up('Space');
      }
      // Drive into a wall so border sounds get a chance.
      if (i === 5) {
        await page.keyboard.down('a');
        await delay(1200);
        await page.keyboard.up('a');
      }
    }
    await page.mouse.up();
    await delay(600);
    await collect();
    console.log(`[look] after ${secondary}: ${fired.size} names so far`);
  }

  // The dedup case, on its own page load and measured there.
  //
  // The history is per-page, so reading the peak after eight page loads read
  // the last one only — and reported 0 for a name that had demonstrably fired
  // on an earlier page. Kills and measurement have to happen together.
  //
  // Equipped with the Grenade: a blast killing several enemies at once is the
  // ten-in-one-frame case the dedup rule exists for, and the Cannon alone
  // could not produce it — an earlier run reported peak 0 simply because
  // nothing died, which is not evidence about the rule.
  await page.goto(`${URL}?secondary=Grenade`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /all-enemy test level/i }).click();
  await delay(11000);
  await clear();
  await page.locator('canvas').hover({ position: { x: 700, y: 400 } });
  await page.mouse.down();
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(a) * 180, 400 + Math.sin(a) * 180);
    await delay(260);
    // Held, not tapped.
    if (i % 2 === 0) {
      await page.keyboard.down('Space');
      await delay(160);
      await page.keyboard.up('Space');
    }
  }
  await page.mouse.up();
  await delay(500);
  await collect();
  const squish = await peak('EnemySquish');
  const coin = await peak('Coin');

  const manifest = await page.evaluate(() => globalThis.__soundManifestNames ?? []);
  console.log('');
  console.log(`[look] FIRED (${fired.size}): ${[...fired].sort().join(' ')}`);
  if (manifest.length) {
    const missing = manifest.filter((n) => !fired.has(n)).sort();
    console.log(`[look] NOT FIRED (${missing.length}): ${missing.join(' ')}`);
  }
  console.log(`[look] peak/frame EnemySquish: ${squish}`);
  console.log(`[look] peak/frame Coin:        ${coin}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');

  await browser.close();
  stop();
  process.exit(0);
}

if (args.sound) {
  // The driven proof for sound triggers.
  //
  // **What this shows and what it does not.** A row in the queue history means
  // the call site was reached with a name the manifest resolves. It does NOT
  // mean anything was audible — volume, mute and a suspended AudioContext all
  // leave the history identical, and `audioSelfTest` is the check for that.
  // Report both claims separately or neither is worth much.
  const q = async (fn) => page.evaluate(fn);
  const names = () => q(() => globalThis.__soundQueue?.names() ?? null);
  const unresolved = () => q(() => globalThis.__soundQueue?.unresolved() ?? null);
  const peak = (n) => page.evaluate((name) => globalThis.__soundQueue?.peakPerFrame(name) ?? -1, n);
  const clear = () => q(() => globalThis.__soundQueue?.clear());

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  if ((await names()) === null) {
    console.log('[look] FAIL: globalThis.__soundQueue is absent — the aid did not install');
  } else {
    console.log('[look] queue history installed');
  }

  // A menu interaction, step by step, clearing between so each step's
  // contribution is unambiguous rather than inferred from a growing list.
  await clear();
  await page.getByRole('button', { name: /save slots/i }).hover();
  await delay(250);
  console.log(`[look] after hover:        ${JSON.stringify(await names())}`);

  // Hovering the same control again must NOT retrigger — the delegated
  // listener tracks the last-hovered element for exactly this.
  await page.getByRole('button', { name: /save slots/i }).hover();
  await delay(250);
  console.log(`[look] after re-hover:     ${JSON.stringify(await names())}`);

  await clear();
  await page.getByRole('button', { name: /save slots/i }).click();
  await delay(400);
  console.log(`[look] after click:        ${JSON.stringify(await names())}`);

  // The opt-out: the diagnostics panel is a dev aid and must stay silent.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await clear();
  const diag = page.getByRole('button', { name: /diagnostics/i });
  if ((await diag.count()) > 0) {
    await diag.first().hover();
    await delay(200);
    await diag.first().click();
    await delay(300);
    console.log(`[look] after diagnostics:  ${JSON.stringify(await names())}  (expected [])`);
  }

  // Gameplay, for the dedup number. Many enemies die in a short window; a
  // per-frame peak above 1 for a once-per-frame trigger is the over-firing
  // defect the frame dedup is supposed to make impossible.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /all-enemy test level/i }).click();
  await delay(9000);
  await clear();
  await page.locator('canvas').hover({ position: { x: 700, y: 400 } });
  await page.mouse.down();
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(a) * 200, 400 + Math.sin(a) * 200);
    await delay(300);
  }
  await page.mouse.up();

  const fired = await names();
  const counts = {};
  for (const n of fired ?? []) counts[n] = (counts[n] ?? 0) + 1;
  console.log(`[look] gameplay triggers:  ${JSON.stringify(counts)}`);
  console.log(`[look] peak/frame EnemySquish: ${await peak('EnemySquish')} (1 = dedup holding)`);
  console.log(`[look] peak/frame Coin:        ${await peak('Coin')}`);
  console.log(`[look] unresolved names:   ${JSON.stringify(await unresolved())}  (expected [])`);

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.baseline) {
  // The full loop, stage by stage, for the dated baseline entry in the audit.
  // boot -> slots -> 1-1 -> fight -> win with coins -> results -> continue ->
  // level 2 -> defeat.
  const stage = async (name, ms = 0) => {
    if (ms) await delay(ms);
    await shot(`b-${name}`);
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await stage('01-menu');

  await page.getByRole('button', { name: /save slots/i }).click();
  await stage('02-slots', 600);
  // Reload rather than closing. `MainMenuScreen` returns null while the picker
  // is open — the right fix for a real layout defect in T28 — so Play is not
  // reachable from here and Escape does not dismiss it. Recorded in CLAUDE.md
  // as a harness failure that is the harness, not the game.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await stage('03-level-start', 2200);

  await page.locator('canvas').hover({ position: { x: 900, y: 400 } });
  await page.mouse.down();
  let cleared = false;
  for (let i = 0; i < 90 && !cleared; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(a) * 280, 400 + Math.sin(a) * 280);
    await delay(400);
    cleared = (await page.getByText(/^0 LEFT$/i).count()) > 0;
    if (i === 4) await stage('04-fight');
    if (i === 12) await stage('05-fight-later');
  }
  console.log(`[look] level 1-1 cleared: ${cleared}`);
  await burst('b-06-win-coins', 10, 100);
  await page.mouse.up();

  // The results stack opens on its LAST page, so step back to the results.
  await delay(1500);
  await stage('07-results-as-opened');
  for (let i = 0; i < 3; i += 1) {
    // `aria-label="Previous page"` — the visible glyph is a chevron and does
    // not make an accessible name to match on.
    const back = page.getByRole('button', { name: /previous page/i });
    if ((await back.count()) === 0) break;
    await back.first().click();
    await delay(500);
  }
  await stage('08-results');

  // Onward to level 2, then lose it.
  const next = page.getByRole('button', { name: /next level/i });
  if ((await next.count()) > 0) {
    await next.first().click();
    await stage('09-level-2', 2600);
    await page.keyboard.press('k');
    await stage('10-defeat', 1200);
  } else {
    console.log('[look] no onward button on the results screen');
    await stage('09-no-onward');
  }

  console.log(`[look] frames -> ${args.out}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.money) {
  // Coins: the drop, the collect, and the wait.
  //
  // The last is the point and no unit test reaches it. `levelDoneFunction`
  // (`:667`) holds the results screen while loose money is on the floor, so
  // the sequence to capture is: last enemy dies -> coins scattered, no overlay
  // -> tank hoovers them up -> overlay arrives. Until this pass `moneyOnFloor`
  // was hardcoded 0 and that wait could never fire.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /all-enemy test level/i }).click();
  await delay(9000);

  // Kill something at close range and photograph the drop immediately — coins
  // are pulled toward the tank from anywhere with no range limit, so they do
  // not sit still to be photographed later.
  await page.locator('canvas').hover({ position: { x: 700, y: 400 } });
  await page.mouse.move(700, 400);
  await page.mouse.down();
  await burst('m-01-drop', 10, 120);
  await page.mouse.up();
  await burst('m-02-collect', 10, 120);

  // Now a real level played to a finish, which is where the wait matters.
  //
  // Mirrors `saveRoundTrip`'s fight exactly — a sequential sweep with the
  // button held — because that one demonstrably clears 1-1 and two other
  // shapes did not. Both failures read as "the level never resolved" and both
  // were the harness.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(2200);

  await page.locator('canvas').hover({ position: { x: 900, y: 400 } });
  await page.mouse.down();

  // Capture through the fight rather than after it: the sequence worth having
  // is coins on the floor with the level already decided, then the overlay.
  // Poll the arena counter, not the overlay text. The results stack **opens on
  // its last page** (`Hud.tsx:135`), so on a first clear it shows "NEW ENEMY"
  // and a /level cleared/ predicate never matches — that reported a working
  // game as a 120s timeout twice before the frames said otherwise.
  let cleared = false;
  for (let i = 0; i < 90 && !cleared; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    await page.mouse.move(640 + Math.cos(a) * 280, 400 + Math.sin(a) * 280);
    await delay(400);
    cleared = (await page.getByText(/^0 LEFT$/i).count()) > 0;
    if (i % 6 === 0) await shot(`m-03-fight-${String(i).padStart(2, '0')}`);
  }
  console.log(`[look] arena cleared: ${cleared}`);

  // The window, caught the moment the arena empties: level decided, coins
  // still loose, overlay not yet up. 80ms so several frames land inside it.
  await burst('m-04-wait', 14, 80);
  const resolved = (await page.getByRole('dialog', { name: /level results/i }).count()) > 0;
  console.log(`[look] results screen reached: ${resolved}`);
  await page.mouse.up();
  await shot('m-03-transition');

  console.log(`[look] frames -> ${args.out}`);
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
  // The window is short by design: `levelDone` is set at once, and the results
  // overlay follows a 15-frame timer (~500ms). Captured at 60ms so several
  // frames land inside it — at 100ms this took two frames and one of them was
  // usually already past the overlay.
  //
  // The pass condition is a PAIR of consecutive frames in that window where the
  // particles have moved and the enemies have not. Either alone proves nothing:
  // moving particles with moving enemies is the naive unpause, and frozen
  // enemies with frozen particles is the old pause.
  await burst('p-06-after-level', 14, 60);
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
