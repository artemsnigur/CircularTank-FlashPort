/**
 * What keeps running after a level resolves — `PartGameArea.as:2806`.
 *
 * The AS3's main loop has one `if(!levelDone)` block, and roughly half the
 * frame sits inside it. This is that partition, named per system, so the scene
 * asks a function rather than repeating a bare `!levelDone` at a dozen call
 * sites — and so the rule can be driven against the AS3 line by line instead of
 * being pinned as a spelling in the scene's source.
 *
 * ── Two stages, not one ───────────────────────────────────────────────────
 * `levelDone` is set the instant a level is decided (`:2774`). The screen does
 * not change then: `levelDoneFunction` (`:667`) waits for the loose money to be
 * collected and then counts a 15-frame timer down before
 * `Main.changeScreen = "Status"`. This table describes that in-between window.
 *
 * **The original never draws its results screen over a live scene.** It leaves
 * the gameplay screen entirely. So this port's `scene.pause()` at
 * `outcome.finished` is the right analogue of the screen change, and is
 * deliberately kept — what was wrong was running *everything* during the
 * window before it. See `docs/AUDIT-2026-07.md` A0.
 *
 * ── Why the split falls where it does ─────────────────────────────────────
 * Everything that can *act on the player* stops, and everything already in
 * flight finishes. `handleEnemies` is the biggest thing inside the gate, and it
 * carries enemy movement, firing, contact damage, the status timers and the
 * heal auras (`:4380` onward, poison at `:6381`). That is what makes leaving
 * the scene running safe: after a defeat the tank has been removed from the
 * display list outright (`:2781`), and nothing that could chase it is still
 * ticking anyway.
 */

/** Systems the main loop drives, in the order `:2804-2842` runs them. */
export type GatedSystem =
  | 'playerBullets'
  | 'enemyBulletFlight'
  | 'enemyBulletSeeking'
  | 'enemyBulletHitsTank'
  | 'mines'
  | 'groundHazards'
  | 'tankDrive'
  | 'tankAttack'
  | 'tankShield'
  | 'flag'
  | 'enemySpawning'
  | 'enemies'
  | 'enemyIndicators'
  | 'explosions'
  | 'explosionQueue'
  | 'particles'
  | 'money'
  | 'camera';

/**
 * True when the system keeps running after `levelDone` — i.e. it sits *outside*
 * the gate in the AS3.
 *
 * Each entry carries the line it was read from. The three `enemyBullet*`
 * entries are one AS3 function split three ways on purpose: `:1492` moves every
 * round unconditionally, and `:1520`'s `else if(!levelDone)` covers the seeking
 * and the hit on the tank. Collapsing them into one answer would either freeze
 * enemy fire in mid-air or let it kill a tank the player cannot steer.
 */
const RUNS_WHILE_LEVEL_DONE: Readonly<Record<GatedSystem, boolean>> = {
  playerBullets: true, // `:2804` handleBullets — outside
  enemyBulletFlight: true, // `:1492` — position is updated before any gate
  enemyBulletSeeking: false, // `:1522` — inside `else if(!levelDone)`
  enemyBulletHitsTank: false, // `:1520` — same branch
  mines: false, // `:2812` handleMines
  groundHazards: false, // `:2813` handleGround
  tankDrive: false, // `:2816` moveTank
  tankAttack: false, // `:2818` tankAttack
  tankShield: false, // `:2819` handleTankShield
  flag: false, // `:2822` handleFlag
  enemySpawning: false, // `:2831` handleWarnings, which calls spawnEnemy `:2461`
  enemies: false, // `:2833` handleEnemies
  enemyIndicators: true, // `:2835` — outside
  explosions: true, // `:2837` handleExplosions
  explosionQueue: true, // `:2838` handleExplosionQueue
  particles: true, // `:2839` handleParticles
  money: true, // `:2840` handleMoney
  camera: true, // `:2841` setCamera
};

/** Whether `system` should still be driven once the level has resolved. */
export function runsWhileLevelDone(system: GatedSystem): boolean {
  return RUNS_WHILE_LEVEL_DONE[system];
}

/**
 * Whether `system` should be driven this frame.
 *
 * The form the scene calls, so the gate reads as one question rather than as a
 * `!levelDone &&` repeated at each site.
 */
export function shouldRun(system: GatedSystem, levelDone: boolean): boolean {
  return !levelDone || runsWhileLevelDone(system);
}
