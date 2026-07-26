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
import { Worlds } from '../../game/config/constants';

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
                  GameEvents.emit('ui:start-game', { world, level, sandbox: true, equipped })
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

export function LevelSelectScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const listing = useGameStore((s) => s.levelList);
  if (activeScene !== 'LevelSelect') return null;

  const levels = listing?.levels ?? [];
  const cleared = levels.filter((l) => l.cleared).length;

  return (
    <div className="screen screen--levels">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Back
        </button>
        <h2 className="screen__title">{listing?.worldName ?? 'Loading…'}</h2>
      </header>

      {levels.length === 0 ? (
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
                    ? `Level ${entry.level}, ${entry.mode}${entry.cleared ? ', cleared' : ''}`
                    : `Level ${entry.level}, locked`
                }
                onClick={() =>
                  GameEvents.emit('ui:start-game', {
                    world: listing!.world,
                    level: entry.level,
                  })
                }
              >
                <span className="level-grid__number">{entry.unlocked ? entry.level : '🔒'}</span>
                {entry.unlocked && <span className="level-grid__mode">{entry.mode}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="screen__hint">
        {cleared}/{levels.length} cleared · world 1 of 9 — the world picker is not ported yet
      </p>

      {import.meta.env.DEV && <DevLevelJump />}
    </div>
  );
}
