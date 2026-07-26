/**
 * Turns silent startup failures into a visible error screen.
 *
 * Motivating incident: an unhandled promise rejection inside an async
 * `Scene.create()` stranded the game on the Boot scene. Phaser does not await
 * `create()`, so nothing surfaced anywhere — the UI just showed "Loading"
 * forever and the only clue was a console message that is easy to miss.
 *
 * Anything that throws or rejects before the game reaches `phase: 'ready'` is
 * now promoted onto the loading screen. After startup we stay quiet: a
 * mid-game exception should not replace the running game with an error panel.
 */
import { useGameStore } from './gameStore';

let installed = false;

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function installErrorCapture(): () => void {
  if (installed) return () => undefined;
  installed = true;

  const report = (source: string, detail: unknown): void => {
    const state = useGameStore.getState();
    // Only hijack the UI during startup, and never overwrite a more specific
    // error that the loader already reported.
    if (state.phase === 'ready' || state.loadError !== null) return;
    state.setLoadError(`${source} during "${state.stage}" stage — ${describe(detail)}`);
  };

  const onError = (event: ErrorEvent): void => {
    report('Uncaught error', event.error ?? event.message);
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    report('Unhandled promise rejection', event.reason);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    installed = false;
  };
}
