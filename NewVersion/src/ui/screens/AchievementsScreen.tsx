/**
 * The achievements board — `ScreenAchievements.as`.
 *
 * ── It is a board, and the positions are the AS3's ────────────────────────
 * Each spec carries `x`/`y` from `achievementPlacementArray`: 36 entries on a
 * fixed grid spanning x 55..355 and y 120..400 in the original's 640x480 stage.
 * There is no paging to port — the AS3 places all 36 at once — so a paged list
 * would look reasonable and lose the layout entirely.
 *
 * **The grid is not regular, and assuming it was would have collided entries.**
 * The first version of this divided x by 60 and y by 40 to get columns and
 * rows; `achievementListing.test.ts` caught it — `MaxedPrimary1` sits 16 units
 * off the row step, so two achievements would have rounded into one cell and
 * one would have vanished. The placements are irregular by design.
 *
 * So they are used as **proportional positions**: each `x`/`y` is expressed as
 * a fraction of the board's own extent and applied as a percentage. The layout
 * is the AS3's exactly, and it scales with a viewport the original never had —
 * transcribing the raw pixels would pin the board to a 640x480 stage and clip
 * it on anything narrower.
 *
 * ── Unearned entries still show their goal ────────────────────────────────
 * Unlike the bestiary, which withholds what an unmet enemy is, this screen
 * names the target — that is what an achievements list is for. Only the earned
 * mark and the difficulty vary.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { useInfoText } from '../useInfoText';
import { siteCorner } from '../../game/ui/infoTextSites';
import { achievementTooltip } from '../../game/achievements/achievementTooltip';
import type { AchievementEntry } from '../../game/achievements/achievementListing';

/** The extent of `achievementPlacementArray`, in AS3 stage units. */
const BOARD = { minX: 55, maxX: 355, minY: 120, maxY: 400 };

const fraction = (value: number, min: number, max: number): number =>
  ((value - min) / (max - min)) * 100;

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

/**
 * One achievement, with the hover panel `Achievement.as:92-105` gives it.
 *
 * `:81` composes the tooltip as `title + "
" + description + difficultyText`,
 * and `:99` passes the two lengths so the panel can style the first and last
 * runs — the title in the display face, the difficulty note smaller. That is
 * the whole of the "Achievement" special type (`PartInfoText.as:195-205`); it
 * styles sub-ranges rather than drawing anything structured.
 *
 * `showLeft` is `true` here and `false` on the results screen (`:103`, gated on
 * `onStatusScreen`) — a fixed corner per context, not a computed one.
 */
function AchievementCell({ entry }: { entry: AchievementEntry }): React.ReactElement {
  // Composed by `achievementTooltip` — `Achievement.as:60-81` — which the
  // status screen's icon also uses. One source, because the panel styles by
  // character offset and two compositions could agree on the text and disagree
  // on the ranges.
  const tip = achievementTooltip(entry);

  // `Achievement.as:99` — the board branch. `:103` is the same cell on the
  // level-complete status screen, opening the other way horizontally.
  const hover = useInfoText({
    text: tip.text,
    ...siteCorner('Achievement.as:99'),
    titleLength: tip.titleLength,
    noteLength: tip.noteLength,
  });

  return (
    <li
      className={`achievements__cell${entry.earned ? ' achievements__cell--earned' : ''}`}
      style={{
        left: `${fraction(entry.x, BOARD.minX, BOARD.maxX)}%`,
        top: `${fraction(entry.y, BOARD.minY, BOARD.maxY)}%`,
      }}
      {...hover}
    >
      <h3 className="achievements__title">{entry.title}</h3>
      <p className="achievements__goal">{entry.description}</p>
      {entry.earned && entry.difficultyMatters && entry.difficulty !== null && (
        <p className="achievements__difficulty">{DIFFICULTY_LABEL[entry.difficulty]}</p>
      )}
    </li>
  );
}

export function AchievementsScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const board = useGameStore((s) => s.achievementBoard);
  if (activeScene !== 'Achievements') return null;

  const entries = board?.entries ?? [];
  const earned = board?.earnedCount ?? 0;
  const total = board?.total ?? 0;

  return (
    <div className="screen screen--achievements">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Menu
        </button>
        <h2 className="screen__title">Achievements</h2>
        <span aria-label={`${earned} of ${total} earned`}>
          {earned} / {total}
        </span>
      </header>

      <ul className="achievements__grid">
        {entries.map((entry) => (
          <AchievementCell key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}
