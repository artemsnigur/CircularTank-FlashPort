/**
 * Loading / error screen, driven by `boot:*` and `preload:*` events via the
 * store.
 *
 * It names the current stage rather than showing an anonymous spinner. That is
 * deliberate: a silent hang here used to be undiagnosable, and "stuck on
 * Loading" is far more actionable when it reads "Loading fonts…".
 *
 * Port target: ScreenLoad.as, LoadingRing.as, LoadingBall.as, LoadingGlow.as.
 */
import { useGameStore } from '../../state/gameStore';
import type { BootStage } from '../../game/events/GameEvents';

const STAGE_LABEL: Record<BootStage, string> = {
  fonts: 'Loading fonts',
  assets: 'Loading assets',
  ready: 'Ready',
};

export function LoadingScreen(): React.ReactElement | null {
  const phase = useGameStore((s) => s.phase);
  const stage = useGameStore((s) => s.stage);
  const progress = useGameStore((s) => s.progress);
  const loadError = useGameStore((s) => s.loadError);

  if (phase === 'ready') return null;

  if (phase === 'error') {
    return (
      <div className="screen screen--loading" role="alert">
        <h2 className="screen__title">Startup failed</h2>
        <p className="screen__error">{loadError}</p>
        <p className="screen__hint">
          If assets are missing, run <code>npm run assets:sync</code> to copy the extracted
          SWF files into <code>src/assets/</code>, then reload. Otherwise check the browser
          console — the failing stage is logged there.
        </p>
      </div>
    );
  }

  const pct = Math.round(progress * 100);

  return (
    <div className="screen screen--loading">
      <h2 className="screen__title">{STAGE_LABEL[stage]}</h2>
      <div
        className="loader"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={STAGE_LABEL[stage]}
      >
        <div className="loader__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="screen__hint">{stage === 'assets' ? `${pct}%` : ''}</p>
    </div>
  );
}
