/**
 * The equipped tile's red ring, identified so the view can decline to draw it.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 * `ButtonWeapon`'s equipped frame swaps the plain disc behind the weapon for a
 * red disc and lays a red ring over the top. At the sizes the shop now runs
 * at, that ring is an extracted SWF shape blown up well past the size it was
 * drawn for, and the weapon art overhangs it. T169 replaced it with a CSS glow
 * on `.shop-tile--equipped`; recorded as `A32`.
 *
 * **The data stays faithful.** `upgradeTileFrame` still returns frame 4 for an
 * equipped weapon, because that is what `ButtonWeapon.as:193-206` does, and
 * `upgradeTile.test.ts` still pins it against the AS3. The divergence is in the
 * *view*, which is where it belongs — so this module names the two shapes
 * rather than changing which frame the rule selects.
 *
 * ── Derived, not listed ───────────────────────────────────────────────────
 * A hand-written `[601, 602]` would be a claim about generated data with
 * nothing keeping the two in step; re-export the clips from a fresh JPEXS run
 * with different ids and the list silently stops matching. So the pair is
 * computed: for every equippable clip, the shapes its **equipped** frame adds
 * over its **owned** frame, intersected across all of them.
 *
 * That intersection is the mechanism, and it is worth stating what it assumes:
 * that the highlight is the same pair on every weapon. Measured across the 24
 * equippable clips it is — 23 swap `596` for `601, 602` and one (GummyBear,
 * whose plain disc is its own shape) swaps `634` for the same pair.
 * `tileHighlight.test.ts` drives that agreement rather than trusting it.
 */
import { UPGRADE_TILE_CLIPS, UPGRADE_TILE_REST_FRAME } from './upgradeArt';

/**
 * The shapes that appear only when a weapon is equipped — the red disc and the
 * ring over it.
 *
 * Empty if the clips ever stop agreeing, which is deliberate: an empty set
 * makes `withoutEquippedHighlight` a no-op, so the tiles fall back to drawing
 * the original art rather than to silently stripping the wrong layer.
 */
export const EQUIPPED_HIGHLIGHT_SHAPES: ReadonlySet<number> = (() => {
  // Kept as an array rather than a `Set` while intersecting: the tsconfig's lib
  // does not give `Set` an iterator, so spreading or `Array.from`-ing one is a
  // type error here even though it runs.
  let shared: number[] | null = null;

  for (const clip of Object.values(UPGRADE_TILE_CLIPS)) {
    if (!clip.equippable) continue;

    const owned: readonly number[] = clip.frames[UPGRADE_TILE_REST_FRAME.owned - 1] ?? [];
    const equipped: readonly number[] = clip.frames[UPGRADE_TILE_REST_FRAME.equipped - 1] ?? [];
    const added = equipped.filter((shape) => !owned.includes(shape));

    shared = shared === null ? added : shared.filter((shape) => added.includes(shape));
  }

  return new Set<number>(shared ?? []);
})();

/**
 * The same layers with the equipped highlight removed.
 *
 * The weapon's own glyph is untouched — only the disc and ring go, and the
 * tile's CSS supplies both a surface and the equipped state underneath.
 */
export function withoutEquippedHighlight(layers: readonly number[]): readonly number[] {
  if (EQUIPPED_HIGHLIGHT_SHAPES.size === 0) return layers;
  return layers.filter((shape) => !EQUIPPED_HIGHLIGHT_SHAPES.has(shape));
}
