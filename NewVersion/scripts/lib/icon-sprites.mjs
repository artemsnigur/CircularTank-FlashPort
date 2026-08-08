/**
 * The two strength/weakness badge clips, by SWF symbol id.
 *
 * Hand-kept like `projectile-sprites.mjs`, and for the same reason: the id is
 * only discoverable from the `[Embed(... symbol="symbolNNNN")]` line on the AS3
 * class, which nothing in the SWF itself links back to a name.
 *
 * ── They are two clips, not one, and they are not interchangeable ─────────
 * Both carry 17 frames laid out identically — frame 1 blank, 2-9 the eight
 * damage types as a *strength*, 10-17 the same eight as a *weakness* — but the
 * artwork differs on six of the sixteen glyphs (FireLava, Food and Magic in
 * each half). Which one a site uses is fixed by the AS3:
 *
 *   `IconStrongWeak2` (1018)  `PartInfoText.addStrengthsAndWeaknessIcons`
 *                             (`:404`, `:456`) — the hover panel's icons
 *   `IconStrongWeak`  (1033)  `ScreenEnemies.as` x4 and `ScreenStatus.as` x4 —
 *                             placed directly on the screen, each with its own
 *                             tooltip (`IconStrongWeak.as:48`)
 *
 * Both are synced even though only 1033 has a live consumer today, which is the
 * precedent `PROJECTILE_SPRITE_IDS` set: copying a clip's whole shape set means
 * the pass that finally draws the other one needs no asset work. The six
 * 1018-only shapes are therefore present and undrawn **by intent**, and
 * `resistanceIconArt.test.ts` asserts that set is exactly those six rather than
 * letting "unused" and "missing" look alike.
 */
export const ICON_SPRITE_IDS = [1018, 1033];
