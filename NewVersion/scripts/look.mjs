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
/**
 * `LOOK_URL` points the harness at a server it did **not** start — in practice
 * `vite preview` over a production build.
 *
 * Added for the stutter investigation (T113): the whole question was whether
 * scene-entry cost is a dev-server artifact, and that cannot be answered by a
 * tool that can only ever measure the dev server. The port-bind guard below is
 * skipped in this mode, because refusing a server we did not start is exactly
 * the point here — so the URL has to be given explicitly rather than
 * discovered, and it is echoed in the output so no run is ambiguous about what
 * it measured.
 */
const EXTERNAL_URL = process.env.LOOK_URL;
const URL = EXTERNAL_URL ?? `http://127.0.0.1:${PORT}/`;

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
    // `--viewport 390x844` — an iPhone-ish portrait. The overflow class of bug
    // is viewport-dependent by definition, so a desktop-only pass proves the
    // least interesting case: a tall window is where content fits.
    if (argv[i] === '--viewport') args.viewport = argv[++i];
    if (argv[i] === '--overlays') args.overlays = true;
    if (argv[i] === '--tooltips') args.tooltips = true;
    if (argv[i] === '--resistances') args.resistances = true;
    if (argv[i] === '--next-level') args.nextLevel = true;
    if (argv[i] === '--level-guide') args.levelGuide = true;
    if (argv[i] === '--grid-preview') args.gridPreview = true;
    if (argv[i] === '--achievement-icon') args.achievementIcon = true;
    if (argv[i] === '--boss-life') args.bossLife = true;
    if (argv[i] === '--walls') args.walls = true;
    if (argv[i] === '--frames') args.frames = true;
    if (argv[i] === '--separation') args.separation = true;
    if (argv[i] === '--boss-collision') args.bossCollision = true;
    if (argv[i] === '--separation-level') args.separationLevel = argv[i + 1];
    if (argv[i] === '--hits') args.hits = true;
    if (argv[i] === '--turret') args.turret = true;
    if (argv[i] === '--sprites') args.sprites = true;
    if (argv[i] === '--transitions') args.transitions = true;
    if (argv[i] === '--transitions-levels') args.transitionsLevels = argv[i + 1];
    if (argv[i] === '--frames-level') args.framesLevel = argv[i + 1];
    // `--shrink` retargets `--boss-life` at 3-9, whose boss row is `Shrinking`
    // — the one type whose radius changes as it is damaged, so the disc is
    // resized every frame from the live `Enemy.radius`. 1-9's boss keeps a
    // fixed radius and cannot show a mask-sizing fault.
    if (argv[i] === '--shrink') args.shrink = true;
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
if (!EXTERNAL_URL && (await portInUse(PORT))) {
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
const vite = EXTERNAL_URL
  ? { killed: true, kill: () => {} }
  : spawn(
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
if (EXTERNAL_URL) console.log(`[look] using external server ${EXTERNAL_URL} (no vite spawned)`);
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
const viewportArg = /^(\d+)x(\d+)$/.exec(args.viewport ?? '');
const viewport = viewportArg
  ? { width: Number(viewportArg[1]), height: Number(viewportArg[2]) }
  : { width: 1280, height: 800 };
if (args.viewport && !viewportArg) {
  throw new Error(`--viewport wants WIDTHxHEIGHT, got "${args.viewport}"`);
}
console.log(`[look] viewport ${viewport.width}x${viewport.height}`);
const page = await browser.newPage({ viewport });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});

/**
 * A frame, optionally cropped.
 *
 * `clip` exists because a full 1280x800 frame is the wrong instrument for a
 * small sprite: the muzzle flare is ~10px on it, which cannot distinguish a
 * flare at the tank's centre from one at its barrel. A crop is not extra
 * evidence, it is the same evidence at a legible size.
 */
const shot = (name, clip) =>
  page.screenshot({ path: `${args.out}/${name}.png`, ...(clip ? { clip } : {}) });

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

  // ── Move *before* firing (T85) ───────────────────────────────────────────
  // A fresh profile has the tutorial on, and `:7153` holds the arena until the
  // player has moved **and** fired. This routine used to fire first and move
  // afterwards, so every "fired" frame was taken with the gate still shut —
  // the frames showed the `WASD TO MOVE` panel and no projectile at all, and
  // read as "the weapon does not fire". Same ordering fault `--baseline` fixed
  // in T58 and `--sound-sweep` in T65 (`L3`); it survived here because nothing
  // had needed these frames to show a projectile until the art landed.
  await page.keyboard.down('d');
  await delay(700);
  await page.keyboard.up('d');
  await delay(200);

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

if (args.overlays) {
  /*
   * The two-layer projectiles — `BulletBomb` and `ObjectMine`.
   *
   * Both draw a static body with a second shape animating over it, and both
   * loop from spawn rather than following any game state. A single screenshot
   * cannot tell an animation from a static overlay, so each is captured as a
   * burst spanning more than one full cycle: the bomb's is 16 frames (~533ms)
   * and the mine's 30 (~1s).
   *
   * The mine is the easier read of the two — it sits still, so successive
   * frames differ only by the blink.
   */
  // Local copies rather than the sound sweep's — those are scoped inside its
  // own block. Both gates still apply: `:7153` holds the arena until the
  // tutorial's move-and-fire is done, and since T67 the countdown blocks
  // `moveTank`/`tankAttack` for its two seconds.
  const readArena = async () => {
    // The tank's screen position lives at `__arena.tank.screen`, not on the
    // root — reading the root gave an object with no `x`, which Playwright
    // rejected as invalid mouse coordinates rather than silently centring.
    const arena = await page.evaluate(() => globalThis.__arena ?? null);
    const screen = arena?.tank?.screen;
    return screen ? { ...screen, live: true } : { x: 640, y: 400, live: false };
  };

  const openLevel = async (query) => {
    await page.goto(`${URL}${query}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /all-enemy test level/i }).click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[look] warning: countdown never reported done'));
    // Move then fire, in that order — the tutorial gate needs both, and firing
    // first is the ordering fault that cost `--secondaries` its evidence.
    await page.keyboard.down('d');
    await delay(600);
    await page.keyboard.up('d');
    await page.mouse.move(760, 400);
    await page.mouse.down();
    await delay(200);
    await page.mouse.up();
    await delay(800);
  };

  // ── ObjectMine: drop one, step away, watch it blink ──────────────────────
  await openLevel('?secondary=Mine&primary=Cannon');
  await page.keyboard.down('Space');
  await delay(220);
  await page.keyboard.up('Space');
  // Move off the drop point: a mine spawns at the tank's own centre and is
  // completely hidden underneath it otherwise — the trap `--secondaries`
  // documents.
  await page.keyboard.down('a');
  await delay(900);
  await page.keyboard.up('a');
  await delay(300);
  // ~1.4 cycles at 30fps, sampled well inside each phase.
  await burst('ov-mine', 8, 130);
  console.log('[look] mine blink: 8 frames over ~1040ms (cycle is 1000ms)');

  // ── BulletBomb: fire and follow the round ────────────────────────────────
  await openLevel('?secondary=Mine&primary=Timed%20Bomb%20Cannon');
  const at = await readArena();
  await page.mouse.move(at.x + 260, at.y - 40);
  await page.mouse.down();
  await delay(120);
  await burst('ov-bomb', 8, 70);
  await page.mouse.up();
  console.log('[look] bomb ping-pong: 8 frames over ~560ms (cycle is 533ms)');
}

if (args.sprites) {
  /**
   * The flag's real art, and where the muzzle flare actually lands — T116.
   *
   * Both are measured rather than photographed, for the same reason each time:
   * the flag is 33px on a 1280px frame, and the flare is a particle with a
   * ~5-frame life that a screenshot catches only by luck. Frames are taken too,
   * but the numbers are the claim.
   *
   * The flare's offset is checked at **two** turret angles, because a flare
   * pinned to the tank centre and one correctly offset are the same point when
   * the turret happens to face along an axis you only tested once.
   *
   * ── What the numbers should say (T121, divergence `A10`) ─────────────────
   * The flare sits at the equipped weapon's **own barrel reach**, not at a
   * shared constant: **10.5** for the Cannon, **11.3** for the Gummy Bear.
   * Neither is `PartGameArea.as:3962`'s flat 10, and neither is T120's 16 —
   * that was the hull edge, 5.5 units past where any of these barrels end.
   *
   * Two weapons are run rather than one, because a per-weapon read and a
   * constant are indistinguishable on any single weapon. The Magic Cannon's
   * turret is measured too — it is the one genuinely long barrel at 17.9 — but
   * it fires no flare: the AS3's chain omits it, so there is nothing to
   * photograph there and the turret geometry is the claim instead.
   */
  /**
   * Enters 1-5 with a given primary equipped, past the tutorial gate.
   *
   * A reload per weapon rather than an in-game switch: `?primary=` grants
   * ownership as well as equipping, and a weapon the profile does not own
   * resolves to null stats and never fires — which photographs identically to
   * a broken flare.
   */
  const enterLevelFive = async (primary) => {
    // `flarehold=40` because the flare's own lifetime is **2 frames** — about
    // 33ms, against a ~200ms screenshot round-trip. Without it the crop is a
    // coin flip that mostly loses, which is what three earlier orderings in
    // this run kept discovering. It lengthens the flare and moves nothing:
    // position is `tank + bearing * barrelReach`, the anchor is a sprite
    // origin, and neither has a time term.
    await page.goto(
      `${URL}?primary=${encodeURIComponent(primary)}&secondary=Shield&flarehold=40`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(800);
    const target = page.getByRole('button', { name: /^World 1, level 5,/i });
    if ((await target.count()) === 0) return false;
    await target.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => {});

    await page.keyboard.down('d');
    await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
    await page.mouse.down();
    await delay(700);
    await page.mouse.up();
    await page.keyboard.up('d');
    return true;
  };

  /** The turret as drawn, then its flare at two angles. */
  const flaresFor = async (weapon) => {
    const turret = await page.evaluate(() => globalThis.__arena?.tank?.turret ?? null);
    console.log(
      turret
        ? `[sprites] turret ${weapon.padEnd(17)}: texture ${turret.texture} · ` +
            `drawn ${turret.width}x${turret.height} · origin ${turret.originX},${turret.originY}`
        : `[sprites] turret ${weapon}: no arena projection`,
    );

    for (const [label, sx, sy] of [
      ['east', 1200, 400],
      ['north', 640, 80],
    ]) {
      await page.locator('canvas').hover({ position: { x: sx, y: sy } });
      await delay(120);
      await page.mouse.down();

      // **Poll fast, shoot on the hit, then confirm the flare was still there.**
      //
      // Each half is a trap this run has already fallen into. Polling at 20ms
      // and shooting afterwards gets the numbers but often photographs a bare
      // tank, because the flare lives ~5 frames (~165ms) and the round-trip
      // spends most of it. Shooting *first* and validating after fixes the
      // frame but wrecks the sampling: a screenshot is ~200ms, so the reads
      // between shots are further apart than the flare is long, and the run
      // reported "none observed" for a flare it had just photographed.
      //
      // So: cheap reads to find the flare, the crop immediately on the hit, and
      // a second cheap read to confirm it outlived the shutter. Retried while
      // the trigger is held, because most attempts land inside the 600ms
      // reload.
      const slug = `${weapon.replace(/\s+/g, '')}-${label}`;
      const readFlare = () =>
        page.evaluate(() => {
          const a = globalThis.__arena;
          if (!a?.flares?.length) return null;
          // The newest, for the same reason the projection sends the newest:
          // `?flarehold=` keeps earlier flares alive, and the first entry is
          // the one fired at the *previous* angle.
          return { turret: a.tank.turret.rotationDeg, flare: a.flares[a.flares.length - 1] };
        });

      // Drain first. Held flares outlive the shot that made them, including the
      // ones fired while satisfying the tutorial gate, so an angle measured
      // without draining reports a flare from before the turret turned.
      for (let i = 0; i < 60; i += 1) {
        const alive = await page.evaluate(() => globalThis.__arena?.flares?.length ?? 0);
        if (alive === 0) break;
        await delay(50);
      }

      let seen = null;
      let photographed = false;
      for (let i = 0; i < 120 && !photographed; i += 1) {
        const hit = await readFlare();
        if (!hit) {
          await delay(20);
          continue;
        }
        seen = hit;
        await shot(`sprites-flare-${slug}-close`, { x: 725, y: 320, width: 160, height: 160 });
        photographed = (await readFlare()) !== null;
      }
      // The crop box is fixed because the tank does not move in this section —
      // no movement key is held — so it sits at the same screen point at every
      // angle; if that changes, the crop slides off the tank and the miss is
      // obvious rather than subtle.
      await shot(`sprites-flare-${slug}`);
      await page.mouse.up();
      if (!seen) {
        console.log(`[sprites] flare ${weapon} ${label}: none observed`);
        continue;
      }
      if (!photographed) {
        // Said out loud rather than left for a reader to infer from a frame
        // that looks like a bare tank: the numbers below are real, the crop is
        // not evidence for this angle.
        console.log(`[sprites] flare ${weapon} ${label}: measured, but no frame caught it`);
      }
      const dist = Math.hypot(seen.flare.dx, seen.flare.dy);
      const bearing = (Math.atan2(seen.flare.dy, seen.flare.dx) * 180) / Math.PI;
      console.log(
        `[sprites] flare ${weapon.padEnd(17)} ${label.padEnd(5)}: turret ${String(seen.turret).padStart(4)}deg` +
          ` · offset (${seen.flare.dx},${seen.flare.dy})` +
          ` dist ${dist.toFixed(1)} bearing ${bearing.toFixed(0)}deg` +
          ` · flare rot ${seen.flare.rotationDeg}deg · anchor x ${seen.flare.originX}` +
          ` · ${seen.flare.type}`,
      );
    }
  };

  // `secondary=Shield` because the default is Mine, and the shield is one of
  // the two sprites this run exists to check.
  await page.goto(`${URL}?primary=Cannon&secondary=Shield&flarehold=40`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /level select/i }).first().click();
  await delay(800);
  // 1-5 is a Flag level, so the flag item is on the field.
  const cell = page.getByRole('button', { name: /^World 1, level 5,/i });
  if ((await cell.count()) === 0) {
    console.log('[sprites] no dev jump cell for 1-5');
  } else {
    await cell.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => {});

    // Satisfy the tutorial gate so the level actually runs.
    await page.keyboard.down('d');
    await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
    await page.mouse.down();
    await delay(700);
    await page.mouse.up();
    await page.keyboard.up('d');

    // ── The flag ──────────────────────────────────────────────────────────
    // Flags are placed over time, so wait for one rather than shooting a frame
    // that says "0 on screen" and calling it evidence.
    let flag = null;
    for (let i = 0; i < 200 && !flag; i += 1) {
      flag = await page.evaluate(() => globalThis.__arena?.flag ?? null);
      if (!flag) await delay(50);
    }
    await shot('sprites-flag');
    console.log(
      flag
        ? `[sprites] flag: texture ${flag.texture} · tinted ${flag.tinted} · width ${flag.width}`
        : '[sprites] flag: none placed within the window',
    );

    // ── The spawn warning ─────────────────────────────────────────────────
    // Warnings appear shortly before each enemy, so this waits for one rather
    // than shooting whatever is on screen.
    let warn = null;
    for (let i = 0; i < 200 && !warn; i += 1) {
      warn = await page.evaluate(() => globalThis.__arena?.warning ?? null);
      if (!warn) await delay(50);
    }
    await shot('sprites-warning');
    console.log(
      warn
        ? `[sprites] warning: texture ${warn.texture} · tinted ${warn.tinted} · width ${warn.width}`
        : '[sprites] warning: none observed',
    );

    // ── The shield, including its 1 -> 4 intro ────────────────────────────
    // Raised with the secondary. `PartGameArea.as:1027` plays 1 -> 4 and
    // `:1033-1035` holds on 4, so the frames are sampled fast enough to catch
    // the intro rather than only its resting state.
    // **Held, not tapped.** `keyboard.press` is down+up in ~10ms and input
    // flags are read once per frame, so the whole press can fall between two
    // frames — the trap CLAUDE.md names, and it read as "shield never raised".
    await page.keyboard.down('Space');
    // **Sampled from the press, not after it.** The intro is 4 frames at 30fps
    // — 133ms — so a sampler that starts after a 200ms hold sees only the
    // resting frame and reports "1 distinct frame" about a working animation.
    const frames = [];
    for (let i = 0; i < 60; i += 1) {
      const s = await page.evaluate(() => globalThis.__arena?.shield ?? null);
      if (s && !frames.some((f) => f.texture === s.texture)) frames.push(s);
      if (i === 8) await shot('sprites-shield');
      if (i === 12) await page.keyboard.up('Space');
      await delay(10);
    }
    if (frames.length === 0) console.log('[sprites] shield: never raised');
    else {
      console.log(
        `[sprites] shield: ${frames.length} distinct frame(s) — ` +
          frames.map((f) => f.texture).join(' -> ') +
          ` · tinted ${frames[0].tinted} · width ${frames[0].width}`,
      );
    }

    await flaresFor('Cannon');
  }

  // The second weapon, and the reason there is a second: a per-weapon read and
  // a shared constant are the same number on any one weapon. The Gummy Bear's
  // barrel reaches 11.3 where the Cannon's reaches 10.5.
  if (await enterLevelFive('Gummy Bear Cannon')) await flaresFor('Gummy Bear Cannon');

  // The long barrel, turret only. 17.9 against everything else's 10.5 — and the
  // AS3's flare chain omits the Magic Cannon entirely, so there is no flare to
  // photograph here and the turret's drawn geometry is the claim instead.
  if (await enterLevelFive('Magic Cannon')) {
    const magic = await page.evaluate(() => globalThis.__arena?.tank?.turret ?? null);
    await shot('sprites-turret-MagicCannon-close', { x: 725, y: 320, width: 160, height: 160 });
    console.log(
      magic
        ? `[sprites] turret ${'Magic Cannon'.padEnd(17)}: texture ${magic.texture} · ` +
            `drawn ${magic.width}x${magic.height} · origin ${magic.originX},${magic.originY}`
        : '[sprites] turret Magic Cannon: no arena projection',
    );
  }

  {
    // ── Enemy bullets, across the six shooting types ──────────────────────
    // Each type belongs to particular enemies, so this drives the isolated dev
    // levels from the Enemies screen — a mixed arena cannot guarantee any given
    // shooter turns up in a short window, which is the same reason
    // `--sound-sweep` uses them.
    // `shootType` splits by **rank**: `Basic`/`Following` on the normal variant
    // and `BasicBoss`/`FollowingBoss` on the boss one, so the four dev levels
    // below reach only four of the six. The two Boss types are driven from real
    // Boss levels afterwards — 1-27 has a `Shooting` boss and 9-9 a `Soldier`.
    const seenBullets = new Map();
    for (const type of ['Shooting', 'Soldier', 'Trap', 'GrapplingHook']) {
      await page.goto(`${URL}?primary=Cannon`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
      await page.getByRole('button', { name: /enemy behaviour/i }).click();
      await delay(700);
      const row = page.locator('li', { hasText: type }).first();
      const test = row.getByRole('button', { name: /test/i });
      if ((await test.count()) === 0) {
        console.log(`[sprites] no Test button for ${type}`);
        continue;
      }
      await test.first().click();
      await page
        .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
        .catch(() => {});
      // Satisfy the tutorial spawn gate, then stand still and let them shoot.
      await page.keyboard.down('d');
      await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
      await page.mouse.down();
      await delay(700);
      await page.mouse.up();
      await page.keyboard.up('d');

      for (let i = 0; i < 240; i += 1) {
        const rows = await page.evaluate(() => globalThis.__arena?.enemyBullets ?? []);
        for (const b of rows) {
          if (b.shootType && !seenBullets.has(`${b.shootType}:${b.reflected}`)) {
            seenBullets.set(`${b.shootType}:${b.reflected}`, b);
          }
        }
        if (i === 120) await shot(`sprites-bullets-${type}`);
        await delay(25);
      }
    }
    // The two Boss-rank shootTypes, from levels whose boss row shoots.
    for (const [bw, bl, who] of [
      [1, 27, 'Shooting boss -> BasicBoss'],
      [9, 9, 'Soldier boss -> FollowingBoss'],
    ]) {
      await page.goto(`${URL}?primary=Cannon`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
      await page.getByRole('button', { name: /level select/i }).first().click();
      await delay(800);
      if (bw !== 1) {
        await page.locator(`.dev-jump__world:text-is("${bw}")`).first().click();
        await delay(300);
      }
      const bcell = page.getByRole('button', { name: new RegExp(`^World ${bw}, level ${bl},`, 'i') });
      if ((await bcell.count()) === 0) {
        console.log(`[sprites] no dev cell for ${bw}-${bl} (${who})`);
        continue;
      }
      await bcell.first().click();
      await page
        .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
        .catch(() => {});
      await page.keyboard.down('d');
      await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
      await page.mouse.down();
      await delay(700);
      await page.mouse.up();
      await page.keyboard.up('d');
      for (let i = 0; i < 400; i += 1) {
        const rows = await page.evaluate(() => globalThis.__arena?.enemyBullets ?? []);
        for (const b of rows) {
          if (b.shootType && !seenBullets.has(`${b.shootType}:${b.reflected}`)) {
            seenBullets.set(`${b.shootType}:${b.reflected}`, b);
          }
        }
        await delay(25);
      }
    }

    if (seenBullets.size === 0) console.log('[sprites] enemy bullets: none observed');
    for (const [, b] of [...seenBullets.entries()].sort()) {
      console.log(
        `[sprites] bullet ${String(b.shootType).padEnd(14)}` +
          ` texture ${String(b.texture).padEnd(10)}` +
          ` tinted ${String(b.tinted).padEnd(5)}` +
          ` rot ${String(b.rotationDeg).padStart(4)}deg` +
          ` reflected ${b.reflected}`,
      );
    }
    const distinct = new Set([...seenBullets.values()].map((b) => b.texture));
    console.log(
      `[sprites] enemy bullets: ${seenBullets.size} state(s) seen, ${distinct.size} distinct texture(s)`,
    );
  }
}

if (args.turret) {
  /**
   * The equipped weapon on the tank **during the countdown** — T115.
   *
   * ── Measured, not only photographed ──────────────────────────────────────
   * The turret is a scene sibling rather than a child of the tank, so "is it on
   * the tank" has a numeric answer: the distance between the two world points.
   * Before the fix that distance was the whole spawn offset — the body at the
   * spawn point, the turret at the world origin — which a small screenshot of a
   * small tank does not reliably show. The frame is corroboration; the distance
   * and the texture key are the evidence.
   *
   * Two weapons, because a turret that is right for one and hardcoded would
   * pass a single-weapon run. The texture key is asserted to differ between
   * them, so "it drew a turret" cannot stand in for "it drew *this* weapon".
   */
  for (const weapon of ['Cannon', 'Laser Cannon']) {
    await page.goto(`${URL}?primary=${encodeURIComponent(weapon)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(800);
    const cell = page.getByRole('button', { name: /^World 1, level 4,/i });
    if ((await cell.count()) === 0) {
      console.log('[turret] no dev jump cell for 1-4');
      break;
    }
    await cell.first().click();

    // **Sample while the countdown is still running.** Waiting on
    // `countDownDone` would measure exactly the state that was never broken.
    let during = null;
    for (let i = 0; i < 120; i += 1) {
      const s = await page.evaluate(() => {
        const a = globalThis.__arena;
        if (!a?.tank?.turret) return null;
        return { done: a.countDownDone, tank: a.tank.world, turret: a.tank.turret };
      });
      if (s && !s.done) {
        during = s;
        break;
      }
      if (s?.done) break;
      await delay(25);
    }

    if (!during) {
      console.log(`[turret] ${weapon}: never sampled a pre-countdown frame`);
      continue;
    }
    const dx = during.turret.x - during.tank.x;
    const dy = during.turret.y - during.tank.y;
    const gap = Math.hypot(dx, dy);
    console.log(
      `[turret] ${weapon.padEnd(12)} DURING countdown:` +
        ` tank (${during.tank.x},${during.tank.y})` +
        ` turret (${during.turret.x},${during.turret.y})` +
        ` gap ${gap.toFixed(1)}` +
        ` · texture ${during.turret.texture} · visible ${during.turret.visible}`,
    );
    await shot(`turret-countdown-${weapon.replace(/\s+/g, '-')}`);

    // And after GO!, to show the fix did not change gameplay behaviour.
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => {});
    const after = await page.evaluate(() => {
      const a = globalThis.__arena;
      return { tank: a.tank.world, turret: a.tank.turret };
    });
    const gapAfter = Math.hypot(after.turret.x - after.tank.x, after.turret.y - after.tank.y);
    console.log(
      `[turret] ${weapon.padEnd(12)} after GO!      :` +
        ` gap ${gapAfter.toFixed(1)} · texture ${after.turret.texture}`,
    );
  }
}

if (args.hits) {
  /**
   * Enemy appearance across repeated hits — the T114 defect.
   *
   * ── Why not a screenshot ─────────────────────────────────────────────────
   * The symptom is a *multiply* applied to the artwork. Against nine world
   * themes, "slightly darker than it should be" is not reliably readable from a
   * frame, and the enemy is often mid-explosion when the frame lands. The
   * observable is the sprite's own tint and alpha, sampled per enemy per frame.
   *
   * Reports, per enemy that was hit at least once:
   *   settled  — tint back to none within the flash window after its last hit
   *   stuck    — still tinted well after the flash should have ended
   *   alpha    — the minimum seen, to catch an opacity change as well
   *
   * `stuck` is the number the bug moved: before the fix every hit enemy came to
   * rest tinted, because the reset restored `baseTint` instead of clearing.
   */
  // **The weakest primary on purpose.** With a Laser Cannon the enemies died
  // in the same frame they were hit, so the flash and the corpse both landed
  // between two 25ms samples and the run reported a clean `0 were hit`.
  await page.goto(`${URL}?primary=Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /level select/i }).first().click();
  await delay(900);
  // **The level-select dev jump, not the Enemies screen's Test button.** That
  // route launched a dev level which reported "30 left" and spawned nothing for
  // an entire 400-sample run, so the sampler measured an empty arena and
  // reported a clean "0 were hit". 1-4 is the level `--walls` already drives.
  const test = page.getByRole('button', { name: /^World 1, level 9,/i });
  if ((await test.count()) === 0) {
    console.log('[hits] no dev jump cell for 1-9');
  } else {
    await test.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[hits] countdown never reported done'));

    await page.keyboard.down('d');
    await page.locator('canvas').hover({ position: { x: 700, y: 400 } });
    await page.mouse.down();
    await delay(600);
    await page.keyboard.up('d');

    // Track per enemy: was it ever tinted, and is it tinted long after.
    const seen = new Map();
    let samples = 0;
    for (let i = 0; i < 900; i += 1) {
      const arena = await page.evaluate(() => {
        const a = globalThis.__arena;
        return (a?.enemies ?? []).map((e) => ({
          id: e.id,
          tint: e.tint,
          alpha: e.alpha,
          hp: e.health,
          type: e.enemyType,
          screen: e.screen,
        }));
      });
      samples += 1;
      if (i === 40 || i === 120) {
        const st = await page.evaluate(() => ({
          n: (globalThis.__arena?.enemies ?? []).length,
          hp: globalThis.document.querySelector(".hud-health__text")?.textContent ?? "?",
          over: globalThis.document.querySelector(".level-outcome__actions") !== null,
          left: globalThis.document.querySelector(".hud-stat--right")?.textContent ?? "?",
        }));
        console.log(`[hits] probe i=${i}: ` + JSON.stringify(st));
      }
      for (const e of arena) {
        if (e.id === undefined) continue;
        const prev = seen.get(e.id) ?? {
          everTinted: false,
          tintedSamples: 0,
          sinceTint: Infinity,
          minAlpha: 1,
          stuck: false,
        };
        if (e.tint !== null && e.tint !== undefined) {
          prev.everTinted = true;
          prev.tintedSamples += 1;
          prev.run = (prev.run ?? 0) + 1;
          prev.maxRun = Math.max(prev.maxRun ?? 0, prev.run);
          prev.sinceTint = 0;
          prev.lastTint = e.tint;
        } else {
          prev.sinceTint += 1;
          prev.run = 0;
        }
        // **Consecutive, not cumulative.** The first version counted every
        // tinted sample, so an enemy under continuous fire — legitimately
        // re-flashed over and over — was reported as stuck, and the run said
        // "1 left tinted" about a working build. The flash is 80ms and a sample
        // is ~25ms, so an unbroken run past ~10 samples (250ms) is a tint that
        // is not being cleared.
        if ((prev.maxRun ?? 0) > 10) prev.stuck = true;
        prev.minAlpha = Math.min(prev.minAlpha, e.alpha ?? 1);
        prev.type = e.type;
        seen.set(e.id, prev);
      }
      // **Aim at a live enemy, not at a screen constant.** The first version
      // orbited (640, 400) — the viewport centre — and landed zero hits in 400
      // samples while reporting a clean "0 left tinted". That is `L8` exactly:
      // the harness aims where the tank used to be and the number looks fine.
      // Cycled so the fire spreads across enemies rather than deleting one.
      const target = arena[i % Math.max(1, arena.length)]?.screen;
      if (target) await page.mouse.move(target.x, target.y);
      await delay(25);
    }
    await page.mouse.up();

    const hit = [...seen.values()].filter((e) => e.everTinted);
    const stuck = hit.filter((e) => e.stuck);
    const dimmed = hit.filter((e) => e.minAlpha < 0.99);
    console.log(
      `[hits] ${samples} samples · ${seen.size} enemies seen · ${hit.length} were hit` +
        ` · ${stuck.length} left tinted · ${dimmed.length} dropped below full alpha`,
    );
    const worst = hit.sort((a, b) => b.tintedSamples - a.tintedSamples).slice(0, 5);
    for (const e of worst) {
      console.log(
        `[hits]   ${String(e.type).padEnd(8)} tinted ${String(e.tintedSamples).padStart(3)} samples, longest run ${String(e.maxRun ?? 0).padStart(3)}` +
          ` samples · min alpha ${e.minAlpha.toFixed(2)}` +
          ` · last tint ${e.lastTint === undefined ? 'n/a' : '0x' + e.lastTint.toString(16)}`,
      );
    }
    await shot('hits-after');
  }
}

if (args.transitions) {
  /**
   * Repeat level entries — does a scene-entry hitch recur, or is it one-time?
   *
   * `--frames` established that every long frame lands in the first ~2s of a
   * session at zero enemies. That leaves two very different explanations, and
   * they need different fixes:
   *
   *   one-time     — module loading, asset decode, texture upload. Costs once,
   *                  and a re-entry is clean.
   *   per-entry    — work redone on every scene start. Costs every level change,
   *                  which is what "stutters when I switch levels" describes.
   *
   * So this enters the **same** level several times and reports the long frames
   * inside a window after each entry, keyed by entry number. Entry 1 alone
   * cannot tell the two apart; entries 2..n are the measurement.
   *
   * Works against a production build too via `LOOK_URL`, because the exit route
   * is the HUD's own **Menu** button (`Hud.tsx:676-682`, `ui:goto MainMenu`)
   * rather than a dev-only affordance.
   */
  const ENTRIES = 4;
  const WINDOW_MS = 2500;
  const levels = (args.transitionsLevels ?? '1-4,1-9').split(',');

  await page.addInitScript(() => {
    const w = globalThis;
    w.__frameLog = { deltas: [], at: [], marks: [], t0: 0 };
    w.__frameLog.t0 = globalThis.performance.now();
    let last = 0;
    const tick = (t) => {
      if (last > 0) {
        w.__frameLog.deltas.push(t - last);
        w.__frameLog.at.push(t - w.__frameLog.t0);
      }
      last = t;
      w.__frameLog.raf = globalThis.requestAnimationFrame(tick);
    };
    w.__frameLog.raf = globalThis.requestAnimationFrame(tick);
  });

  const mark = (labelText) =>
    page.evaluate((l) => {
      const w = globalThis;
      w.__frameLog.marks.push({ label: l, t: globalThis.performance.now() - w.__frameLog.t0 });
    }, labelText);

  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  for (const lv of levels) {
    const [lw, ll] = lv.split('-').map(Number);
    for (let entry = 1; entry <= ENTRIES; entry += 1) {
      // Wait for the menu to settle before reaching for its controls. Coming
      // back from a level via `ui:goto MainMenu` re-mounts the menu, and
      // "Level select" is not present for a moment after the scene swap.
      await page
        .getByRole('button', { name: /play|continue/i })
        .first()
        .waitFor({ timeout: 20_000 })
        .catch(() => {});
      const ls = page.getByRole('button', { name: /level select/i }).first();
      if ((await ls.count()) === 0) {
        // Report the actual menu state rather than timing out blind. Returning
        // from a level re-mounts the menu and the reachable controls differ.
        const buttons = await page.getByRole('button').allTextContents();
        console.log(`[trans] ${lv}#${entry}: no "level select" — buttons: ${buttons.join(' | ')}`);
        break;
      }
      await ls.click({ force: true });
      await delay(700);
      if (lw !== 1) {
        await page.locator(`.dev-jump__world:text-is("${lw}")`).first().click();
        await delay(250);
      }
      // The dev jump's cells are `World W, level N, <mode>`; the **real** grid's
      // are `Level N, ...` (`LevelSelectScreen.tsx:96` vs the grid's own label).
      // A production build has no dev jump, so fall back to the real grid —
      // which in a fresh profile means level 1 only, and that is enough to ask
      // whether a transition hitches.
      let cell = page.getByRole('button', { name: new RegExp(`^World ${lw}, level ${ll},`, 'i') });
      if ((await cell.count()) === 0) {
        // Production has no dev jump, and `LevelSelectScene` opens on the
        // **world picker** (`selectedWorld = 0` is the picker, not a world), so
        // the world has to be chosen before any level cell exists. The dev jump
        // sidesteps both, which is why this is only needed here.
        const worldCell = page.getByRole('button', {
          name: new RegExp(`^World ${lw}, .*level \\d+ of`, 'i'),
        });
        if ((await worldCell.count()) > 0) {
          await worldCell.first().click();
          await delay(500);
        }
        cell = page.getByRole('button', { name: new RegExp(`^Level ${ll},`, 'i') });
      }
      if ((await cell.count()) === 0) {
        console.log(`[trans] no cell for ${lv} (dev jump absent, level locked?) — skipping`);
        break;
      }
      // Marked immediately before the click, so the window covers the whole
      // transition: teardown, create, first render.
      await mark(`${lv}#${entry}`);
      // Profile **one** transition rather than the whole run: aggregate samples
      // over a session are dominated by steady-state rendering and would bury
      // the thing being asked about.
      // **Off by default, because attaching it distorts what it measures.** The
      // profiled entry read max 217ms where the three unprofiled entries either
      // side of it read 33ms. That also invalidated an earlier dev-vs-production
      // boot comparison, which had a profiled dev run against an unprofiled
      // production one — 233ms vs 67ms, of which most of the gap was the
      // profiler. Opt in with `TRANS_PROFILE=1`, and do not compare a profiled
      // number with an unprofiled one.
      const profileThis = process.env.TRANS_PROFILE === '1' && lv === levels[0] && entry === 2;
      let cdp = null;
      if (profileThis) {
        cdp = await page.context().newCDPSession(page);
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
        await cdp.send('Profiler.start');
      }
      await cell.first().click();
      await delay(WINDOW_MS + 1500);
      if (cdp) {
        const { profile } = await cdp.send('Profiler.stop');
        const byId = new Map(profile.nodes.map((n) => [n.id, n]));
        const self = new Map();
        for (const id of profile.samples) {
          const n = byId.get(id);
          if (!n) continue;
          const f = n.callFrame;
          const key = `${f.functionName || '(anonymous)'} ${(f.url.split('/').pop() ?? '').split('?')[0]}:${f.lineNumber}`;
          self.set(key, (self.get(key) ?? 0) + 1);
        }
        const total = profile.samples.length;
        console.log(`[trans] CPU profile across ${lv} entry ${entry} — ${total} samples:`);
        for (const [k, n] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
          console.log(`[trans]     ${((n / total) * 100).toFixed(1)}% ${k}`);
        }
      }
      // Back to the menu via the HUD's own button, which exists in production.
      const menu = page.getByRole('button', { name: /^menu$/i });
      if ((await menu.count()) === 0) {
        console.log('[trans] no in-play Menu button found — cannot loop');
        break;
      }
      // **A DOM click, not a synthesised pointer event.** In dev the
      // diagnostics toggle (`DiagnosticsPanel.tsx`, dev-only — `:66` returns
      // null in production) sits over the HUD's Menu button and swallows its
      // pointer events. `force: true` only skips Playwright's actionability
      // check; the click still hit-tests to the topmost element, so the run
      // stayed in the level and the next iteration found the in-game HUD where
      // it expected a menu. Dispatching on the element bypasses hit-testing.
      await menu.first().evaluate((el) => el.click());
      await delay(900);
    }
  }

  const rows = await page.evaluate((win) => {
    const w = globalThis;
    globalThis.cancelAnimationFrame(w.__frameLog.raf);
    const d = w.__frameLog.deltas;
    const at = w.__frameLog.at;
    return w.__frameLog.marks.map((m) => {
      const inWin = [];
      for (let i = 0; i < d.length; i += 1) {
        if (at[i] >= m.t && at[i] < m.t + win) inWin.push(d[i]);
      }
      const long = inWin.filter((x) => x > 33);
      return {
        label: m.label,
        frames: inWin.length,
        over33: long.length,
        over50: inWin.filter((x) => x > 50).length,
        max: inWin.length > 0 ? Math.max(...inWin) : 0,
        lost: long.reduce((a, b) => a + (b - 16.7), 0),
      };
    });
  }, WINDOW_MS);

  // Boot phase: everything before the first level entry. Reported from the same
  // unprofiled run as the transitions, so dev and production are comparable.
  const boot = await page.evaluate(() => {
    const w = globalThis;
    const d = w.__frameLog.deltas;
    const at = w.__frameLog.at;
    const firstMark = w.__frameLog.marks[0]?.t ?? Infinity;
    const before = d.filter((_, i) => at[i] < firstMark);
    const long = before.filter((x) => x > 33);
    return {
      frames: before.length,
      over33: long.length,
      over50: before.filter((x) => x > 50).length,
      max: before.length > 0 ? Math.max(...before) : 0,
      lost: long.reduce((a, b) => a + (b - 16.7), 0),
    };
  });
  console.log(
    `[trans] BOOT (page load -> first entry): ${boot.frames} frames` +
      ` · >33ms ${boot.over33} · >50ms ${boot.over50} · max ${boot.max.toFixed(0)}ms` +
      ` · time lost ${boot.lost.toFixed(0)}ms`,
  );
  console.log(`[trans] ${WINDOW_MS}ms window after each entry · server ${URL}`);
  for (const r of rows) {
    console.log(
      `[trans]   ${r.label.padEnd(8)} frames ${String(r.frames).padStart(3)}` +
        ` · >33ms ${String(r.over33).padStart(2)} · >50ms ${String(r.over50).padStart(2)}` +
        ` · max ${r.max.toFixed(0).padStart(3)}ms · time lost ${r.lost.toFixed(0)}ms`,
    );
  }
}

if (args.frames) {
  /**
   * Frame-timing profile — for the intermittent-stutter report.
   *
   * ── Why rAF deltas and not "it feels laggy" ──────────────────────────────
   * A stutter is a *distribution* problem: the mean can be a healthy 16.7ms
   * while one frame in two hundred takes 120ms, and that is what a player
   * notices. So this records every frame delta in the page and reports
   * percentiles and the long-frame counts, never an average alone.
   *
   * Sampled inside the page rather than by polling from the harness, because a
   * Playwright `evaluate` round trip is itself milliseconds and would be
   * measuring the harness.
   *
   * Enemy count is sampled alongside on each frame so a spike can be correlated
   * with load rather than assumed to be caused by it.
   */
  const target = args.framesLevel ?? '1-4';
  const SECONDS = Number(process.env.FRAMES_SECONDS ?? 30);

  await page.addInitScript(() => {
    const w = globalThis;
    w.__frameLog = { deltas: [], enemies: [], heap: [], at: [], t0: 0 };
    w.__frameLog.t0 = globalThis.performance.now();
    let last = 0;
    let lastHeap = 0;
    const tick = (t) => {
      if (last > 0) {
        w.__frameLog.deltas.push(t - last);
        w.__frameLog.enemies.push((w.__arena?.enemies ?? []).length);
        w.__frameLog.at.push(t - w.__frameLog.t0);
      }
      const mem = globalThis.performance?.memory;
      if (mem && t - lastHeap > 1000) {
        lastHeap = t;
        w.__frameLog.heap.push(Math.round(mem.usedJSHeapSize / 1048576));
      }
      last = t;
      w.__frameLog.raf = globalThis.requestAnimationFrame(tick);
    };
    w.__frameLog.raf = globalThis.requestAnimationFrame(tick);
  });

  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });

  let entered = false;
  let label = target;
  if (target.startsWith('dev:')) {
    // The Enemies screen's Test button — **30 of one type at once**, which is
    // the only reliable way to get a loaded arena. Ordinary levels spawn on a
    // ~3s interval, so a 30s profile on 1-9 saw a mean of 1.4 enemies: a
    // measurement of an empty scene, and useless for a load question.
    const type = target.slice(4);
    await page.getByRole('button', { name: /enemy behaviour/i }).click();
    await delay(900);
    const row = page.locator('li', { hasText: type }).first();
    const test = row.getByRole('button', { name: /test/i });
    if ((await test.count()) === 0) console.log(`[frames] no Test button for ${type}`);
    else {
      await test.click();
      entered = true;
      label = `dev ${type} x30`;
    }
  } else {
    const [fw, fl] = target.split('-').map(Number);
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(900);
    if (fw !== 1) {
      await page.locator(`.dev-jump__world:text-is("${fw}")`).first().click();
      await delay(300);
    }
    const cell = page.getByRole('button', { name: new RegExp(`^World ${fw}, level ${fl},`, 'i') });
    if ((await cell.count()) === 0) console.log(`[frames] dev jump cell for ${target} not found`);
    else {
      await cell.first().click();
      entered = true;
    }
  }

  if (entered) {
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[frames] warning: countdown never reported done'));

    // Satisfy the tutorial spawn gate, or the profile measures an empty arena.
    await page.keyboard.down('d');
    await page.locator('canvas').hover({ position: { x: 700, y: 400 } });
    await page.mouse.down();
    await delay(700);
    await page.mouse.up();
    await page.keyboard.up('d');

    // Installed at page load via `addInitScript` (below), not here, so the log
    // covers **boot, the menu and the level transition** as well as play. A
    // recorder started after entry cannot see an entry hitch, which is exactly
    // the shape "occasional freeze" takes.
    await page.evaluate(() => {
      const w = globalThis;
      if (w.__frameLog) return;
      w.__frameLog = { deltas: [], enemies: [], heap: [], at: [], t0: 0 };
      w.__frameLog.t0 = globalThis.performance.now();
      let last = 0;
      let lastHeap = 0;
      const tick = (t) => {
        if (last > 0) {
          w.__frameLog.deltas.push(t - last);
          w.__frameLog.enemies.push((w.__arena?.enemies ?? []).length);
          w.__frameLog.at.push(t - w.__frameLog.t0);
        }
        // Heap once a second. A sawtooth here with long frames at the drops is
        // the signature of GC pauses from per-frame allocation — the specific
        // hypothesis about `{ skipBottom }` and the debug projection's
        // per-enemy object churn. Chromium-only, and absent under some flags,
        // so its absence is reported rather than assumed to mean zero.
        const mem = globalThis.performance?.memory;
        if (mem && t - lastHeap > 1000) {
          lastHeap = t;
          w.__frameLog.heap.push(Math.round(mem.usedJSHeapSize / 1048576));
        }
        last = t;
        w.__frameLog.raf = globalThis.requestAnimationFrame(tick);
      };
      w.__frameLog.raf = globalThis.requestAnimationFrame(tick);
    });

    // **A CPU profile, because rAF deltas have a ceiling.** At a steady 16.7ms
    // the game is vsync-bound: a 2ms update and a 6ms update both present at
    // 16.7ms, so frame deltas can prove "no stutter here" and can say nothing
    // about how much headroom a change consumed. Function self-time can.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');

    // **Kite without firing**, so enemies accumulate and the profile covers a
    // loaded arena. Firing with the dev jump's fully-upgraded loadout kept the
    // arena at a mean of 2.3 enemies — a measurement of an empty scene, which
    // is exactly the load the report is about.
    let held = 'd';
    await page.keyboard.down(held);
    for (let t = 0; t < SECONDS * 1000; t += 2000) {
      await delay(2000);
      await page.keyboard.up(held);
      held = held === 'd' ? 'a' : 'd';
      await page.keyboard.down(held);
    }
    await page.keyboard.up(held);

    const { profile } = await cdp.send('Profiler.stop');
    // Self time per function: sum the samples that landed directly in it.
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const total = profile.samples.length;
    for (const id of profile.samples) {
      const n = byId.get(id);
      if (!n) continue;
      const f = n.callFrame;
      const name = `${f.functionName || '(anonymous)'} ${f.url.split('/').pop() ?? ''}:${f.lineNumber}`;
      self.set(name, (self.get(name) ?? 0) + 1);
    }
    const top = [...self.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([name, n]) => `${((n / total) * 100).toFixed(1)}% ${name}`);
    console.log(`[frames] CPU profile — ${total} samples, top self time:`);
    for (const line of top) console.log(`[frames]     ${line}`);

    const report = await page.evaluate(() => {
      const w = globalThis;
      globalThis.cancelAnimationFrame(w.__frameLog.raf);
      const d = w.__frameLog.deltas.slice();
      const e = w.__frameLog.enemies.slice();
      const sorted = d.slice().sort((a, b) => a - b);
      const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
      const over = (ms) => d.filter((x) => x > ms).length;
      // Enemy count at the moment of each long frame, so "spikes happen when
      // the arena is busy" is a measurement and not an assumption.
      const longIdx = d.map((x, i) => [x, i]).filter(([x]) => x > 50);
      return {
        frames: d.length,
        mean: d.reduce((a, b) => a + b, 0) / Math.max(1, d.length),
        p50: pct(50),
        p95: pct(95),
        p99: pct(99),
        max: Math.max(...d),
        over33: over(33),
        over50: over(50),
        over100: over(100),
        maxEnemies: Math.max(0, ...e),
        meanEnemies: e.reduce((a, b) => a + b, 0) / Math.max(1, e.length),
        // Elapsed seconds as well as enemy count, so a cluster of long frames
        // early in the run (a level-entry hitch) is distinguishable from ones
        // spread through steady play (a per-frame cost).
        longFrames: longIdx
          .slice(0, 10)
          .map(([x, i]) => `${x.toFixed(0)}ms@t=${(w.__frameLog.at[i] / 1000).toFixed(1)}s,n=${e[i]}`),
        heap: w.__frameLog.heap.slice(),
      };
    });

    const r = report;
    console.log(
      `[frames] ${label} over ${SECONDS}s: ${r.frames} frames` +
        ` · mean ${r.mean.toFixed(1)}ms · p50 ${r.p50.toFixed(1)}` +
        ` · p95 ${r.p95.toFixed(1)} · p99 ${r.p99.toFixed(1)} · max ${r.max.toFixed(0)}`,
    );
    console.log(
      `[frames]   long frames: >33ms ${r.over33}, >50ms ${r.over50}, >100ms ${r.over100}` +
        ` · enemies mean ${r.meanEnemies.toFixed(1)} max ${r.maxEnemies}`,
    );
    if (r.heap.length > 1) {
      const h = r.heap;
      console.log(
        `[frames]   heap MB: start ${h[0]} end ${h[h.length - 1]} min ${Math.min(...h)} max ${Math.max(...h)}` +
          ` · ${h.join(">")}`,
      );
    } else {
      console.log("[frames]   heap: performance.memory unavailable — not measured");
    }
    if (r.longFrames.length > 0) console.log(`[frames]   worst: ${r.longFrames.join(', ')}`);
  }
}

if (args.walls) {
  /**
   * Enemy wall collision — `PartGameArea.as:5370-5513`.
   *
   * ── Why this measures rather than photographs ────────────────────────────
   * A frame of an enemy touching a wall cannot tell a bounce from a slide from
   * a jitter: all three put a sprite against an edge. What separates them is
   * what the *heading* does over consecutive samples, so this tracks each
   * enemy's world position and rotation and classifies every wall contact:
   *
   *   turned  — rotation changed materially at the wall (a bounce, or a boss's
   *             one-degree turn)
   *   stuck   — the enemy was still on the same wall N samples later
   *
   * "stuck" is the number that matters. The pre-T112 behaviour — clamp and
   * zero, heading left pointing into the wall — produces a high stuck count and
   * a low turned count, and a *re-mirror* bug (dropping the pointing-into-the
   * -wall guard) produces a high turned count with the enemy never leaving.
   * Either failure is invisible in a screenshot and obvious here.
   *
   * Bosses are reported separately, because they are supposed to grind along
   * the wall while turning (`:5516-5530`) — a boss "stuck" for a few samples is
   * correct, and counting it with the others would hide a real defect.
   */
  // Sampled near the game's own frame rate. At 80ms — 2.4 frames at the SWF's
  // 30fps — most wall contacts fell *between* samples: a boss that demonstrably
  // reached a wall (closest approach 0) registered a single on-wall sample in
  // 220. A wall contact lasts a frame or three, so the sampler has to run at
  // roughly frame cadence to see them at all.
  const SAMPLES = 500;
  const SAMPLE_MS = 20;

  async function wallRun(label, world, level, shots) {
    await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(900);
    if (world !== 1) {
      await page.locator(`.dev-jump__world:text-is("${world}")`).first().click();
      await delay(300);
    }
    const cell = page.getByRole('button', {
      name: new RegExp(`^World ${world}, level ${level},`, 'i'),
    });
    if ((await cell.count()) === 0) {
      console.log(`[walls] ${label}: dev jump cell for ${world}-${level} not found`);
      return;
    }
    await cell.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[walls] warning: countdown never reported done'));

    // **Satisfy the tutorial spawn gate before sampling.** Every `page.goto`
    // gets a fresh profile, so `tutorialOn` defaults true and `:7153` holds
    // spawning until the player has both moved and fired. The first version of
    // this mode skipped it and reported a perfectly clean `0 contacts` on an
    // arena that never contained an enemy — the same clean-zero that cost `L3`
    // and `L8` a pass each. Held, not tapped: input flags are read once a frame.
    await page.keyboard.down('d');
    await page.locator('canvas').hover({ position: { x: 700, y: 400 } });
    await page.mouse.down();
    await delay(700);
    await page.mouse.up();

    // Jam the tank into the bottom-right corner and **hold it there for the
    // whole run**, so pursuers converge on a corner and must ride two walls to
    // reach it. Released after sampling.
    //
    // The first version let go after 1.5s and the tank drifted back toward the
    // middle: non-boss contacts were 1-3 per run and **bosses reached a wall
    // zero times**, which would have left the boss branch unverified in play
    // while the summary line still read like a pass.
    //
    // Enemies spawn *on* an edge, and a spawn is deliberately not counted (a
    // contact needs a prior off-wall sample to transition from), so everything
    // counted here is a real arrival.
    await page.keyboard.down('s');

    // Track per enemy across samples. Identity is by index into the live array,
    // which is stable enough between two samples 80ms apart for this purpose —
    // and a mis-pairing shows up as noise in `turned`, never as a false "stuck".
    const seen = new Map();
    // **Per-sample rotation delta while on a wall**, not transition counting.
    //
    // Counting off-wall -> on-wall transitions failed on the case that matters:
    // a boss spawns at a room edge and chases a cornered tank, so it goes wall
    // to wall and never transitions. It read `0 contacts` while sitting at a
    // wall for 152 consecutive samples.
    //
    // What separates the two behaviours is the *size* of the heading change
    // while against a wall. A reflection mirrors by tens of degrees in a single
    // frame; a boss's `:5525-5529` turn is 1 deg/frame, so ~2-3 deg across an
    // 80ms sample. So:
    //
    //   big   (>30 deg in one sample) — a mirror. Non-bosses only.
    //   small (0.2-30)                — a gradual turn. Bosses, and steering.
    //   longestOnWall                 — consecutive samples pinned to a wall.
    const stats = {
      normal: { onWall: 0, big: 0, small: 0, maxDelta: 0, longestOnWall: 0 },
      boss: { onWall: 0, big: 0, small: 0, maxDelta: 0, longestOnWall: 0 },
    };
    const types = new Set();
    let shotsTaken = 0;
    // Boss presence, tracked separately from contacts. `types` records the
    // *species* — a boss on 1-9 is a `Basic` whose `enemyLevel` is `B` — so
    // "types=Basic,Fast" says nothing about whether a boss was on the field. I
    // misread exactly that once: zero boss contacts looked like "no boss
    // spawned" when it meant "the boss never reached a wall".
    let bossSamples = 0;
    let bossMinWallGap = Infinity;
    let bossWorst = 'n/a';
    let bossFramed = false;
    /** Frames queued by the detectors, drained outside the per-enemy scan. */
    const pending = [];

    for (let i = 0; i < SAMPLES; i += 1) {
      const frame = await page.evaluate(() => {
        const a = globalThis.__arena;
        if (!a?.room) return null;
        return {
          room: a.room,
          enemies: (a.enemies ?? []).map((e) => ({
            x: e.x,
            y: e.y,
            rotation: e.rotation,
            radius: e.radius,
            level: e.enemyLevel,
            type: e.enemyType,
            id: e.id,
          })),
        };
      });
      if (i === 0) {
        // Report what was actually read on the first sample. A silent `types=none`
        // is indistinguishable between "no room in the projection" and "no
        // enemies in the arena", and this project has twice shipped a harness
        // that measured an empty arena and reported a clean number (`L3`, `L8`).
        const probe = await page.evaluate(() => {
          const a = globalThis.__arena;
          return {
            hasArena: Boolean(a),
            keys: a ? Object.keys(a).join(',') : '-',
            room: a?.room ?? null,
            count: (a?.enemies ?? []).length,
            first: (a?.enemies ?? [])[0] ?? null,
            // Which level actually loaded. The first run of this mode reported
            // a room of 800x800 for 1-7, which `levelData.ts` says is 640x640 —
            // so the room size alone could not say whether the dev jump had
            // landed on the wrong cell or the room rule was wrong.
            hud: (globalThis.document.querySelector('.hud-stat--right')?.textContent ?? '')
              .replace(/\s+/g, ' ')
              .trim(),
          };
        });
        console.log(`[walls] ${label} probe: ${JSON.stringify(probe)}`);
      }
      if (!frame) {
        await delay(SAMPLE_MS);
        continue;
      }

      for (let k = 0; k < frame.enemies.length; k += 1) {
        const e = frame.enemies[k];
        if (e.x === undefined || e.radius === undefined) continue;
        types.add(e.type);
        const onWall =
          e.x <= e.radius + 1 ||
          e.x >= frame.room.width - e.radius - 1 ||
          e.y <= e.radius + 1 ||
          e.y >= frame.room.height - e.radius - 1;

        // **Stable id, not the array index.** The list is distance-sorted and
        // sliced, so an index refers to a different enemy from frame to frame.
        // Keying on it compared unrelated enemies: it reported 1-3 contacts a
        // run, and **0 for a boss that sat against a wall for 152 consecutive
        // samples** — a plausible number from a broken instrument.
        const key = `${e.id}`;
        const prev = seen.get(key);
        const bucket = e.level === 'B' ? stats.boss : stats.normal;

        if (e.level === 'B') {
          bossSamples += 1;
          const gap = Math.min(
            e.x - e.radius,
            frame.room.width - e.radius - e.x,
            e.y - e.radius,
            frame.room.height - e.radius - e.y,
          );
          if (gap < bossMinWallGap) {
            bossMinWallGap = gap;
            // A negative gap means the enemy is *outside* the clamp boundary,
            // which `clampToRoom` should make impossible. Recorded with its
            // operands so the cause is readable rather than guessed at.
            bossWorst = `x=${e.x.toFixed(0)} y=${e.y.toFixed(0)} r=${e.radius.toFixed(0)}` +
              ` room=${frame.room.width}x${frame.room.height} sample=${i}`;
          }
        }

        const streak = onWall ? (prev?.onWall ? prev.streak + 1 : 1) : 0;
        if (onWall) {
          bucket.onWall += 1;
          bucket.longestOnWall = Math.max(bucket.longestOnWall, streak);
          if (prev) {
            const delta = Math.abs(shortestDeg(prev.rotation, e.rotation));
            bucket.maxDelta = Math.max(bucket.maxDelta, delta);
            if (delta > 30) {
              bucket.big += 1;
              // **Frame the event, not the clock.** Timed frames on this mode
              // photographed an empty arena, because wall contacts are brief
              // and rare. Capturing on detection is the only way a frame is
              // evidence of the thing being measured.
              pending.push([`walls-${label}-mirror-${bucket.big}`, e]);
            } else if (delta > 0.2) bucket.small += 1;
          }
          if (e.level === 'B' && !bossFramed) {
            bossFramed = true;
            pending.push([`walls-${label}-boss-at-wall`, e]);
          }
        }
        seen.set(key, { onWall, rotation: e.rotation, streak });
      }

      // Drain frames queued by the detectors above, outside the per-enemy scan
      // so a screenshot never runs mid-sample. Each is logged with the operands
      // that triggered it, so the frame and the number it evidences are tied
      // together rather than left to be matched up by eye.
      while (pending.length > 0 && shotsTaken < shots + 4) {
        const [name, ev] = pending.shift();
        shotsTaken += 1;
        console.log(
          `[walls] frame ${name}: x=${ev.x.toFixed(0)} y=${ev.y.toFixed(0)}` +
            ` rot=${ev.rotation.toFixed(0)} level=${ev.level} type=${ev.type}`,
        );
        await shot(name);
      }
      await delay(SAMPLE_MS);
    }

    await page.keyboard.up('d');
    await page.keyboard.up('s');

    const fmt = (s) =>
      `${s.onWall} on-wall samples, ${s.big} mirrors, ${s.small} gradual turns,` +
      ` max ${s.maxDelta.toFixed(0)} deg, longest streak ${s.longestOnWall}`;
    console.log(`[walls] ${label} (${world}-${level}) types=${[...types].join(',') || 'none'}`);
    console.log(`[walls]   non-boss: ${fmt(stats.normal)}`);
    console.log(
      `[walls]   boss:     ${fmt(stats.boss)}` +
        ` · present in ${bossSamples} samples` +
        ` · closest approach to a wall ${
          bossMinWallGap === Infinity ? 'n/a' : bossMinWallGap.toFixed(0) + ` [${bossWorst}]`
        }`,
    );
  }

  /** Signed shortest angular difference in degrees. */
  function shortestDeg(from, to) {
    let d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // Modes verified against `levelData.ts` rather than guessed — the first two
  // picks here were wrong (1-3 and 1-5 are Flag, not Normal and Tower).
  //
  // 1-4 is Normal at 800x600. **Not 1-1**, whose tutorial holds spawning until
  // the player has moved and fired — that gate has silently emptied the arena
  // for two earlier harness modes (`L3`, `L8`).
  await wallRun('normal', 1, 4, 3);
  // 1-9, the first Boss level — bosses must turn, not bounce.
  await wallRun('boss', 1, 9, 2);
  // 1-7, Tower at 640x640. Flagged in scoping as worth confirming.
  await wallRun('tower', 1, 7, 2);
}

if (args.bossLife) {
  /**
   * The boss life indicator — `PartInterface.handleLifeIndicators` (`:872-995`).
   *
   * ── A screenshot alone cannot read a wipe ────────────────────────────────
   * The wedge is a *mask*, so the disc's own bounds never change: a broken
   * indicator that always draws a full circle, or never draws one, photographs
   * as a plausible red ring either way. What separates them is the boss's HP
   * fraction over time — so this samples `__arena` while the boss is being shot
   * and prints the health alongside the degrees the formula demands, then takes
   * a frame at each sample.
   *
   * Level 1-9 is the first Boss level. The dev jump reaches it directly, and
   * `equipped` gives enough damage to move a 500 HP boss inside one run.
   *
   * `--shrink` retargets at **3-9**, whose boss row is `Shrinking`. That is the
   * only type `enemyBodies.SHRINKS` carries, so it is the only one whose radius
   * — and therefore the disc's `setDisplaySize` — changes every frame. A
   * fixed-radius boss cannot expose a mask-sizing fault, which is why the
   * shrinking case is driven separately rather than assumed to be covered.
   */
  const bossWorld = args.shrink ? 3 : 1;
  const bossLevel = 9;
  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /level select/i }).first().click();
  await delay(900);
  if (bossWorld !== 1) {
    // The dev jump renders cells for the selected world only, so the world
    // button has to be pressed before the cell exists.
    await page.locator(`.dev-jump__world:text-is("${bossWorld}")`).first().click();
    await delay(300);
  }
  const cell19 = page.getByRole('button', {
    name: new RegExp(`^World ${bossWorld}, level ${bossLevel},`, 'i'),
  });
  if ((await cell19.count()) === 0) {
    console.log(`[boss] dev jump cell for ${bossWorld}-${bossLevel} not found`);
  } else {
    console.log(`[boss] level ${bossWorld}-${bossLevel}${args.shrink ? ' (Shrinking boss)' : ''}`);
    await cell19.first().click();
    // 3-9's two boss rows are `Shrinking` and `Trap`; pin the sampler to the
    // one this mode exists to watch so the series follows a single enemy.
    if (args.shrink) {
      await page.evaluate(() => {
        globalThis.__lookBossType = 'Shrinking';
      });
    }
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[look] warning: countdown never reported done'));
    await page.keyboard.down('d');
    await delay(500);
    await page.keyboard.up('d');
    await page.locator('canvas').hover({ position: { x: 800, y: 400 } });

    const bossState = () =>
      page.evaluate(() => {
        const a = globalThis.__arena;
        // **Track one named boss, not "a boss".** 3-9 carries *two* — a
        // `Shrinking` and a `Trap` — and the array is sorted by distance, so a
        // bare `find` returns whichever is closer and flips as the tank kites.
        // That read as a boss healing itself: 594 -> 654 -> 468 across three
        // samples. Selecting by lowest HP was no better, because it jumps to
        // the survivor the moment the tracked one dies (300 -> 534).
        const bosses = (a?.enemies ?? []).filter((e) => e.enemyLevel === 'B');
        const wanted = globalThis.__lookBossType;
        const boss = wanted
          ? bosses.find((e) => e.enemyType === wanted)
          : bosses.sort((p, q) => p.health - q.health)[0];
        if (!boss) return null;
        return {
          hp: boss.health,
          max: boss.maxHealth,
          // The disc is sized from this every frame, so a shrinking boss must
          // show it falling. Reported rather than inferred from the frame.
          radius: boss.radius,
          type: boss.enemyType,
          x: boss.screen?.x,
          y: boss.screen?.y,
        };
      });

    await page.mouse.down();
    let shots = 0;
    let lastBucket = -1;
    // **Keep moving.** A Boss level spawns indefinitely, and a stationary tank
    // is dead in ~16s — the first run of this ended at `tank=0/100` with only
    // two samples taken. Kiting is what buys enough of the wipe to see.
    // Kite *away from the boss*, re-chosen each half second from its screen
    // position. Oscillating a/d stayed in the same place and died just as
    // fast; the Laser Cannon out-ranges the boss, so distance is the whole
    // difference between two samples and five.
    let held = 'w';
    await page.keyboard.down(held);
    for (let i = 0; i < 900 && shots < 5; i += 1) {
      if (i % 6 === 0) {
        const b0 = await bossState();
        if (b0) {
          const dx = 640 - b0.x;
          const dy = 400 - b0.y;
          const want =
            Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : dy > 0 ? 's' : 'w';
          if (want !== held) {
            await page.keyboard.up(held);
            held = want;
            await page.keyboard.down(held);
          }
        }
      }
      const b = await bossState();
      if (b) {
        await page.mouse.move(b.x, b.y);
        const frac = b.hp / b.max;
        // Sample once per 20% band, so the frames span the wipe rather than
        // clustering wherever the loop happened to be.
        const bucket = Math.floor((1 - frac) * 5);
        if (bucket !== lastBucket && bucket >= 0) {
          lastBucket = bucket;
          shots += 1;
          const degrees = 360 * (1 - Math.min(1, Math.max(0, frac)));
          console.log(
            `[boss] ${b.type} hp ${String(b.hp).padStart(4)}/${b.max}` +
              ` = ${(frac * 100).toFixed(0).padStart(3)}%` +
              ` -> wipe ${degrees.toFixed(0).padStart(3)} deg` +
              ` · radius ${Number(b.radius).toFixed(1)}`,
          );
          await shot(`boss-life-${args.shrink ? 'shrink-' : ''}${shots}`);
        }
      }
      if (i % 60 === 0) {
        const diag = await page.evaluate(() => {
          const a = globalThis.__arena;
          const over = globalThis.document.querySelector('.level-outcome__actions') !== null;
          const hpEl = globalThis.document.querySelector('.hud-health__text');
          return {
            levels: (a?.enemies ?? []).map((e) => e.enemyLevel).join(',') || 'none',
            tank: hpEl ? hpEl.textContent : '?',
            over,
          };
        });
        console.log(
          `[boss]   i=${i} nearest=${diag.levels} tank=${diag.tank}` +
            (diag.over ? ' LEVEL ENDED' : ''),
        );
        if (diag.over) break;
      }
      await delay(90);
    }
    await page.mouse.up();
    await page.keyboard.up(held);
    console.log(
      shots > 1
        ? `[boss] ${shots} frames across the wipe — the wedge tracked HP`
        : '[boss] NOT ENOUGH SAMPLES: the boss never took measurable damage',
    );
  }

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.achievementIcon) {
  /**
   * The achievement reveal page's icon and its tooltip — `Achievement.as:103`,
   * the `onStatusScreen` branch.
   *
   * Needs a **real clear that earns an achievement**, which 1-1 does: clearing
   * it earns `TopGun` (upgrade 1 primary weapon to level 10) only if upgrades
   * were bought, but `Kills`/`Stars` thresholds and the first-clear
   * achievements fire on an ordinary win. The reveal pages open on the newest
   * page, so the achievement page is what the overlay shows first.
   *
   * Checked beyond a screenshot: the icon's layers must actually load (a clip
   * that resolved to nothing renders an empty box, which looks like spacing),
   * and the tooltip must carry the AS3's difficulty note — the line that
   * distinguishes this composition from the one T99 shipped.
   */
  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(1200);
  const slotA = page.getByRole('button', { name: /new game|slot 1/i });
  if ((await slotA.count()) > 0) {
    await slotA.first().click();
    await delay(1200);
  }
  await page
    .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
    .catch(() => console.log('[look] warning: countdown never reported done'));
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
  await page.mouse.down();
  let done = false;
  for (let i = 0; i < 300 && !done; i += 1) {
    const a = await page.evaluate(() => globalThis.__arena ?? null);
    const t = a?.enemies?.[0];
    if (t) await page.mouse.move(t.screen.x, t.screen.y);
    await delay(120);
    done = await page.evaluate(
      () => globalThis.document.querySelector('.level-outcome__actions, .achievement-icon') !== null,
    );
  }
  await page.mouse.up();
  await delay(600);

  const icon = page.locator('.achievement-icon');
  const count = await icon.count();
  console.log(`[ach] achievement reveal pages showing an icon: ${count}`);

  if (count === 0) {
    console.log('[ach] no achievement page — the clear earned none, nothing to hover');
    await shot('ach-no-page');
  } else {
    const info = await page.evaluate(() => {
      const el = globalThis.document.querySelector('.achievement-icon');
      const imgs = [...el.querySelectorAll('img')];
      return {
        name: el.getAttribute('aria-label'),
        loaded: imgs.filter((i) => i.naturalWidth > 0).length,
        layers: imgs.length,
      };
    });
    console.log(`[ach] icon "${info.name}": ${info.loaded}/${info.layers} layers loaded`);
    await shot('ach-page');

    const b = await icon.first().boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(500);
    const tip = await page.evaluate(() => {
      const el = globalThis.document.querySelector('.info-text');
      if (!el) return null;
      return {
        text: el.textContent,
        runs: [...el.querySelectorAll('.info-text__run')].map((r) =>
          (r.className.match(/info-text__run--(\w+)/) ?? [])[1],
        ),
      };
    });
    if (!tip) console.log('[ach] NO TOOLTIP on hover');
    else {
      console.log(`[ach] tooltip runs: ${tip.runs.join(', ')}`);
      console.log(`[ach] tooltip text: ${JSON.stringify(tip.text)}`);
      console.log(
        /\(Difficulty (doesn't|matters)|Completed on (EASY|MEDIUM|HARD)\.\)/.test(tip.text)
          ? '[ach] carries the AS3 difficulty note (correct)'
          : '[ach] MISSING the difficulty note',
      );
    }
    await shot('ach-tooltip');
  }

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.gridPreview) {
  /**
   * The level-grid roster tooltip — a port-invented trigger over `levelPreview`
   * (T103). Not a port of `ImageEnemy`; see divergence `A8`.
   *
   * ── Staleness is the thing to check, and a screenshot cannot ─────────────
   * One panel serves every cell. A build that showed the first level hovered
   * and never updated photographs perfectly — the panel is there, the content
   * is plausible. So this hovers **three different cells in sequence** and
   * requires the summary's `Level:` line to follow the cursor each time.
   */
  const tip = () =>
    page.evaluate(() => {
      const el = globalThis.document.querySelector('.info-text');
      if (!el) return null;
      const body = el.querySelector('.info-text__run--body')?.textContent ?? '';
      return {
        level: (body.match(/Level: (\d+)/) ?? [])[1] ?? '?',
        mode: (body.match(/Mode: (\w+)/) ?? [])[1] ?? '?',
        objective: (body.match(/Objective: (.+)/) ?? [])[1] ?? '?',
        rows: el.querySelectorAll('.enemy-line').length,
        art: (() => {
          const imgs = [...el.querySelectorAll('.enemy-line__art')];
          return `${imgs.filter((i) => i.naturalWidth > 0).length}/${imgs.length}`;
        })(),
      };
    });

  // ── Clear 1-1 first ──────────────────────────────────────────────────────
  // A fresh profile has exactly **one** unlocked cell, so the staleness check —
  // the only thing here a screenshot cannot do — has nothing to compare. Fifth
  // time in this arc that the default profile has turned out not to be a
  // representative sample; one clear gives two cells, which is enough.
  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(1200);
  const slotCell = page.getByRole('button', { name: /new game|slot 1/i });
  if ((await slotCell.count()) > 0) {
    await slotCell.first().click();
    await delay(1200);
  }
  await page
    .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
    .catch(() => console.log('[look] warning: countdown never reported done'));
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
  await page.mouse.down();
  let cleared11 = false;
  for (let i = 0; i < 300 && !cleared11; i += 1) {
    const a = await page.evaluate(() => globalThis.__arena ?? null);
    const t = a?.enemies?.[0];
    if (t) await page.mouse.move(t.screen.x, t.screen.y);
    await delay(120);
    cleared11 = await page.evaluate(
      () => globalThis.document.querySelector('.level-outcome__actions') !== null,
    );
  }
  await page.mouse.up();
  await delay(400);

  await page.getByRole('button', { name: /level select/i }).first().click().catch(() => {});
  await delay(1200);
  // The reveal opens the grid itself; if it did not, open world 1 by hand.
  if ((await page.locator('.level-grid__cell').count()) === 0) {
    await page.getByRole('button', { name: /^World 1,/i }).first().click().catch(() => {});
    await delay(700);
  }

  const cells = page.locator('.level-grid__cell:not([disabled])');
  const n = await cells.count();
  console.log(`[grid] unlocked cells: ${n}`);

  const seen = [];
  for (let i = 0; i < Math.min(n, 3); i += 1) {
    const cell = cells.nth(i);
    await cell.scrollIntoViewIfNeeded();
    const b = await cell.boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(450);
    const t = await tip();
    seen.push(t?.level ?? 'none');
    console.log(
      t
        ? `[grid] cell ${i + 1}: Level ${t.level} · ${t.mode} · ${t.objective} · ${t.rows} rows · art ${t.art}`
        : `[grid] cell ${i + 1}: NO PANEL`,
    );
    await shot(`grid-preview-${i + 1}`);
    // Leave, so the next hover is a fresh raise rather than a lingering panel.
    await page.mouse.move(5, 5);
    await delay(250);
  }

  const distinct = new Set(seen.filter((s) => s !== 'none'));
  console.log(
    distinct.size === seen.filter((s) => s !== 'none').length && distinct.size > 1
      ? `[grid] each hover showed its own level (${[...distinct].join(', ')}) — not stale`
      : `[grid] STALE OR MISSING: ${JSON.stringify(seen)}`,
  );

  // A locked cell must show nothing: the AS3 withholds the detail panel for a
  // locked level (`ScreenLevelSelect.as:1197`), and a roster would leak it.
  const locked = page.locator('.level-grid__cell[disabled]').first();
  if ((await locked.count()) > 0) {
    await locked.scrollIntoViewIfNeeded();
    const b = await locked.boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(450);
    const t = await tip();
    console.log(`[grid] locked cell: ${t ? `PANEL SHOWN (wrong) — Level ${t.level}` : 'no panel (correct)'}`);
  }

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.levelGuide) {
  /**
   * The level guide widget on the shop screen — `LevelGuide.as`.
   *
   * Drives the arrows and presets and **reads the state back after each
   * press**, because the widget's whole job is a number that changes: a
   * screenshot of "World 1 / Level 1" is identical whether the arrows work or
   * are inert.
   */
  const read = () =>
    page.evaluate(() => {
      const el = globalThis.document.querySelector('.level-guide');
      if (!el) return null;
      const values = [...el.querySelectorAll('.level-guide__value')].map((v) => v.textContent);
      const arrows = [...el.querySelectorAll('.guide-arrow')].map((b) => ({
        name: b.getAttribute('aria-label'),
        on: !b.disabled,
      }));
      const presets = [...el.querySelectorAll('.guide-preset')].map((b) => ({
        name: b.getAttribute('aria-label'),
        on: b.getAttribute('aria-pressed') === 'true',
      }));
      const imgs = [...el.querySelectorAll('img')];
      return {
        values,
        arrows,
        presets,
        auto: el.querySelector('.guide-auto')?.getAttribute('aria-pressed'),
        art: `${imgs.filter((i) => i.naturalWidth > 0).length}/${imgs.length} images loaded`,
      };
    });

  const show = (label, s) => {
    if (!s) { console.log(`[guide] ${label}: NO WIDGET`); return; }
    console.log(`[guide] ${label}: ${s.values.join(' / ')}  auto=${s.auto}  ${s.art}`);
    console.log(`[guide]   arrows  ${s.arrows.map((a) => `${a.name}=${a.on ? 'on' : 'off'}`).join('  ')}`);
    console.log(`[guide]   presets ${s.presets.map((p) => `${p.name}=${p.on ? 'ON' : 'off'}`).join('  ')}`);
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /upgrades/i }).first().click({ timeout: 4000 });
  await delay(900);

  show('fresh profile', await read());
  await shot('guide-fresh');

  // Every arrow is at a bound on a fresh profile, so pressing one must do
  // nothing — the counterpart to the presses below. A widget whose arrows moved
  // here would be ignoring the bounds entirely.
  await page.getByRole('button', { name: /next level$/i }).first().click().catch(() => {});
  show('after a bounded press', await read());

  // The info tooltip — `ButtonLevelGuideInfo.as:64`, the AllEnemiesInLevel type.
  const info = page.locator('.guide-info');
  if ((await info.count()) > 0) {
    const b = await info.first().boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(500);
    const tip = await page.evaluate(() => {
      const el = globalThis.document.querySelector('.info-text');
      if (!el) return null;
      return {
        summary: (el.querySelector('.info-text__run--body')?.textContent ?? '').split('\n'),
        rows: el.querySelectorAll('.enemy-line').length,
      };
    });
    console.log(`[guide] info tooltip: ${tip ? `${tip.rows} enemy rows` : 'NONE'}`);
    if (tip) for (const line of tip.summary) console.log(`[guide]   ${line}`);
    await shot('guide-info');
  }

  // The auto-select toggle, driven both ways.
  const auto = page.locator('.guide-auto').first();
  await auto.click();
  await delay(300);
  show('auto toggled off', await read());
  await auto.click();
  await delay(300);
  show('auto toggled back on', await read());
  await shot('guide-auto');

  // ── With progress ────────────────────────────────────────────────────────
  // A fresh profile has `maxWorld = 1, maxLevel = 1`, so **every arrow is
  // correctly disabled** and the run above proves nothing about them moving.
  // Fourth time this trap has come up in this arc; clear 1-1 so the level
  // arrows have somewhere to go, then drive them.
  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(1200);
  const slotBtn = page.getByRole('button', { name: /new game|slot 1/i });
  if ((await slotBtn.count()) > 0) {
    await slotBtn.first().click();
    await delay(1200);
  }
  await page
    .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
    .catch(() => console.log('[look] warning: countdown never reported done'));
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
  await page.mouse.down();
  let won = false;
  for (let i = 0; i < 300 && !won; i += 1) {
    const a = await page.evaluate(() => globalThis.__arena ?? null);
    const t = a?.enemies?.[0];
    if (t) await page.mouse.move(t.screen.x, t.screen.y);
    await delay(120);
    won = await page.evaluate(
      () => globalThis.document.querySelector('.level-outcome__actions') !== null,
    );
  }
  await page.mouse.up();
  await delay(400);

  await page.getByRole('button', { name: /menu/i }).last().click().catch(() => {});
  await delay(900);
  await page.getByRole('button', { name: /upgrades/i }).first().click({ timeout: 4000 }).catch(() => {});
  await delay(900);

  show('after clearing 1-1', await read());
  await shot('guide-progress');

  // Now drive the level arrows, both directions, reading back each time.
  const press = async (label, name) => {
    await page.getByRole('button', { name }).first().click().catch(() => {});
    await delay(250);
    show(label, await read());
  };
  await press('level right', /^Next level$/i);
  await press('level right again (at bound)', /^Next level$/i);
  await press('level left', /^Previous level$/i);
  await shot('guide-arrows');

  // ── The four PartInfoText sites this widget owns ─────────────────────────
  // Each is read back by *text*, not by "a panel appeared": the three presets
  // carry three different fixed strings and the auto-select one names its own
  // state, so a wiring mistake that pointed them all at one string would look
  // identical in a screenshot.
  const tipText = () =>
    page.evaluate(() => globalThis.document.querySelector('.info-text')?.textContent ?? null);

  const hoverTip = async (label, locator) => {
    const el = locator.first();
    if ((await el.count()) === 0) { console.log(`[guide] tooltip ${label}: NO TARGET`); return; }
    const b = await el.boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(450);
    const t = await tipText();
    console.log(`[guide] tooltip ${label}: ${t ? JSON.stringify(t.slice(0, 64)) : 'NONE'}`);
    // Move off so the keep-alive drops it before the next hover.
    await page.mouse.move(5, 5);
    await delay(200);
  };

  await hoverTip('preset Previous', page.getByRole('button', { name: /select previous level/i }));
  await hoverTip('preset Upcoming', page.getByRole('button', { name: /select upcoming level/i }));
  await hoverTip('preset Last', page.getByRole('button', { name: /select last level/i }));
  await hoverTip('auto-select', page.locator('.guide-auto'));
  await shot('guide-tooltips');

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.nextLevel) {
  /**
   * The Next Level button's roster preview — `ButtonNextLevel.as:208`, the
   * `"AllEnemiesInLevel"` branch of `PartInfoText`.
   *
   * ── This needs a real win, and there is no shortcut ───────────────────────
   * The button only exists on the results overlay, and only when the outcome
   * carries a next level. Nothing can be seeded: the dev level jump banks
   * nothing, so it produces an overlay with `nextLevel: null` and no button at
   * all. So 1-1 is actually cleared, the same way `--medals` does it.
   *
   * What is checked, beyond a screenshot: the rows the panel draws are compared
   * against **level 1-2's real roster** read out of the page, and every enemy
   * image is checked for `naturalWidth > 0` — a missing enemy clip renders as a
   * gap in the row, which reads as a layout bug rather than a missing asset.
   */
  const arenaOf = () => page.evaluate(() => globalThis.__arena ?? null);

  /**
   * Reads the hovered panel back. Shared by both scenarios below.
   *
   * Checks `naturalWidth > 0` on every image — the enemy clip *and* each badge
   * layer. A missing enemy clip leaves a gap in the row that reads as a layout
   * bug rather than a missing asset, and a missing badge layer renders as a
   * plain disc, which is what a real badge nearly looks like.
   */
  const readPanel = () =>
    page.evaluate(() => {
      const el = globalThis.document.querySelector('.info-text');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        box: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,
        summary: (el.querySelector('.info-text__run--body')?.textContent ?? '').split('\n'),
        heading: el.querySelector('.info-text__enemies-heading')?.textContent ?? null,
        rows: [...el.querySelectorAll('.enemy-line')].map((row) => ({
          amount: row.querySelector('.enemy-line__amount')?.textContent ?? '',
          lvl: row.querySelector('.enemy-line__level')?.textContent ?? '',
          art: [...row.querySelectorAll('.enemy-line__art')].map((i) => i.naturalWidth > 0),
          badges: [...row.querySelectorAll('.resistance-icon')].map((bd) => ({
            name: bd.getAttribute('aria-label'),
            loaded: [...bd.querySelectorAll('img')].filter((i) => i.naturalWidth > 0).length,
            layers: [...bd.querySelectorAll('img')].length,
          })),
        })),
      };
    });

  const reportPanel = (label, panel) => {
    if (!panel) {
      console.log(`[next] ${label}: NO PANEL on hover`);
      return;
    }
    console.log(`[next] ${label}: panel ${panel.box}`);
    for (const line of panel.summary) console.log(`[next]   ${line}`);
    console.log(`[next] heading=${JSON.stringify(panel.heading)} rows=${panel.rows.length}`);
    let broken = 0;
    for (const row of panel.rows) {
      if (row.art.length === 0 || row.art.some((ok) => !ok)) broken += 1;
      const badges = row.badges
        .map((bd) => {
          if (bd.loaded !== bd.layers) broken += 1;
          return `${bd.name}[${bd.loaded}/${bd.layers}]`;
        })
        .join(' ');
      console.log(
        `[next]   ${row.amount.padEnd(8)} ${row.lvl.padEnd(6)} art=${row.art} ${badges}`,
      );
    }
    console.log(
      broken === 0 ? '[next] every image resolved' : `[next] ${broken} image(s) failed to load`,
    );
  };

  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /play|continue/i }).first().click();
  await delay(1200);
  const slot1 = page.getByRole('button', { name: /new game|slot 1/i });
  if ((await slot1.count()) > 0) {
    await slot1.first().click();
    await delay(1200);
  }
  await page
    .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
    .catch(() => console.log('[look] warning: countdown never reported done'));

  // Move then fire, in that order — the tutorial gate at `:7153` holds spawning
  // until both are done, and firing first is the ordering fault that cost
  // `--secondaries` its evidence.
  await page.keyboard.down('d');
  await delay(600);
  await page.keyboard.up('d');
  await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
  await page.mouse.down();
  await delay(400);
  await page.mouse.up();
  await delay(300);

  await page.mouse.down();
  let done = false;
  for (let i = 0; i < 260 && !done; i += 1) {
    const a = await arenaOf();
    const target = a?.enemies?.[0];
    if (target) await page.mouse.move(target.screen.x, target.screen.y);
    else if (a) await page.mouse.move(a.tank?.screen?.x ?? 640, a.tank?.screen?.y ?? 400);
    await delay(120);
    done = await page.evaluate(
      () => globalThis.document.querySelector('.level-outcome__actions') !== null,
    );
  }
  await page.mouse.up();
  await delay(400);

  const hoverNext = async (label, shotName) => {
    const next = page.getByRole('button', { name: /next level/i });
    if ((await next.count()) === 0) {
      console.log(`[next] ${label}: NO BUTTON — level did not complete, or nextLevel was null`);
      await shot(`${shotName}-no-button`);
      return;
    }
    const b = await next.first().boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    // Several frames: the panel is raised by a per-frame re-assert.
    await delay(500);
    reportPanel(label, await readPanel());
    await shot(shotName);
  };

  await hoverNext('1-1 -> 1-2', 'next-preview');

  // ── A roster with resistances ────────────────────────────────────────────
  // 1-2's enemies are Basic and Fast, and **neither has a single strength or
  // weakness**, so the run above draws no badges at all and proves nothing
  // about them. The first level whose roster carries any is 1-13 (`Strong`),
  // so this jumps to 1-12 and wins it. Same trap as `?known=all` on the
  // bestiary: the default path is not a representative sample.
  await page.goto(`${URL}?primary=Laser%20Cannon`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /level select/i }).first().click();
  await delay(800);
  const cell = page.getByRole('button', { name: /^World 1, level 12,/i });
  if ((await cell.count()) === 0) {
    console.log('[next] dev jump cell for 1-12 not found — skipping the badge scenario');
  } else {
    await cell.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => console.log('[look] warning: countdown never reported done'));
    await page.keyboard.down('d');
    await delay(500);
    await page.keyboard.up('d');
    await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
    await page.mouse.down();
    let cleared = false;
    // 1-12 is a 24-enemy Tower level and takes appreciably longer than 1-1;
    // the first run of this budgeted 400 ticks (~44s) and stopped with 11 still
    // alive and the tank at full health — which reported as "level did not
    // complete" and looked exactly like a broken jump. The frame said
    // otherwise. Budget from what the level actually needs.
    for (let i = 0; i < 1100 && !cleared; i += 1) {
      const a = await arenaOf();
      const t = a?.enemies?.[0];
      if (t) await page.mouse.move(t.screen.x, t.screen.y);
      await delay(110);
      cleared = await page.evaluate(
        () => globalThis.document.querySelector('.level-outcome__actions') !== null,
      );
    }
    await page.mouse.up();
    await delay(400);
    await hoverNext('1-12 -> 1-13', 'next-preview-badges');
  }

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.resistances) {
  /**
   * The bestiary's strength/weakness badges — `ScreenEnemies.as:329-451`.
   *
   * ── What a screenshot alone cannot tell you here ──────────────────────────
   * A badge is three stacked SVGs. If one layer fails to resolve the icon still
   * renders — just wrong, and plausibly so, because the two outer layers carry
   * the colour and the middle one carries the meaning. A frame that dropped its
   * glyph would photograph as a clean empty disc, which is also what the "none"
   * badge is *supposed* to look like.
   *
   * So this counts the layers that actually loaded (`naturalWidth > 0`, which
   * is false for a 404'd image) and reports them alongside the label, instead
   * of trusting the picture.
   */
  // `?known=all` reveals the whole bestiary. Without it a fresh profile knows
  // only `Basic`, which has no resistances at all, so the 16 typed badges are
  // simply not on the page and the run would photograph the empty case twice
  // and report it as coverage.
  await page.goto(`${URL}?known=all`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /bestiary/i }).first().click({ timeout: 4000 });
  await delay(900);

  const rows = await page.evaluate(() => {
    const out = [];
    for (const row of globalThis.document.querySelectorAll('.bestiary-row')) {
      const name = row.querySelector('.bestiary-row__name')?.textContent ?? '?';
      const groups = [...row.querySelectorAll('.resistance-row')].map((r) => ({
        label: r.querySelector('.resistance-row__label')?.textContent ?? '',
        badges: [...r.querySelectorAll('.resistance-icon')].map((b) => ({
          name: b.getAttribute('aria-label'),
          // The check a picture cannot make: did every layer actually load?
          layers: [...b.querySelectorAll('img')].length,
          loaded: [...b.querySelectorAll('img')].filter((i) => i.naturalWidth > 0).length,
          box: Math.round(b.getBoundingClientRect().width),
        })),
      }));
      out.push({ name, locked: row.className.includes('locked'), groups });
    }
    return out;
  });

  console.log(`[res] bestiary rows: ${rows.length}`);
  let broken = 0;
  for (const row of rows) {
    if (row.groups.length === 0) {
      console.log(`[res] ${row.name.padEnd(16)} ${row.locked ? 'locked, no badges (correct)' : 'NO BADGES (wrong — met enemy)'}`);
      continue;
    }
    for (const g of row.groups) {
      const cells = g.badges
        .map((b) => {
          if (b.loaded !== b.layers) broken += 1;
          return `${b.name} [${b.loaded}/${b.layers} layers, ${b.box}px]`;
        })
        .join('  ');
      console.log(`[res] ${row.name.padEnd(16)} ${g.label.padEnd(10)} ${cells}`);
    }
  }
  console.log(
    broken === 0
      ? '[res] every badge layer resolved'
      : `[res] ${broken} badge(s) with a layer that did not load`,
  );

  await shot('res-bestiary');

  // Hover one badge: `IconStrongWeak.as:48` gives each its own tooltip, and the
  // "none" badge deliberately has none (`ScreenEnemies.as:385-391` builds it
  // with no `pText`). Both halves, because either alone is satisfiable wrongly.
  const named = page.locator('.resistance-icon[aria-label="Explosions 25%"]').first();
  if ((await named.count()) > 0) {
    await named.scrollIntoViewIfNeeded();
    const b = await named.boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(400);
    const tip = await page.evaluate(
      () => globalThis.document.querySelector('.info-text')?.textContent ?? null,
    );
    console.log(`[res] hover a typed badge:  tooltip=${JSON.stringify(tip)} (want "Explosions")`);
    await shot('res-badge-tooltip');
  } else {
    console.log('[res] no "Explosions 25%" badge on screen — nothing hovered');
  }

  const none = page.locator('.resistance-icon[aria-label="None"]').first();
  if ((await none.count()) > 0) {
    await none.scrollIntoViewIfNeeded();
    const b = await none.boundingBox();
    await page.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await delay(400);
    const tip = await page.evaluate(
      () => globalThis.document.querySelector('.info-text')?.textContent ?? null,
    );
    console.log(`[res] hover the none badge: tooltip=${JSON.stringify(tip)} (want null)`);
  }

  console.log(problems.length ? `[look] page problems: ${problems.join(' | ')}` : '[look] no page errors');
  await browser.close();
  stop();
  process.exit(0);
}

if (args.tooltips) {
  /**
   * The hover panel — `PartInfoText.as`, ported in T99.
   *
   * ── Why a screenshot alone is not the evidence here ───────────────────────
   * A tooltip is exactly the class of thing a DOM assertion lies about: the
   * `.info-text` node existing proves the request reached the panel, not that
   * it is on screen, not that it is in the right corner, and not that it stays
   * up. So each probe **measures the panel's box against the cursor** and
   * checks the corner the AS3 asks for, then screenshots.
   *
   * The keep-alive gets its own check for the same reason. A panel that opens
   * on `mouseenter` and never closes photographs identically to a correct one;
   * only holding still for several frames and *then* leaving separates them.
   */
  const panel = () =>
    page.evaluate(() => {
      const el = globalThis.document.querySelector('.info-text');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const runs = [...el.querySelectorAll('.info-text__run')].map((s) => ({
        style: (s.className.match(/info-text__run--(\w+)/) ?? [])[1] ?? '?',
        size: globalThis.getComputedStyle(s).fontSize,
        text: s.textContent.slice(0, 28),
      }));
      return {
        x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        runs,
      };
    });

  /**
   * Reads the corner the panel actually opened toward, from its box relative
   * to the cursor. This is the assertion the screenshot cannot make: `left`
   * means the panel extends rightward *from* the cursor (`showLeft` true),
   * per `placeInfoText`'s `:368-385`.
   */
  const cornerOf = (box, mx, my) =>
    box === null
      ? 'none'
      : `${box.x + box.w / 2 > mx ? 'left' : 'right'}/${box.y + box.h / 2 > my ? 'top' : 'bottom'}`;

  const open = async (label, go) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await go();
    await delay(700);
    console.log(`[tip] --- ${label} ---`);
  };

  const hover = async (name, target, expect) => {
    // **Scroll first.** `boundingBox()` reports document coordinates, so a row
    // below the fold returns a y outside the viewport and `mouse.move` lands on
    // nothing — which read as "NO PANEL" on the first run and looked exactly
    // like a broken tooltip. The shop scrolls; half its 28 rows are off-screen.
    await target.scrollIntoViewIfNeeded();
    await delay(150);
    const box = await target.boundingBox();
    if (!box) { console.log(`[tip] ${name.padEnd(18)} NO TARGET`); return null; }
    const mx = Math.round(box.x + box.width / 2);
    const my = Math.round(box.y + box.height / 2);
    await page.mouse.move(mx, my);
    // Several frames, not one: the panel is raised by a per-frame re-assert,
    // so a single frame after the move can land before the first tick.
    await delay(400);
    const got = await panel();
    const corner = cornerOf(got, mx, my);
    await shot(`tip-${name}`);
    console.log(
      `[tip] ${name.padEnd(18)} ${got ? `box=${got.w}x${got.h} at ${got.x},${got.y}` : 'NO PANEL'}` +
        `  cursor=${mx},${my}  corner=${corner}${expect ? ` (want ${expect})` : ''}` +
        `${got && corner !== expect && expect ? '  ← MISMATCH' : ''}`,
    );
    if (got) console.log(`[tip] ${''.padEnd(18)} runs=${JSON.stringify(got.runs)}`);
    return { mx, my, got };
  };

  // ── Shop rows — `ButtonUpgradeInfo.as:56` passes `false, false` ──────────
  await open('Upgrades', async () => {
    await page.getByRole('button', { name: /upgrades/i }).first().click({ timeout: 4000 });
  });
  const rows = page.locator('.shop-row');
  console.log(`[tip] shop rows: ${await rows.count()}`);
  await hover('shop-first', rows.first(), 'right/top');
  await hover('shop-mid', rows.nth(Math.floor((await rows.count()) / 2)), 'right/top');

  // Keep-alive, driven as a pair. Holding still must keep it; leaving must
  // close it. Either half alone is satisfied by a stuck panel or a dead one.
  const held = await hover('shop-hold', rows.first(), 'right/top');
  if (held) {
    await delay(1200);
    const still = await panel();
    console.log(`[tip] after 1200ms held:  ${still ? 'STILL SHOWING (correct)' : 'GONE (wrong)'}`);
    await page.mouse.move(5, 5);
    await delay(400);
    const gone = await panel();
    console.log(`[tip] after leaving:      ${gone ? 'STILL SHOWING (wrong)' : 'GONE (correct)'}`);
    await shot('tip-shop-left');
  }

  // ── Achievements — `Achievement.as:99` passes `true,false`, and is the only
  // site with styled sub-ranges.
  //
  // `left/bottom` is the expectation because `showTop` is **false** there: the
  // panel opens up-and-right. The first run of this probe asserted `left/top`
  // from the scoping note's "true, true" and reported a mismatch against
  // correct code — the AS3 line settled it, which is rule 1 doing its job in
  // the direction it is least comfortable.
  await open('Achievements', async () => {
    await page.getByRole('button', { name: /achievements/i }).first().click({ timeout: 4000 });
  });
  const cells = page.locator('.achievements__cell');
  console.log(`[tip] achievement cells: ${await cells.count()}`);
  await hover('ach-first', cells.first(), 'left/bottom');
  await hover('ach-mid', cells.nth(Math.floor((await cells.count()) / 2)), 'left/bottom');

  // The third run — the difficulty note — only exists on an *earned*
  // achievement (`Achievement.as:60-79`), and a fresh profile has none. Said
  // plainly rather than left as a silent gap: the three-run split is pinned in
  // `infoText.test.ts`, and this pass drives two of the three styles.
  const earned = page.locator('.achievements__cell--earned');
  const earnedCount = await earned.count();
  if (earnedCount > 0) await hover('ach-earned', earned.first(), 'left/bottom');
  else console.log('[tip] no earned achievement on a fresh profile — note run not driven here');

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

    // **Reachability, not just presence.** A centred flex container that
    // overflows puts its first rows *above* its own scroll origin, where no
    // amount of scrolling reaches them — which is how the shop's top weapons
    // became unbuyable. `chars` counts them happily, because they are in the
    // DOM; only geometry can tell that nobody can get to them.
    //
    // Measured by parking the container at the top and asking whether anything
    // still sits above its client edge.
    const reach = await page.evaluate(() => {
      // `globalThis.` because this body is serialised into the page — the
      // same reason the `__arena` reads elsewhere in this file are written that
      // way; Node's lint has no `document`.
      const el = globalThis.document.querySelector('.screen');
      if (!el) return null;
      el.scrollTop = 0;
      const box = el.getBoundingClientRect();
      let above = 0;
      let below = 0;
      for (const child of el.children) {
        const r = child.getBoundingClientRect();
        // 1px of tolerance for sub-pixel layout.
        if (r.top < box.top - 1) above += 1;
        if (r.bottom > box.bottom + 1) below += 1;
      }
      return {
        above,
        below,
        scrollable: el.scrollHeight > el.clientHeight,
        overflow: el.scrollHeight - el.clientHeight,
      };
    });

    await shot(`ui-${label.toLowerCase().replace(/[^a-z]/g, '')}`);
    // `above` must always be 0. `below` is fine when the screen scrolls — that
    // content is reachable — and only a problem when it does not.
    const verdict = reach === null
      ? 'no .screen'
      : reach.above > 0
        ? `UNREACHABLE ${reach.above} above origin`
        : reach.below > 0 && !reach.scrollable
          ? `CLIPPED ${reach.below} below, no scroll`
          : reach.scrollable
            ? `ok (scrolls ${reach.overflow}px)`
            : 'ok (fits)';
    console.log(
      `[ui] ${label.padEnd(16)} controls=${String(controls).padStart(3)} ` +
        `chars=${String(text.length).padStart(4)}  ${verdict}`,
    );
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
  /**
   * Adds this step's names to the running set and **returns the ones that are
   * new** (T80).
   *
   * The cumulative total alone cannot attribute a name to a step, and that
   * matters whenever a pass changes the wiring *and* the sweep's own reach in
   * the same commit — "the count went up" is then joint evidence and says
   * nothing about which call site ran. `Burning` has two independent sources
   * (a flame at `:6006`, lava at `:6261`) and they are exercised by different
   * pairs, so without this the two are indistinguishable in the output.
   *
   * It also makes the run-to-run swing legible: `TankDamaged`, `TeleportOut`
   * and `ReflectBullet` move in and out of the total between runs, which is
   * what makes the headline figure a poor instrument for a small change.
   */
  const collect = async () => {
    const fresh = [];
    for (const n of await names()) {
      if (!fired.has(n)) fresh.push(n);
      fired.add(n);
    }
    return fresh;
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
  // `Lava Ball` (T80) is the only source of a lava patch, and lava is one of
  // the two things that assert the `Burning` loop (`:6261`). Placed at index 2
  // rather than appended so it pairs with a *different* primary than the
  // Flamethrower below — the two `Burning` sources then get separate page
  // loads, and a count that moves says which one moved it.
  const SECONDARIES = ['Grenade', 'Mine', 'Lava Ball', 'Shield', 'Rockets', 'Icicles', 'Crazy Cheese', 'Ice Ball', 'Magic Bunny'];

  // Paired with a different primary each pass, via the `?primary=` aid added
  // in T41. Eight weapon sounds plus BorderTiny/BorderBig were silent purely
  // because the Cannon is what a fresh profile equips — unexercised, not
  // unwired, and this is what tells the two apart.
  //
  // `Flamethrower` (T80) is the other half of the same gap, and it was a
  // *reach* gap before it was a wiring one: this list is what the sweep can
  // equip, and the weapon that asserts `FlameThrower`/`Burning` (`:3788`,
  // `:6006`) was simply not in it. Both names would have stayed on the silent
  // list after the wiring landed, which would have read as "still unwired".
  const PRIMARIES = [
    'MiniGun', 'Shotgun', 'Big Cannon', 'Gummy Bear Cannon',
    'Cake Cannon', 'Poison Cannon', 'Magic Cannon', 'Laser Cannon',
    'Flamethrower',
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
    const fresh = await collect();

    // The tracking, stated rather than assumed. A centre list that never
    // moves means `__arena` is not being read and the orbit is fixed again —
    // which is the failure this pass exists to remove, and it would otherwise
    // be invisible in the count.
    const xs = centres.map((c) => Math.round(c.x));
    const spread = Math.max(...xs) - Math.min(...xs);
    const live = centres.filter((c) => c.live).length;
    console.log(
      `[look] ${primary} + ${secondary}: ${fired.size} names so far` +
        ` (+${fresh.length}: ${fresh.join(' ') || '-'})` +
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
   * Lava, driven on its own — the second source of `Burning` (T80).
   *
   * `:6261` asserts the loop from an enemy **standing in lava**, which the
   * orbit-and-fire loop above cannot reliably produce: it throws a ball every
   * third step and then keeps moving, so the tank is rarely anywhere near its
   * own patch when an enemy crosses it, and a patch does not bite until
   * `lifeTime > 15` frames anyway. The first run of this pass showed exactly
   * that — `Big Cannon + Lava Ball` added `Ball` and `ExplosionSmall` and no
   * `Burning`, so the throw happened and the contact did not.
   *
   * So: throw short, then **stand still**. Enemies home on the tank, which
   * makes the tank's own feet the one place a crossing is guaranteed. Standing
   * in the fire is the point, not an accident of the script.
   */
  {
    await page.goto(`${URL}?secondary=Lava%20Ball&primary=Cannon`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /all-enemy test level/i }).click();
    await releasePlay();
    await delay(2500);
    await clear();

    // Three throws in a tight arc just off the tank, so the patches overlap
    // the ground the enemies have to walk over to reach it.
    //
    // `at.live` is logged rather than assumed: `arenaAt()` falls back to a
    // plausible-looking centre when `__arena` is not published, and a fallback
    // that resembles a real reading is trap 13. If these throws land somewhere
    // other than where the log says the tank is, that is the reason.
    const throws = [];
    for (const dx of [90, 0, -90]) {
      const at = await arenaAt();
      throws.push(`${Math.round(at.x)},${Math.round(at.y)}${at.live ? '' : '(fallback)'}`);
      await page.mouse.move(at.x + dx, at.y - 60);
      await page.keyboard.down('Space');
      await delay(220);
      await page.keyboard.up('Space');
      await delay(500);
    }

    // Then wait, without moving. `Burning` needs contact, not a throw.
    await burst('lava-burning', 6, 700);
    await delay(2000);

    // **Read this segment absolutely, not as a delta against the cumulative
    // set.** The `+N new` log is the wrong instrument here and said so on the
    // first attempt: `Burning` had already been added by the Flamethrower
    // pairing above, so this segment reported `+0` whether lava asserted the
    // loop or not. A name that fires twice is invisible to a set difference.
    //
    // The history was cleared before the throws, so what follows is this
    // segment's own sounds and nothing else.
    const segment = new Set(await names());
    await collect();
    console.log(
      `[look] isolated Lava Ball: ${fired.size} names so far` +
        ` | this segment alone: Ball=${segment.has('Ball')}` +
        ` Burning=${segment.has('Burning')} (${segment.size} names)` +
        ` | tank at ${throws.join(' ')}`,
    );
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

if (args.separation) {
  /**
   * Enemy-enemy interpenetration, measured A/B on one build — T125.
   *
   * ── What is counted, and why it is a ratio ───────────────────────────────
   * For every unordered pair of live enemies, every sample: `d / (r1 + r2)`.
   * Below 1.0 the circles overlap. A ratio rather than a raw distance because
   * enemy radii differ by type, so "37 units apart" means nothing without
   * knowing whose 37 it is.
   *
   * Reported as the **share of sampled pairs that overlap**, plus the worst
   * ratio seen. The share is the number that should move; the worst ratio says
   * how bad the worst case still is, because separation is a push per frame and
   * not a constraint solver — two enemies spawning on top of each other start
   * overlapped and take several frames to part.
   *
   * ── The A/B ─────────────────────────────────────────────────────────────
   * Both halves are the same build, the same level and the same sample count,
   * differing only by `?separation=0`. Comparing against an older commit would
   * vary the build and the run together, and this project has already had one
   * measurement invalidated that way (the CDP profiler in T113).
   *
   * Bosses are counted separately: their branch is a *force* into `pushVel`
   * with a mass split, while the normal branch is a flat 0.5 of position, so
   * mixing them averages two unrelated rules.
   */
  const sepTarget = args.separationLevel ?? '1-13';
  const [sepW, sepL] = sepTarget.split('-').map(Number);
  const SEP_SAMPLES = Number(process.env.SEPARATION_SAMPLES ?? 240);

  const measureSeparation = async (separationOn) => {
    const query = separationOn ? '?primary=Cannon' : '?primary=Cannon&separation=0';
    await page.goto(`${URL}${query}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(800);
    if (sepW !== 1) {
      await page.locator(`.dev-jump__world:text-is("${sepW}")`).first().click();
      await delay(300);
    }
    const cell = page.getByRole('button', {
      name: new RegExp(`^World ${sepW}, level ${sepL},`, 'i'),
    });
    if ((await cell.count()) === 0) return null;
    await cell.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => {});

    // Satisfy the tutorial gate, then **kite**: hold one movement key for the
    // whole window so the tank runs to a wall and the chasers arrive as a pack.
    //
    // A stationary tank measures nothing, which the first run of this proved:
    // 193 samples on the busiest level in the game gave **0% overlapping and a
    // worst ratio of 9.7** — no two enemies ever came within nine times their
    // combined radii. Enemies converging on a still target reach it one at a
    // time and die on contact, so they never crowd. Kiting is what puts them
    // shoulder to shoulder, which is the case separation exists for.
    //
    // Deliberately not firing: killing them is the other way to keep a crowd
    // from forming, and both halves must see the same one.
    // The gate first, exactly as every other mode satisfies it: **`d` held
    // while the mouse is down**. Moving the keydown to after the press delayed
    // every spawn past the sampling window and produced two runs of "0
    // populated samples" — the tutorial's Move step was never cleared.
    await page.keyboard.down('d');
    await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
    await page.mouse.down();
    await delay(700);
    await page.mouse.up();
    await page.keyboard.up('d');

    // Let the crowd build before sampling: the first enemies spawn at the room
    // edge and need to cross it. Sampling from frame one spends most of the
    // window on an empty arena, which is what made the first attempts thin.
    await delay(3000);

    // Then kite for the whole window, so the chasers arrive as a pack.
    await page.keyboard.down('d');

    let pairs = 0;
    let overlapping = 0;
    let bossPairs = 0;
    let bossOverlapping = 0;
    let worst = Infinity;
    let maxEnemies = 0;
    let samples = 0;
    // Reachability, kept separate from the geometry: "the loop ran N times" and
    // "the crowd is less overlapped" are different claims and the second is
    // worthless without the first.
    let appliedTotal = 0;
    let framesWithEffects = 0;
    let reportedOn = null;

    for (let i = 0; i < SEP_SAMPLES; i += 1) {
      const frame = await page.evaluate(() => ({
        bodies: globalThis.__arena?.bodies ?? [],
        separation: globalThis.__arena?.separation ?? null,
      }));
      const bodies = frame.bodies;
      if (frame.separation) {
        reportedOn = frame.separation.on;
        appliedTotal += frame.separation.applied;
        if (frame.separation.applied > 0) framesWithEffects += 1;
      }
      // `SEPARATION_DUMP=1` prints one populated sample raw. Kept because the
      // first four runs of this mode all reported a worst ratio near 9.6
      // regardless of scenario, which is the shape of an instrument fault
      // rather than a game property — and it was one.
      if (process.env.SEPARATION_DUMP === '1' && bodies.length > 2 && samples === 3) {
        console.log('[separation] raw sample:', JSON.stringify(bodies.slice(0, 6)));
      }
      if (bodies.length > 1) {
        samples += 1;
        maxEnemies = Math.max(maxEnemies, bodies.length);
        for (let a = 0; a < bodies.length; a += 1) {
          for (let b = a + 1; b < bodies.length; b += 1) {
            const A = bodies[a];
            const B = bodies[b];
            const sum = A.r + B.r;
            if (sum <= 0) continue;
            const ratio = Math.hypot(B.x - A.x, B.y - A.y) / sum;
            if (A.boss && B.boss) {
              bossPairs += 1;
              if (ratio < 1) bossOverlapping += 1;
            } else {
              pairs += 1;
              if (ratio < 1) overlapping += 1;
              if (ratio < worst) worst = ratio;
            }
          }
        }
      }
      await delay(20);
    }

    await page.keyboard.up('d');
    return {
      pairs,
      overlapping,
      bossPairs,
      bossOverlapping,
      worst,
      maxEnemies,
      samples,
      appliedTotal,
      framesWithEffects,
      reportedOn,
    };
  };

  const sepOff = await measureSeparation(false);
  const sepOn = await measureSeparation(true);

  const sepLine = (label, m) => {
    if (!m) return `[separation] ${label}: no dev cell for ${sepTarget}`;
    const share = m.pairs > 0 ? ((100 * m.overlapping) / m.pairs).toFixed(1) : 'n/a';
    const bossShare =
      m.bossPairs > 0 ? ((100 * m.bossOverlapping) / m.bossPairs).toFixed(1) : 'n/a';
    return (
      `[separation] ${label.padEnd(3)}: ${String(m.samples).padStart(3)} samples · ` +
      `up to ${String(m.maxEnemies).padStart(2)} enemies · ` +
      `${String(m.pairs).padStart(6)} normal pairs, ${share}% overlapping` +
      ` · worst ratio ${m.worst === Infinity ? 'n/a' : m.worst.toFixed(3)}` +
      ` · ${m.bossPairs} boss pairs, ${bossShare}% overlapping` +
      ` · loop ${m.reportedOn === null ? '?' : m.reportedOn ? 'on' : 'off'},` +
      ` ${m.appliedTotal} effects over ${m.framesWithEffects} sampled frames`
    );
  };

  console.log(`[separation] level ${sepTarget}, ${SEP_SAMPLES} samples per half`);
  console.log(sepLine('off', sepOff));
  console.log(sepLine('on', sepOn));
  if (sepOff && sepOn && sepOff.pairs > 0 && sepOn.pairs > 0) {
    const before = (100 * sepOff.overlapping) / sepOff.pairs;
    const after = (100 * sepOn.overlapping) / sepOn.pairs;
    console.log(
      `[separation] overlapping share ${before.toFixed(1)}% -> ${after.toFixed(1)}%` +
        ` (${before > 0 ? (((before - after) / before) * 100).toFixed(0) : 'n/a'}% fewer)`,
    );
  }
}

if (args.bossCollision) {
  /**
   * `BossCollision` and its on-screen gate — `:5195-5198`, pass (d).
   *
   * ── Why this needs a dev aid ─────────────────────────────────────────────
   * The sound needs **two live bosses touching**. Twenty-five levels carry two
   * or more, but every enemy converges on the tank, so a natural boss collision
   * happens next to the tank and is therefore always on screen. That drives one
   * side of the gate and can never drive the other, and a gate only tested on
   * its accepting side is not tested.
   *
   * So `?bosspair=x,y` drops the first two live bosses on top of each other at
   * a chosen world point. Nothing else about them changes — same stats, same
   * steering, same radii — so what follows is the ordinary rule on an ordinary
   * pair.
   *
   * ── What is asserted ─────────────────────────────────────────────────────
   * Three things, because the sound alone cannot tell a working gate from a
   * broken emit:
   *
   *   1. the pair really collided     — `separation.lastBossCollision` exists
   *   2. the gate's verdict           — `audible`, with the camera rect and the
   *                                     contact point printed so the margin can
   *                                     be checked by hand
   *   3. the sound followed the verdict — `BossCollision` in the queue history
   *
   * The off-screen half also **measures** how far outside the camera the
   * contact point actually fell, rather than trusting that a corner of the room
   * is far enough. In a 900x720 room with a ~640x400 camera the slack is only
   * 260 units, and the margin is 200 — so "off screen" is true by 60 units, not
   * by a comfortable distance, and that is worth printing rather than assuming.
   */
  const bcLevel = '3-9';
  const [bcW, bcL] = bcLevel.split('-').map(Number);

  const runBossPair = async (label, point, drive) => {
    await page.goto(`${URL}?primary=Cannon&bosspair=${point.x},${point.y}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: /play|continue/i }).first().waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /level select/i }).first().click();
    await delay(800);
    if (bcW !== 1) {
      await page.locator(`.dev-jump__world:text-is("${bcW}")`).first().click();
      await delay(300);
    }
    const cell = page.getByRole('button', { name: new RegExp(`^World ${bcW}, level ${bcL},`, 'i') });
    if ((await cell.count()) === 0) {
      console.log(`[boss-collision] ${label}: no dev cell for ${bcLevel}`);
      return;
    }
    await cell.first().click();
    await page
      .waitForFunction(() => globalThis.__arena?.countDownDone === true, null, { timeout: 15_000 })
      .catch(() => {});

    // The tutorial gate, then hold the drive keys for the rest of the run.
    //
    // **The camera is clamped inside the room, so where the tank stands decides
    // whether an off-screen collision is even possible.** In this 900x720 arena
    // a 640x400 camera leaves 260 units of horizontal slack and 320 vertical —
    // against a 200 margin. Parked mid-room the camera sat at (260,164) and the
    // far corner came out only 140 units outside the rect, which the gate
    // correctly called audible. Driving the tank into the opposite corner first
    // is what makes the far corner genuinely unreachable by the ear.
    for (const key of drive) await page.keyboard.down(key);
    await page.locator('canvas').hover({ position: { x: 800, y: 400 } });
    await page.mouse.down();
    await delay(700);
    await page.mouse.up();
    // Long enough to reach the corner and for the camera to settle there.
    await delay(2500);

    // Clear the history *after* the gate work, so the level's own start-up
    // sounds are not counted as the collision.
    await page.evaluate(() => globalThis.__soundQueue?.clear());

    let seen = null;
    for (let i = 0; i < 400 && !seen; i += 1) {
      seen = await page.evaluate(
        () => globalThis.__arena?.separation?.lastBossCollision ?? null,
      );
      if (!seen) await delay(50);
    }

    const queued = await page.evaluate(
      () => (globalThis.__soundQueue?.names() ?? []).filter((n) => n === 'BossCollision').length,
    );

    if (!seen) {
      console.log(`[boss-collision] ${label}: no boss collision observed`);
      return;
    }

    // How far outside the camera rect the contact point fell, on the worst
    // axis. Negative means inside.
    const c = seen.camera;
    const outX = Math.max(c.x - seen.contactX, seen.contactX - (c.x + c.width));
    const outY = Math.max(c.y - seen.contactY, seen.contactY - (c.y + c.height));
    const outside = Math.max(outX, outY);

    for (const key of drive) await page.keyboard.up(key);

    console.log(
      `[boss-collision] ${label.padEnd(10)}: contact (${seen.contactX},${seen.contactY})` +
        ` · camera ${c.width}x${c.height} at (${c.x},${c.y})` +
        ` · ${outside <= 0 ? 'inside' : `${outside} units outside`} the rect` +
        ` · audible ${seen.audible} · BossCollision queued ${queued}x`,
    );
  };

  // On screen: mid-room, which the camera is always looking at.
  await runBossPair('on-screen', { x: 450, y: 360 }, ['d']);
  // Off screen: the bottom-right corner, with the tank held in the top-left so
  // the camera is pinned to the opposite end of its travel.
  await runBossPair('off-screen', { x: 880, y: 700 }, ['w', 'a']);
}

console.log(`[look] frames -> ${args.out}`);
console.log(problems.length ? `[look] page problems:\n  ${problems.join('\n  ')}` : '[look] no page errors');

await browser.close();
stop();
