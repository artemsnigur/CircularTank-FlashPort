/**
 * The achievements board — `ScreenAchievements.as`.
 *
 * ── It is a board, and the positions are the AS3's ────────────────────────
 * Each spec carries `x`/`y` from `achievementPlacementArray`: 36 entries on a
 * fixed grid spanning x 55..355 and y 120..400 in the original's 640x480 stage.
 * There is no paging to port — the AS3 places all 36 at once — so a paged list
 * would look reasonable and lose the layout entirely.
 *
 * **The grid is a regular 6x6 lattice — x every 60, y every 56, all 36 points
 * filled.** An earlier version of this header said it was irregular and that
 * `MaxedPrimary1` sat 16 units off the row step; measured, it does not. The
 * real defect was the *assumed* step: the first screen divided y by 40, and
 * 176 is not a multiple of 40, so two entries rounded into one cell and one
 * vanished. The data was regular the whole time and the arithmetic was wrong,
 * which is a different bug with a different fix.
 *
 * The placements are still used as **proportional positions** rather than
 * derived indices, and now for the honest reason: each `x`/`y` is a fraction of
 * the board's extent, so the layout is the AS3's exactly and scales with a
 * viewport the original never had. Transcribing the raw pixels would pin the
 * board to a 640x480 stage and clip it on anything narrower.
 *
 * ── Unearned entries still show their goal ────────────────────────────────
 * Unlike the bestiary, which withholds what an unmet enemy is, this screen
 * names the target — that is what an achievements list is for. Only the earned
 * mark and the difficulty vary.
 */
import { useState } from 'react';

import { useGameStore } from '../../state/gameStore';
import { ScreenShell } from '../ScreenShell';
import { CursorTip } from '../CursorTooltip';
import { achievementNote, achievementFrame } from '../../game/achievements/achievementTooltip';
import { ACHIEVEMENT_CLIPS } from '../../game/achievements/achievementArt';
import { AchievementArt } from '../AchievementArt';
import { LevelModeIcon } from '../LevelModeIcon';
import { formatNumber } from '../../game/core/Functions';
import { MEDAL_TIERS } from '../../game/achievements/achievementStats';
import type { AchievementEntry } from '../../game/achievements/achievementListing';

/** The extent of `achievementPlacementArray`, in AS3 stage units. */
const BOARD = { minX: 55, maxX: 355, minY: 120, maxY: 400 };

/**
 * Where a placement sits in the board's extent, as a **unitless 0..1**.
 *
 * Not a percentage, and that is the fix for a real defect: a disc centred at
 * `left: 0%` hangs half off the left edge, and one at `100%` half off the
 * right. Measured, the board overflowed its plate by 31-167px and every badge
 * intersected something. The CSS insets the range by half a disc instead —
 * `calc(var(--disc) / 2 + (100% - var(--disc)) * var(--fx))` — which needs the
 * fraction as a number it can multiply a length by.
 */
const fraction = (value: number, min: number, max: number): number =>
  (value - min) / (max - min);

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

/**
 * The badge's own picture — the clip's layers, each at its true scale.
 *
 * ── Why the layers are not all one size ───────────────────────────────────
 * `Achievement<id>` composes a 52-unit backing disc, a 48-unit difficulty ring
 * and an icon at whatever size the icon is: `Bosses1`'s is 26x26,
 * `BossOnlySpecial`'s is 33.3x12.5. The results-screen toast stretches every
 * layer to fill its box, which passes at 64px on one icon and is plainly wrong
 * at 36 badges — a 26-unit icon drawn over the whole disc is twice its size.
 *
 * So each layer is drawn at `its own size / ACHIEVEMENT_BADGE_SIZE` of the
 * badge, both numbers generated from the SVGs rather than typed here.
 *
 * ── The one thing assumed, said plainly ───────────────────────────────────
 * **That every layer is centred on the badge.** The SWF's PlaceObject
 * translation is not in `SPRITE_SHAPES`, so the generator cannot see where a
 * layer sits, only how big it is. Centring is right for the backing disc and
 * the ring by construction — they are concentric — and matches every icon
 * checked by eye. An off-centre icon in the original would render centred here
 * and nothing would flag it; recovering the offsets means extending
 * `gen-sprite-shapes.mjs` to keep the translation half of the matrix.
 */
function AchievementBadge({ entry }: { entry: AchievementEntry }): React.ReactElement | null {
  const clip = ACHIEVEMENT_CLIPS[entry.id];
  if (clip === undefined) return null;

  /*
   * **A locked badge shows the earned picture, dimmed — a divergence.**
   *
   * Frame 1 is the AS3's locked art: a grey disc with the icon at 10% opacity
   * (`1282.svg` and its 35 siblings). At 36 badges on one board that reads as
   * 36 empty circles, which is the state a fresh profile is in and the reason
   * the board was reported as missing its artwork. Frame 2 is the same badge
   * lit, so it is what is drawn, and `--locked` desaturates it in CSS.
   *
   * An earned badge still uses its true frame, so the difficulty ring is the
   * one the achievement was actually won on — `achievementFrame` is the AS3's
   * own `thisState` mapping and is not second-guessed here.
   */
  const frame = entry.earned ? Math.min(achievementFrame(entry), clip.frames.length) : 2;
  const layers = clip.frames[frame - 1] ?? [];

  // The sizing that used to live here is `AchievementArt` now, so the reveal
  // page cannot draw a badge differently from this board — T227.
  return <AchievementArt className="achievements__art" layers={layers} aria-hidden />;
}

/**
 * One achievement, as a badge.
 *
 * ── The hover readout is a cursor tooltip, not `PartInfoText` ─────────────
 * `Achievement.as:99` opens the AS3's corner panel. This board uses the same
 * pointer-following card level select uses, for the same reason: a corner
 * panel means looking away from the badge you are pointing at, and this is a
 * 36-cell grid. Recorded as a divergence in `A36`.
 *
 * The badge carries no text at all now — the AS3's own arrangement, and what
 * makes room for the picture. Title, goal and note live in the card, and stay
 * in the DOM as clipped text so the accessible name is unchanged.
 */
function AchievementCell({
  entry,
  onHover,
}: {
  entry: AchievementEntry;
  onHover: (entry: AchievementEntry | null) => void;
}): React.ReactElement {
  return (
    <li
      className={`achievements__cell${entry.earned ? ' achievements__cell--earned' : ' achievements__cell--locked'}`}
      style={
        {
          '--fx': fraction(entry.x, BOARD.minX, BOARD.maxX),
          '--fy': fraction(entry.y, BOARD.minY, BOARD.maxY),
        } as React.CSSProperties
      }
      onMouseEnter={() => onHover(entry)}
      onMouseLeave={() => onHover(null)}
    >
      <AchievementBadge entry={entry} />
      <h3 className="achievements__title">{entry.title}</h3>
      <p className="achievements__goal">{entry.description}</p>
      {entry.earned && entry.difficultyMatters && entry.difficulty !== null && (
        <p className="achievements__difficulty">{DIFFICULTY_LABEL[entry.difficulty]}</p>
      )}
    </li>
  );
}

/**
 * The hover card — title, goal and the note, laid out rather than styled by
 * character range.
 *
 * The note comes from `achievementNote`, which `achievementTooltip` also uses,
 * so this and the results screen's panel cannot end up saying different things
 * about the same achievement.
 */
function AchievementTip({ entry }: { entry: AchievementEntry | null }): React.ReactElement {
  return (
    <CursorTip open={entry !== null} contentKey={entry?.id ?? null} className="cursor-tip--badge">
      {entry !== null && (
        <>
          <p className="cursor-tip__title">{entry.title}</p>
          <p className="cursor-tip__objective">{entry.description}</p>
          <p className="cursor-tip__note">{achievementNote(entry)}</p>
        </>
      )}
    </CursorTip>
  );
}

export function AchievementsScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const board = useGameStore((s) => s.achievementBoard);
  /*
   * The hovered badge, and **only** the hovered badge, is React state. The
   * card's *position* never is — that is written to `style.transform` inside
   * `CursorTip`. So a pointer sweep across the board re-renders once per badge
   * crossed rather than once per pixel, which is the rule level select landed
   * on after the same screen measured 8 fps.
   */
  const [hovered, setHovered] = useState<AchievementEntry | null>(null);
  if (activeScene !== 'Achievements') return null;

  const entries = board?.entries ?? [];
  const earned = board?.earnedCount ?? 0;
  const total = board?.total ?? 0;
  const stats = board?.stats;

  return (
    <ScreenShell
      title="Achievements"
      titleClip="TitleAchievements"
      typeTitle
      nav="Achievements"
      className="screen--achievements"
    >
      {/*
        Board left, window right — `bgWindow` sits at the stage's right edge
        here as it does on level select and the shop, and the two columns span
        rather than being capped (`A32`).
      */}
      <div className="achievements">
        {/* The board's plate. The 36 cells are placed on it proportionally
            from `achievementPlacementArray`, so the panel is the ground rather
            than a layout — it must not become a grid or the placements stop
            meaning anything. */}
        <div className="achievements__board">
          <ul className="achievements__grid">
            {entries.map((entry) => (
              <AchievementCell key={entry.id} entry={entry} onHover={setHovered} />
            ))}
          </ul>
        </div>

        <aside className="achievements__panel" aria-label="Totals">
          {/* `:725`/`:726` — the two running totals, at the window's top. */}
          <p className="achievements__stat">
            <span className="achievements__stat-label">Kills</span>
            <span className="achievements__stat-value">
              {formatNumber(stats?.enemyKills ?? 0)}
            </span>
          </p>
          <p className="achievements__stat">
            <span className="achievements__stat-label">Money earned</span>
            <span className="achievements__stat-value">
              ${formatNumber(stats?.moneyEarned ?? 0)}
            </span>
          </p>

          {/*
            The 5x3 medal matrix — `:727` onward. A **row is one mode at three
            tiers**, which is the opposite of a level tile, where a row is one
            level's three medal slots. `:729`/`:735`/`:741` place bronze,
            silver and gold at the same y and step the mode by 32.
          */}
          <div className="achievements__medals">
            {(stats?.medals ?? []).map((row) => (
              <div key={row.type} className="achievements__medal-row">
                {MEDAL_TIERS.map((tier) => (
                  <span
                    key={tier}
                    className={`achievements__medal achievements__medal--${tier}`}
                  >
                    <LevelModeIcon
                      mode={row.mode}
                      className="achievements__medal-icon"
                      title={`${row.type}, ${tier}`}
                    />
                    <span className="achievements__medal-count">{row.counts[tier]}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* The port's own line — the original has no earned counter, and it
              is the one number a board of 36 discs does not make obvious. */}
          <p className="achievements__tally" aria-label={`${earned} of ${total} earned`}>
            {earned} / {total} earned
          </p>
        </aside>
      </div>

      {/* Mounted once, outside the board, and portalled to `<body>` from
          there — a card rendered per cell would be 36 of them. */}
      <AchievementTip entry={hovered} />
    </ScreenShell>
  );
}
