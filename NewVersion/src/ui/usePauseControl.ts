/**
 * The pause trigger, driven from the DOM — `PartGameArea.as:2682-2703`.
 *
 * ── Why this is not in `GameplayScene` ────────────────────────────────────
 * **A paused Phaser scene cannot hear its own keys.** `scene.pause()` takes the
 * scene out of the update loop *and* its `KeyboardPlugin` stops dispatching,
 * because the plugin checks `isActive()` before emitting. A `keydown-P` handler
 * registered in the scene would therefore pause the game and then be unable to
 * unpause it — the key would be dead exactly when it is needed.
 *
 * So the trigger listens on `window` and goes over the event bus, which is the
 * sanctioned React -> Phaser direction anyway (`GameEvents` -> the scene's
 * `ui:pause` subscriber). The bus is an ordinary emitter and is unaffected by
 * scene state, so the resume lands.
 *
 * ── The latch runs per event, not per frame ───────────────────────────────
 * The AS3 polls a held key every frame; the DOM gives edges instead. `keydown`
 * repeats while a key is held — the browser's auto-repeat — which is the same
 * hazard the AS3's `canPause` guards, so the same latch is applied to the same
 * effect. `keyup` re-arms it, exactly as `:2700` does.
 */
import { useEffect, useRef } from 'react';

import { GameEvents } from '../game/events/GameEvents';
import { createPauseLatch, stepPauseLatch } from '../game/ui/pauseLatch';
import type { PauseLatchState } from '../game/ui/pauseLatch';
import { useGameStore } from '../state/gameStore';

/** `Main.keyP` and `Main.keyEsc` — `Main.as:719`, `:723`. */
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);

/**
 * Installs the pause trigger for as long as gameplay is on screen.
 *
 * `active` is the caller's "a level is running" — mounting this in the HUD is
 * not enough on its own, because the HUD outlives the level.
 */
export function usePauseControl(active: boolean): void {
  const levelFinished = useGameStore((s) => s.levelOutcome !== null);
  // From the store's mirror, not `readGameplayOptions` — that takes a
  // `SaveStore` reached through a Phaser scene, and React must never hold a
  // scene reference. The options screen reads the same mirror.
  const autoPause = useGameStore((s) => s.gameplayOptions.autoPause);
  // **Read, not owned.** The overlay's Resume button changes this too, so a
  // copy held in the latch would go stale the first time a player mixed the
  // button and the key — press P, click Resume, press P, and the key would try
  // to unpause an already running game. `PartGameArea.gamePaused` is a static
  // for the same reason; only `canPause` is local here.
  const paused = useGameStore((s) => s.paused);

  // Refs rather than state: the latch must not re-render anything, and the
  // listeners must see the current value without being torn down and rebuilt
  // on every change — a rebuild between a keydown and its keyup would drop the
  // re-arm and leave pause stuck.
  const latch = useRef<PauseLatchState>(createPauseLatch());
  const finishedRef = useRef(levelFinished);
  finishedRef.current = levelFinished;
  const autoPauseRef = useRef(autoPause);
  autoPauseRef.current = autoPause;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!active) {
      // Leaving gameplay re-arms, so a key held through a scene change does not
      // arrive latched on the next one.
      latch.current = createPauseLatch();
      return;
    }

    const apply = (over: { keyHeld?: boolean; focused?: boolean }) => {
      const next = stepPauseLatch({ canPause: latch.current.canPause, paused: pausedRef.current }, {
        keyHeld: over.keyHeld ?? false,
        focused: over.focused ?? true,
        autoPause: autoPauseRef.current,
        levelFinished: finishedRef.current,
      });
      latch.current = { canPause: next.canPause, paused: next.paused };
      // The store is what everything else reads; this only reports the edge.
      if (next.toggled) GameEvents.emit('ui:pause', { paused: next.paused });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!PAUSE_KEYS.has(event.code)) return;
      // Escape has no default worth keeping here, and P would type into any
      // focused field. Neither should reach the page.
      event.preventDefault();
      apply({ keyHeld: true });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!PAUSE_KEYS.has(event.code)) return;
      apply({ keyHeld: false });
    };

    // `Main.gameActive` — the AS3's focus flag. `blur` alone misses a tab
    // switch on some browsers and `visibilitychange` alone misses a click onto
    // another window, so both are listened for and both mean "not focused".
    const onBlur = () => apply({ focused: false });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') apply({ focused: false });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active]);
}
