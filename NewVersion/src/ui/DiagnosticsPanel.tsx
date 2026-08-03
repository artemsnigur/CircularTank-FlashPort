/**
 * DEV-AID: diagnostics panel — the pipeline's own report card.
 *
 * This is where "the skeleton works" stops being a claim and becomes
 * something you can read on the device you are holding — viewport and DPR,
 * whether both extracted fonts resolved to distinct faces, and the audio
 * self-test results including measured leading silence and loop-seam step.
 */
import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { assetCounts } from '../assets/registry';
import { GameEvents } from '../game/events/GameEvents';
import type { AudioTrackReport } from '../game/events/GameEvents';

function verdictClass(verdict: string): string {
  return `pill pill--${verdict}`;
}

function TrackRow({ track }: { track: AudioTrackReport }): React.ReactElement {
  return (
    <li className="diag__track">
      <div className="diag__track-head">
        <span className={verdictClass(track.verdict)}>{track.verdict}</span>
        <code>{track.file}</code>
      </div>
      <dl className="diag__grid">
        <dt>decoded</dt>
        <dd>{track.decodedDuration.toFixed(3)}s</dd>
        <dt>headers</dt>
        <dd>{track.expectedDuration.toFixed(3)}s</dd>
        <dt>drift</dt>
        <dd>{track.driftMs.toFixed(1)} ms</dd>
        <dt>lead silence</dt>
        <dd>{track.leadingSilenceMs.toFixed(1)} ms</dd>
        <dt>peak</dt>
        <dd>{track.peak.toFixed(3)}</dd>
        <dt>DC</dt>
        <dd>{track.dcOffset.toFixed(5)}</dd>
        {track.loopSeamDelta !== null && (
          <>
            <dt>loop seam</dt>
            <dd>{track.loopSeamDelta.toFixed(4)}</dd>
          </>
        )}
        <dt>played</dt>
        <dd>{track.playbackConfirmed ? 'yes' : 'no'}</dd>
      </dl>
      <ul className="diag__notes">
        {track.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </li>
  );
}

export function DiagnosticsPanel(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const viewport = useGameStore((s) => s.viewport);
  const safeArea = useGameStore((s) => s.safeArea);
  const fonts = useGameStore((s) => s.fonts);
  const audio = useGameStore((s) => s.audioReport);
  const fps = useGameStore((s) => s.fps);
  const activeScene = useGameStore((s) => s.activeScene);

  if (!import.meta.env.DEV) return null;

  if (!open) {
    return (
      <button type="button" className="diag__toggle" onClick={() => setOpen(true)}>
        diagnostics
      </button>
    );
  }

  return (
    <aside className="diag">
      <header className="diag__head">
        <strong>Pipeline diagnostics</strong>
        <button type="button" className="diag__close" onClick={() => setOpen(false)}>
          ×
        </button>
      </header>

      <section>
        <h3>Runtime</h3>
        <dl className="diag__grid">
          <dt>scene</dt>
          <dd>{activeScene ?? '—'}</dd>
          <dt>fps</dt>
          <dd>{fps || '—'}</dd>
          <dt>assets</dt>
          <dd>
            {assetCounts.images} img · {assetCounts.audio} mp3 · {assetCounts.shapes} svg
          </dd>
        </dl>
      </section>

      <section>
        <h3>Viewport</h3>
        {viewport ? (
          <dl className="diag__grid">
            <dt>css</dt>
            <dd>
              {Math.round(viewport.cssWidth)}×{Math.round(viewport.cssHeight)}
            </dd>
            <dt>dpr</dt>
            <dd>{viewport.pixelRatio}×</dd>
            <dt>zoom</dt>
            <dd>{viewport.zoom.toFixed(3)}</dd>
            <dt>world</dt>
            <dd>
              {Math.round(viewport.logicalWidth)}×{Math.round(viewport.logicalHeight)} units
            </dd>
            <dt>safe area</dt>
            <dd>
              {safeArea.top}/{safeArea.right}/{safeArea.bottom}/{safeArea.left}
            </dd>
          </dl>
        ) : (
          <p className="diag__empty">Waiting for first layout…</p>
        )}
      </section>

      <section>
        <h3>Fonts</h3>
        {fonts.length === 0 ? (
          <p className="diag__empty">Not measured yet.</p>
        ) : (
          <ul className="diag__list">
            {fonts.map((font) => (
              <li key={font.family}>
                <span
                  className={verdictClass(
                    font.loaded && font.distinctFromFallback ? 'ok' : 'warn',
                  )}
                >
                  {font.loaded && font.distinctFromFallback ? 'ok' : 'fallback'}
                </span>{' '}
                <span style={{ fontFamily: `"${font.family}", monospace` }}>{font.family}</span>{' '}
                <code>{font.file}</code>
                <span className="diag__muted">
                  {' '}
                  {font.measuredWidth.toFixed(1)}px vs {font.fallbackWidth.toFixed(1)}px fallback
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>
          Audio{' '}
          {audio && <span className={verdictClass(audio.verdict)}>{audio.verdict}</span>}
        </h3>
        {audio ? (
          <>
            <p className="diag__muted">
              {audio.backend} · {audio.sampleRate || '—'} Hz ·{' '}
              {audio.unlocked ? 'unlocked' : 'locked (tap the canvas)'}
            </p>
            <ul className="diag__list">
              {audio.tracks.map((track) => (
                <TrackRow key={track.key} track={track} />
              ))}
            </ul>
          </>
        ) : (
          <p className="diag__empty">Tap once to unlock audio and run the self-test.</p>
        )}
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:run-audio-selftest', {})}
        >
          Run audio self-test
        </button>
      </section>
    </aside>
  );
}
