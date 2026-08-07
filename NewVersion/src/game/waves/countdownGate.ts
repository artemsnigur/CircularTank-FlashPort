/**
 * What runs during the opening countdown — `PartGameArea.as:2806-2830`.
 *
 * The second of the main loop's two partitions. `levelDoneGate.ts` is the
 * first, and this one nests inside it: `if(!levelDone) { if(countDownDone) { … }
 * … }`. Both are keyed by the same `GatedSystem` vocabulary so a system added
 * to one has to be classified in the other, rather than defaulting to whichever
 * side the author happened to think of.
 *
 * ── The split, and why it is not "the game is paused" ─────────────────────
 * Seven things stop, and the rest of the frame keeps going. **Enemies spawn,
 * advance and shoot throughout the countdown** — what stops is everything the
 * *player* drives:
 *
 *     stops                          keeps running
 *     handleMines        `:2814`     spawnWarnings/handleWarnings `:2831-2832`
 *     handleGround       `:2815`     handleEnemies               `:2833`
 *     moveTank           `:2818`     handleBullets               `:2804`
 *     tankAttack         `:2820`     handleEnemyBullets          `:2805`
 *     handleTankShield   `:2821`     indicators, explosions, particles,
 *     handleFlag         `:2824`       money, camera             `:2835-2841`
 *     tempNothingPressed `:2826`
 *
 * So the countdown is a "get ready" window with real stakes: the arena fills
 * while the player watches and cannot act. It is not a freeze frame.
 *
 * ── Enemy fire is outside this gate, deliberately ─────────────────────────
 * `handleEnemyBullets` is called at `:2805`, *above* `if(!levelDone)` and
 * therefore above the countdown gate too. A round already in the air can reach
 * a tank that cannot move or raise its shield. That is faithful and reads as a
 * defect, so it is stated here rather than discovered: in practice the window
 * is two seconds and spawns arrive at the room edge, so nothing is usually
 * close enough to fire. Reproduced as written.
 *
 * ── Why this is a table and not a `!countDownDone &&` at each call site ───
 * The same reason `levelDoneGate.ts` is: a guard bolted on at the call site
 * applies to every branch, including the ones whose rule it contradicts, and a
 * partition spread across a dozen sites cannot be driven against the AS3 line
 * by line. See the guard-scoping section in `CLAUDE.md`.
 */

import type { GatedSystem } from './levelDoneGate';

/**
 * True when the system keeps running *while the countdown is still going* —
 * i.e. it sits **outside** the `if(countDownDone)` block at `:2808`.
 *
 * Each entry carries the line it was read from. Note the polarity is the
 * opposite of the flag's name: `countDownDone === false` means the countdown is
 * **active**, so these are the systems that survive that state.
 */
const RUNS_DURING_COUNTDOWN: Readonly<Record<GatedSystem, boolean>> = {
  playerBullets: true, // `:2804` handleBullets — above both gates
  enemyBulletFlight: true, // `:2805` handleEnemyBullets — above both gates
  enemyBulletSeeking: true, // `:2805` — same call, see the note above
  enemyBulletHitsTank: true, // `:2805` — same call
  mines: false, // `:2814` handleMines
  groundHazards: false, // `:2815` handleGround
  tankDrive: false, // `:2818` moveTank
  tankAttack: false, // `:2820` tankAttack
  tankShield: false, // `:2821` handleTankShield
  flag: false, // `:2824` handleFlag
  inputActivity: false, // `:2826` the tempNothingPressed clear
  enemySpawning: true, // `:2831` — below the block, which closes at `:2830`
  enemies: true, // `:2833` handleEnemies
  enemyIndicators: true, // `:2835`
  explosions: true, // `:2837`
  explosionQueue: true, // `:2838`
  particles: true, // `:2839`
  money: true, // `:2840`
  camera: true, // `:2841`
};

/** Whether `system` is driven while the countdown is still running. */
export function runsDuringCountdown(system: GatedSystem): boolean {
  return RUNS_DURING_COUNTDOWN[system];
}

/**
 * Whether `system` should be driven this frame, given both gates.
 *
 * The form the scene calls. `countDownDone` is the AS3 flag verbatim, so
 * `false` means the countdown is still running — which is why this reads
 * `countDownDone ||` rather than `!countDownDone &&`.
 */
export function shouldRunDuringCountdown(
  system: GatedSystem,
  countDownDone: boolean,
): boolean {
  return countDownDone || runsDuringCountdown(system);
}
