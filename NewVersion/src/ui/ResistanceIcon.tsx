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
/** `PartInfoText.as:449-450` — the `"Small"` variant is 0.75 scale, 28px pitch. */
const SMALL_SIZE = Math.round(SIZE * 0.75);

/**
 * Which clip a site draws, per the AS3. **Not interchangeable**: the two differ
 * on six of sixteen glyphs, so a site drawing the wrong one looks entirely
 * correct and is wrong about FireLava, Food and Magic in both halves.
 *
 *   `IconStrongWeak`   `ScreenEnemies.as:334` etc — the bestiary rows
 *   `IconStrongWeak2`  `PartInfoText.as:404`/`:456` — inside the hover panel,
 *                      which is the only thing `addStrengthsAndWeaknessIcons`
 *                      ever constructs, at either scale
 */
export type ResistanceIconVariant = 'screen' | 'panel';

const CLIP_FOR: Record<ResistanceIconVariant, typeof RESISTANCE_ICON_CLIPS[string]> = {
  screen: RESISTANCE_ICON_CLIPS.IconStrongWeak,
  panel: RESISTANCE_ICON_CLIPS.IconStrongWeak2,
};

export function ResistanceIcon({
  badge,
  variant = 'screen',
}: {
  badge: ResistanceBadge;
  variant?: ResistanceIconVariant;
}): React.ReactElement {
  // `IconStrongWeak.as:48` — `changeText(theText, false, false)`. The label is
  // set alongside the frame at `ScreenEnemies.as:339-374`; the "none" badge is
  // built at `:385-391` **without** a `pText`, so it has no tooltip and its
  // label is not shown on hover.
  const hover = useInfoText({
    text: badge.label,
    ...siteCorner('IconStrongWeak.as:48'),
  });

  const clip = CLIP_FOR[variant];
  const layers = clip.frames[badge.frame - 1] ?? clip.frames[0];
  const size = variant === 'panel' ? SMALL_SIZE : SIZE;

  /**
   * **Two rules, deliberately kept apart — they were one and it was wrong.**
   *
   * `named` is about the *badge*: the frame-1 placeholder has no damage type,
   * so it is called "None". Everything else names its type and share.
   *
   * `interactive` is about the *clip*: `IconStrongWeak.as` carries roll-over
   * handlers and a `pText`, while `IconStrongWeak2.as` is a bare `MovieClip`
   * with a constructor and nothing else — so the panel's badges have no
   * tooltip in the original either, which is just as well, since they sit
   * inside one and the panel is `pointer-events: none`.
   *
   * Collapsing them into a single flag made every *panel* badge announce
   * itself as "None" — correct art, correct percentage drawn on it, and an
   * accessible name that said the opposite. Invisible to a screenshot; the
   * driven check reads `aria-label`, which is how it surfaced.
   */
  const named = badge.damageType !== null;
  const interactive = named && variant === 'screen';

  return (
    <span
      className={`resistance-icon resistance-icon--${variant}`}
      style={{ width: size, height: size }}
      // The AS3 badge is a picture with a hover label; the accessible name has
      // to carry both, because the percentage is drawn *on* the art and a
      // screen reader gets neither from an <img> stack.
      role="img"
      aria-label={named ? `${badge.label} ${badge.percent}` : 'None'}
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
