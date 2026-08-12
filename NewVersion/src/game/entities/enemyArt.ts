/**
 * Enemy art — which shape each `Enemy*` clip's frames draw, and how big it is.
 *
 * Generated from `assets.swf` the way `propArt.ts` and `particleArt.ts` were:
 * every `DefineSprite` frame places one `DefineShape`, so a frame maps to a
 * shape id and JPEXS's `shapes/<id>.svg` is the art. All 40 clips resolved and
 * all 48 shapes were already exported — no extraction step.
 *
 * ── `size` is not decoration; it is the collision radius ──────────────────
 * The AS3 sets `enemy.radius = enemy.width / 2` (`PartGameArea.as:3318`), so
 * the authored sprite width *is* the hitbox. This port previously used one
 * invented diameter for every normal enemy and another for every boss, which
 * made contact range wrong by up to 2.9x per type. `size` carries the authored
 * width so `Enemy` can derive the radius the way the source does, and the
 * reconciliation test drives it against the SVG rather than against this table.
 *
 * Widths are odd numbers (17, 19, 21…) because the authored shape carries a
 * 0.5-unit stroke on each side. The AS3 halves the width as-is and so does
 * this, stroke included — that is where `Tank.radius = 14` against a 29-wide
 * body comes from.
 *
 * ── Two-frame types ───────────────────────────────────────────────────────
 * Ghost, ScaredGhost, Teleporting and Temperamental (and their bosses) have a
 * second frame for their altered state — invisible for the two ghosts
 * (`:4824`, `:4844`), mid-teleport and enraged for the others. Every other type
 * has one frame.
 */
export interface EnemyClip {
  /** `assets.swf` character id. */
  symbol: number;
  /** Shape id per 1-based frame. */
  frames: readonly number[];
  /** Authored sprite width in design units. Halved, this is the radius. */
  size: number;
}

export const ENEMY_CLIPS: Readonly<Record<string, EnemyClip>> = {
  Accelerating: { symbol: 302, frames: [301], size: 21 },
  AcceleratingBoss: { symbol: 300, frames: [299], size: 101 },
  Basic: { symbol: 1353, frames: [1352], size: 17 },
  BasicBoss: { symbol: 276, frames: [275], size: 81 },
  Crazy: { symbol: 306, frames: [305], size: 21 },
  CrazyBoss: { symbol: 304, frames: [303], size: 101 },
  DamageAddict: { symbol: 314, frames: [313], size: 27 },
  DamageAddictBoss: { symbol: 312, frames: [311], size: 131 },
  Exploding: { symbol: 1414, frames: [1413], size: 19 },
  ExplodingBoss: { symbol: 320, frames: [319], size: 91 },
  Fast: { symbol: 350, frames: [349], size: 17 },
  FastBoss: { symbol: 348, frames: [347], size: 81 },
  Ghost: { symbol: 294, frames: [292, 293], size: 19 },
  GhostBoss: { symbol: 279, frames: [277, 278], size: 91 },
  GrapplingHook: { symbol: 1410, frames: [1409], size: 13 },
  GrapplingHookBoss: { symbol: 342, frames: [341], size: 61 },
  Medic: { symbol: 310, frames: [309], size: 17 },
  MedicBoss: { symbol: 308, frames: [307], size: 81 },
  Ninja: { symbol: 298, frames: [297], size: 17 },
  NinjaBoss: { symbol: 296, frames: [295], size: 81 },
  Random: { symbol: 318, frames: [317], size: 21 },
  RandomBoss: { symbol: 316, frames: [315], size: 101 },
  ScaredGhost: { symbol: 291, frames: [289, 290], size: 17 },
  ScaredGhostBoss: { symbol: 288, frames: [286, 287], size: 81 },
  Shooting: { symbol: 274, frames: [273], size: 21 },
  ShootingBoss: { symbol: 272, frames: [271], size: 101 },
  Shrinking: { symbol: 324, frames: [323], size: 23 },
  ShrinkingBoss: { symbol: 322, frames: [321], size: 111 },
  Soldier: { symbol: 1408, frames: [1407], size: 19 },
  SoldierBoss: { symbol: 332, frames: [331], size: 91 },
  Strong: { symbol: 334, frames: [333], size: 25 },
  StrongBoss: { symbol: 336, frames: [335], size: 121 },
  Teleporting: { symbol: 330, frames: [328, 329], size: 15 },
  TeleportingBoss: { symbol: 327, frames: [325, 326], size: 71 },
  Temperamental: { symbol: 285, frames: [283, 284], size: 19 },
  TemperamentalBoss: { symbol: 282, frames: [280, 281], size: 91 },
  Tiny: { symbol: 1412, frames: [1411], size: 9 },
  TinyBoss: { symbol: 346, frames: [345], size: 41 },
  Trap: { symbol: 344, frames: [343], size: 13 },
  TrapBoss: { symbol: 340, frames: [339], size: 61 },
};

/**
 * The clip key for a type at a level — `Basic` or `BasicBoss`.
 *
 * The AS3 has no such function: it instantiates `new EnemyBasicBoss()` by name
 * at the spawn dispatch, so the pairing is enforced by the compiler there. Here
 * it is one rule in one place, and `enemyArt.test.ts` asserts every type
 * resolves at both levels — that assertion is what replaces the compiler, the
 * same trade `particleArt.ts` documents.
 */
export function enemyClipKey(enemyType: string, isBoss: boolean): string {
  return isBoss ? `${enemyType}Boss` : enemyType;
}

/** The shape a type draws on a given 1-based frame, clamped to its range. */
export function enemyShape(
  enemyType: string,
  isBoss: boolean,
  frame = 1,
): number | undefined {
  const clip = ENEMY_CLIPS[enemyClipKey(enemyType, isBoss)];
  if (!clip || clip.frames.length === 0) return undefined;
  return clip.frames[Math.min(Math.max(frame, 1), clip.frames.length) - 1];
}

/**
 * The collision radius for a type — `PartGameArea.as:3318`, `enemy.width / 2`.
 *
 * Returns undefined rather than a default for an unknown type. A fallback here
 * would be the invented-constant failure again, one layer down: every caller
 * would keep working and the wrong number would be invisible.
 */
export function enemyRadius(enemyType: string, isBoss: boolean): number | undefined {
  const clip = ENEMY_CLIPS[enemyClipKey(enemyType, isBoss)];
  return clip ? clip.size / 2 : undefined;
}

/**
 * The tint an enemy rests at once a damage flash ends — `uncolorClip`
 * (`PartGameArea.as:2129`), called at `:4511` when `damageIndicator` reaches 0.
 *
 * **`null` means no tint at all**, which is what `uncolorClip` does: it assigns
 * `new ColorTransform()`, the identity, restoring the clip's own colours. It
 * does *not* re-apply a base colour, and neither should this.
 *
 * ── The bug this exists to prevent (T114) ─────────────────────────────────
 * `Enemy` only tints its sprite at construction when the type has **no** real
 * art and falls back to `particle-dot`; every one of the twenty types has art
 * (`enemyArt.test.ts` pins that), so a real enemy starts untinted. The flash
 * reset nevertheless restored `baseTint` unconditionally, so the **first hit
 * permanently multiplied the artwork** by a colour that was never applied to
 * it — darkening and desaturating the sprite for the rest of its life.
 *
 * That single mistake produced both reported symptoms: a mid-grey particle
 * colour (`EnemyGrey` `0x9e9e9e`, `EnemyBlack` `0x4a4a4a`) read as "turned
 * grey", and any darkening multiply read as "lost opacity". **No alpha was ever
 * involved** — see `enemyVisibility.hidesWhenHurt`, which dims `ScaredGhost`
 * on damage and is faithful (`:4832-4850`).
 */
export function restingTint(usesFallbackArt: boolean, baseTint: number): number | null {
  return usesFallbackArt ? baseTint : null;
}
