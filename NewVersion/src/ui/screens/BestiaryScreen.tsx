/**
 * The bestiary — `ScreenEnemies.as`.
 *
 * The player-facing view: which enemies have been met, and what is known about
 * them. `EnemiesScreen` is the development board and is a different screen for
 * a different audience.
 *
 * Renders entirely from `bestiary`, which `BestiaryScene` publishes off the
 * profile. This component does no lookups of its own — in particular it never
 * reads `BESTIARY` directly, because that would show descriptions for enemies
 * the player has not met.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { ScreenShell } from '../ScreenShell';
import { ResistanceIcon } from '../ResistanceIcon';
import { EnemyTile } from '../EnemyTile';
import type { ResistanceBadge } from '../../game/enemies/resistanceIcons';
import { BESTIARY_TIERS, TIER_LABEL } from '../../game/enemies/bestiaryView';
import type { BestiaryStats, BestiaryView } from '../../game/enemies/bestiaryView';
import { Difficulties } from '../../game/config/constants';

/**
 * One resistance row — the AS3 draws the badges alone, with no caption.
 *
 * A caption is added here because the original's two rows are told apart by
 * their **badge colour and stage position** (`y = 348` against `y = 408`), and
 * this port stacks them in flow where neither cue survives on its own. The
 * colours still differ; the words say which is which without relying on that.
 */
function ResistanceRow({
  label,
  badges,
}: {
  label: string;
  badges: ResistanceBadge[];
}): React.ReactElement {
  return (
    <span className="resistance-row">
      <span className="resistance-row__label">{label}</span>
      {badges.map((badge, i) => (
        <ResistanceIcon key={`${badge.frame}-${i}`} badge={badge} />
      ))}
    </span>
  );
}

/**
 * The four stat lines — `ScreenEnemies.as:544-567`.
 *
 * The AS3 prints each as one string ("Health: 120 HP"); split into a label and
 * a value here so the numbers can line up in a column, which a proportional
 * DOM font needs and a fixed stage layout did not.
 */
function StatBlock({ stats }: { stats: BestiaryStats }): React.ReactElement {
  const speed =
    stats.speedMax === undefined ? `${stats.speed}` : `${stats.speed}-${stats.speedMax}`;

  return (
    <dl className="bestiary-stats">
      <div className="bestiary-stats__item">
        <dt>Money</dt>
        <dd>{stats.money}$</dd>
      </div>
      <div className="bestiary-stats__item">
        <dt>Health</dt>
        <dd>{stats.health} HP</dd>
      </div>
      <div className="bestiary-stats__item">
        <dt>Damage</dt>
        <dd>{stats.damage} HP</dd>
      </div>
      <div className="bestiary-stats__item">
        <dt>Speed</dt>
        {/* `:551` — px per second. The range form is Temperamental's and
            Accelerating's only; see `bestiaryStats.ts`. */}
        <dd>{speed} PX/Sec</dd>
      </div>
    </dl>
  );
}

/**
 * The difficulty and tier selectors — `ScreenEnemies.as:583-611`.
 *
 * **One pair for the whole screen, not one per row.** Both are statics in the
 * original (`enemyDifficulty`, `selectedEnemyLevel`), so a change re-reads
 * every enemy; twenty copies of a single setting would be twenty ways to ask
 * the same question.
 *
 * The scene owns the state. This emits and re-renders from what comes back, so
 * the buttons cannot claim a selection the numbers do not reflect.
 */
function ViewControls({ view }: { view: BestiaryView }): React.ReactElement {
  const set = (next: Partial<BestiaryView>): void => {
    GameEvents.emit('ui:bestiary-view', { ...view, ...next });
  };

  return (
    <div className="bestiary-controls">
      <div className="bestiary-controls__group" role="group" aria-label="Difficulty">
        {Difficulties.map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            className={`bestiary-controls__button${
              view.difficulty === difficulty ? ' bestiary-controls__button--on' : ''
            }`}
            aria-pressed={view.difficulty === difficulty}
            onClick={() => set({ difficulty })}
          >
            {difficulty}
          </button>
        ))}
      </div>
      <div className="bestiary-controls__group" role="group" aria-label="Enemy level">
        {BESTIARY_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            className={`bestiary-controls__button${
              view.tier === tier ? ' bestiary-controls__button--on' : ''
            }`}
            aria-pressed={view.tier === tier}
            onClick={() => set({ tier })}
          >
            {TIER_LABEL[tier]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BestiaryScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const bestiary = useGameStore((s) => s.bestiary);
  if (activeScene !== 'Bestiary') return null;

  const entries = bestiary?.entries ?? [];
  const knownCount = bestiary?.knownCount ?? 0;
  const total = bestiary?.total ?? 0;

  return (
    <ScreenShell
      title="Enemies"
      titleClip="TitleEnemies"
      nav="Enemies"
      className="screen--bestiary"
    >
      {/* The title art says "ENEMIES" because that is what `TitleEnemies`
          draws and what `ScreenEnemies.as` is called. The port's own name for
          this screen stays "Bestiary" in the code, where it distinguishes the
          player-facing view from `EnemiesScreen`, the development board. */}
      <p className="screen__count" aria-label={`${knownCount} of ${total} enemies known`}>
        {knownCount} / {total}
      </p>

      {bestiary && <ViewControls view={bestiary.view} />}

      {entries.length === 0 ? (
        <p className="screen__hint">Loading…</p>
      ) : (
        <ul className="bestiary__list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`bestiary-row ${entry.known ? '' : 'bestiary-row--locked'}`}
            >
              {/*
                The enemy's picture — `ButtonEnemy<Type>` frame 1, or frame 4
                for an unmet one. Which of the two is decided in the listing,
                not here: this screen is not allowed to know what a locked
                enemy looks like, which is the same rule that keeps the
                description out of it.
              */}
              <EnemyTile
                layers={entry.tile}
                label={entry.known ? entry.displayName : 'Not yet encountered'}
              />
              <span className="bestiary-row__name">
                {entry.known ? entry.displayName : '???'}
              </span>
              <span className="bestiary-row__text">
                {entry.known ? entry.description : 'Not yet encountered.'}
              </span>
              {/*
                The two resistance rows — `ScreenEnemies.as:331-451`, which
                draws them as one line of strength badges and one of weakness
                badges. Absent entirely for an unmet enemy: the listing sends no
                badges at all in that case, so there is nothing here to leak.

                The AS3 places these at fixed stage coordinates (`:378`
                `x = 434 + i * 38`, `y = 348`/`408`) against a 640x480 stage.
                Rule 7: those are frozen screen constants, not a layout, so the
                port uses a flow row at the same 38px pitch.
              */}
              {/* Absent for an unmet enemy: the listing sends no stats, so
                  there is no number here to hide. */}
              {entry.stats && <StatBlock stats={entry.stats} />}
              {entry.strengths.length > 0 && (
                <span className="bestiary-row__resist">
                  <ResistanceRow label="Strong vs" badges={entry.strengths} />
                  <ResistanceRow label="Weak to" badges={entry.weaknesses} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="screen__hint">
        Clearing a level reveals the enemies waiting in the next one.
      </p>
    </ScreenShell>
  );
}
