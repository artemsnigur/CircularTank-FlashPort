/**
 * One strength/weakness badge — `IconStrongWeak` (symbol 1033).
 *
 * A frame is three stacked shapes (`resistanceIconArt.ts` explains the layout),
 * so this renders three absolutely-positioned images in a square box. All 32
 * placement matrices across both clips were measured as identity scale with a
 * zero offset, so centring each layer reproduces the clip exactly — there is no
 * per-layer transform to apply.
 *
 * The percentage sits over the badge, as `ScreenEnemies.as:380` puts it: a
 * `TextField` added *to the icon* rather than beside it.
 */
import { shapeUrl } from '../assets/registry';
import { RESISTANCE_ICON_CLIPS } from '../game/enemies/resistanceIconArt';
import { siteCorner } from '../game/ui/infoTextSites';
import { useInfoText } from './useInfoText';
import type { ResistanceBadge } from '../game/enemies/resistanceIcons';

/** `ScreenEnemies.as` places these at a 38px pitch; the art is ~30px wide. */
const SIZE = 30;

const CLIP = RESISTANCE_ICON_CLIPS.IconStrongWeak;

export function ResistanceIcon({ badge }: { badge: ResistanceBadge }): React.ReactElement {
  // `IconStrongWeak.as:48` — `changeText(theText, false, false)`. The label is
  // set alongside the frame at `ScreenEnemies.as:339-374`; the "none" badge is
  // built at `:385-391` **without** a `pText`, so it has no tooltip and its
  // label is not shown on hover.
  const hover = useInfoText({
    text: badge.label,
    ...siteCorner('IconStrongWeak.as:48'),
  });

  const layers = CLIP.frames[badge.frame - 1] ?? CLIP.frames[0];
  const interactive = badge.damageType !== null;

  return (
    <span
      className="resistance-icon"
      style={{ width: SIZE, height: SIZE }}
      // The AS3 badge is a picture with a hover label; the accessible name has
      // to carry both, because the percentage is drawn *on* the art and a
      // screen reader gets neither from an <img> stack.
      role="img"
      aria-label={
        interactive ? `${badge.label} ${badge.percent}` : 'None'
      }
      {...(interactive ? hover : {})}
    >
      {layers.map((shape) => (
        <img
          key={shape}
          className="resistance-icon__layer"
          src={shapeUrl(`${shape}.svg`)}
          alt=""
          aria-hidden="true"
        />
      ))}
      {badge.percent !== '' && (
        <span className="resistance-icon__percent" aria-hidden="true">
          {badge.percent}
        </span>
      )}
    </span>
  );
}
