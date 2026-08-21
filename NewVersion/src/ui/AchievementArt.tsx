/**
 * One achievement badge, drawn from its SWF layers at their true proportions.
 *
 * ── Why this is shared rather than written twice ──────────────────────────
 * It was written twice, and only one copy was right. The gallery sized each
 * layer by its own box; the unlock reveal in `Hud.tsx` set every layer to
 * `width: 100%; height: 100%` of a 64px square.
 *
 * That is invisible on a badge whose layers are square and severe on one whose
 * layers are not. `BossOnlySpecial` — "CHUCK NORRIS" — stacks `1213` (52x52),
 * a difficulty ring, and `1292`, which is **33.3 x 12.5**. Forced into a
 * square that emblem is stretched to two and a half times its proper width,
 * which is what was reported.
 *
 * A badge is a *stack* of layers with different native sizes — that is what
 * the AS3's clips are — so any renderer that ignores the sizes is wrong for
 * some badge. One renderer means the rule is applied once and cannot drift
 * apart again.
 *
 * ── The sizing ───────────────────────────────────────────────────────────
 * Each layer is drawn at `its own box / ACHIEVEMENT_BADGE_SIZE` of the
 * container and centred, which reproduces the clip's own composition: the
 * layers were authored concentric on a 52-unit badge, so scaling each by its
 * share of 52 and centring puts them back where they were.
 *
 * `object-fit: contain` would also stop the distortion, but it would letterbox
 * each layer inside the full square instead of placing it, so a 33x12 emblem
 * would sit at the badge's full width rather than at two thirds of it. The
 * ratio is what carries the composition, not just the aspect.
 */

import React from 'react';

import {
  ACHIEVEMENT_BADGE_SIZE,
  ACHIEVEMENT_SHAPE_BOX,
} from '../game/achievements/achievementArt';
import { shapeUrl } from '../assets/registry';

interface AchievementArtProps {
  /** Shape ids for one frame, back to front. */
  layers: readonly number[];
  /** The caller's own class — position, filters, size all stay theirs. */
  className: string;
  /** Only the reveal page labels itself; the gallery cell is decorative. */
  role?: 'img';
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

export function AchievementArt({
  layers,
  className,
  role,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...rest
}: AchievementArtProps & Record<string, unknown>): React.ReactElement {
  return (
    <span
      className={`achievement-art ${className}`}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      {...rest}
    >
      {layers.map((shape) => {
        /*
         * A shape with no box falls back to the full badge, which draws it
         * square. That is the old bug as a default, so it is not left to
         * chance: `achievementArt.test.ts` requires every shape any clip
         * frame names to have a box, and all 76 do.
         */
        const [w, h] = ACHIEVEMENT_SHAPE_BOX[shape] ?? [
          ACHIEVEMENT_BADGE_SIZE,
          ACHIEVEMENT_BADGE_SIZE,
        ];
        return (
          <img
            key={shape}
            src={shapeUrl(`${shape}.svg`)}
            alt=""
            aria-hidden="true"
            style={
              {
                '--sw': w / ACHIEVEMENT_BADGE_SIZE,
                '--sh': h / ACHIEVEMENT_BADGE_SIZE,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
