/**
 * One shop tile — `ButtonWeapon` / `ButtonMisc`.
 *
 * Three stacked shapes in a square box, the same construction as `EnemyTile`
 * and `ResistanceIcon`: the generator checked every placement matrix across the
 * 28 clips as identity scale, so centring each layer reproduces the tile.
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
}: {
  layers: readonly number[];
  label: string;
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
      style={{ width: SIZE, height: SIZE }}
      title={label}
      aria-hidden="true"
    >
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
