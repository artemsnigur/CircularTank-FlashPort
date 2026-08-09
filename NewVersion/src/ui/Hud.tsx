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
import {
  FADE_OUT_MS,
  SLIDE_OUT_DISTANCE,
  SLIDE_OUT_MS,
} from '../game/waves/countdownPanel';
import { showingToast } from '../game/achievements/toastQueue';
import { previewForLevel } from '../game/levels/levelPreview';
import { achievementFrame, achievementTooltip } from '../game/achievements/achievementTooltip';
import { ACHIEVEMENT_CLIPS } from '../game/achievements/achievementArt';
import { ACHIEVEMENT_PAGE_EARNED } from '../game/waves/statusPages';
import { shapeUrl } from '../assets/registry';
import { DIFFICULTY_RANK } from '../game/levels/levelProgress';
import type { AchievementPage } from '../game/waves/statusPages';
import { siteCorner } from '../game/ui/infoTextSites';
import { useInfoText } from './useInfoText';
import type { LevelRef } from '../game/levels/levelProgress';
import type { Difficulty } from '../game/config/constants';
import {
  medalCuesBetween,
  medalRevealDurationMs,
  medalsShownAt,
} from '../game/waves/medalReveal';

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

/**
 * The two reload bars and the weapon name —
 * `PartInterface.drawReloadBars` (`:746-778`).
 *
 * **Replaced an invented magazine readout in T78.** It showed `12/12` from
 * `PLACEHOLDER_AMMO`; the original has no magazine at all (`ammo`, `magazine`
 * and `clipSize` appear zero times in its three gameplay files). These are
 * cooldown fills — see `weapons/reloadBars.ts`.
 *
 * ── No `capacity <= 0` guard, deliberately ────────────────────────────────
 * The old component returned null on `capacity <= 0`, and a stray
 * `capacity: 0` emit once took the **weapon name** down with it — the
 * guard-scoping case in `CLAUDE.md`. A fill of 0 is a perfectly ordinary state
 * (just fired, or mid-countdown), so there is nothing here that should hide the
 * whole readout. The secondary bar is the only conditional part, and it is
 * conditional on *having a secondary*, which is what `secondaryName` says.
 */
function ReloadReadout(): React.ReactElement {
  const primary = useGameStore((s) => s.reloadPrimary);
  const secondary = useGameStore((s) => s.reloadSecondary);
  const weapon = useGameStore((s) => s.weapon);
  const secondaryName = useGameStore((s) => s.secondaryName);

  return (
    <div className="hud-reload">
      <div className="hud-reload__bars">
        <ReloadBar fill={primary} label={`${weapon} reload`} />
        {secondaryName !== null && (
          <ReloadBar fill={secondary} label={`${secondaryName} reload`} />
        )}
      </div>
      <div className="hud-reload__names">
        <span className="hud-reload__weapon">{weapon}</span>
        {secondaryName !== null && (
          <span className="hud-reload__secondary">{secondaryName}</span>
        )}
      </div>
    </div>
  );
}

/**
 * One bar. `fill` is 0-1; the AS3 draws it as `height/80` upward from the
 * bottom (`:764`), which is what `align-self: flex-end` reproduces.
 */
function ReloadBar({ fill, label }: { fill: number; label: string }): React.ReactElement {
  const percent = Math.round(Math.min(1, Math.max(0, fill)) * 100);
  return (
    <div
      className="hud-reload__track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="hud-reload__fill" style={{ height: `${percent}%` }} />
    </div>
  );
}

/** Medals earned, always three glyphs so the panel height does not jump. */
/**
 * The medals, stamped in one at a time — `ScreenStatus.as:1147-1163`.
 *
 * ── The animation must never change the outcome ───────────────────────────
 * `aria-label` carries the **final** count from the first render, not the
 * count currently showing. A screen reader announcing "1 of 3 medals" and then
 * "2 of 3" as the icons arrive would turn a presentation detail into a
 * different result; the visual reveal is `aria-hidden` for the same reason.
 *
 * The timer only decides how many of the earned medals are *drawn*. `value` is
 * `medalsForHp`'s output and is never recomputed here.
 */
function MedalRow({ value }: { value: number }): React.ReactElement {
  const [shown, setShown] = useState(() => medalsShownAt(0, value));

  useEffect(() => {
    // Reset for a new result, then walk the stamps. `startedAt` rather than a
    // frame count: the elapsed-time model is what makes the cue times the AS3's
    // regardless of how often this ticks — the same substitution
    // `tickCountdown` makes, and `flames.ts:38-42` before it.
    const startedAt = performance.now();
    let previous = 0;
    setShown(medalsShownAt(0, value));

    const id = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      for (const cue of medalCuesBetween(previous, elapsed, value)) {
        GameEvents.emit('ui:sound', { name: cue });
      }
      previous = elapsed;
      setShown(medalsShownAt(elapsed, value));
      if (elapsed >= medalRevealDurationMs(value)) window.clearInterval(id);
    }, 40);

    return () => window.clearInterval(id);
  }, [value]);

  return (
    <p className="level-outcome__medals" aria-label={`${value} of 3 medals`}>
      <span aria-hidden="true">
        {'★'.repeat(shown)}
        {'☆'.repeat(Math.max(0, 3 - shown))}
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
/**
 * The Next Level button and its preview panel — `ButtonNextLevel.as`.
 *
 * `:335` composes a six-line summary and `:208` hands it to the panel with
 * `"AllEnemiesInLevel"`, which appends one line per enemy type in the level the
 * button leads to. That is the whole of the special type: a roster preview, so
 * the player can see what is coming before committing.
 *
 * **The coordinates come from the outcome, not from arithmetic here.** `:191-207`
 * computes the next level inline — `level + 1`, rolling to the next world, and
 * `0` when there is none. This port already had that rule wrong once by
 * duplicating it in the view (it sent `level + 1`, which is wrong at a world
 * boundary), so the scene owns it and this reads `outcome.nextLevel`. The AS3's
 * `nextLevel = 0` branch has no equivalent: a null here hides the button.
 */
function NextLevelButton({
  next,
  difficulty,
  onPlay,
}: {
  next: LevelRef;
  difficulty: Difficulty;
  onPlay: () => void;
}): React.ReactElement {
  const preview = previewForLevel(next.world, next.level, difficulty);

  const hover = useInfoText({
    text: preview?.summary ?? '',
    ...siteCorner('ButtonNextLevel.as:208'),
    enemyRows: preview?.rows,
  });

  return (
    <button
      type="button"
      className="hud__button hud__button--primary"
      onClick={onPlay}
      {...hover}
    >
      Next level ›
    </button>
  );
}

/**
 * The Achievement reveal page — `ScreenStatus.as:962-1005`.
 *
 * ── The icon exists so the tooltip has something to hang on ───────────────
 * `:1000-1004` places the achievement's own clip at (480, 374) with
 * `onStatusScreen = true`, which is the **only** thing that flag does: it flips
 * the panel's corner at `Achievement.as:103`. The AS3 page shows the *title*
 * only (`:971`), so there the tooltip is the sole way to read the description.
 *
 * **This port already shows the description as page text, so the tooltip
 * duplicates it — and it is built anyway, deliberately.** Recorded here so a
 * later reader does not delete it as an oversight: it was added for port
 * completeness with the duplication understood, not by accident.
 *
 * The text comes from `achievementTooltip`, the same function the achievements
 * board uses, so the two screens cannot drift.
 */
function AchievementReveal({
  page,
  difficulty,
}: {
  page: AchievementPage;
  difficulty: Difficulty;
}): React.ReactElement {
  // The page exists because this was just earned, and on this difficulty —
  // `ScreenStatus.as:986-998` reads `levelDifficulty` for the same reason.
  const earnedOn = DIFFICULTY_RANK[difficulty];
  const state = {
    ...page,
    earned: ACHIEVEMENT_PAGE_EARNED,
    difficulty: page.difficultyMatters ? earnedOn : null,
  };
  const tip = achievementTooltip(state);

  const hover = useInfoText({
    text: tip.text,
    ...siteCorner('Achievement.as:103'),
    titleLength: tip.titleLength,
    noteLength: tip.noteLength,
  });

  const clip = ACHIEVEMENT_CLIPS[page.id];
  // `achievementFrame` follows `thisState`; a clip whose achievement records no
  // difficulty has only two frames, so the index is clamped to what exists.
  const frame = Math.min(achievementFrame(state), clip?.frames.length ?? 1);
  const layers = clip?.frames[frame - 1] ?? [];

  return (
    <>
      <p className="level-outcome__eyebrow">New Achievement</p>
      <h2 className="level-outcome__title">{page.title}</h2>

      <span className="achievement-icon" role="img" aria-label={page.title} {...hover}>
        {layers.map((shape) => (
          <img key={shape} src={shapeUrl(`${shape}.svg`)} alt="" aria-hidden="true" />
        ))}
      </span>

      <p className="level-outcome__body">{page.description}</p>
      {page.difficultyMatters && (
        <p className="level-outcome__note">Earned on {difficulty}</p>
      )}
    </>
  );
}

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
                <NextLevelButton
                  next={outcome.nextLevel}
                  difficulty={difficulty}
                  onPlay={playNext}
                />
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
            <AchievementReveal page={current} difficulty={difficulty} />
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

/**
 * The achievement toast — `PartAchievements` (`:112-132`, `:262-274`).
 *
 * **One at a time, top right.** `:265` dequeues only when nothing is showing
 * and `:116-117` splices the head off, so six achievements earned together
 * produce six sequential toasts. `:125-126` right-aligns it 16px from the edge.
 *
 * The port previously rendered the whole queue as a centred column, which grew
 * downward into the centred results panel — the T74 finding. Neither the
 * stacking nor the count was the mechanism: **two centred overlays were**, and
 * the AS3 has neither.
 */
function AchievementToasts(): React.ReactElement | null {
  const queue = useGameStore((s) => s.achievements);
  const dismiss = useGameStore((s) => s.dismissAchievement);
  const showing = showingToast(queue);

  const showingId = showing?.id ?? null;

  useEffect(() => {
    if (!showing) return;
    // Only the head runs a timer. Dismissing it promotes the next, which is
    // what `:265`'s `achievementCurrent == ""` check does in the original.
    const id = window.setTimeout(
      () => dismiss(showing.id),
      Math.max(0, showing.at + ACHIEVEMENT_TOAST_MS - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [showing, dismiss]);

  useEffect(() => {
    // `:120` — `SoundManager.sfxArray.push("Achievement")` sits inside
    // `showAchievementFromQueue`, so the sound is bound to a toast being
    // **shown**, not to one being earned. A toast that arrives behind another
    // therefore sounds when it is promoted, not when it was unlocked.
    //
    // Keyed on the id so a re-render with the same head does not re-sound it.
    if (showingId === null) return;
    GameEvents.emit('ui:sound', { name: 'Achievement' });
  }, [showingId]);

  if (!showing) return null;

  return (
    <div className="hud-toasts" aria-live="polite">
      <div className="hud-toast" key={showing.id}>
        <span className="hud-toast__eyebrow">Achievement unlocked</span>
        <span className="hud-toast__title">{showing.title}</span>
      </div>
    </div>
  );
}


/**
 * The opening countdown panel — `PartInterface.as:303-308`.
 *
 * Four things stacked: the `BackgroundText` panel, the big digit, a
 * `"<Mode> Mode"` label and a red objective line. DOM rather than in-canvas
 * because every one of them is laid-out text, which is the split
 * `docs/TEXT_RENDERING.md` sets.
 *
 * ── The exit is CSS, and the numbers are the AS3's ────────────────────────
 * `:713-721` starts eight tweens on expiry: all four objects fade over 20
 * frames and slide up 168 units over 30. Those are `FADE_OUT_MS`,
 * `SLIDE_OUT_MS` and `SLIDE_OUT_DISTANCE`, fed to CSS custom properties so the
 * durations live with the source citation rather than in a stylesheet.
 *
 * The panel stays mounted through `running: false` so the transition can play;
 * the scene stops emitting once it has finished, and the null clears it.
 */
function CountdownPanel(): React.ReactElement | null {
  const countdown = useGameStore((s) => s.countdown);
  if (!countdown) return null;

  return (
    <div
      className={`hud-countdown${countdown.running ? '' : ' hud-countdown--out'}`}
      style={
        {
          '--countdown-fade-ms': `${FADE_OUT_MS}ms`,
          '--countdown-slide-ms': `${SLIDE_OUT_MS}ms`,
          '--countdown-slide': `${SLIDE_OUT_DISTANCE}px`,
        } as React.CSSProperties
      }
      // The digit changes four times in two seconds; announcing each one is
      // noise, and the objective line below carries the meaning.
      aria-hidden="true"
    >
      <div className="hud-countdown__panel">
        <span className="hud-countdown__digit">{countdown.label}</span>
        <span className="hud-countdown__mode">{countdown.mode}</span>
        <span className="hud-countdown__objective">{countdown.objective}</span>
      </div>
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
        <ReloadReadout />
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

      <CountdownPanel />
      <LevelOutcomeOverlay />
      <AchievementToasts />
    </div>
  );
}
