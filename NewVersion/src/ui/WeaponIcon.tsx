/**
 * One weapon icon — `WeaponInterface` (symbol 1198), the clip `PartInterface`
 * draws three of at `:239`, `:247` and `:252`.
 *
 * ── Layers align by origin, not by centre ─────────────────────────────────
 * The same stacked-`<img>` construction as `UpgradeIcon`, with one difference
 * that is the whole reason this is a separate component: **the layers are
 * offset.**
 *
 * Every placement inside 1198 is identity with translate (0, 0), so both
 * shapes sit at the *clip origin* — and a shape's origin is usually not its
 * box centre. 22 of the 24 glyphs are off-centre, `Cannon` worst at 4.31 units
 * on a 30-unit socket. Centring the layers, which is correct for the shop
 * tiles, would hang the default weapon's barrel out of its socket. `dx`/`dy`
 * come from the generated table; `weaponArt.ts` says where they are measured.
 *
 * ── Sizing ────────────────────────────────────────────────────────────────
 * `size` is the socket's drawn size in CSS pixels; every layer is scaled by the
 * same factor, so the glyph keeps its authored proportion against the plate
 * exactly as `scaleX = 1.25` does in the AS3.
 */
import { shapeUrl } from '../assets/registry';
import { WEAPON_SOCKET_SIZE } from '../game/ui/weaponArt';
import { weaponLayers } from '../game/ui/weaponPanel';

export function WeaponIcon({
  weapon,
  size,
  opacity = 1,
  label,
}: {
  /** Display name, or null for an empty slot — both resolve to a picture. */
  weapon: string | null;
  /** Drawn size of the socket, in CSS pixels. */
  size: number;
  /** `weaponInterfaceSpecial`'s dimming while it reloads (`:648`). */
  opacity?: number;
  label: string;
}): React.ReactElement {
  const scale = size / WEAPON_SOCKET_SIZE;

  return (
    /*
      Decorative, like `UpgradeIcon`: the readout names the weapon in text
      beside this, so announcing the picture would read the same fact twice.
      `title` still gives a mouse user the name on hover.
    */
    <span
      className="weapon-icon"
      style={{ width: size, height: size, opacity }}
      title={label}
      aria-hidden="true"
      data-weapon={weapon ?? 'None'}
    >
      {weaponLayers(weapon).map((layer, i) => (
        <img
          key={`${layer.shape}-${i}`}
          className="weapon-icon__layer"
          src={shapeUrl(`${layer.shape}.svg`)}
          alt=""
          style={{
            width: layer.width * scale,
            height: layer.height * scale,
            // Centre the layer, then move it to where its origin puts it.
            transform: `translate(calc(-50% + ${layer.dx * scale}px), calc(-50% + ${layer.dy * scale}px))`,
          }}
        />
      ))}
    </span>
  );
}
