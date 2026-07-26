/**
 * Enemy shooting — `PartGameArea.as:6889` (the gate), `:6914` (the shot),
 * `:1491` (bullet flight), `:1574` (the hit on the tank), `:3286` (spawn).
 *
 * ── Scope ─────────────────────────────────────────────────────────────────
 * Two bullet classes — `Basic` and `BasicBoss` — across two firing patterns,
 * `Front` and `Circle`. Between them that is the full ranged behaviour of
 * `Shooting`, `Ninja` (Front), `Crazy` and `Random` (Circle), normal variants.
 *
 * Deliberately **not** covered, and each needs its own pass:
 *
 *   Hook, Trap                   other bullet classes; Trap is a speed-0
 *                                stationary hazard on its own display layer
 *   Following, FollowingBoss     homing; would reuse weapons/magic.ts
 *   FrontAmount, FrontSides,     three other firing patterns
 *   BackTrap
 *   reflected                    the BulletReflect upgrade bouncing shots back
 *   bulletsShooting              GrapplingHook's tether accounting
 *
 * The stats are already extracted: `shoot`, `shootType`, `shootAngle`,
 * `reloadTimeMax` and `bulletAmount` all come from the generated
 * `enemyStatsData.ts`, so this needed no generator work.
 *
 * ── Why defeat was previously unreachable ─────────────────────────────────
 * Contact was the only damage source, and it is self-limiting: an enemy dies
 * on contact, so a level's total damage is capped at `enemies x contactDamage`.
 * Level 1-1 is 10 enemies at 5 damage against 100 HP, so losing was
 * arithmetically impossible. Ranged fire removes that cap.
 */

const AS3_FPS = 30;

/** `EnemyBulletBasic` — radius 4, damage 1, and a very long life. */
export const BASIC_BULLET_RADIUS = 4;
export const BASIC_BULLET_DAMAGE = 1;
export const BASIC_BULLET_SPEED = 4;

/**
 * `EnemyBulletBasicBoss` — bigger, twice the damage, and far shorter-lived.
 *
 * The 90-frame life is the real difference: a boss shot expires after three
 * seconds where a Basic runs for thirty, so boss fire does not accumulate
 * across the arena.
 */
export const BOSS_BULLET_RADIUS = 6;
export const BOSS_BULLET_DAMAGE = 2;
export const BOSS_BULLET_LIFETIME = 90;

/**
 * `lifeTimeMax = 900` — thirty seconds.
 *
 * Long enough that in practice a Basic shot leaves the room rather than
 * expiring; the short-lived types are the boss and hook variants.
 */
export const BASIC_BULLET_LIFETIME = 900;

/** Below this many frames left, the bullet fades out (`:1499`). */
export const BULLET_FADE_FRAMES = 10;

export interface EnemyBulletState {
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  rotation: number;
  radius: number;
  damage: number;
  lifeTime: number;
  lifeTimeMax: number;
}

export interface ShooterState {
  /** Frames until this enemy may fire again. */
  reloadTime: number;
  reloadTimeMax: number;
}

/**
 * Initial reload for a freshly spawned shooter — `:3288`.
 *
 *     reloadTime = round(random() * (reloadTimeMax - 10)) + 10
 *
 * Randomised on purpose. Without it every enemy of a wave, all spawned from
 * the same timer, would fire in perfect unison. The `+ 10` floor also means a
 * shooter never arrives already loaded.
 */
export function initialReloadTime(reloadTimeMax: number, random: () => number): number {
  return Math.round(random() * (reloadTimeMax - 10)) + 10;
}

export function createShooter(reloadTimeMax: number, random: () => number): ShooterState {
  return { reloadTime: initialReloadTime(reloadTimeMax, random), reloadTimeMax };
}

/**
 * Counts a shooter's reload down.
 *
 * The AS3 decrements by one per frame and tests `== 0`; this clamps at zero so
 * a fractional delta cannot step over the trigger.
 */
export function tickShooter(state: ShooterState, deltaMs: number): ShooterState {
  const frames = (deltaMs / 1000) * AS3_FPS;
  return { ...state, reloadTime: Math.max(0, state.reloadTime - frames) };
}

/**
 * Whether this enemy fires now.
 *
 * A frozen enemy does not shoot (`:6889` gates on `!theEnemy.frozen`), which is
 * the second thing freeze does beyond stopping movement.
 */
export function canShoot(state: ShooterState, frozen: boolean): boolean {
  return !frozen && state.reloadTime <= 0;
}

/** Resets the timer after firing — `:7032`. */
export function registerShot(state: ShooterState): ShooterState {
  return { ...state, reloadTime: state.reloadTimeMax };
}

export interface ShooterOrigin {
  x: number;
  y: number;
  /** Degrees. The enemy's facing, which is where a `Front` shot goes. */
  rotation: number;
  radius: number;
}

/**
 * The per-class figures a shot is built from.
 *
 * Every bullet leaves the enemy's edge rather than its centre — `enemy.radius +
 * bullet.radius` along its heading — so a shot never starts inside its owner.
 * `bulletSpeedMultiplier` is the difficulty scaling applied at `:6905`; Easy
 * is 1.
 */
export interface BulletClassSpec {
  radius: number;
  damage: number;
  lifeTime: number;
}

export const BASIC_BULLET: BulletClassSpec = {
  radius: BASIC_BULLET_RADIUS,
  damage: BASIC_BULLET_DAMAGE,
  lifeTime: BASIC_BULLET_LIFETIME,
};

export const BASIC_BOSS_BULLET: BulletClassSpec = {
  radius: BOSS_BULLET_RADIUS,
  damage: BOSS_BULLET_DAMAGE,
  lifeTime: BOSS_BULLET_LIFETIME,
};

/** Bullet classes this slice can build; anything else is not ported. */
export const SUPPORTED_SHOOT_TYPES = ['Basic', 'BasicBoss'] as const;
/** Firing patterns this slice can lay out. */
export const SUPPORTED_SHOOT_ANGLES = ['Front', 'Circle'] as const;

export function bulletClassFor(shootType: string | undefined): BulletClassSpec | null {
  if (shootType === 'Basic') return BASIC_BULLET;
  if (shootType === 'BasicBoss') return BASIC_BOSS_BULLET;
  return null;
}

/** Builds one bullet at a given heading. Shared by both patterns. */
function bulletAtAngle(
  origin: ShooterOrigin,
  degrees: number,
  spec: BulletClassSpec,
  bulletSpeedMultiplier: number,
): EnemyBulletState {
  const radians = (degrees * Math.PI) / 180;
  const speed = BASIC_BULLET_SPEED * bulletSpeedMultiplier;
  const offset = origin.radius + spec.radius;

  return {
    x: origin.x + Math.cos(radians) * offset,
    y: origin.y + Math.sin(radians) * offset,
    xVel: Math.cos(radians) * speed,
    yVel: Math.sin(radians) * speed,
    rotation: degrees,
    radius: spec.radius,
    damage: spec.damage,
    lifeTime: spec.lifeTime,
    lifeTimeMax: spec.lifeTime,
  };
}

/**
 * `shootAngle: "Front"` — a single shot along the enemy's facing (`:6981`).
 */
export function createFrontShot(
  origin: ShooterOrigin,
  spec: BulletClassSpec,
  bulletSpeedMultiplier = 1,
): EnemyBulletState[] {
  return [bulletAtAngle(origin, origin.rotation, spec, bulletSpeedMultiplier)];
}

/**
 * `shootAngle: "Circle"` — `bulletAmount` shots evenly around a full turn,
 * from a **random** starting angle (`:7016`).
 *
 *     rotation = random()*360 + b * (360 / bulletAmount)
 *
 * The random offset is what stops a Crazy's six-bullet ring landing in the
 * same six directions every time, so consecutive volleys cannot be dodged by
 * standing in a fixed gap. It ignores the enemy's facing entirely, which is
 * why Circle enemies threaten in every direction regardless of where they are
 * pointed.
 */
export function createCircleShot(
  origin: ShooterOrigin,
  spec: BulletClassSpec,
  bulletAmount: number,
  random: () => number,
  bulletSpeedMultiplier = 1,
): EnemyBulletState[] {
  const count = Math.max(1, Math.trunc(bulletAmount));
  const start = random() * 360;

  return Array.from({ length: count }, (_, b) =>
    bulletAtAngle(origin, start + b * (360 / count), spec, bulletSpeedMultiplier),
  );
}

/**
 * The volley an enemy fires, or an empty array when its combination is not
 * ported. Returning empty rather than throwing keeps an unported enemy
 * harmless instead of taking the scene down.
 */
export function createVolley(
  origin: ShooterOrigin,
  shootType: string | undefined,
  shootAngle: string | undefined,
  bulletAmount: number,
  random: () => number,
  bulletSpeedMultiplier = 1,
): EnemyBulletState[] {
  const spec = bulletClassFor(shootType);
  if (!spec) return [];

  if (shootAngle === 'Front') return createFrontShot(origin, spec, bulletSpeedMultiplier);
  if (shootAngle === 'Circle') {
    return createCircleShot(origin, spec, bulletAmount, random, bulletSpeedMultiplier);
  }
  return [];
}

export interface RoomBounds {
  roomWidth: number;
  roomHeight: number;
}

/**
 * Advances an enemy bullet, returning null once it expires or leaves the room.
 *
 * Both endings are the same branch in the AS3 (`:1504`): a bullet dies when its
 * lifetime runs out **or** when it passes the room edge.
 */
export function advanceEnemyBullet(
  bullet: EnemyBulletState,
  bounds: RoomBounds,
  deltaMs: number,
): EnemyBulletState | null {
  const frames = (deltaMs / 1000) * AS3_FPS;
  const x = bullet.x + bullet.xVel * frames;
  const y = bullet.y + bullet.yVel * frames;
  const lifeTime = Math.max(0, bullet.lifeTime - frames);

  if (lifeTime <= 0) return null;
  if (
    x < -bullet.radius ||
    x > bounds.roomWidth + bullet.radius ||
    y < -bullet.radius ||
    y > bounds.roomHeight + bullet.radius
  ) {
    return null;
  }

  return { ...bullet, x, y, lifeTime };
}

/** Alpha for the fade-out over the last ten frames — `:1501`. */
export function bulletAlpha(bullet: EnemyBulletState): number {
  if (bullet.lifeTime > BULLET_FADE_FRAMES) return 1;
  return 0.3 + 0.7 * (bullet.lifeTime / BULLET_FADE_FRAMES);
}

export interface HitTarget {
  x: number;
  y: number;
  radius: number;
}

/** Whether the bullet is touching the tank. */
export function hitsTank(bullet: EnemyBulletState, tank: HitTarget): boolean {
  return Math.hypot(tank.x - bullet.x, tank.y - bullet.y) <= tank.radius + bullet.radius;
}

/**
 * Tank health after taking a hit, floored at zero.
 *
 * `:1574` reads `if (hp - damage > 0) hp -= damage; else hp = 0`, so a hit that
 * would overkill sets exactly zero rather than going negative.
 */
export function applyBulletToTank(hp: number, damage: number): number {
  return hp - damage > 0 ? hp - damage : 0;
}
