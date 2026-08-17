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
import type { LevelListing } from '../../state/gameStore';
import type { Difficulty } from '../../game/config/constants';
import type { MedalTier } from '../../game/levels/medalTiers';
import { LevelModeIcon } from '../LevelModeIcon';
import { CursorTooltip } from '../CursorTooltip';
import { shapeUrl } from '../../assets/registry';
import { CHROME_CLIPS } from '../../game/ui/chromeArt';

/**
 * The world's own texture band — `bgFadeText` frame `1 + world` (`:795`).
 *
 * Frame 1 is the world picker's, so the frames array (0-based) is indexed by
 * the world number directly. Out of range falls back to world 1's rather than
 * to nothing: a missing band reads as a broken header, and every world in the
 * data has one.
 */
function worldBand(world: number): string {
  const frames = CHROME_CLIPS.BackgroundFadeText.frames;
  const frame = frames[world] ?? frames[1];
  return `url(${shapeUrl(`${frame.layers[0].shape}.svg`)})`;
}

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
function Medals({
  medals,
  mode,
}: {
  medals: readonly MedalTier[];
  /**
   * The medal's *shape* — `:874` builds the icon from the level's mode before
   * `:898` sets its tier frame, so a Flag level earns flags and a Boss level
   * earns skulls. One icon doing two jobs, which is why this takes the mode
   * rather than the badge owning it alone.
   */
  mode: string;
}): React.ReactElement {
  return (
    <span className="level-grid__medals" aria-hidden="true">
      {Array.from({ length: MAX_LEVEL_VALUE }, (_, i) => {
        const tier = medals[i];
        return (
          <LevelModeIcon
            key={i}
            mode={mode}
            className={`level-grid__medal${tier ? ` level-grid__medal--${tier}` : ''}`}
          />
        );
      })}
    </span>
  );
}

/**
 * One tier's tally on a world tile — `iconBronzeValue` and its two siblings,
 * each an `IconValue` frame beside a `N/135` count (`:1571-1573`).
 *
 * The glyphs are the five level modes in that tier's colour. The original
 * draws a single composite `IconValue`; this spells it out with the shapes
 * `LevelModeIcon` already owns, which reads as "medals of every kind" at any
 * size and needs no sixth extracted clip. `A35`.
 */
function WorldTally({
  tier,
  earned,
  total,
}: {
  tier: MedalTier;
  earned: number;
  total: number;
}): React.ReactElement {
  return (
    <span className={`world-tally world-tally--${tier}`}>
      <span className="world-tally__icons" aria-hidden="true">
        {(['Normal', 'Flag', 'Tower', 'Defense', 'Boss'] as const).map((mode) => (
          <LevelModeIcon key={mode} mode={mode} className="world-tally__icon" />
        ))}
      </span>
      <span className="world-tally__count">
        {earned}/{total}
      </span>
    </span>
  );
}

/**
 * The world picker — `ButtonWorld`, `ScreenLevelSelect.as:1488-1576`.
 *
 * A locked world shows nothing at all in the original: the number, the progress
 * line and all three tallies are blanked (`:1520-1524`), and tapping it does
 * nothing. Both kept — the button is disabled, so a locked world is inert here
 * for the same reason it is there.
 *
 * ── The tile's parts, and where each comes from ───────────────────────────
 * `:1541` puts the world number top-left, `:1570` the `Level N/45` line
 * top-right, and `:1571-1573` the three tier tallies down the bottom half.
 * Between them sits the world's own terrain — the same texture the level
 * grid's header band carries, which is why `worldBand` serves both.
 *
 * **No difficulty buttons here.** They used to render above this grid, and
 * they do not belong: the tallies show all three tiers at once, so a
 * difficulty is neither read nor displayed on this view. It is chosen where it
 * matters, beside the level being played.
 */
function WorldPicker(): React.ReactElement {
  const listing = useGameStore((s) => s.worldList);
  const worlds = listing?.worlds ?? [];

  if (worlds.length === 0) return <p className="screen__hint">Loading…</p>;

  return (
    <ul className="world-grid">
      {worlds.map((entry) => (
        <li key={entry.world} className="world-grid__slot">
          <button
            type="button"
            className={`world-grid__cell${entry.unlocked ? '' : ' world-grid__cell--locked'}`}
            disabled={!entry.unlocked}
            aria-label={
              entry.unlocked
                ? `World ${entry.world}, ${entry.name}, level ${entry.frontier} of ${entry.totalLevels}`
                : `World ${entry.world}, locked`
            }
            onClick={() => GameEvents.emit('ui:select-world', { world: entry.world })}
          >
            {entry.unlocked ? (
              <>
                {/* The world's terrain, as its own texture — the same shape the
                    level grid's header band uses for this world. */}
                <span
                  className="world-grid__scene"
                  style={{ backgroundImage: worldBand(entry.world) }}
                  aria-hidden="true"
                >
                  <span className="world-grid__number">{entry.world}</span>
                  <span className="world-grid__progress">
                    Level {entry.frontier}/{entry.totalLevels}
                  </span>
                </span>

                <span className="world-grid__name">{entry.name}</span>

                {/* Three tiers at once, as `ButtonWorld` shows them — the level
                    grid's per-difficulty count is a different question. */}
                <span className="world-grid__tallies">
                  <WorldTally
                    tier="gold"
                    earned={entry.gold}
                    total={entry.totalLevels * MAX_LEVEL_VALUE}
                  />
                  <WorldTally
                    tier="silver"
                    earned={entry.silver}
                    total={entry.totalLevels * MAX_LEVEL_VALUE}
                  />
                  <WorldTally
                    tier="bronze"
                    earned={entry.bronze}
                    total={entry.totalLevels * MAX_LEVEL_VALUE}
                  />
                </span>
              </>
            ) : (
              /* `:1521-1524` blanks every field on a locked world; the padlock
                 is all that is left. */
              <span className="world-grid__lock" aria-hidden="true" />
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
 * `!isLocked`), built from `ImageEnemy` tiles. The port now has that selection
 * step too — `A8` was reversed in T173 — so the panel beside the grid is the
 * faithful home for this, and the hover tooltip is an extra beside it.
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
  entry,
  difficulty,
  selected,
  onSelect,
  onHover,
}: {
  entry: NonNullable<LevelListing>['levels'][number];
  difficulty: Difficulty;
  /** Whether the detail panel is describing this level. */
  selected: boolean;
  /** Points the detail panel at this level — a click, and only a click. */
  onSelect: () => void;
  /** Raises and lowers the cursor tooltip. Hover changes nothing else. */
  onHover: (level: number | null) => void;
}): React.ReactElement {

  return (
    <li>
      <button
        type="button"
        className={[
          'level-grid__cell',
          entry.cleared ? 'level-grid__cell--cleared' : '',
          entry.unlocked ? '' : 'level-grid__cell--locked',
          selected ? 'level-grid__cell--on' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={!entry.unlocked}
        // `aria-pressed` and not `aria-current`: this is a selection among
        // peers, and it is what tells a screen reader which tile the panel is
        // describing — the highlight says it to everyone else.
        aria-pressed={selected}
        // No `title`: a native tooltip and the panel would both appear, saying
        // different things. The panel supersedes it and `aria-label` keeps the
        // accessible name.
        aria-label={
          entry.unlocked
            ? `Level ${entry.level}, ${entry.mode}, ${entry.value} of ${MAX_LEVEL_VALUE} on ${difficulty}`
            : `Level ${entry.level}, locked`
        }
        /*
         * **A click selects; it does not start.** This is `A8` reversed at the
         * maintainer's direction, back to the AS3's four steps: pick a world,
         * see the grid, *select* a level (`selectedLevel`, drawn as a
         * highlight), then press Play.
         *
         * The old model started the level here, and hover moved the panel —
         * which meant the panel changed under the cursor on the way to
         * anything, and a mis-click launched a level. Both are gone: hover is
         * now only a CSS state.
         */
        onClick={onSelect}
        /*
         * Hover raises the cursor tooltip and does nothing else — it does not
         * move the selection, and the panel on the right stays where the last
         * click put it.
         *
         * These fire once per tile crossed, not once per pointer move: the
         * tooltip's *position* is written straight to `style.transform` by
         * `CursorTooltip`, so React never sees a coordinate.
         */
        onMouseEnter={() => onHover(entry.unlocked ? entry.level : null)}
        onMouseLeave={() => onHover(null)}
      >
        {/*
          Number top-left, mode badge top-right, medals along the bottom —
          `ButtonLevelSelect`'s own arrangement (`:925` puts `iconMode` at
          (32, 11) and `:915` the medals at y 32, on a 41px button).

          Absolutely placed rather than stacked in flow, and that is a layout
          fix as much as a faithfulness one: a column of three grew the tile
          past its `aspect-ratio`, which is what stretched the cells and
          pushed the last row out of the plate.
        */}
        <span className="level-grid__number">{entry.unlocked ? entry.level : ''}</span>
        {entry.unlocked ? (
          <LevelModeIcon mode={entry.mode} className="level-grid__badge" />
        ) : (
          <span className="level-grid__lock" aria-hidden="true" />
        )}
        {entry.unlocked && <Medals medals={entry.medals} mode={entry.mode} />}
      </button>
    </li>
  );
}

/**
 * The right-hand column — `ScreenLevelSelect.as:390-429`'s `bgWindow` and the
 * six fields it holds: level name, mode, difficulty, objective, note, enemies.
 *
 * ── It describes the selected level, and PLAY LEVEL is the only way in ────
 * The original **selects** a level and then needs `ButtonPlayLevel` to start
 * it. `A8` diverged from that — a cell click launched immediately — and T173
 * reversed it at the maintainer's direction, so the flow is the AS3's four
 * steps again: world, grid, select, Play.
 *
 * `PLAY LEVEL` is therefore the route rather than a second one. The grid no
 * longer starts anything, which also means a mis-click costs nothing.
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

        The only way into a level since T173. The grid selects; this starts
        whichever level the panel is describing.
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
   * Which level the detail panel describes — the AS3's `selectedLevel`.
   *
   * **Moved by a click only.** It used to follow hover and focus, on the
   * reading that the panel described "what the player is pointing at". In use
   * that means the panel changes under the cursor on the way to anywhere else,
   * so the thing you were reading is gone by the time you look at it. A
   * selection should be something you ask for.
   *
   * `null` until then, and the fallback is the level guide's — see `shown`.
   */
  const [focused, setFocused] = useState<number | null>(null);
  /**
   * Which tile the pointer is over, for the cursor tooltip only.
   *
   * Deliberately *not* the same thing as `focused`: this changes as the
   * pointer crosses tiles and must never move the panel — that is the whole
   * point of T173's split. It changes a handful of times a second at most,
   * which is why it can be React state at all; the tooltip's coordinates never
   * are. See `CursorTooltip`.
   */
  const [hovered, setHovered] = useState<number | null>(null);
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
            `SELECT WORLD` on its own band, the way the grid view heads itself
            with the world name — one shape for both states of this screen.

            No way back out of here, which is the original's own arrangement:
            `ScreenLevelSelect` has `bWorldSelect` for going *up* from a grid
            and nothing for leaving the world list, because the bottom bar
            carries that.

            **And no difficulty buttons.** They used to sit here and did not
            belong: the tiles show all three tiers at once, so a difficulty is
            neither read nor shown on this view. It is chosen where it matters,
            beside the level about to be played.
          */}
          <header className="levels__world levels__world--picker">
            <h2 className="levels__world-name">Select world</h2>
            <p className="levels__tally">
              {worldList?.worlds.filter((w) => w.unlocked).length ?? 0} of{' '}
              {worldList?.worlds.length ?? 0} open
            </p>
          </header>

          <WorldPicker />
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
            <header
              className="levels__world"
              /*
                Each world has its own texture — `bgFadeText`, ten frames of
                one shape, `gotoAndStop(1 + selectedWorld)` (`:795`). Frame 1
                is the picker, so world N is index N.

                A background image and not a `ChromeArt`, for `A27`'s reason:
                the shape has no `viewBox`, and this has to stretch across
                whatever the column is rather than keep its authored 410px.
              */
              style={{ backgroundImage: worldBand(listing?.world ?? 1) }}
            >
              {/* `:1184` — `worldText.text = "World " + selectedWorld`. The
                  world's *name* is the port's addition beside it. */}
              <h2 className="levels__world-name">World {listing?.world ?? 1}</h2>
              <p className="levels__world-theme">{listing?.worldName ?? ''}</p>
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
                    entry={entry}
                    difficulty={difficulty}
                    selected={entry.level === shown}
                    onSelect={() => setFocused(entry.level)}
                    onHover={setHovered}
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

          {/*
            One preview computed for the hovered tile, not 45 for every tile on
            every render — which is what `LevelCell` used to do. `hovered` is
            null whenever the pointer is off the grid, so this costs nothing
            the rest of the time.
          */}
          <CursorTooltip
            title={`Level ${listing!.world}-${hovered ?? ''}`}
            preview={
              hovered === null ? null : previewForLevel(listing!.world, hovered, difficulty)
            }
          />
        </div>
      )}

    </ScreenShell>
  );
}
