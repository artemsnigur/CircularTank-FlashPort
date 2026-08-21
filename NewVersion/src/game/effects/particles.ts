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
/*
 * ── These are the AS3's own figures, and they stay that way (T220) ────────
 *
 * T219 scaled velocity and lifetime by 1.9 and the burst count by 1.55, on
 * the reasoning that the effect was hard to see. Reverted by request: the
 * original is a small, quick puff on purpose, and the port matches `:820-825`
 * term for term again. **Do not scale these without being asked** — the
 * understatement is the intended look, not a defect to correct.
 */
export const DEBRIS_PRESET: Omit<ParticlePreset, 'sprite'> = {
  velocity: 1.5,
  velocityRandom: 1,
  friction: 0.2,
  lifeTime: 5,
  lifeTimeRandom: 10,
  scaleMax: 2,
  scaleMin: 0.2,
  killVelocity: 0,
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
  /**
   * ── Divergence: a flame on a burning enemy (T233) ──────────────────────
   *
   * **There is no `Burn` particle in the AS3.** `A82` established that by
   * three sweeps: fire is not a status there, only per-frame contact damage,
   * so the original shows nothing on an enemy standing in lava beyond the red
   * damage flash. This was added by request, because "enemies just walking on
   * lava die, there are no particles".
   *
   * It borrows the original's *shape* even though the effect is new: the AS3
   * already has one continuous status emitter — poison's, on its own 3-frame
   * clock at `:6375` — and this is the same arrangement on a 4-frame one. That
   * matters more than it sounds: emitting per damage tick would be **30 a
   * second per enemy**, and the cadence is what keeps a crowd affordable.
   *
   * The art is the muzzle flare, which is a real flame drawn for this game.
   * Its registration point is its flat base (`PARTICLE_ANCHORS` gives it
   * `originX: 0`), so a flame *extends from* where it is spawned rather than
   * straddling it — exactly what is wanted licking up off a body. It carries
   * four frames, so `particleFrame` gives it the same flicker the muzzle now
   * has.
   *
   * `facesStartAngle` because each flame is spawned individually with its own
   * jittered angle: the shared `startAngle` *is* this flame's angle, and both
   * its heading and its rotation come from it.
   */
  Burn: {
    sprite: 'MuzzleFlareSmall',
    velocity: 1.2, velocityRandom: 0.8, friction: 0.15,
    lifeTime: 6, lifeTimeRandom: 4,
    scaleMax: 0.9, scaleMin: 0.15, killVelocity: -1, facesStartAngle: true,
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
  /**
   * The clip frame, chosen once at spawn — see `particleFrame`.
   *
   * Fixed for the particle's life, exactly as `gotoAndStop` is: none of these
   * clips animates. The field exists because the draw site used to ask for
   * frame 1 unconditionally, which drew the ordinary poison puff on bosses and
   * flattened the muzzle flares to one of their four.
   */
  frame: number;
}

/**
 * The clip frame a particle draws — `gotoAndStop` in `spawnParticle`.
 *
 * ── There are exactly three rules, and only two are random ────────────────
 * Every `gotoAndStop` in the whole spawner was listed before writing this,
 * because the obvious implementation — "pick a random frame from the clip's
 * frames" — is wrong for two of the five multi-frame clips:
 *
 *   `Poison` / `PoisonBoss`  `:844` / `:850`. **Fixed, not random**: frame 1
 *                            for the ordinary puff and frame 2 for the boss's.
 *                            It is a boss distinction wearing a frame, and
 *                            randomising it would draw the small puff on a
 *                            boss half the time.
 *   `Magic`                  `:871-882`. Random over three, at `< 0.33`,
 *                            `< 0.66`, else — so **34%** for the third, not a
 *                            clean third.
 *   the three muzzle flares  `:915`. `round(1 + random() * 3)` over four, and
 *                            rounding skews it: frames 2 and 3 come up about
 *                            a third each, frames 1 and 4 about a sixth. Same
 *                            shape as the ice block's frame draw.
 *
 * `Reflect` has **three** frames and no `gotoAndStop` anywhere, so it stays on
 * frame 1. That is the case a `frames.length`-driven implementation would get
 * wrong while looking more thorough, and it is why this is a table of rules
 * rather than a loop over the art.
 *
 * Everything else is a single-frame clip and returns 1 trivially.
 */
export function particleFrame(type: string, random: () => number = Math.random): number {
  if (type === 'Poison') return 1;
  if (type === 'PoisonBoss') return 2;

  if (type === 'Magic') {
    const roll = random();
    if (roll < 0.33) return 1;
    if (roll < 0.66) return 2;
    return 3;
  }

  if (type.startsWith('MuzzleFlare')) return Math.round(1 + random() * 3);

  // T233's invented `Burn` draws the flare art, so it takes the flare's rule.
  // Not an AS3 line — there is no `Burn` particle there at all (`A82`).
  if (type === 'Burn') return Math.round(1 + random() * 3);

  return 1;
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
      frame: particleFrame(input.type, random),
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
