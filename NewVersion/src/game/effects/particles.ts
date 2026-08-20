/**
 * Particles — `PartGameArea.as:718` (`spawnParticle`), `:6960` (`handleParticles`).
 *
 * One parameterised system, not several behaviours sharing a name: a type
 * selects a physics preset and a sprite, and everything else comes from the
 * call. 64 call sites across the AS3, and every impact, death, heal and
 * strength/weakness cue in the game runs through it.
 *
 * ── This one draws from `Math.random`, not `PM_PRNG` ──────────────────────
 * Every randomised term — velocity, lifetime, spawn angle, and in the original
 * the variant frame —
 * uses the unseeded generator. **Particles are not inside any stream**, so
 * unlike the background props there is no draw order to preserve and nothing
 * shifts if a spawn is added or removed. Established by reading every
 * assignment in `spawnParticle`; it is the reason this subsystem is cheap.
 *
 * The consequence for tests: *what a spawn produced* is not assertable without
 * pinning `Math.random`. `tickParticles` is pure and fully assertable, and the
 * tables below are checkable against the source. Those are the two things
 * tested; nothing asserts a specific spawned particle.
 */

/** Frames, velocities and scales are all in AS3 units at 30 fps. */
export interface ParticlePreset {
  /** Sprite class, minus the `Particle` prefix — `ParticleBlack` is `Black`. */
  sprite: string;
  /** Base speed before `addVel` and the per-particle random term. */
  velocity: number;
  /** Random amount added to `velocity`. 0 means the speed is exact. */
  velocityRandom: number;
  friction: number;
  /** Base lifetime in frames, before `lifeTimeRandom`. */
  lifeTime: number;
  lifeTimeRandom: number;
  scaleMax: number;
  scaleMin: number;
  /**
   * Removal trips when `velocity` reaches this — `:6996`.
   *
   * `0` for the debris types, which therefore die the moment friction stops
   * them. `-1` is unreachable by a decaying non-negative velocity, so those
   * types live out their full lifetime instead.
   */
  killVelocity: number;
  /** Spawn offset is scaled by `1 - rand * rand` rather than used flat — `:770`. */
  randomDistance?: boolean;
  /** Facing comes from `startAngle` rather than the movement angle. */
  facesStartAngle?: boolean;
}

/**
 * The debris preset — every `Enemy*` colour shares it (`:730-742`).
 *
 * The AS3 spells this as a long negative type check (`!= "BulletDestroy" &&
 * != "Poison" && …`) with a colour switch inside. Same rule, stated positively:
 * anything not named below is debris.
 */
/**
 * ── Divergence: death debris carries further and lasts longer (T219) ──────
 *
 * The AS3's figures are kept below as `AS3_DEBRIS` and this scales two of
 * them. Nothing here was wrong — the port matched `:820-825` exactly — it was
 * simply a small effect:
 *
 *   velocity `1.5 + random()` against friction `0.2` is spent in about a
 *   dozen frames, and `lifeTime` is `5 + random() * 10` — between **6 and 17
 *   hundredths of a second** at 30fps. Debris travelled roughly 10 to 15
 *   units and was gone before the eye found it.
 *
 * Velocity and lifetime are scaled together, because scaling either alone
 * looks wrong in a specific way: more speed with the same life is a flicker
 * that ends mid-flight, and more life at the same speed is debris hanging
 * still. Friction is **not** scaled — it is what makes the burst decelerate
 * and settle, and raising it with the rest would flatten the arc back out.
 *
 * The scale is deliberately modest. This fires on every kill, so the failure
 * mode of overdoing it is a screen of confetti during an ordinary wave, which
 * is worse than the understatement being fixed.
 */
export const DEBRIS_SCALE = 1.9;

/**
 * How many more pieces a body breaks into — `:6837` passes `radius / 1.5`.
 *
 * Separate from `DEBRIS_SCALE` because they fail differently: too much speed
 * or life looks *wrong*, too many pieces costs frames. This is the one to
 * lower first if a crowded wave ever drops frames.
 */
export const DEBRIS_COUNT_SCALE = 1.55;

/** `:820-825` — the original's own numbers, kept for the source-pinning test. */
export const AS3_DEBRIS = {
  velocity: 1.5,
  velocityRandom: 1,
  friction: 0.2,
  lifeTime: 5,
  lifeTimeRandom: 10,
  scaleMax: 2,
  scaleMin: 0.2,
  killVelocity: 0,
} as const;

export const DEBRIS_PRESET: Omit<ParticlePreset, 'sprite'> = {
  velocity: AS3_DEBRIS.velocity * DEBRIS_SCALE,
  velocityRandom: AS3_DEBRIS.velocityRandom * DEBRIS_SCALE,
  friction: AS3_DEBRIS.friction,
  lifeTime: Math.round(AS3_DEBRIS.lifeTime * DEBRIS_SCALE),
  lifeTimeRandom: Math.round(AS3_DEBRIS.lifeTimeRandom * DEBRIS_SCALE),
  scaleMax: AS3_DEBRIS.scaleMax,
  scaleMin: AS3_DEBRIS.scaleMin,
  killVelocity: AS3_DEBRIS.killVelocity,
};

export const PARTICLE_PRESETS: Readonly<Record<string, ParticlePreset>> = {
  BulletDestroy: {
    sprite: 'Black',
    velocity: 0.5, velocityRandom: 1.5, friction: 0.1,
    lifeTime: 5, lifeTimeRandom: 5,
    scaleMax: 1.5, scaleMin: 0.2, killVelocity: 0,
  },
  Poison: {
    sprite: 'Poison',
    velocity: 0, velocityRandom: 0, friction: 0.1,
    lifeTime: 10, lifeTimeRandom: 0,
    scaleMax: 0, scaleMin: 0, killVelocity: 0,
  },
  PoisonBoss: {
    sprite: 'Poison',
    velocity: 0, velocityRandom: 0, friction: 0.1,
    lifeTime: 20, lifeTimeRandom: 0,
    scaleMax: 0, scaleMin: 0, killVelocity: 0,
  },
  Smoke: {
    sprite: 'Smoke',
    velocity: 1.5, velocityRandom: 1, friction: 0.5,
    lifeTime: 15, lifeTimeRandom: 10,
    scaleMax: 3, scaleMin: 0.2, killVelocity: -1,
  },
  Magic: {
    sprite: 'Magic',
    velocity: 2, velocityRandom: 1.4, friction: 0.6,
    lifeTime: 5, lifeTimeRandom: 5,
    scaleMax: 1, scaleMin: 0.2, killVelocity: -1,
  },
  MuzzleFlareSmall: {
    sprite: 'MuzzleFlareSmall',
    velocity: 0, velocityRandom: 0, friction: 0,
    lifeTime: 2, lifeTimeRandom: 0,
    scaleMax: 1, scaleMin: 1, killVelocity: -1, facesStartAngle: true,
  },
  MuzzleFlareMedium: {
    sprite: 'MuzzleFlareMedium',
    velocity: 0, velocityRandom: 0, friction: 0,
    lifeTime: 2, lifeTimeRandom: 0,
    scaleMax: 1, scaleMin: 1, killVelocity: -1, facesStartAngle: true,
  },
  MuzzleFlareBig: {
    sprite: 'MuzzleFlareBig',
    velocity: 0, velocityRandom: 0, friction: 0,
    lifeTime: 2, lifeTimeRandom: 0,
    scaleMax: 1, scaleMin: 1, killVelocity: -1, facesStartAngle: true,
  },
  Reflect: {
    sprite: 'Reflect',
    velocity: 0, velocityRandom: 0, friction: 0,
    lifeTime: 4, lifeTimeRandom: 0,
    scaleMax: 1, scaleMin: 1, killVelocity: -1, facesStartAngle: true,
  },
  Heal: {
    sprite: 'Heal',
    velocity: 2.75, velocityRandom: 0, friction: 0.1,
    lifeTime: 20, lifeTimeRandom: 0,
    scaleMax: 1, scaleMin: 0.5, killVelocity: -1,
  },
  HealBoss: {
    sprite: 'HealBoss',
    velocity: 2.75, velocityRandom: 0, friction: 0.1,
    lifeTime: 20, lifeTimeRandom: 0,
    scaleMax: 2, scaleMin: 0.5, killVelocity: -1,
  },
  Immune: {
    sprite: 'Immune',
    velocity: 1.5, velocityRandom: 1, friction: 0.5,
    lifeTime: 15, lifeTimeRandom: 10,
    scaleMax: 3, scaleMin: 0.2, killVelocity: -1,
  },
  Strength: {
    sprite: 'Strength',
    velocity: 0, velocityRandom: 0, friction: 0,
    lifeTime: 20, lifeTimeRandom: 0,
    scaleMax: 1.1, scaleMin: 0, killVelocity: -1, randomDistance: true,
  },
  Weakness: {
    sprite: 'Weakness',
    velocity: 0, velocityRandom: 0, friction: 0,
    lifeTime: 20, lifeTimeRandom: 0,
    scaleMax: 1.1, scaleMin: 0, killVelocity: -1, randomDistance: true,
  },
};

/**
 * Types whose alpha fades over their life — `:6984-6992`.
 *
 * **Four of thirty-two, and that is the point.** Every other particle holds full
 * opacity and disappears when its lifetime runs out. Heal fades linearly;
 * Strength and Weakness fade on the *square* of remaining life, so they hold
 * longer and then vanish quickly.
 *
 * A tidy-up that gives every particle a fade would look like an improvement and
 * would be wrong for twenty-eight of them. Pinned against a type that has no
 * rule rather than on its own.
 */
export const ALPHA_LINEAR = new Set(['Heal', 'HealBoss']);
export const ALPHA_SQUARED = new Set(['Strength', 'Weakness']);

export interface Particle {
  type: string;
  x: number;
  y: number;
  /** Degrees. Direction of travel, and of the sprite unless `facesStartAngle`. */
  moveAngle: number;
  rotation: number;
  velocity: number;
  friction: number;
  lifeTime: number;
  lifeTimeMax: number;
  scaleMax: number;
  scaleMin: number;
  killVelocity: number;
  /** Current drawn scale and opacity, recomputed each tick. */
  scale: number;
  alpha: number;
}

export function presetFor(type: string): ParticlePreset {
  return PARTICLE_PRESETS[type] ?? { sprite: type.replace(/^Enemy/, ''), ...DEBRIS_PRESET };
}

export interface SpawnInput {
  type: string;
  count: number;
  x: number;
  y: number;
  distance?: number;
  startAngle?: number;
  randAngle?: number;
  addVel?: number;
  addMaxScale?: number;
  addMinScale?: number;
  /** Injectable only so a test can build a known particle to tick. */
  random?: () => number;
}

/**
 * Builds `count` particles — `:750-775`.
 *
 * Returns them rather than adding them to a layer, so the physics can be driven
 * without a scene. **Nothing here is worth asserting against fixed values**: the
 * velocity, lifetime and angle all carry a random term, so an assertion on a
 * spawned particle pins `Math.random` rather than the port.
 */
export function spawnParticles(input: SpawnInput): Particle[] {
  const random = input.random ?? Math.random;
  const preset = presetFor(input.type);
  const {
    distance = 5, startAngle = 0, randAngle = 360,
    addVel = 0, addMaxScale = 0, addMinScale = 0,
  } = input;

  const made: Particle[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const velocity = preset.velocity + addVel + random() * preset.velocityRandom;
    const lifeTime = Math.round(preset.lifeTime + random() * preset.lifeTimeRandom);
    const moveAngle = startAngle - randAngle / 2 + random() * randAngle;

    // `:757` — the offset is along the movement angle, and `randomDistance`
    // types bunch toward the centre by scaling it with `1 - r * r`.
    const spread = preset.randomDistance ? 1 - random() * random() : 1;
    const radians = (moveAngle * Math.PI) / 180;
    const offset = distance > 0 ? distance * spread : 0;

    made.push({
      type: input.type,
      x: input.x + Math.cos(radians) * offset,
      y: input.y + Math.sin(radians) * offset,
      moveAngle,
      rotation: preset.facesStartAngle ? startAngle : random() * 360,
      velocity,
      friction: preset.friction,
      lifeTime,
      lifeTimeMax: lifeTime,
      scaleMax: preset.scaleMax + addMaxScale,
      scaleMin: preset.scaleMin + addMinScale,
      killVelocity: preset.killVelocity,
      scale: preset.scaleMax + addMaxScale,
      alpha: 1,
    });
  }
  return made;
}

/** Opacity for one particle — `:6984-6992`. 1 for everything but four types. */
export function alphaFor(type: string, lifeTime: number, lifeTimeMax: number): number {
  if (lifeTimeMax === 0) return 1;
  const remaining = lifeTime / lifeTimeMax;
  if (ALPHA_LINEAR.has(type)) return remaining * 0.75;
  if (ALPHA_SQUARED.has(type)) return remaining * remaining;
  return 1;
}

/**
 * Whether a particle should be removed — `:6996`.
 *
 * Two conditions, and **`Poison` is carved out of the second**: it spawns at
 * velocity 0, which already equals its `killVelocity`, so without the exception
 * it would be removed on its first tick and never appear at all. It lives out
 * its lifetime instead.
 *
 * A term-for-term port drops that clause easily — the general path still looks
 * right, and the only symptom is one effect silently missing. Asserted against
 * a non-poison type on the same condition rather than on its own.
 */
export function isDead(particle: Particle): boolean {
  if (particle.lifeTime === 0) return true;
  if (particle.type === 'Poison' || particle.type === 'PoisonBoss') return false;
  return particle.velocity === particle.killVelocity;
}

/**
 * One frame — `:6962-6994`.
 *
 * Velocity decays by friction and is floored at zero; position integrates along
 * `moveAngle`; scale interpolates from `scaleMin` at death to `scaleMax` at
 * spawn, which is why a particle *shrinks* as it ages.
 */
export function tickParticle(particle: Particle): Particle {
  const velocity = particle.velocity - particle.friction > 0
    ? particle.velocity - particle.friction
    : 0;

  const radians = (particle.moveAngle * Math.PI) / 180;
  const lifeTime = particle.lifeTime - 1;
  const remaining = particle.lifeTimeMax === 0 ? 0 : lifeTime / particle.lifeTimeMax;

  return {
    ...particle,
    velocity,
    x: particle.x + Math.cos(radians) * velocity,
    y: particle.y + Math.sin(radians) * velocity,
    lifeTime,
    scale: particle.scaleMin + (particle.scaleMax - particle.scaleMin) * remaining,
    alpha: alphaFor(particle.type, lifeTime, particle.lifeTimeMax),
  };
}

/**
 * Advances every particle and drops the dead ones.
 *
 * ── Where step 2 must call this, and where it must not ────────────────────
 * **`handleParticles` runs OUTSIDE the `if(!levelDone)` gate.** In
 * `PartGameArea.update` the order is `handleBullets` → `handleEnemyBullets` →
 * `if (!levelDone) { … handleMines, handleGround, tankAttack, spawnWarnings,
 * handleEnemies … }` → `handleEnemyIndicators` → `handleExplosions` →
 * `handleExplosionQueue` → **`handleParticles` (`:2839`)** → `handleMoney`.
 *
 * So particles keep moving and fading after a level ends, and that is visible:
 * the post-level screen dims over a world where the last death's debris is
 * still settling. Wire this inside the level-done gate and everything freezes
 * mid-flight the instant the level resolves.
 *
 * **The risk is specific rather than hypothetical.** Every gameplay system the
 * port has wired so far lives inside that gate, so the natural place to put
 * this call is beside them — which would be wrong. Ordering has already cost
 * this port twice: `:7083`'s reachability turns on `handleGround` running
 * before `tankAttack`, and the laser's half-frame skew on `tankAttack` sitting
 * between the two functions that read the beam.
 */
export function tickParticles(particles: readonly Particle[]): Particle[] {
  return particles.map(tickParticle).filter((p) => !isDead(p));
}
