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
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PORT = 5199;
const URL = `http://127.0.0.1:${PORT}/`;

function parseArgs(argv) {
  const args = { out: resolve(ROOT, '.look'), hold: 6000, secondaries: false, save: false, slots: false, particles: false, money: false, baseline: false, sound: false, soundSweep: false, indicators: false, tutorial: false, ui: false, countdown: false, medals: false, unlock: false };
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
    if (argv[i] === '--indicators') args.indicators = true;
    if (argv[i] === '--tutorial') args.tutorial = true;
    if (argv[i] === '--ui') args.ui = true;
    if (argv[i] === '--countdown') args.countdown = true;
    if (argv[i] === '--medals') args.medals = true;
    if (argv[i] === '--unlock') args.unlock = true;
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

/**
 * Whether something already holds `port`.
 *
 * ── Why `serverUp` cannot answer this ─────────────────────────────────────
 * `serverUp` fetches the URL and accepts any 200. A **foreign** server on this
 * port answers 200 perfectly well, so with `--strictPort` the sequence used to
 * be: our vite fails to bind, the stranger replies, and the run captures a full
 * set of normal-looking frames from a build nobody chose. Nothing in the output
 * said so.
 *
 * That is not hypothetical — it happened in T63, one commit after the hazard was
 * written down, and the frames were of a server started before the fix they were
 * taken to verify. Binding is the only test that distinguishes "answering" from
 * "ours".
 */
function portInUse(port) {
  return new Promise((res) => {
    const probe = createServer();
    probe.once('error', (e) => res(e.code === 'EADDRINUSE'));
    probe.listen(port, '127.0.0.1', () => probe.close(() => res(false)));
  });
}

const args = parseArgs(process.argv.slice(2));

// Refuse rather than measure something we did not start. A `look` run that
// silently answers from a stranger is worse than one that does not run: it
// produces evidence, and the evidence looks fine.
if (await portInUse(PORT)) {
  throw new Error(
    `port ${PORT} is already in use, so this run would be answered by a server ` +
      `it did not start — and its frames would be evidence about an unknown build.\n` +
      `Find the owner:  netstat -ano | findstr :${PORT}      (Windows)\n` +
      `                 lsof -i :${PORT}                     (macOS/Linux)\n` +
      `Then kill it and re-run. This is usually a leaked child from an earlier ` +
      `look run — see L4 in docs/BACKLOG.md.`,
  );
}

rmSync(args.out, { recursive: true, force: true });
mkdirSync(args.out, { recursive: true });

// Spawned **directly**, not through `npx` with `shell: true`. `child.kill()`
// signals the process it spawned; with a shell wrapper that is the shell, and
// the vite grandchild survives holding the port. That is how this script leaked
// its own port and then answered its next run from the leak. `smoke.mjs` fixed
// the identical bug the same way and says so at its own spawn site.
const vite = spawn(
  process.execPath,
  [
    resolve(ROOT, 'node_modules/vite/bin/vite.js'),
    '--port',
    String(PORT),
    '--strictPort',
    '--host',
    '127.0.0.1',
  ],
  { cwd: ROOT, stdio: 'ignore' },
);
const stop = () => {
  try {
    if (!vite.killed) vite.kill();
  } catch {
    /* already gone */
  }
};
// `exit` covers a thrown error below as well as a clean finish, so a failed run
// cannot leave a server behind either.
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

if (args.ui) {
  // MEASURE the UI by driving it, not by counting AS3 classes.
  //
  // Every count-based estimate in this project has been wrong: 27 tutorial
  // classes were 26 stubs and one real class; 187 sound sites were 12 rules.
  // A screen that opens, renders content and responds is ported, whatever a
  // class list says.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  const probe = async (label, open) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    try {
      await open();
      await delay(900);
    } catch {
      console.log(`[ui] ${label.padEnd(16)} UNREACHABLE (no entry point)`);
      return;
    }
    // Content, not just presence: a screen that opens empty is not ported.
    //
    // **Counts every interactive role, not just `button`.** The first version
    // counted buttons alone and reported Options as 4 controls when it renders
    // 9 — the six checkboxes use `role="switch"`. Caught before an estimate
    // leaned on it, unlike the sound sweep's blind spot, which inverted a
    // reading twice before anyone noticed.
    const roles = ['button', 'switch', 'checkbox', 'radio', 'tab', 'link'];
    let controls = 0;
    for (const role of roles) controls += await page.getByRole(role).count();
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    await shot(`ui-${label.toLowerCase().replace(/[^a-z]/g, '')}`);
    console.log(`[ui] ${label.padEnd(16)} controls=${String(controls).padStart(3)} chars=${String(text.length).padStart(4)}`);
  };

  const click = (re) => async () => {
    await page.getByRole('button', { name: re }).first().click({ timeout: 4000 });
  };

  await probe('MainMenu', async () => {});
  await probe('LevelSelect', click(/level select/i));
  await probe('Upgrades', click(/upgrades/i));
  await probe('Bestiary', click(/bestiary/i));
  await probe('SaveSlots', click(/save slots/i));
  await probe('Enemies', click(/enemy behaviour/i));
  await probe('Options', click(/^options$/i));
  await probe('Achievements2', click(/achievements/i));
  await probe('Achievements', click(/achievements/i));
  await probe('Premium', click(/premium|more games/i));
  await probe('Credits', click(/credits/i));

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.unlock) {
  /**
   * The level-select medal reveal — `ScreenLevelSelect.progressLevelButtons`
   * (`:518-545`) and the `Unlock` pushes at `:768` / `:1475`.
   *
   * Wins 1-1 on a real run (the dev jump banks nothing, so it would leave the
   * tables identical and nothing to reveal), then goes to level select and
   * watches the medal count on the 1-1 row climb.
   *
   * **Also checks the asymmetry the scoping pass found.** The gates read the
   * earned table while only the display lags, so the Next-level button and
   * level select must agree about 1-2 being playable *while the reveal is still
   * running*. That is asserted here by reading the row's disabled state.
   */
  // `LevelSelectScreen.tsx:287` — `Level N, <mode>, V of 3 on <difficulty>`.
  // The dev jump's cells use `World W, level N, <mode>`, which is a different
  // element: reading that one returned 0 forever while the reveal ran fine.
  const medalsOnRow = () =>
    page.evaluate(() => {
      const cell = globalThis.document.querySelector('[aria-label^="Level 1,"]');
      const label = cell?.getAttribute('aria-label') ?? '';
      const m = /,\s*(\d+) of 3 on/.exec(label);
      return m ? Number(m[1]) : -1;
    });

  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(1200);
  const slot = page.getByRole('button', { name: /new game|slot 1/i });
  if ((await slot.count()) > 0) {
    await slot.first().click();
    await delay(1200);
  }

  await page
    .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
    .catch(() => console.log('[look] warning: countdown never reported done'));
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await delay(200);
  await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
  await page.mouse.down();
  await delay(400);
  await page.mouse.up();

  await page.mouse.down();
  let won = false;
  for (let i = 0; i < 260 && !won; i += 1) {
    const a = await page.evaluate(() => globalThis.__arena ?? null);
    const target = a?.enemies?.[0];
    if (target) await page.mouse.move(target.screen.x, target.screen.y);
    else if (a?.tank?.screen) await page.mouse.move(a.tank.screen.x + 200, a.tank.screen.y);
    await delay(120);
    won = await page.evaluate(
      () => globalThis.document.querySelector('.level-outcome__medals') !== null,
    );
  }
  await page.mouse.up();
  console.log(`[look] 1-1 won: ${won}`);

  await page.evaluate(() => globalThis.__soundQueue?.clear());

  // Straight to level select, where the reveal runs.
  const toSelect = page.getByRole('button', { name: /level select/i });
  if ((await toSelect.count()) === 0) console.log('[look] warning: no Level select button');
  else await toSelect.first().click();

  const seen = [];
  let last = -1;
  let firstAt = null;
  const started = Date.now();
  while (Date.now() - started < 6000) {
    const n = await medalsOnRow();
    if (n >= 0 && n !== last) {
      const now = Date.now();
      firstAt ??= now;
      seen.push({ medals: n, atMs: now - firstAt });
      await page.screenshot({ path: `${args.out}/u-reveal-${seen.length}-${n}.png` });
      last = n;
    }
    await delay(20);
  }

  const unlockSounds = await page.evaluate(() =>
    (globalThis.__soundQueue?.names() ?? []).filter((n) => n === 'Unlock'),
  );

  // The asymmetry check: is 1-2 startable from level select at this point?
  const nextEnabled = await page.evaluate(() => {
    const cell = globalThis.document.querySelector('[aria-label^="Level 2,"]');
    if (!cell) return null;
    // A locked row is labelled "Level 2, locked" and is disabled.
    return !cell.hasAttribute('disabled') && !/locked/.test(cell.getAttribute('aria-label') ?? '');
  });

  console.log(`[look] reveal: ${seen.map((s) => `${s.medals}★@${s.atMs}ms`).join('  ') || 'none'}`);
  console.log(`[look] Unlock sounds: ${unlockSounds.length}`);
  console.log(`[look] level 1-2 selectable during/after the reveal: ${nextEnabled}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.medals) {
  /**
   * All three medal stamps — `ScreenStatus.as:1147-1163`.
   *
   * `--baseline` clears 1-1 with damage taken, so it earns one medal and
   * exercises one of the three stamps. Three medals need `hp >= 95` (`:246`),
   * which means clearing without being touched: the dev jump's "Arrive fully
   * upgraded" plus a long-range primary, aiming at enemies before they close.
   *
   * Times are measured **from the first star**, because the overlay's mount is
   * what starts the clock and that is not the same instant as the last kill.
   */
  const arena = async () => {
    const a = await page.evaluate(() => globalThis.__arena ?? null);
    return a?.tank?.screen ? { ...a.tank.screen, enemies: a.enemies ?? [] } : null;
  };

  /**
   * A **real** run, not the dev jump.
   *
   * `GameplayScene.ts:4126-4128` reads `this.banking?.medals ?? 0`, and
   * `bankLevelOutcome` is skipped entirely on a sandbox run — so every dev-jump
   * clear reports "0 of 3 medals" however well it went. That is documented
   * behaviour at the site, not a defect, and it makes the dev jump useless for
   * observing this. Diagnosed by driving one and reading the label.
   */
  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(1200);
  // The slot picker, when a fresh profile shows it.
  const slot = page.getByRole('button', { name: /new game|slot 1/i });
  if ((await slot.count()) > 0) {
    await slot.first().click();
    await delay(1200);
  }

  await page
    .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
    .catch(() => console.log('[look] warning: countdown never reported done'));

  // Move, then fire — `:7153` holds spawning until the tutorial's `AimShoot` is
  // done, and 1-1 is where the tutorial starts. Without this the level never
  // spawns and never clears, which is `L3` in a third place.
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await delay(200);
  await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
  await page.mouse.down();
  await delay(400);
  await page.mouse.up();
  await delay(400);

  // Fire continuously and keep the cursor on the nearest enemy, so they die at
  // range rather than on the tank.
  await page.mouse.down();
  let cleared = false;
  for (let i = 0; i < 260 && !cleared; i += 1) {
    const a = await arena();
    if (a) {
      const target = a.enemies?.[0];
      if (target) await page.mouse.move(target.screen.x, target.screen.y);
      else await page.mouse.move(a.x + 200, a.y);
    }
    await delay(120);
    cleared = await page.evaluate(
      () => globalThis.document.querySelector('.level-outcome__medals') !== null,
    );
    if (i % 40 === 0) {
      const hud = await page.evaluate(() =>
        globalThis.document.body.innerText.replace(/\s+/g, ' ').slice(0, 90),
      );
      console.log(`[look]   i=${i} enemies=${a?.enemies?.length ?? 'n/a'} hud="${hud}"`);
    }
  }
  await page.mouse.up();

  const stars = () =>
    page.evaluate(() => {
      const el = globalThis.document.querySelector('.level-outcome__medals span');
      return el ? (el.textContent ?? '').split('★').length - 1 : -1;
    });
  const label = await page.evaluate(
    () =>
      globalThis.document.querySelector('.level-outcome__medals')?.getAttribute('aria-label') ?? '',
  );

  const seen = [];
  let last = -1;
  let firstAt = null;
  const started = Date.now();
  while (Date.now() - started < 4000) {
    const n = await stars();
    if (n > 0 && n !== last) {
      const now = Date.now();
      firstAt ??= now;
      seen.push({ stars: n, atMs: now - firstAt });
      await page.screenshot({ path: `${args.out}/m-medal-${n}.png` });
      last = n;
    }
    await delay(20);
  }

  const awards = await page.evaluate(() =>
    (globalThis.__soundQueue?.names() ?? []).filter(
      (n) => n.startsWith('Award') || n === 'Achievement',
    ),
  );

  console.log(`[look] final: "${label}"`);
  console.log(`[look] stamps: ${seen.map((s) => `${s.stars}★@${s.atMs}ms`).join('  ') || 'none'}`);
  console.log(`[look] award sounds: ${awards.join(' ') || 'none'}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.countdown) {
  /**
   * The countdown's effect on **spawn placement**, driven either side of the
   * change in one run.
   *
   * `countDownDone` switches `spawnPlacement` between the off-camera search
   * (while the countdown runs) and edge placement (for the rest of the level).
   * Before T67 the flag was never written, so the search ran on *every* spawn.
   * `?countdown=0` reproduces exactly that, so both cases come from **one
   * build** — comparing frames across two builds is a trap this project has
   * already paid for.
   *
   * ── Why level 1-2 and not 1-1 ─────────────────────────────────────────
   * `PartInterface.as:288` skips the countdown outright on 1-1 for a fresh
   * tutorial, so 1-1 can never show this. 1-2 is world 1, Normal and
   * 800x600 — bigger than the camera on both axes, so the search is eligible.
   *
   * ── Why the tutorial is turned off first ──────────────────────────────
   * `:7153` holds spawning until `AimShoot` is done, and the countdown blocks
   * `tankAttack` — so with the tutorial running the player cannot satisfy the
   * tutorial during the countdown and nothing spawns at all. That interaction
   * is faithful and is exactly why the AS3 has the 1-1 skip, but it would make
   * this measurement empty.
   *
   * Placement and timing only — per `L8` the sweep cannot reliably land hits,
   * so nothing here reads kills or combat outcomes.
   */
  const spawns = () => page.evaluate(() => globalThis.__spawns ?? []);
  const clearSpawns = () => page.evaluate(() => { globalThis.__spawns = []; });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  // Tutorial off, once — the options store persists across both runs below.
  await page.getByRole('button', { name: /^options$/i }).click();
  await delay(600);
  const tutorialSwitch = page.getByRole('switch', { name: /tutorial/i });
  if ((await tutorialSwitch.count()) > 0 && (await tutorialSwitch.first().isChecked())) {
    await tutorialSwitch.first().click();
    await delay(300);
  }
  await page.getByRole('button', { name: /back|menu/i }).first().click();
  await delay(600);

  /**
   * Watches the panel's digit change, reading it from the DOM rather than
   * sleeping on the clock.
   *
   * The countdown starts on the first `update`, which is after `create()`'s
   * tail — so wall time from the click is not the countdown's own time. Timing
   * is therefore measured **from the first digit**, which is frame 54, i.e.
   * 200ms into a 2000ms countdown. Expected gaps from there are 600/600/600.
   */
  const watchPanel = async (label) => {
    const digit = () =>
      page.evaluate(
        () => globalThis.document.querySelector('.hud-countdown__digit')?.textContent ?? null,
      );
    const seen = [];
    let last = null;
    let firstAt = null;
    const started = Date.now();

    while (Date.now() - started < 8000) {
      const d = await digit();
      if (d !== null && d !== '' && d !== last) {
        const now = Date.now();
        firstAt ??= now;
        seen.push({ digit: d, atMs: now - firstAt });
        await page.screenshot({ path: `${args.out}/c-panel-${seen.length}-${d.replace('!', '')}.png` });
        last = d;
        if (d === 'GO!') break;
      }
      await delay(25);
    }

    console.log(`[countdown] ${label} panel digits: ` +
      seen.map((s) => `${s.digit}@${s.atMs}ms`).join('  '));
    await delay(1200);
    await page.screenshot({ path: `${args.out}/c-panel-after-fade.png` });
    const gone = await page.evaluate(() => {
      const el = globalThis.document.querySelector('.hud-countdown');
      return el === null || globalThis.getComputedStyle(el).opacity === '0';
    });
    console.log(`[countdown] ${label} panel faded out: ${gone}`);

    // `:726`/`:731`/`:736` queue CountDownBeep1 on each digit and `:741`
    // queues CountDownBeep2 on GO!. Counted rather than assumed — three and
    // one, not four of either.
    const beeps = await page.evaluate(() =>
      (globalThis.__soundQueue?.names() ?? []).filter((n) => n.startsWith('CountDownBeep')),
    );
    const b1 = beeps.filter((n) => n === 'CountDownBeep1').length;
    const b2 = beeps.filter((n) => n === 'CountDownBeep2').length;
    console.log(`[countdown] ${label} beeps: CountDownBeep1 x${b1}, CountDownBeep2 x${b2}`);
    return seen;
  };

  const run = async (label, query, watch = false) => {
    await page.goto(`${URL}${query}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(800);
    await page.getByRole('button', { name: /World 1, level 2, Normal/i }).click();
    if (watch) await watchPanel(label);
    await delay(1200);
    // **Watching costs the countdown-window spawn.** `watchPanel` runs for the
    // whole countdown, so by the time the queue is cleared the one off-camera
    // placement has already happened and the `after` run reports 0 rather than
    // 1. That is an artefact of watching, not a change in placement — the
    // unwatched `before`/`after` pair is the measurement, and T67 recorded it
    // as 9/9 against 1/8. Do not read `offCamera=0` here as a regression.
    await clearSpawns();
    // Long enough for well past the 2s countdown at 1-2's ~42-frame interval.
    await delay(16_000);
    const list = await spawns();
    await page.screenshot({ path: `${args.out}/c-${label}.png` });

    const off = list.filter((s) => s.offCamera).length;
    const edge = list.length - off;
    const pct = list.length ? Math.round((edge / list.length) * 100) : 0;
    console.log(
      `[countdown] ${label.padEnd(7)} spawns=${String(list.length).padStart(2)} ` +
        `offCamera=${String(off).padStart(2)} edge=${String(edge).padStart(2)} (${pct}% edge)`,
    );
    for (const s of list) {
      console.log(
        `             ${s.atMs.toString().padStart(6)}ms  ` +
          `(${String(s.x).padStart(4)},${String(s.y).padStart(4)})  ` +
          `${s.offCamera ? 'off-camera' : `edge wall ${s.wall}`}  ` +
          `countDownDone=${String(s.countDownDone).padEnd(5)} ` +
          `framesLeft=${s.framesLeft}`,
      );
    }
    return { off, edge, total: list.length };
  };

  const before = await run('before', '?countdown=0');
  const after = await run('after', '', true);

  console.log(
    `\n[countdown] before: ${before.off}/${before.total} off-camera  ` +
      `after: ${after.off}/${after.total} off-camera`,
  );
  console.log('[countdown] frames -> ' + args.out);
  await browser.close();
  stop();
  process.exit(0);
}

if (args.tutorial) {
  // The first end-to-end watch of the whole subsystem: T46 built the state
  // machine, T47 the gates, and neither could observe the sequence.
  // No dev flag: a fresh options store means `tutorialOn` defaults true, which
  // is the whole point of T54. The flag now exists only for a *completed*
  // profile, which the preference cannot re-enable.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(2500);

  const dump = async (label) => {
    const d = await page.evaluate(() => globalThis.__tutorialPanel ?? null);
    console.log(`[look] ${label}: ${JSON.stringify(d)}`);
  };

  // Move: the panel should be up and nothing should have spawned, because
  // `:7153` holds the countdown until AimShoot is done.
  await burst('t-01-move', 6, 200);
  await dump('panel 1 (Move)');

  // Doing the thing dismisses it. Held, not tapped.
  await page.keyboard.down('d');
  await delay(700);
  await page.keyboard.up('d');
  await burst('t-02-move-dismissed', 8, 200);

  // AimShoot follows, and spawning is still held.
  await dump('panel 2 (AimShoot) early');
  await burst('t-03-aimshoot', 6, 250);
  await dump('panel 2 (AimShoot) late');

  // Firing satisfies it and releases the spawn gate on the same frame.
  await page.locator('canvas').hover({ position: { x: 900, y: 400 } });
  await page.mouse.down();
  await delay(300);
  await page.mouse.up();
  await burst('t-04-spawn-released', 10, 250);

  // How many steps were shown, via the sound the AS3 fires once per step
  // (`:399`). A count of 1 means the handover never happened.
  const tut = await page.evaluate(
    () => (globalThis.__soundQueue?.names() ?? []).filter((n) => n === 'Tutorial').length,
  );
  console.log(`[look] Tutorial sound fired ${tut} time(s) — one per step shown`);

  console.log(`[look] frames -> ${args.out}`);
  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.indicators) {
  // The two on-enemy markers. Each needs a specific condition, so each gets
  // its own isolated dev level rather than hoping a mixed arena obliges.
  const isolated = async (type, slug, setup) => {
    await page.goto(`${URL}${setup}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /enemy behaviour/i }).click();
    await delay(900);
    const row = page.locator('li', { hasText: type }).first();
    const test = row.getByRole('button', { name: /test/i });
    if ((await test.count()) === 0) {
      console.log(`[look] no Test button for ${type}`);
      return;
    }
    await test.click();
    await delay(6000);
    // Sweep while firing. A fixed bearing put every round into empty ground —
    // the enemies were behind the crosshair — and the marker never appeared,
    // which reads as "not wired" and is the scenario missing.
    await page.locator('canvas').hover({ position: { x: 760, y: 400 } });
    await page.mouse.down();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      await page.mouse.move(640 + Math.cos(a) * 200, 400 + Math.sin(a) * 200);
      await delay(400);
      await shot(`${slug}-${String(i).padStart(2, '0')}`);
    }
    await page.mouse.up();
  };

  // A bomb marker needs the Timed Bomb Cannon, whose rounds attach rather than
  // damage. Basic enemies so the markers are unobstructed.
  await isolated('Basic', 'i-01-bomb', '?primary=Timed%20Bomb%20Cannon');

  // A heal ring needs a Medic, and the ring is sized from its own reach.
  await isolated('Medic', 'i-02-medic', '');

  console.log(`[look] frames -> ${args.out}`);
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

  /**
   * Gets a freshly-loaded level to the point where play actually runs.
   *
   * **Two gates, in order, and both were being ignored.** `:7153` holds
   * spawning until the tutorial's `AimShoot` is done, which needs a move and a
   * fire (`L3`, T65). Since T67 the countdown *also* blocks `moveTank` and
   * `tankAttack` (`:2818`, `:2820`) for its two seconds — so a move-and-fire
   * inside that window satisfies nothing and the tutorial gate stays shut for
   * the whole run.
   *
   * That combination is what made the sweep measure an empty arena: `60 LEFT`
   * from first frame to last, `__arena.enemies` empty at every sample, and a
   * perfectly plausible 27 of 67 reported anyway.
   *
   * Waits on the real flag rather than sleeping, so a slow machine cannot
   * reintroduce it.
   */
  const releasePlay = async () => {
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[look] warning: countdown never reported done'));

    await page.keyboard.down('d');
    await delay(600);
    await page.keyboard.up('d');
    await delay(200);
    await page.locator('canvas').hover({ position: { x: 760, y: 400 } });
    await page.mouse.down();
    await delay(300);
    await page.mouse.up();
  };

  /**
   * The tank and its nearest enemies, in canvas CSS pixels — `__arena` (T69).
   *
   * The fallback is deliberately **not** the screen centre: `(640, 400)` is
   * also exactly where the tank starts, so a silent fallback used to be
   * indistinguishable from a correct read and produced an entirely plausible
   * log. `live` is reported so the count of real reads is the claim.
   */
  const arenaAt = async () => {
    const arena = await page.evaluate(() => globalThis.__arena ?? null);
    const screen = arena?.tank?.screen;
    return screen
      ? { ...screen, live: true, enemies: arena.enemies ?? [] }
      : { x: 640, y: 400, live: false, enemies: [] };
  };

  /**
   * Points the cursor at a live enemy, or orbits the tank when none is in the
   * list.
   *
   * The orbit is kept as the fallback rather than deleted — it is what
   * exercises the *border* sounds when the arena is empty — but it is centred
   * on the tank's live position, not on the old screen constant. Enemies are
   * cycled rather than always-nearest so successive shots take different
   * bearings and the "spray in all directions" intent survives.
   */
  const aimFrom = async (step, radius = 220) => {
    const at = await arenaAt();
    const target = at.enemies?.[step % Math.max(1, at.enemies.length)];
    if (target) await page.mouse.move(target.screen.x, target.screen.y);
    else {
      const a = (step / 5) * Math.PI * 2;
      await page.mouse.move(at.x + Math.cos(a) * radius, at.y + Math.sin(a) * radius);
    }
    return { ...at, aimed: Boolean(target) };
  };

  // One page load per primary: `?secondary=` grants a secondary, and the
  // weapon cycle key (Q) walks the equipped slots.
  const SECONDARIES = ['Grenade', 'Mine', 'Shield', 'Rockets', 'Icicles', 'Crazy Cheese', 'Ice Ball', 'Magic Bunny'];

  // Paired with a different primary each pass, via the `?primary=` aid added
  // in T41. Eight weapon sounds plus BorderTiny/BorderBig were silent purely
  // because the Cannon is what a fresh profile equips — unexercised, not
  // unwired, and this is what tells the two apart.
  const PRIMARIES = [
    'MiniGun', 'Shotgun', 'Big Cannon', 'Gummy Bear Cannon',
    'Cake Cannon', 'Poison Cannon', 'Magic Cannon', 'Laser Cannon',
  ];

  for (const [i, secondary] of SECONDARIES.entries()) {
    const primary = PRIMARIES[i % PRIMARIES.length];
    const q = `?secondary=${encodeURIComponent(secondary)}&primary=${encodeURIComponent(primary)}`;
    await page.goto(`${URL}${q}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /all-enemy test level/i }).click();

    // Move, then fire, *before* the settle delay — the same fix `--baseline`
    // got in T58, arriving here in T65 (`L3`).
    //
    // Each `page.goto` above is a fresh profile, so `tutorialOn` defaults true
    // and `:7153` holds enemy spawning until the player has moved **and**
    // fired. This loop used to fire at the hover below and move only at
    // iteration 5, so the gate stayed shut and nothing spawned.
    //
    // **Measured A/B on this level, not assumed.** Without the move the
    // tutorial stays on step `Move` through the entire firing loop — 140 sounds
    // queued, step never advances, arena still reads `60 LEFT`. With it the
    // step reaches `KillEnemies` inside the settle and enemies are on screen
    // when measurement starts.
    //
    // ── Wait out the countdown before doing any of it (T69) ───────────────
    // `:2818`/`:2820` put `moveTank` and `tankAttack` inside the countdown
    // gate, so the move-and-fire below satisfies nothing if it runs inside the
    // window — the tutorial's `AimShoot` stays undone and `:7153` then holds
    // spawning for the entire run. That is exactly what happened after T67:
    // the arena stayed at `60 LEFT`, `__arena.enemies` was empty at every
    // sample, and the sweep still reported a plausible 27 of 67.
    //
    // Waiting on the flag rather than sleeping a guessed duration, so a slower
    // machine cannot reintroduce it.
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[look] warning: countdown never reported done'));

    // The `L8` half is below: the orbit is centred on the tank's **live**
    // screen position rather than on a hard-coded one.
    await page.keyboard.down('d');
    await delay(600);
    await page.keyboard.up('d');
    await delay(200);
    await page.locator('canvas').hover({ position: { x: 760, y: 400 } });
    await page.mouse.down();
    await delay(300);
    await page.mouse.up();

    await delay(7000);
    await clear();

    // `aimFrom` re-reads `__arena` **every step** rather than sampling once:
    // the camera keeps following, so a centre taken at the top of the loop is
    // stale by the end of it.
    const start = await arenaAt();
    await page.mouse.move(start.x + 220, start.y);
    await page.mouse.down();
    const centres = [];
    let aimedAtEnemy = 0;
    for (let i = 0; i < 10; i += 1) {
      const c = await aimFrom(i);
      centres.push(c);
      if (c.aimed) aimedAtEnemy += 1;
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

    // The tracking, stated rather than assumed. A centre list that never
    // moves means `__arena` is not being read and the orbit is fixed again —
    // which is the failure this pass exists to remove, and it would otherwise
    // be invisible in the count.
    const xs = centres.map((c) => Math.round(c.x));
    const spread = Math.max(...xs) - Math.min(...xs);
    const live = centres.filter((c) => c.live).length;
    console.log(
      `[look] ${primary} + ${secondary}: ${fired.size} names so far` +
        `  | tank x ${xs[0]}..${xs[xs.length - 1]} spread ${spread}, ${live}/${centres.length} live` +
        `, aimed at an enemy ${aimedAtEnemy}/${centres.length}`,
    );
  }

  // Isolated dev levels: thirty of one type, reached from the Enemies screen.
  //
  // This is the tool doing what it was built for. Six names — TeleportIn/Out,
  // Freeze, BossCollision, TankShieldCollision, BottomCollision — need a
  // particular enemy type or condition, and a mixed arena cannot guarantee
  // any of them shows up in a short window.
  for (const type of ['Teleporting', 'GrapplingHook', 'Shooting', 'Trap']) {
    await page.goto(`${URL}?secondary=Ice%20Grenade&primary=Timed%20Bomb%20Cannon`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /enemy behaviour/i }).click();
    await delay(900);
    const row = page.locator('li', { hasText: type }).first();
    const test = row.getByRole('button', { name: /test/i });
    if ((await test.count()) === 0) {
      console.log(`[look] no Test button for ${type} — skipped`);
      continue;
    }
    await test.click();
    // Same two gates as the pairings above — these isolated levels carried the
    // identical fixed-point orbit and the identical missing release.
    await releasePlay();
    await delay(6000);
    const isolatedStart = await arenaAt();
    await page.mouse.move(isolatedStart.x + 200, isolatedStart.y);
    await page.mouse.down();
    for (let i = 0; i < 10; i += 1) {
      await aimFrom(i, 200);
      await delay(320);
      if (i % 3 === 0) {
        await page.keyboard.down('Space');
        await delay(180);
        await page.keyboard.up('Space');
      }
    }
    await page.mouse.up();
    await delay(600);
    await collect();
    console.log(`[look] isolated ${type}: ${fired.size} names so far`);
  }

  /**
   * The four modes the sweep never visited — Flag, Tower, Boss and Defense.
   *
   * Eight sounds were being reported as "not firing" purely because the sweep
   * only ever drove the all-enemy dev level, which is Normal. `musicForMode`
   * (`GameplayScene.ts:948`) picks the track from `spec.mode`, so four of the
   * eight are one page load away from proving themselves; `FlagPickup`,
   * `BossCollision` and `BottomCollision` need the mode's own mechanic.
   *
   * Reached through the dev level jump rather than by unlocking, so this does
   * not depend on progress. World 1 gives one of each: `1-3` Flag, `1-7` Tower,
   * `1-9` Boss, `1-11` Defense.
   */
  const MODE_LEVELS = [
    ['Flag', 3],
    ['Tower', 7],
    ['Boss', 9],
    ['Defense', 11],
  ];

  for (const [mode, level] of MODE_LEVELS) {
    await page.goto(`${URL}?primary=Big%20Cannon&secondary=Grenade`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(800);
    const cell = page.getByRole('button', { name: new RegExp(`World 1, level ${level}, ${mode}`, 'i') });
    if ((await cell.count()) === 0) {
      console.log(`[look] no dev cell for 1-${level} ${mode} — skipped`);
      continue;
    }
    await cell.click();
    await releasePlay();
    await delay(3000);

    const before = fired.size;
    await page.mouse.down();
    for (let i = 0; i < 16; i += 1) {
      await aimFrom(i);
      await delay(300);
      // Tower cannot move, so driving is pointless there; elsewhere it is what
      // reaches a flag or the bottom lane.
      if (mode !== 'Tower' && i % 4 === 0) {
        const key = mode === 'Defense' ? 's' : 'd';
        await page.keyboard.down(key);
        await delay(400);
        await page.keyboard.up(key);
      }
      if (i % 3 === 0) {
        await page.keyboard.down('Space');
        await delay(160);
        await page.keyboard.up('Space');
      }
    }
    await page.mouse.up();
    await delay(600);
    await collect();
    console.log(`[look] mode ${mode.padEnd(8)} (1-${level}): ${fired.size} names (+${fired.size - before})`);
  }

  /**
   * A defeat, then the menu — `outcomeMusic` (`GameplayScene.ts:4022`) and
   * `MainMenuScene.ts:83`.
   *
   * `Lose` and `Menu` are wired and were silent only because the sweep never
   * finished a level or left one. The dev `K` key resolves a level in one
   * press, which is the cheapest way to reach both.
   */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /all-enemy test level/i }).click();
  await releasePlay();
  await delay(1500);
  await page.keyboard.press('k');
  await delay(2500);
  await collect();
  const afterLoss = fired.size;
  console.log(`[look] defeat: ${afterLoss} names`);

  // The results overlay's own exit, not the HUD's — `/menu/i` matches both and
  // `.first()` took whichever the DOM happened to order first. `.last()` is the
  // overlay's, which is the one that is actually clickable over it.
  //
  // **Failures are reported, not swallowed.** The earlier version had
  // `.catch(() => {})`, which turned a missed click into "+0 names" and looked
  // exactly like a sound that does not fire.
  const menuButtons = page.getByRole('button', { name: /^menu$/i });
  const menuCount = await menuButtons.count();
  if (menuCount === 0) console.log('[look] warning: no Menu button after the defeat');
  else {
    await menuButtons.last().click();
    await delay(1500);
    // **`Menu` music needs a Phaser pointer event, not a DOM one.**
    // `MainMenuScene.ts:79-84` hangs `setMusic('Menu')` off a one-shot
    // `POINTER_DOWN` on the canvas — the gesture that unlocks the AudioContext.
    // Every click the harness makes is on a React button, which never reaches
    // Phaser's input, so the track was unreachable however many times the
    // sweep returned to the menu.
    // Far right, clear of the menu column — the overlay's buttons intercept a
    // centre click and Playwright reports it rather than silently missing.
    await page.mouse.click(1250, 400);
    await delay(2500);
  }
  await collect();
  console.log(`[look] back to menu: ${fired.size} names (+${fired.size - afterLoss})`);

  /**
   * A shop purchase — `InterfaceButtonMoney` (`UpgradesScene.ts:243`).
   *
   * Wired, and silent only because nothing in the sweep ever bought anything.
   * The dev money top-up makes an affordable row certain.
   */
  const beforeShop = fired.size;
  const upgrades = page.getByRole('button', { name: /^upgrades$/i });
  if ((await upgrades.count()) === 0) console.log('[look] warning: no Upgrades button on the menu');
  else {
    await upgrades.first().click();
    await delay(1200);

    // The dev grant — `UpgradesScreen.tsx:186-194`, labelled "Dev: +N coins".
    // Clicked several times: one grant does not necessarily cover the cheapest
    // row, and the first attempt failed on a *disabled* Buy button, which
    // Playwright reports rather than silently skipping.
    const grant = page.getByRole('button', { name: /^Dev: \+.* coins$/i });
    if ((await grant.count()) === 0) console.log('[look] warning: no dev grant button');
    else {
      for (let i = 0; i < 4; i += 1) {
        await grant.first().click();
        await delay(200);
      }
    }

    // `aria-label` is `Buy|Upgrade <name> for <cost> coins`
    // (`UpgradesScreen.tsx:120`), so match that rather than the visible verb.
    // **Enabled only** — a disabled row means the grant was not enough, which
    // is a harness problem and must not read as a silent sound.
    const buy = page.getByRole('button', { name: /^(Buy|Upgrade) .* for \d+ coins$/i });
    const enabled = [];
    for (const b of await buy.all()) if (await b.isEnabled()) enabled.push(b);
    if (enabled.length === 0) console.log('[look] warning: every shop row is unaffordable');
    else {
      // Reported, never swallowed: a failed click is a harness problem and must
      // not be indistinguishable from a sound that does not fire.
      try {
        await enabled[0].click({ timeout: 5000 });
        await delay(900);
      } catch {
        console.log('[look] warning: the Buy click did not land — InterfaceButtonMoney not driven');
      }
    }
  }
  await collect();
  console.log(`[look] shop: ${fired.size} names (+${fired.size - beforeShop})`);

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
  // The peak measurement was reading 0 for a name that had demonstrably fired
  // earlier in the same run — not because the dedup rule was wrong, but
  // because this block never released play either, so nothing ever died here.
  await releasePlay();
  await delay(11000);
  await clear();
  const dedupStart = await arenaAt();
  await page.mouse.move(dedupStart.x + 180, dedupStart.y);
  await page.mouse.down();
  for (let i = 0; i < 24; i += 1) {
    await aimFrom(i, 180);
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
  // The rounds-are-landing check. Before T69 every one of these was absent
  // while the sweep still reported a plausible 25 of 67 — a count alone cannot
  // tell an unwired sound from one nothing ever triggered.
  const IMPACTS = ['ImpactBullet', 'ImpactLaser', 'ImpactMagic', 'ImpactCake', 'EnemySquish', 'Coin'];
  const landed = IMPACTS.filter((n) => fired.has(n));
  console.log(
    `[look] landing evidence: ${landed.length}/${IMPACTS.length} — ${landed.join(' ') || 'NONE'}`,
  );
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

  // Move first. The tutorial is on by default for a fresh options store, and
  // `:7153` holds enemy spawning until `AimShoot` is done — which needs the
  // player to move and then fire. A baseline that never pressed a key stalled
  // at 10 LEFT forever and looked like a broken level.
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await delay(400);

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

  /**
   * The medal stamp-in — `ScreenStatus.as:1147-1163`, 10/20/30 AS3 frames.
   *
   * Watched by reading the star count out of the DOM as it changes, because the
   * whole reveal is over in one second and the results capture below sits at
   * +1500ms — it would only ever photograph the settled state. Times are
   * measured **from the first star**, since the overlay's own mount is what
   * starts the clock and that is not the same instant as the win.
   */
  {
    const stars = () =>
      page.evaluate(() => {
        const el = globalThis.document.querySelector('.level-outcome__medals span');
        return el ? (el.textContent ?? '').split('★').length - 1 : -1;
      });
    const seen = [];
    let last = -1;
    let firstAt = null;
    const started = Date.now();
    while (Date.now() - started < 4000) {
      const n = await stars();
      if (n > 0 && n !== last) {
        const now = Date.now();
        firstAt ??= now;
        seen.push({ stars: n, atMs: now - firstAt });
        await page.screenshot({ path: `${args.out}/b-06b-medal-${n}.png` });
        last = n;
      }
      await delay(20);
    }
    const awards = await page.evaluate(() =>
      (globalThis.__soundQueue?.names() ?? []).filter((n) => n.startsWith('Award')),
    );
    console.log(
      `[look] medal stamp-in: ${seen.map((s) => `${s.stars}★@${s.atMs}ms`).join('  ') || 'none seen'}`,
    );
    console.log(`[look] award sounds: ${awards.join(' ') || 'none'}`);
  }

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
