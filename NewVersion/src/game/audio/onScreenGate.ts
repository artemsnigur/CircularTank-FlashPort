/**
 * Whether a world position is close enough to be heard — the AS3's on-screen
 * sound gate.
 *
 * ── It is binary, and that is deliberate ──────────────────────────────────
 * There is **no distance attenuation anywhere in the original**. A sound either
 * plays at full volume or does not play at all, decided by whether its source
 * lies within the camera rect expanded by `SOUND_HEARING_MARGIN`. No falloff,
 * no panning, no per-source volume — `playSound` sets one volume for every
 * one-shot.
 *
 * **This is the kind of rule a future reader will want to improve.** Turning it
 * into a distance falloff is a one-line change that sounds strictly better and
 * is a divergence: it would make distant explosions audible-but-quiet where the
 * original makes them silent, which changes what the player can infer about
 * off-screen events. If that is ever wanted it is a design decision, and it
 * belongs in `docs/AUDIT-2026-07.md` rather than in a tidy-up. See the
 * "code that looks wrong, is load-bearing" section — this is the same hazard as
 * the coin magnet's missing range limit, in the opposite direction.
 *
 * ── Which sounds use it ───────────────────────────────────────────────────
 * Not all of them, and that asymmetry is the point of the pairing test: six
 * sites in `PartGameArea` gate their push on this rule (`:4343` ExplosionSmall,
 * `:4948` TeleportOut, `:4975` TeleportIn, `:5197` BossCollision, `:5573`
 * ImpactLaser, `:6903` enemy fire), while the player's own weapon, the UI
 * sounds and the pickup sounds are ungated — they originate at the tank or at
 * the interface, which is always on screen. **That count is a floor**: it comes
 * from scanning near each push for the rule's distinctive operand, and the AS3
 * inlines this test rather than calling a helper.
 */

/** `:6900` — `distanceAdd`, the slack outside the camera rect. */
export const SOUND_HEARING_MARGIN = 100;

export interface HearingRect {
  /** Camera top-left in world units. */
  cameraX: number;
  cameraY: number;
  /** Live camera size. Never the AS3's frozen 640x400 — see CLAUDE.md. */
  cameraWidth: number;
  cameraHeight: number;
}

/**
 * True when `(x, y)` is within the camera rect plus the margin.
 *
 * `radius` widens the test by the source's own size, matching the AS3's
 * `theEnemy.width / 2` terms — a large boss at the edge is audible when its
 * centre is not.
 */
export function isAudibleAt(
  x: number,
  y: number,
  radius: number,
  rect: HearingRect,
): boolean {
  const margin = SOUND_HEARING_MARGIN + radius;
  return (
    x >= rect.cameraX - margin &&
    x <= rect.cameraX + rect.cameraWidth + margin &&
    y >= rect.cameraY - margin &&
    y <= rect.cameraY + rect.cameraHeight + margin
  );
}
