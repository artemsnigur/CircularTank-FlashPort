/**
 * React-rendered HUD overlay.
 *
 * Every value here comes from the Zustand store, which is fed by
 * state/bridge.ts from Phaser events. There is no polling, no
 * requestAnimationFrame, and no reference to a Scene: a component re-renders
 * only when the specific slice it selected changes.
 *
 * The overlay is `pointer-events: none` so taps fall through to the canvas;
 * individual controls re-enable it for themselves.
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { buildStatusPages, initialPageIndex,
  revealPages,
  unlockSummary,
} from '../game/waves/statusPages';
import { AudioToggles } from './AudioToggles';
import { GameEvents } from '../game/events/GameEvents';
import { formatNumber } from '../game/core/Functions';

const ACHIEVEMENT_TOAST_MS = 4000;

function CurrencyCounter(): React.ReactElement {
  // The worked example from the brief: a React counter driven by a Phaser
  // event. Drive the tank over a coin in the Gameplay scene and this updates.
  const currency = useGameStore((s) => s.currency);
  return (
    <div className="hud-stat" aria-live="polite">
      <span className="hud-stat__icon" aria-hidden="true">
        ◉
      </span>
      {/* Functions.formatNumber, not toLocaleString: the original always
          comma-groups, whereas toLocaleString yields "1 234" in fr-FR. */}
      <span className="hud-stat__value">{formatNumber(currency)}</span>
      <span className="hud-stat__label">coins</span>
    </div>
  );
}

function HealthBar(): React.ReactElement {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const pct = maxHealth > 0 ? Math.round((health / maxHealth) * 100) : 0;

  return (
    <div
      className="hud-health"
      role="progressbar"
      aria-valuenow={health}
      aria-valuemin={0}
      aria-valuemax={maxHealth}
      aria-label="Tank health"
    >
      <div className="hud-health__fill" style={{ width: `${pct}%` }} />
      <span className="hud-health__text">
        {health}/{maxHealth}
      </span>
    </div>
  );
}

function WaveIndicator(): React.ReactElement | null {
  const wave = useGameStore((s) => s.wave);
  const remaining = useGameStore((s) => s.enemiesRemaining);
  const mode = useGameStore((s) => s.levelMode);
  if (wave <= 0) return null;

  // Flag and Boss levels spawn indefinitely, so there is no finite total to
  // count down — the figure is how many are on screen right now.
  const label = mode === 'Flag' || mode === 'Boss' ? 'on screen' : 'left';

  return (
    <div className="hud-stat hud-stat--right">
      <span className="hud-stat__label">level {mode !== 'Normal' ? `· ${mode}` : ''}</span>
      <span className="hud-stat__value">{wave}</span>
      <span className="hud-stat__sub">
        {remaining} {label}
      </span>
    </div>
  );
}

/**
 * Flags still to capture.
 *
 * Flag levels end on flags, not on clearing the arena, so this is the only
 * counter that reflects progress towards finishing one. Hidden everywhere else.
 */
function FlagCounter(): React.ReactElement | null {
  const mode = useGameStore((s) => s.levelMode);
  const flagsRemaining = useGameStore((s) => s.flagsRemaining);
  if (mode !== 'Flag') return null;

  return (
    <div className="hud-stat hud-stat--flags" aria-live="polite">
      <span className="hud-stat__icon" aria-hidden="true">
        ⚑
      </span>
      <span className="hud-stat__value">{flagsRemaining}</span>
      <span className="hud-stat__label">flags left</span>
    </div>
  );
}

function AmmoReadout(): React.ReactElement | null {
  const ammo = useGameStore((s) => s.ammo);
  const capacity = useGameStore((s) => s.ammoCapacity);
  const weapon = useGameStore((s) => s.weapon);
  if (capacity <= 0) return null;
  return (
    <div className="hud-ammo">
      <span className="hud-ammo__weapon">{weapon}</span>
      <span className="hud-ammo__count">
        {ammo}
        <span className="hud-ammo__cap">/{capacity}</span>
      </span>
    </div>
  );
}

/** Medals earned, always three glyphs so the panel height does not jump. */
function MedalRow({ value }: { value: number }): React.ReactElement {
  return (
    <p className="level-outcome__medals" aria-label={`${value} of 3 medals`}>
      <span aria-hidden="true">
        {'★'.repeat(value)}
        {'☆'.repeat(Math.max(0, 3 - value))}
      </span>
    </p>
  );
}

/**
 * End-of-level results, with reveals over the top — `ScreenStatus`, diverged.
 *
 * ── What the AS3 does ─────────────────────────────────────────────────────
 * One stack of pages, results → achievements → enemies, opening on the **last**
 * (`:431`). The exit buttons sit on the results page only (`:939-960`), so the
 * reveals cannot be skipped, only walked back through. The AS3's exits are
 * Play Again and Next Level; it has **no menu button at all**, and no route to
 * choose a different level.
 *
 * ── What this port does, deliberately (T44) ───────────────────────────────
 * The results open first, and the reveals are a **pop-up over them** rather
 * than pages behind them. A summary line on the results records what was
 * unlocked, so dismissing the pop-up does not lose the information — in the
 * AS3 it could not be missed, because it was a page you had to walk through.
 *
 * The reveal *content* is untouched. Only its place in the sequence moved.
 *
 * `Level select` is also added, alongside the AS3's Next Level and Play Again:
 * the original leaves the screen only forwards or by replaying, which strands
 * a player who wants a different level. It reuses the existing `ui:goto`
 * LevelSelect route rather than introducing a second path.
 *
 * Full reasoning in `docs/AUDIT-2026-07.md`.
 */
function LevelOutcomeOverlay(): React.ReactElement | null {
  const outcome = useGameStore((s) => s.levelOutcome);
  const clearLevelOutcome = useGameStore((s) => s.clearLevelOutcome);
  const difficulty = useGameStore((s) => s.difficulty);

  const pages = useMemo(
    () =>
      outcome
        ? buildStatusPages({
            newAchievements: outcome.newAchievements,
            newEnemies: outcome.newEnemies,
          })
        : [],
    [outcome],
  );
  const [page, setPage] = useState(0);
  // The reveals show over the results and can be dismissed. Opened whenever a
  // result arrives that has any, which is the AS3's "you cannot miss this"
  // without its "you must page past this".
  const [revealsOpen, setRevealsOpen] = useState(false);

  const reveals = useMemo(() => revealPages(pages), [pages]);
  const unlocked = useMemo(() => unlockSummary(pages), [pages]);

  // Reset whenever a new result arrives, not on every render: paging back and
  // forth must not be undone by an unrelated update.
  useEffect(() => {
    setPage(initialPageIndex(pages));
    setRevealsOpen(revealPages(pages).length > 0);
  }, [pages]);

  if (!outcome) return null;

  const current = reveals[Math.min(page, reveals.length - 1)];
  const atFirst = page <= 0;
  const atLast = page >= reveals.length - 1;

  const retry = (): void => {
    clearLevelOutcome();
    GameEvents.emit('ui:goto', { key: 'Gameplay' });
  };

  // Straight into the next level, skipping the trip through level select.
  // The scene owns the level tables and the unlock rule and hands over the
  // coordinates, so this does no arithmetic: it used to send `level + 1`,
  // which is wrong at a world boundary, where the next level is (world + 1, 1).
  const playNext = (): void => {
    if (!outcome.nextLevel) return;
    clearLevelOutcome();
    // The difficulty is the live preference rather than one captured at the
    // start of the finished level: `ScreenLevelSelect.levelDifficulty` is a
    // global the AS3 reads afresh at every level start, and nothing on this
    // overlay can change it, so the two agree.
    GameEvents.emit('ui:start-game', { ...outcome.nextLevel, difficulty });
  };

  /**
   * Added by this port; the AS3 leaves this screen only forwards or by
   * replaying. Reuses the existing route rather than a second path — the
   * level-select screen already owns the unlock rule and the world pin.
   */
  const toLevelSelect = (): void => {
    clearLevelOutcome();
    GameEvents.emit('ui:goto', { key: 'LevelSelect' });
  };

  const toMenu = (): void => {
    clearLevelOutcome();
    GameEvents.emit('ui:goto', { key: 'MainMenu' });
  };

  return (
    <div className="level-outcome" role="dialog" aria-label="Level results">
      <div className="level-outcome__panel">
        {(
          <>
            <h2 className="level-outcome__title">
              {outcome.result === 'won' ? 'Level Cleared' : 'Tank Destroyed'}
            </h2>
            <MedalRow value={outcome.medals} />
            <dl className="level-outcome__stats">
              <div>
                <dt>Level</dt>
                <dd>{outcome.level}</dd>
              </div>
              <div>
                <dt>Kills</dt>
                <dd>{outcome.kills}</dd>
              </div>
              <div>
                <dt>Coins</dt>
                <dd>{outcome.currency}</dd>
              </div>
            </dl>
            {/* Survives the pop-up being dismissed — see the note above. */}
            {unlocked && <p className="level-outcome__unlocked">{unlocked}</p>}

            <div className="level-outcome__actions">
              {outcome.nextLevel !== null && (
                <button
                  type="button"
                  className="hud__button hud__button--primary"
                  onClick={playNext}
                >
                  Next level ›
                </button>
              )}
              <button type="button" className="hud__button" onClick={retry}>
                {outcome.result === 'won' ? 'Replay' : 'Retry'}
              </button>
              <button type="button" className="hud__button" onClick={toLevelSelect}>
                Level select
              </button>
              <button type="button" className="hud__button" onClick={toMenu}>
                Menu
              </button>
            </div>
            {reveals.length > 0 && !revealsOpen && (
              <button
                type="button"
                className="hud__button hud__button--ghost"
                onClick={() => {
                  setPage(0);
                  setRevealsOpen(true);
                }}
              >
                Show what you unlocked
              </button>
            )}
          </>
        )}

      </div>

      {revealsOpen && current && (
        <div className="level-outcome__reveal" role="dialog" aria-label="New unlocks">
          {current.type === 'Achievement' && (
            <>
              <p className="level-outcome__eyebrow">New Achievement</p>
              <h2 className="level-outcome__title">{current.title}</h2>
              <p className="level-outcome__body">{current.description}</p>
              {current.difficultyMatters && (
                <p className="level-outcome__note">Earned on {difficulty}</p>
              )}
            </>
          )}

          {current.type === 'Enemy' && (
            <>
              <p className="level-outcome__eyebrow">New Enemy</p>
              <h2 className="level-outcome__title">{current.displayName}</h2>
              <p className="level-outcome__body">{current.description}</p>
            </>
          )}

          <button
            type="button"
            className="hud__button hud__button--primary"
            onClick={() => setRevealsOpen(false)}
          >
            Continue
          </button>

        {reveals.length > 1 && (
          <nav className="level-outcome__pager" aria-label="Results pages">
            <button
              type="button"
              className="level-outcome__arrow"
              disabled={atFirst}
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ‹
            </button>
            <span className="level-outcome__count">
              {page + 1} / {reveals.length}
            </span>
            <button
              type="button"
              className="level-outcome__arrow"
              disabled={atLast}
              aria-label="Next page"
              onClick={() => setPage((p) => Math.min(reveals.length - 1, p + 1))}
            >
              ›
            </button>
          </nav>
        )}
        </div>
      )}
    </div>
  );
}

function AchievementToasts(): React.ReactElement {
  const achievements = useGameStore((s) => s.achievements);
  const dismiss = useGameStore((s) => s.dismissAchievement);

  useEffect(() => {
    if (achievements.length === 0) return;
    const timers = achievements.map((a) =>
      window.setTimeout(() => dismiss(a.id), Math.max(0, a.at + ACHIEVEMENT_TOAST_MS - Date.now())),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [achievements, dismiss]);

  return (
    <div className="hud-toasts" aria-live="polite">
      {achievements.map((a) => (
        <div key={a.id} className="hud-toast">
          <span className="hud-toast__eyebrow">Achievement unlocked</span>
          <span className="hud-toast__title">{a.title}</span>
        </div>
      ))}
    </div>
  );
}

export function Hud(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const inGame = activeScene === 'Gameplay';

  if (!inGame) return <AchievementToasts />;

  return (
    <div className="hud">
      <div className="hud__row hud__row--top">
        <CurrencyCounter />
        <FlagCounter />
        <WaveIndicator />
      </div>

      <div className="hud__row hud__row--bottom">
        <HealthBar />
        <AmmoReadout />
        {/* PartInterface.as carries bToggleSound in the in-game HUD, not only
            on an options screen — music you cannot silence mid-level is the
            case a toggle exists for. */}
        <AudioToggles />
        <button
          type="button"
          className="hud__button"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          Menu
        </button>
      </div>

      <LevelOutcomeOverlay />
      <AchievementToasts />
    </div>
  );
}
