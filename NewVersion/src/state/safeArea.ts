/**
 * Reads iOS/Android safe-area insets and publishes them to the store and to
 * Phaser.
 *
 * There is no JS API for `env(safe-area-inset-*)`, so the only reliable way to
 * read it is to let CSS compute it into a custom property and then measure
 * that with `getComputedStyle`. A hidden probe element does this without
 * affecting layout.
 *
 * Requirements for the values to be non-zero:
 *   - <meta name="viewport" content="... viewport-fit=cover">  (index.html)
 *   - on iOS standalone / Capacitor: a translucent status bar
 * Without `viewport-fit=cover` the browser insets the layout viewport itself
 * and every env() reads 0 — which looks like "safe areas are handled" right up
 * until the app is packaged.
 */
import type { SafeAreaInsets } from '../game/config/viewport';
import { NO_INSETS } from '../game/config/viewport';
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from './gameStore';

const PROBE_ID = 'safe-area-probe';

function createProbe(): HTMLElement {
  const existing = document.getElementById(PROBE_ID);
  if (existing) return existing;

  const probe = document.createElement('div');
  probe.id = PROBE_ID;
  // `position: fixed` with all-zero offsets and zero size keeps it out of
  // layout; the padding is what carries the env() values.
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top, 0px)',
    'padding-right:env(safe-area-inset-right, 0px)',
    'padding-bottom:env(safe-area-inset-bottom, 0px)',
    'padding-left:env(safe-area-inset-left, 0px)',
  ].join(';');
  document.body.appendChild(probe);
  return probe;
}

export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined' || !document.body) return NO_INSETS;

  const probe = createProbe();
  const style = window.getComputedStyle(probe);
  const px = (value: string): number => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  return {
    top: px(style.paddingTop),
    right: px(style.paddingRight),
    bottom: px(style.paddingBottom),
    left: px(style.paddingLeft),
  };
}

function sameInsets(a: SafeAreaInsets, b: SafeAreaInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

let installed = false;

/**
 * Starts watching for inset changes (rotation, in-call status bar, keyboard).
 * Returns a teardown function; safe to call more than once.
 */
export function watchSafeArea(): () => void {
  if (installed) return () => undefined;
  installed = true;

  let current = NO_INSETS;

  const publish = (): void => {
    const next = readSafeAreaInsets();
    if (sameInsets(next, current)) return;
    current = next;
    useGameStore.getState().setSafeArea(next);
    GameEvents.emit('ui:safe-area-changed', next);
  };

  publish();

  window.addEventListener('resize', publish);
  window.addEventListener('orientationchange', publish);

  // Rotation on iOS reports the *old* insets for a frame or two after the
  // resize event, so re-read on a short tail.
  const onOrientation = (): void => {
    for (const delay of [50, 200, 500]) window.setTimeout(publish, delay);
  };
  window.addEventListener('orientationchange', onOrientation);

  const visualViewport = window.visualViewport;
  visualViewport?.addEventListener('resize', publish);

  return () => {
    window.removeEventListener('resize', publish);
    window.removeEventListener('orientationchange', publish);
    window.removeEventListener('orientationchange', onOrientation);
    visualViewport?.removeEventListener('resize', publish);
    document.getElementById(PROBE_ID)?.remove();
    installed = false;
  };
}
