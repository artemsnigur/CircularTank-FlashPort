/**
 * One bestiary tile — `ButtonEnemy<Type>`.
 *
 * A frame is three stacked shapes (`bestiaryArt.ts` explains the layout), so
 * this renders them absolutely positioned in a square box, exactly as
 * `ResistanceIcon` does for the badge clips. All placement matrices across the
 * 20 clips were checked as identity scale by the generator, so centring each
 * layer reproduces the tile — there is no per-layer transform to apply.
 *
 * ── It cannot leak an unmet enemy, and not because it is careful ──────────
 * This component has no idea which enemy it is drawing. It takes the layer ids
 * and paints them; `buildBestiaryListing` decides whether those are frame 1 or
 * the locked frame 4. So there is no branch here to get wrong, and no import of
 * the art table that would let a future edit reach for the real glyph.
 */
import { shapeUrl } from '../assets/registry';

/** `ScreenEnemies.as:298-300` lays the tiles out on a 41px pitch; the art is ~38px. */
const SIZE = 38;

export function EnemyTile({
  layers,
  label,
  size = SIZE,
}: {
  layers: readonly number[];
  /** What a screen reader should call it — "Basic" or "Not yet encountered". */
  label: string;
  /**
   * The box, as a CSS length. A number is px — the AS3's own size.
   *
   * Same parameter and same reason as `UpgradeIcon`'s: the box is set inline
   * because it is a measurement the caller owns, and an inline style cannot be
   * overridden from a stylesheet. The cursor tooltip draws these much smaller
   * than the detail panel does.
   */
  size?: number | string;
}): React.ReactElement | null {
  if (layers.length === 0) return null;

  return (
    <span
      className="enemy-tile"
      style={{ width: size, height: size }}
      // The tile is a picture of the enemy with no text in it, so the
      // accessible name has to come from outside the art — the same reasoning
      // as `ResistanceIcon`'s.
      role="img"
      aria-label={label}
    >
      {layers.map((shape, i) => (
        <img
          key={`${shape}-${i}`}
          className="enemy-tile__layer"
          src={shapeUrl(`${shape}.svg`)}
          alt=""
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
