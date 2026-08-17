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
 * The plain backing disc every tile draws behind its glyph.
 *
 * ── Why it is dropped too, as of T182 ─────────────────────────────────────
 * It is a **30x30 shape** — every one of them is a single path of radius 15 —
 * and the shop now draws tiles up to 176px on a 4K display. Scaling a 30px
 * disc by six lands its antialiased edge somewhere between pixels, and the
 * result is a visibly ragged circle behind a crisp glyph. `upgrade-icon__plate`
 * draws it in CSS instead, from the SVG's own gradient stops. `A40`.
 *
 * ── Derived positionally, and that is the honest rule ─────────────────────
 * The plate is **layer 0 of a drawn frame** — not a list of ids. Collected
 * across every rest frame of every clip that yields four shapes today (`596`
 * on 54 frames, `601` on 24, and one each for `EnemyAbsorb` and GummyBear,
 * whose plates are their own shapes), and a re-export from JPEXS with
 * different ids changes nothing here.
 *
 * What the rule assumes is that layer 0 is never *content*.
 * `tileHighlight.test.ts` drives that against the exported SVGs: each shape in
 * this set must be a single-path 30x30 disc, which a glyph is not.
 */
export const TILE_PLATE_SHAPES: ReadonlySet<number> = (() => {
  const plates = new Set<number>();
  const restFrames = [
    UPGRADE_TILE_REST_FRAME.owned,
    UPGRADE_TILE_REST_FRAME.equipped,
    UPGRADE_TILE_REST_FRAME.notOwnedWeapon,
    UPGRADE_TILE_REST_FRAME.notOwnedMisc,
  ];

  for (const clip of Object.values(UPGRADE_TILE_CLIPS)) {
    for (const frame of restFrames) {
      const layers: readonly number[] = clip.frames[frame - 1] ?? [];
      // A misc clip has no frame 7 and an unequippable one no frame 4; both
      // come back empty rather than as a wrong frame.
      if (layers.length > 0) plates.add(layers[0]);
    }
  }

  return plates;
})();

/**
 * A tile's layers with everything the CSS now draws removed — the backing
 * plate and, on an equipped weapon, the red disc and ring.
 *
 * The weapon's own glyph is untouched. What is left is the picture that is
 * *only* available as art; the surface, the plate and the equipped state are
 * all states the stylesheet can render at any size without resampling.
 */
export function tileGlyphLayers(layers: readonly number[]): readonly number[] {
  const dropped = layers.filter(
    (shape) => !EQUIPPED_HIGHLIGHT_SHAPES.has(shape) && !TILE_PLATE_SHAPES.has(shape),
  );
  /*
   * **Never strip a tile down to nothing.** If a regenerated clip ever put the
   * glyph at layer 0, the rule above would drop the only thing worth drawing
   * and the tile would render as an empty plate — a silent, plausible-looking
   * failure. Falling back to the original layers makes it a *visible*
   * duplicate disc instead, which is the direction to fail in.
   */
  return dropped.length === 0 ? layers : dropped;
}
