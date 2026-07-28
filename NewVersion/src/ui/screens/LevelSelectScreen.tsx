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
import { LEVELS } from '../../game/levels/levelData';
import { Difficulties as DIFFICULTIES, Worlds } from '../../game/config/constants';
import { MAX_LEVEL_VALUE } from '../../game/levels/levelProgress';

/**
 * Dev-only jump to any level in any world.
 *
 * `LevelSelectScene` publishes world 1 only (`SELECTED_WORLD`) and gates each
 * level on the previous one being cleared, which is faithful but makes most of
 * the game unreachable for a visual pass — level 1-9, the first Boss level,
 * needs eight clears first.
 *
 * Two deliberate choices:
 *
 *  - It emits the same `ui:start-game` the real grid emits, rather than
 *    inventing a second route into `GameplayScene`. The Test buttons on the
 *    enemies screen already work this way.
 *  - It sets `sandbox`, so nothing it launches can reach the save. That is what
 *    makes it safe to jump into world 7 without inventing progress the player
 *    never made.
 *
 * Reading `LEVELS` in React is the one rule bent here: screens normally take
 * game data from a scene via the store. The alternative is teaching
 * `LevelSelectScene` to publish nine worlds purely for a dev affordance, which
 * would put dev-only branching in production scene code. `EnemiesScreen` bends
 * the same rule for the same reason.
 *
 * Stripped from production builds by the `import.meta.env.DEV` guard at its
 * only call site.
 */
function DevLevelJump(): React.ReactElement {
  const difficulty = useGameStore((s) => s.difficulty);
  const [world, setWorld] = useState(1);
  const [equipped, setEquipped] = useState(true);
  const levels = LEVELS[world - 1] ?? [];

  return (
    <section className="dev-jump">
      <h3 className="dev-jump__title">Dev · jump to any level</h3>

      <label className="dev-jump__equip">
        <input
          type="checkbox"
          checked={equipped}
          onChange={(e) => setEquipped(e.target.checked)}
        />
        {/* Default on: arriving at a late level with the starting Cannon reads
            as "the boss will not die" when it is really 31s of perfect fire. */}
        <span>Arrive fully upgraded</span>
      </label>

      <div className="dev-jump__worlds">
        {LEVELS.map((_, index) => {
          const n = index + 1;
          return (
            <button
              key={n}
              type="button"
              className={`dev-jump__world${n === world ? ' dev-jump__world--on' : ''}`}
              aria-pressed={n === world}
              onClick={() => setWorld(n)}
            >
              {n}
            </button>
          );
        })}
      </div>

      <ul className="dev-jump__grid">
        {levels.map((spec, index) => {
          const level = index + 1;
          return (
            <li key={level}>
              <button
                type="button"
                className={`dev-jump__cell dev-jump__cell--${spec.mode.toLowerCase()}`}
                title={`World ${world} level ${level} — ${spec.mode}, ${spec.roomWidth}x${spec.roomHeight}`}
                aria-label={`World ${world}, level ${level}, ${spec.mode}`}
                onClick={() =>
                  GameEvents.emit('ui:start-game', { world, level, difficulty, sandbox: true, equipped })
                }
              >
                <span className="dev-jump__number">{level}</span>
                <span className="dev-jump__mode">{spec.mode}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="screen__hint">
        {Worlds[world - 1] ?? `World ${world}`} · {levels.length} levels. Runs launched here
        are sandboxed: no money banked, no result recorded, no change to your save.
        {equipped
          ? ' Upgrades are maxed for the run only and are never written back.'
          : ' Using your real upgrades — a late level may be unwinnable at low damage.'}
      </p>
    </section>
  );
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
      {DIFFICULTIES.map((option) => (
        <button
          key={option}
          type="button"
          className={`difficulty__button${option === difficulty ? ' difficulty__button--on' : ''}`}
          aria-pressed={option === difficulty}
          onClick={() => GameEvents.emit('ui:set-difficulty', { difficulty: option })}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/**
 * Medals earned, as seen from the current difficulty.
 *
 * The count is per-difficulty by the cascade in `getLevelValues`, so the same
 * level reads 3 on Easy and 0 on Hard until it has been beaten on Hard. That is
 * the whole reason the row carries a value rather than a boolean.
 */
function Medals({ value }: { value: number }): React.ReactElement {
  return (
    <span className="level-grid__medals" aria-hidden="true">
      {'★'.repeat(value)}
      {'☆'.repeat(MAX_LEVEL_VALUE - value)}
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

export function LevelSelectScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const listing = useGameStore((s) => s.levelList);
  const worldList = useGameStore((s) => s.worldList);
  const difficulty = useGameStore((s) => s.difficulty);
  if (activeScene !== 'LevelSelect') return null;

  // `selected` 0 is the picker — the AS3's `selectedWorld = 0`. The scene owns
  // it; this only renders whichever view it names.
  const showingPicker = (worldList?.selected ?? 0) === 0;
  const levels = showingPicker ? [] : (listing?.levels ?? []);
  const cleared = levels.filter((l) => l.cleared).length;
  const medals = levels.reduce((sum, l) => sum + l.value, 0);

  return (
    <div className="screen screen--levels">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          // Back means "up one level of the screen": out to the world picker
          // from a grid, out to the menu from the picker. `ButtonWorldSelect`
          // is the AS3's equivalent and is likewise absent while the picker is
          // showing (`:692`).
          onClick={() =>
            showingPicker
              ? GameEvents.emit('ui:goto', { key: 'MainMenu' })
              : GameEvents.emit('ui:select-world', { world: 0 })
          }
        >
          {showingPicker ? '‹ Back' : '‹ Worlds'}
        </button>
        <h2 className="screen__title">
          {showingPicker ? 'Choose a world' : (listing?.worldName ?? 'Loading…')}
        </h2>
      </header>

      <DifficultyPicker />

      {showingPicker ? (
        <WorldPicker />
      ) : levels.length === 0 ? (
        <p className="screen__hint">No levels available.</p>
      ) : (
        <ul className="level-grid">
          {levels.map((entry) => (
            <li key={entry.level}>
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
                // The mode is the useful distinguisher between levels, and it
                // is the only hint that a Flag or Boss level plays differently.
                title={entry.unlocked ? `${entry.mode} level` : 'Clear the previous level first'}
                aria-label={
                  entry.unlocked
                    ? `Level ${entry.level}, ${entry.mode}, ${entry.value} of ${MAX_LEVEL_VALUE} on ${difficulty}`
                    : `Level ${entry.level}, locked`
                }
                onClick={() =>
                  GameEvents.emit('ui:start-game', {
                    world: listing!.world,
                    level: entry.level,
                    difficulty,
                  })
                }
              >
                <span className="level-grid__number">{entry.unlocked ? entry.level : '🔒'}</span>
                {entry.unlocked && <span className="level-grid__mode">{entry.mode}</span>}
                {entry.unlocked && <Medals value={entry.value} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showingPicker ? (
        <p className="screen__hint">
          {worldList?.worlds.filter((w) => w.unlocked).length ?? 0} of{' '}
          {worldList?.worlds.length ?? 0} worlds open. Finish a world's last level to
          open the next.
        </p>
      ) : (
        <p className="screen__hint">
          {medals}/{levels.length * MAX_LEVEL_VALUE} medals on {difficulty} · {cleared}/
          {levels.length} cleared
        </p>
      )}

      {import.meta.env.DEV && <DevLevelJump />}
    </div>
  );
}
