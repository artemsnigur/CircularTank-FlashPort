/**
 * Hosts the single Phaser.Game instance.
 *
 * ── The React 18/19 StrictMode problem ────────────────────────────────────
 * In development StrictMode deliberately runs every effect twice:
 *   mount -> effect -> cleanup -> effect
 * The naive `new Phaser.Game()` in an effect with `game.destroy()` in the
 * cleanup therefore builds a game, tears it down mid-boot, and builds another.
 * Phaser's boot is asynchronous (texture manager, WebGL context, audio
 * unlocking), so destroying it partway leaves orphaned RAF callbacks: you get
 * two update loops, doubled input handlers, and a leaked WebGL context that
 * surfaces as "Too many active WebGL contexts" after a few hot reloads.
 *
 * The fix is to make teardown *deferred and cancellable*:
 *   - the game is created only if one does not already exist,
 *   - cleanup schedules the destroy on a macrotask instead of doing it now,
 *   - a re-running effect cancels that pending destroy and reuses the game.
 * StrictMode's synthetic unmount/remount happens well inside one macrotask, so
 * the destroy never fires. A real unmount has no follow-up effect, so it does.
 *
 * The canvas element is owned by React and passed in via `config.canvas`
 * rather than created by Phaser — see ViewportController for why that matters
 * for device-pixel-ratio correctness.
 */
import { useEffect, useRef } from 'react';
import { defaultBootstrap } from './gameBootstrap';
import type { GameBootstrap, GameHandle } from './gameBootstrap';

export interface GameCanvasProps {
  className?: string;
  bootstrap?: GameBootstrap;
}

export function GameCanvas({
  className,
  bootstrap = defaultBootstrap,
}: GameCanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const pendingDestroyRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel a teardown scheduled by StrictMode's synthetic unmount.
    if (pendingDestroyRef.current !== null) {
      window.clearTimeout(pendingDestroyRef.current);
      pendingDestroyRef.current = null;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (handleRef.current === null && container && canvas) {
      handleRef.current = bootstrap(canvas, container);
    }

    return () => {
      pendingDestroyRef.current = window.setTimeout(() => {
        pendingDestroyRef.current = null;
        handleRef.current?.destroy();
        handleRef.current = null;
      }, 0);
    };
    // `bootstrap` is intentionally not a dependency: swapping it should not
    // rebuild the game, and it never changes in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className={className ?? 'game-canvas-host'}>
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
