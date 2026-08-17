/**
 * One shop tile — `ButtonWeapon` / `ButtonMisc`.
 *
 * Stacked shapes in a square box, the same construction as `EnemyTile` and
 * `ResistanceIcon`: the generator checked every placement matrix across the 28
 * clips as identity scale, so centring each layer reproduces the tile.
 *
 * **The backing disc is not one of them any more.** It was a 30x30 shape being
 * drawn at up to 176px; T182 replaced it with `.upgrade-icon__plate`, a CSS
 * circle carrying the same gradient stops. `tileGlyphLayers` is what removes it
 * from the layer list, so the two halves cannot both draw one. `A40`.
 *
 * ── Which frame is not this component's decision ──────────────────────────
 * `UpgradesScene` resolves it through `upgradeTileFrame` and sends the layers.
 * Unlike the bestiary there is nothing to withhold here — the shop hides
 * nothing — so the reason is narrower: the frame depends on *owned* and
 * *equipped*, which live with the profile, and a component that re-derived them
 * from props would be a second place for the rule to be wrong.
 */
import { shapeUrl } from '../assets/registry';

/** `ScreenUpgrades.as` lays the tiles out on a 41px pitch; the art is ~38px. */
const SIZE = 38;

export function UpgradeIcon({
  layers,
  label,
  size = SIZE,
}: {
  layers: readonly number[];
  label: string;
  /**
   * The box, as a CSS length. A number is px — the AS3's own 38.
   *
   * **A string is the point of the parameter.** The shop's tiles size
   * themselves off the viewport so the catalogue fits without scrolling, and
   * the icon has to track them; the box is set inline because it is a
   * *measurement* the caller owns, and an inline style cannot be overridden by
   * a stylesheet. Passing `'72%'` or `'var(--tile-icon)'` is the supported way
   * to hand that decision over.
   */
  size?: number | string;
}): React.ReactElement | null {
  if (layers.length === 0) return null;

  return (
    /*
      Decorative, deliberately. The row already names the upgrade, its level and
      whether it is equipped, in text, so announcing the picture would make a
      screen reader read the same facts twice. `EnemyTile` labels itself because
      there the picture *is* the distinguishing thing; here it is not. `title`
      still gives a mouse user the name on hover.
    */
    <span
      className="upgrade-icon"
      style={{ width: size, height: size }}
      title={label}
      aria-hidden="true"
    >
      {/*
        The backing disc, in CSS — `A40`.

        `ButtonWeapon`'s plate is a **30x30 shape** and this box runs up to
        176px on a 4K display, so the extracted disc arrived at six times its
        drawn size with a ragged antialiased edge behind a crisp glyph.
        `tileGlyphLayers` drops it from the layer list and this draws it, from
        the SVG's own gradient stops rather than from taste.

        First in the DOM, so it sits behind every layer without needing a
        `z-index` that the layers would then have to answer.
      */}
      <span className="upgrade-icon__plate" />
      {layers.map((shape, i) => (
        <img
          key={`${shape}-${i}`}
          className="upgrade-icon__layer"
          src={shapeUrl(`${shape}.svg`)}
          alt=""
        />
      ))}
    </span>
  );
}
