/**
 * Enemy bullet art — the six `EnemyBullet*` classes.
 *
 * Built at `PartGameArea.as:6918-6964`, one class per `shootType`. The port
 * drew all six as a single red-tinted `particle-dot`, which was a real
 * infidelity rather than a faithful simplification: the original has distinct
 * art per class.
 *
 * ── Frame 2 is a selection, not an animation ──────────────────────────────
 * Five of the six clips have two frames, and the question pass (c) asks of any
 * multi-frame clip is whether the AS3 lets it play or pins it. Here it pins:
 *
 *   `:6975`  `eBullet.gotoAndStop(1)` on spawn, for every non-Trap type.
 *   `:1600`  `theBullet.gotoAndStop(2)` — the **only** other frame call —
 *            fires beside `:1601`'s `reflected = true`.
 *
 * So frame 1 is the ordinary round and frame 2 is the one the tank's shield or
 * the `BulletReflect` upgrade has turned around. That is the same shape as
 * `BulletGummyBear`'s bounce stage: a frame that means a *state*, and animating
 * it would invent motion the original does not have.
 *
 * `:1600` operates on `theBullet` with no class branch, so the rule is one rule
 * across all five. `EnemyBulletTrap` has a single frame and `:6976-6979` adds it
 * to `enemyTrapLayer` **without** any `gotoAndStop`, so there is nothing to
 * select for it.
 *
 * ── Facing ────────────────────────────────────────────────────────────────
 * Enemy bullets carry their travel bearing in `rotation` and the AS3 renders
 * them with it, exactly as player projectiles do (T88). It is written at spawn
 * (`:6985` and the fan branches around it, from the firing enemy's rotation)
 * and rewritten on reflection (`:1595`, `rotation = theAngleToTank`). So the
 * sprite is rotated to `state.rotation`, and a reflected round visibly turns.
 *
 * ── Sizes ─────────────────────────────────────────────────────────────────
 * From the SWF's authored dimensions, **not** from `radius`. The two are
 * separate quantities — the rule T85 set when projectile art stopped being
 * sized from `bulletRadius`, and the AS3's own radii disagree with its art
 * (`Basic` is `radius = 4` against an 11px clip).
 */

/** One class's frames and drawn size. */
interface EnemyBulletArt {
  /** `[normal, reflected]`; a single entry where the clip has one frame. */
  frames: readonly number[];
  /** Authored width and height, in design units. */
  width: number;
  height: number;
}

/**
 * `shootType` -> art. Keys are the AS3's own `shootType` strings, which
 * `enemyStatsArray[8]` supplies (`:3284`).
 */
export const ENEMY_BULLET_ART: Readonly<Record<string, EnemyBulletArt>> = {
  // sprite 1175
  Basic: { frames: [1173, 1174], width: 11, height: 11 },
  // sprite 1166
  BasicBoss: { frames: [1164, 1165], width: 16, height: 16 },
  // sprite 1160 — one frame, and never pinned (`:6976-6979`).
  Trap: { frames: [1159], width: 17, height: 17 },
  // sprite 1169 — the only non-square clip.
  Hook: { frames: [1167, 1168], width: 12, height: 15 },
  // sprite 1172
  Following: { frames: [1170, 1171], width: 11, height: 11 },
  // sprite 1163
  FollowingBoss: { frames: [1161, 1162], width: 16, height: 16 },
};

/**
 * The texture key for a round of this type in this state.
 *
 * `reflected` selects frame 2 where the clip has one — `:1600`. A single-frame
 * clip keeps its only frame, which is what `Trap` needs and is also the safe
 * answer for an unknown `shootType`.
 */
export function enemyBulletTexture(
  shootType: string | undefined,
  reflected = false,
): string | undefined {
  const art = shootType === undefined ? undefined : ENEMY_BULLET_ART[shootType];
  if (!art) return undefined;
  const frame = reflected && art.frames.length > 1 ? art.frames[1] : art.frames[0];
  return `unit-${frame}`;
}

/** The drawn size for a round of this type, or undefined for an unknown one. */
export function enemyBulletSize(
  shootType: string | undefined,
): { width: number; height: number } | undefined {
  const art = shootType === undefined ? undefined : ENEMY_BULLET_ART[shootType];
  return art ? { width: art.width, height: art.height } : undefined;
}
