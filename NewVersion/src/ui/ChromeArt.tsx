/**
 * Draws one piece of the original's UI chrome — a title, a nav tab, a panel.
 *
 * ── Percentages, because the port is responsive ───────────────────────────
 * The AS3 draws these at fixed stage coordinates. This port does not have a
 * fixed stage, and that is a settled decision rather than an accident (`A5`,
 * `A17`, `A18`, `A22` all exist because there is no 640x480 cabinet here). So
 * every layer is positioned as a **percentage of the clip's own box**, and the
 * box carries the clip's `aspect-ratio`. Give it a width in CSS and the whole
 * assembly scales with it, on a phone or a desktop, with the layers staying
 * put relative to each other.
 *
 * That is the one thing the caller must not do by hand: a screen that sized
 * layers itself would be re-deriving `chromeArt.ts`'s arithmetic, and the
 * layout numbers there are not obvious — `ButtonUpgrades` puts its label at
 * (32.1, 10) inside a 200x40 plate because Flash placed a nested clip at
 * (100, 20) and the label's own origin sits at (67.9, 10) inside it.
 *
 * ── Naming ────────────────────────────────────────────────────────────────
 * The letters in a title are *paths*, so there is no text for a screen reader
 * to reach. Pass `label` and the element becomes `role="img"` with that name;
 * omit it and the art is `aria-hidden`, which is right when the caller is a
 * real `<button>` that carries its own accessible name — the same split
 * `UpgradeIcon` and `EnemyTile` already use.
 */
import { shapeUrl } from '../assets/registry';
import { CHROME_CLIPS } from '../game/ui/chromeArt';
import type { ChromeClip } from '../game/ui/chromeArt';

export type ChromeClipName = keyof typeof CHROME_CLIPS;

export function ChromeArt({
  clip,
  frame = 1,
  label,
  className,
}: {
  clip: ChromeClipName;
  /** 1-based, as the AS3's `gotoAndStop` arguments are. */
  frame?: number;
  /** Accessible name. Omit for decoration inside a labelled control. */
  label?: string;
  className?: string;
}): React.ReactElement | null {
  const art: ChromeClip | undefined = CHROME_CLIPS[clip];
  if (!art) return null;

  // Out-of-range frames clamp to the resting state rather than rendering
  // nothing: a wrong frame number should look wrong, not blank — a blank is
  // indistinguishable from "the whole component failed", which is the reading
  // that has cost this project the most debugging time.
  const picture = art.frames[frame - 1] ?? art.frames[0];
  if (!picture) return null;

  const percent = (value: number, total: number): string => `${(value / total) * 100}%`;

  return (
    <span
      className={className ? `chrome-art ${className}` : 'chrome-art'}
      style={{ aspectRatio: `${art.width} / ${art.height}` }}
      {...(label === undefined
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label })}
      data-clip={clip}
      data-frame={picture.frame}
    >
      {picture.layers.map((layer, index) => (
        <img
          key={`${layer.shape}-${index}`}
          className="chrome-art__layer"
          src={shapeUrl(`${layer.shape}.svg`)}
          alt=""
          style={{
            left: percent(layer.x, art.width),
            top: percent(layer.y, art.height),
            width: percent(layer.width, art.width),
            height: percent(layer.height, art.height),
          }}
        />
      ))}
    </span>
  );
}
