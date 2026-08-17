/**
 * Level select.
 *
 * The grid is React because scrolling, momentum and accessibility are all free
 * in the DOM. It renders from `levelList`, which `LevelSelectScene` publishes
 * after reading the player's progress — React never touches the profile, since
 * that lives in the Phaser registry.
 *
 * Port target: ScreenLevelSelect.as, ButtonLevelSelect.as. Still to come: the
 * world picker (world 1 only for now) and the bronze/silver/gold value icons.
 */
import { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { ScreenShell } from '../ScreenShell';
import { EnemyTile } from '../EnemyTile';
import { Difficulties as DIFFICULTIES } from '../../game/config/constants';
import { MAX_LEVEL_VALUE } from '../../game/levels/levelProgress';
import { previewForLevel } from '../../game/levels/levelPreview';
import { useInfoText } from '../useInfoText';
import type { LevelListing } from '../../state/gameStore';
import type { Difficulty } from '../../game/config/constants';
import type { MedalTier } from '../../game/levels/medalTiers';

/**
 * The three difficulty buttons — `ButtonDifficultyEasy/Medium/Hard`.
 *
 * The press goes to the scene, which owns the options store and the save slot;
 * this renders the answer that comes back. Pressing the active one is not
 * suppressed here — the scene decides that it changes nothing and, in
 * particular, that it does not consume the `DifficultyChosen` hint.
 */
function DifficultyPicker(): React.ReactElement {
  const difficulty = useGameStore((s) => s.difficulty);
  const hintPending = useGameStore((s) => s.difficultyHintPending);

  return (
    <div
      className={`difficulty${hintPending ? ' difficulty--hint' : ''}`}
      role="group"
      aria-label="Difficulty"
    >
      {DIFFICULTIES.map((option) => {
        const selected = option === difficulty;
        return (
          <button
            key={option}
            type="button"
            className={`difficulty__button difficulty__button--${option.toLowerCase()}${
              selected ? ' difficulty__button--on' : ''
            }`}
            aria-pressed={selected}
            onClick={() => GameEvents.emit('ui:set-difficulty', { difficulty: option })}
          >
            {/*
              Text, not `ButtonDifficultyEasy`'s three clips.

              `ButtonGameDifficulty:73`'s frame 3 is **selected** rather than
              pressed, and that distinction is what survives the swap: the
              chosen pill lights and the other two do not, which is the whole
              job the resting frame was doing. `A33`.
            */}
            {option}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Medals earned, coloured by the difficulty each was taken on.
 *
 * ── Not the current difficulty's count ────────────────────────────────────
 * This used to draw `value` — medals as seen from the selected difficulty —
 * which made a level beaten 3-medal on Easy read as *zero* while `HARD` was
 * set. The AS3 never consults the difficulty buttons here: `:841` reads the
 * whole values triple and `:849-910` colours each medal by the highest tier
 * that reached its slot, so one level can show gold, silver and bronze
 * together. `medalTiers` is that rule; the scene sends the result.
 *
 * `value` is still on the row and still per-difficulty — it answers "how far
 * are you at the setting you chose", which the tally line and the accessible
 * name want. Two questions, two fields.
 */
function Medals({ medals }: { medals: readonly MedalTier[] }): React.ReactElement {
  return (
    <span className="level-grid__medals" aria-hidden="true">
      {Array.from({ length: MAX_LEVEL_VALUE }, (_, i) => {
        const tier = medals[i];
        return (
          <span
            key={i}
            className={`level-grid__medal${tier ? ` level-grid__medal--${tier}` : ''}`}
          >
            {tier ? '★' : '☆'}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The world picker — `ButtonWorld`, `ScreenLevelSelect.as:1504-1576`.
 *
 * A locked world shows nothing at all in the original: the number, the progress
 * line and all three tallies are blanked (`:1520-1524`), and tapping it does
 * nothing. Both kept — the button is disabled, so a locked world is inert here
 * for the same reason it is there.
 */
function WorldPicker(): React.ReactElement {
  const listing = useGameStore((s) => s.worldList);
  const worlds = listing?.worlds ?? [];

  if (worlds.length === 0) return <p className="screen__hint">Loading…</p>;

  return (
    <ul className="world-grid">
      {worlds.map((entry) => (
        <li key={entry.world}>
          <button
            type="button"
            className={`world-grid__cell${entry.unlocked ? '' : ' world-grid__cell--locked'}`}
            disabled={!entry.unlocked}
            aria-label={
              entry.unlocked
                ? `World ${entry.world}, ${entry.name}, level ${entry.frontier} of ${entry.totalLevels}`
                : `World ${entry.world}, locked`
            }
            title={
              entry.unlocked
                ? `${entry.name} — ${entry.levelsCompleted}/${entry.totalLevels} cleared`
                : 'Finish the previous world first'
            }
            onClick={() => GameEvents.emit('ui:select-world', { world: entry.world })}
          >
            {entry.unlocked ? (
              <>
                <span className="world-grid__number">{entry.world}</span>
                <span className="world-grid__name">{entry.name}</span>
                <span className="world-grid__progress">
                  Level {entry.frontier}/{entry.totalLevels}
                </span>
                {/* Three tiers at once, as the world button shows them — the
                    grid's per-difficulty count is a different question. */}
                <span className="world-grid__tiers">
                  <span className="world-grid__tier world-grid__tier--bronze">{entry.bronze}</span>
                  <span className="world-grid__tier world-grid__tier--silver">{entry.silver}</span>
                  <span className="world-grid__tier world-grid__tier--gold">{entry.gold}</span>
                  <span className="world-grid__tier-total">/{entry.totalLevels * MAX_LEVEL_VALUE}</span>
                </span>
              </>
            ) : (
              <span className="world-grid__number">🔒</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * One level in the grid, with a roster preview on hover.
 *
 * ── The content is AS3-derived; the trigger is not ────────────────────────
 * **What is ported:** everything inside the panel. `previewForLevel` is
 * `PartInfoText`'s `"AllEnemiesInLevel"` branch (`:222-294`) plus the six
 * summary lines `ButtonNextLevel.as:335` composes — the same model the
 * next-level button and the level guide's info icon already use, unchanged.
 *
 * **What is not ported:** hovering a *level-grid cell* to see it. The AS3 shows
 * a level's roster in a detail panel for the **selected** level
 * (`ScreenLevelSelect.addEnemyImages`, `:1112-1160`, gated at `:1197` on
 * `!isLocked`), built from `ImageEnemy` tiles. This port has no selection step
 * — a cell click starts the level — which is divergence **`A8`**, a decision,
 * not a gap. So the information is offered on hover instead.
 *
 * **This does not port `ImageEnemy`, and does not unblock its tooltips.**
 * `ImageEnemy.as:174`/`:178` need per-*enemy* hover targets, which only exist
 * if the tiles themselves are rendered. Those two sites stay `no-consumer` in
 * `infoTextSites.ts`, and this component must not be counted as closing them.
 *
 * Locked levels get no panel: the AS3's own gate withholds the detail panel for
 * a locked level, and showing a roster for one would leak what is behind it —
 * the same rule the bestiary applies to unmet enemies.
 */
function LevelCell({
  world,
  entry,
  difficulty,
  onFocus,
}: {
  world: number;
  entry: NonNullable<LevelListing>['levels'][number];
  difficulty: Difficulty;
  /** Points the detail panel at this level — hover and keyboard focus alike. */
  onFocus: () => void;
}): React.ReactElement {
  const preview = entry.unlocked ? previewForLevel(world, entry.level, difficulty) : null;

  const hover = useInfoText({
    text: preview?.summary ?? '',
    // Opens down-and-right of the cursor. Not an AS3 corner — there is no
    // `changeText` call for this trigger to inherit one from, so it is chosen:
    // the grid runs left-to-right from the top, and this is the direction with
    // room on the most cells.
    showLeft: true,
    showTop: true,
    enemyRows: preview?.rows,
  });

  return (
    <li>
      <button
        type="button"
        className={[
          'level-grid__cell',
          entry.cleared ? 'level-grid__cell--cleared' : '',
          entry.unlocked ? '' : 'level-grid__cell--locked',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={!entry.unlocked}
        // No `title`: a native tooltip and the panel would both appear, saying
        // different things. The panel supersedes it and `aria-label` keeps the
        // accessible name.
        aria-label={
          entry.unlocked
            ? `Level ${entry.level}, ${entry.mode}, ${entry.value} of ${MAX_LEVEL_VALUE} on ${difficulty}`
            : `Level ${entry.level}, locked`
        }
        onClick={() =>
          GameEvents.emit('ui:start-game', { world, level: entry.level, difficulty })
        }
        {...(preview ? hover : {})}
        /*
         * **Composed, and after the spread.** `useInfoText` supplies its own
         * `onMouseEnter` for the tooltip; declaring one before the spread lets
         * the spread win, and the detail panel silently never updates —
         * typecheck caught it here, which it only does because both are on the
         * same element.
         *
         * Focus as well as hover: the panel describes what the player is
         * pointing at, and a keyboard points with focus. Hover alone leaves it
         * stale for anyone tabbing the grid.
         */
        onMouseEnter={() => {
          onFocus();
          if (preview) hover.onMouseEnter();
        }}
        onFocus={onFocus}
      >
        <span className="level-grid__number">{entry.unlocked ? entry.level : '🔒'}</span>
        {entry.unlocked && <span className="level-grid__mode">{entry.mode}</span>}
        {entry.unlocked && <Medals medals={entry.medals} />}
      </button>
    </li>
  );
}

/**
 * The right-hand column — `ScreenLevelSelect.as:390-429`'s `bgWindow` and the
 * six fields it holds: level name, mode, difficulty, objective, note, enemies.
 *
 * ── It describes a level; it does not gate starting one ───────────────────
 * The original **selects** a level and then needs `ButtonPlayLevel` to start
 * it. This port starts one on click — divergence `A8`, which the maintainer
 * confirmed stays. So the two ideas are separated: the grid still launches on
 * click, and this panel describes whichever level the player is *pointing at*,
 * falling back to the one they would play next.
 *
 * `PLAY LEVEL` therefore adds a route rather than replacing one. It is the
 * original's own art doing the original's own job for the level named directly
 * above it — and on a keyboard it is reachable in a way a grid of 30 tiles is
 * not.
 */
function LevelDetail({
  world,
  entry,
  difficulty,
}: {
  world: number;
  entry: NonNullable<LevelListing>['levels'][number] | null;
  difficulty: Difficulty;
}): React.ReactElement {
  const preview = entry && entry.unlocked ? previewForLevel(world, entry.level, difficulty) : null;

  return (
    <aside className="levels__detail" aria-label="Level detail">
      {/* `:421` sets `levelText` in red at the window's top. */}
      <p className="levels__name">{entry ? `Level ${entry.level}` : 'No level'}</p>

      {/* `:424` draws `modeText` as its own line. Flag, Boss, Tower and Defense
          are the modes that say something; "Normal" is the absence of one, and
          the original still prints it. */}
      <p className="levels__mode">{preview ? `${preview.mode} mode` : '—'}</p>

      {/*
        PLAY LEVEL, in CSS — `ButtonPlayLevel`'s art is no longer drawn.

        This is the button `A8` made a second route rather than the only one:
        the grid still starts a level on click, and this starts the one named
        directly above it. On a keyboard it is reachable in a way a grid of 45
        tiles is not.
      */}
      <button
        type="button"
        className="levels__play gloss-pill"
        disabled={!entry || !entry.unlocked}
        aria-label={
          entry && entry.unlocked ? `Play level ${world}-${entry.level}` : 'No level selected'
        }
        onClick={() =>
          entry && GameEvents.emit('ui:start-game', { world, level: entry.level, difficulty })
        }
      >
        <span className="levels__play-label">Play level</span>
      </button>

      <p className="levels__label">Difficulty</p>
      <DifficultyPicker />

      {/* `:425`/`:426` — the caption is its own field above the value, which is
          why they are two elements rather than one string. */}
      <p className="levels__label">Objective</p>
      <p className="levels__objective">{preview?.objective ?? '—'}</p>

      <p className="levels__label">Enemies</p>
      {preview && preview.rows.length > 0 ? (
        <ul className="levels__enemies">
          {preview.rows.map((row, i) => (
            <li key={`${row.type}-${i}`} className="levels__enemy">
              {/* Share on top, picture, tier underneath — the arrangement
                  `addEnemyImages` uses (`:1112-1160`). */}
              <span className="levels__enemy-amount">{row.amountLabel}</span>
              {row.shape !== undefined && <EnemyTile layers={[row.shape]} label={row.type} />}
              <span className="levels__enemy-level">{row.levelLabel}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="levels__objective">{entry?.unlocked ? '—' : 'Locked'}</p>
      )}
    </aside>
  );
}

export function LevelSelectScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const listing = useGameStore((s) => s.levelList);
  const worldList = useGameStore((s) => s.worldList);
  const difficulty = useGameStore((s) => s.difficulty);
  /**
   * Which level the detail panel describes.
   *
   * `null` until the player points at something, and then it follows hover and
   * keyboard focus alike — the panel is a description of what is under the
   * cursor, so the two inputs mean the same thing here.
   */
  const [focused, setFocused] = useState<number | null>(null);
  if (activeScene !== 'LevelSelect') return null;

  // `selected` 0 is the picker — the AS3's `selectedWorld = 0`. The scene owns
  // it; this only renders whichever view it names.
  const showingPicker = (worldList?.selected ?? 0) === 0;
  const levels = showingPicker ? [] : (listing?.levels ?? []);
  const cleared = levels.filter((l) => l.cleared).length;
  const medals = levels.reduce((sum, l) => sum + l.value, 0);

  /**
   * The level the detail panel falls back to when nothing is hovered.
   *
   * **The level guide's, not the furthest open one** —
   * `selectFromLevelGuide` (`:583-595`) is what the AS3 runs after opening a
   * grid, and the scene has already applied its two conditions (same world,
   * unlocked) before publishing `guideLevel`.
   *
   * They agree in the common case, which is why the old "furthest unlocked"
   * fallback looked right: the guide defaults to `Upcoming`, and the upcoming
   * level *is* the frontier. They diverge the moment the player moves the
   * guide in the shop — pressing `Previous` there and walking to level select
   * should land on that level, and used to land on the frontier instead.
   *
   * The frontier stays as the second fallback, for a world the guide is not
   * pointing into.
   */
  const frontier = levels.filter((l) => l.unlocked).at(-1)?.level ?? null;
  const shown = focused ?? listing?.guideLevel ?? frontier;

  return (
    <ScreenShell
      title="Level select"
      titleClip="TitleLevelSelect"
      typeTitle
      nav="LevelSelect"
      className="screen--levels"
    >
      {/*
        The world name and the way back out.

        These stay in the content rather than moving into the title bar: the
        bar carries `TitleLevelSelect`, which is fixed art, and the world is a
        changing value. `ScreenLevelSelect.as:421` likewise draws `worldText`
        below the title, not in it.

        "Back" still means "up one level of this screen" — out to the world
        picker from a grid, out to the menu from the picker — which is
        `ButtonWorldSelect`'s job (`:692`, likewise hidden while the picker
        shows). The bottom bar's Menu button is the other exit, and they do
        different things.
      */}
      {showingPicker ? (
        <div className="levels levels--picker">
          {/*
            No way back out of the picker, which is the original's own shape:
            `ScreenLevelSelect` has `bWorldSelect` for going *up* from a grid
            and nothing for leaving the world list — the bottom bar carries
            that. A second exit beside the bar's Menu button was the port's
            addition and is gone.
          */}
          <h2 className="screen__subtitle">Choose a world</h2>
          <DifficultyPicker />
          <WorldPicker />
          <p className="screen__hint">
            {worldList?.worlds.filter((w) => w.unlocked).length ?? 0} of{' '}
            {worldList?.worlds.length ?? 0} worlds open. Finish a world&apos;s last level to
            open the next.
          </p>
        </div>
      ) : levels.length === 0 ? (
        <p className="screen__hint">No levels available.</p>
      ) : (
        /*
          Two columns, edge to edge — `bgLevelSelect` and `bgWindow` at `:390`
          and `:418`, which in the original are adjacent plates spanning the
          stage. No cap and no centring: the shop learned that a `max-width`
          here reads as black pillars on a 2K display (`A32`).
        */
        <div className="levels">
          <section className="levels__main" aria-label="Levels">
            {/* `:421` draws `worldText` over the grid's own plate. */}
            <header className="levels__world">
              <h2 className="levels__world-name">{listing?.worldName ?? 'Loading…'}</h2>
              <p className="levels__tally">
                {medals}/{levels.length * MAX_LEVEL_VALUE} medals on {difficulty} ·{' '}
                {cleared}/{levels.length} cleared
              </p>
            </header>

            <div className="levels__grid-panel">
              <ul className="level-grid">
                {levels.map((entry) => (
                  <LevelCell
                    key={entry.level}
                    world={listing!.world}
                    entry={entry}
                    difficulty={difficulty}
                    onFocus={() => setFocused(entry.level)}
                  />
                ))}
              </ul>
            </div>

            {/*
              `ButtonWorldSelect` (`:692`) — out to the world picker, centred
              under the grid where the original puts it. "Back" in the picker
              means one more level up, to the menu.
            */}
            <button
              type="button"
              className="levels__world-button gloss-pill"
              onClick={() => GameEvents.emit('ui:select-world', { world: 0 })}
            >
              <span className="levels__world-button-label">Select world</span>
            </button>
          </section>

          <LevelDetail
            world={listing!.world}
            entry={levels.find((l) => l.level === shown) ?? null}
            difficulty={difficulty}
          />
        </div>
      )}

    </ScreenShell>
  );
}
