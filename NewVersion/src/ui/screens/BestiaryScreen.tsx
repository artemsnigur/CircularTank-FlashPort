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
import { ResistanceIcon } from '../ResistanceIcon';
import { EnemyTile } from '../EnemyTile';
import type { ResistanceBadge } from '../../game/enemies/resistanceIcons';

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

export function BestiaryScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const bestiary = useGameStore((s) => s.bestiary);
  if (activeScene !== 'Bestiary') return null;

  const entries = bestiary?.entries ?? [];
  const knownCount = bestiary?.knownCount ?? 0;
  const total = bestiary?.total ?? 0;

  return (
    <div className="screen screen--bestiary">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Menu
        </button>
        <h2 className="screen__title">Bestiary</h2>
        <span className="bestiary__count" aria-label={`${knownCount} of ${total} enemies known`}>
          {knownCount} / {total}
        </span>
      </header>

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
    </div>
  );
}
