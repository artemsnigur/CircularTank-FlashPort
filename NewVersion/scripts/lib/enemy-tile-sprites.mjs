/**
 * `BackgroundEnemyImage` (symbol 865) — the plate behind one enemy tile in the
 * AS3's level-select roster, 2 frames (idle / cursor-over).
 *
 * ── Synced, and nothing draws it ──────────────────────────────────────────
 * **Stated plainly so it is not mistaken for an oversight or "cleaned up".**
 * Its only consumer is `ImageEnemy` (`ScreenLevelSelect.as:1128`), which is
 * `no-consumer` in `infoTextSites.ts` as a consequence of divergence `A8`: the
 * AS3 draws the roster as tiles in a **selected-level** detail panel, and this
 * port has no selection step. T103's level-grid tooltip shows the same roster
 * as text-and-icon rows through `levelPreview`, and needs no tile plate.
 *
 * Copied on request so the asset is in hand if the tiles are ever built. That
 * is the `PROJECTILE_SPRITE_IDS` precedent — copy the clip, so the pass that
 * draws it needs no asset work — with one difference worth being honest about:
 * there, the consumer was queued. Here it is decided against, so this may stay
 * undrawn indefinitely. `levelSelectTiles.test.ts` pins that state rather than
 * letting "unused" and "missing" look alike.
 */
export const ENEMY_TILE_SPRITE_IDS = [865];
