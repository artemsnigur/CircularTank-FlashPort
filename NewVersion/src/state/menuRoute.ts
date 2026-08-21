/**
 * Keeps `location.hash` and the active menu in step — both directions.
 *
 *   store `activeScene` changes  ->  the hash is rewritten
 *   the hash changes (Back, Forward, a typed URL)  ->  `ui:goto` is emitted
 *
 * ── Where this sits in the architecture ───────────────────────────────────
 * It is a `state/` installer like `safeArea.ts`, and it goes in at **module
 * scope** in `main.tsx` for the same reason the bridge does: it has to be
 * listening before the first scene boots, and StrictMode's double effect
 * invocation would otherwise subscribe twice and apply every navigation
 * twice.
 *
 * It changes scenes by emitting `ui:goto` rather than by touching a scene,
 * which is the sanctioned channel — every menu scene already subscribes to it,
 * and React holding a `Scene` reference is the thing `CLAUDE.md` forbids
 * outright.
 *
 * ── The loop, and what closes it ──────────────────────────────────────────
 * Writing the hash fires `hashchange`, which would emit `ui:goto` for the
 * scene that just became active, which sets `activeScene`, which writes the
 * hash. Every scene guards `if (key !== SceneKeys.X)` so it would terminate
 * anyway, but relying on that is relying on seven separate guards staying
 * written. The listener compares against the store's own `activeScene` first
 * and does nothing when they already agree, which closes it here, once.
 */

import { GameEvents } from '../game/events/GameEvents';
import { landingScene, routeForScene, sceneForRoute } from '../game/navigation/menuRoute';
import { useGameStore } from './gameStore';

/**
 * Subscribes the hash to the store and the store to the hash.
 *
 * @returns a teardown, for tests. Production installs this once and never
 * removes it — the app has no unmount.
 */
export function installMenuRoute(): () => void {
  if (typeof window === 'undefined') return () => {};

  /**
   * Writes the slug for a scene, or leaves the hash **untouched** when the
   * scene has none.
   *
   * Leaving it is the whole gameplay exception: entering a level does not
   * clear the last menu's slug, so a refresh mid-level lands on the menu the
   * player came through rather than on a half-built simulation.
   *
   * `replaceState` rather than assigning `location.hash`, so moving between
   * menus does not pile up history entries the player has to press Back
   * through — but see the `hashchange` half: real Back and Forward still work,
   * because the browser's own navigation is what creates the entries worth
   * having.
   */
  const write = (scene: Parameters<typeof routeForScene>[0]): void => {
    const slug = routeForScene(scene);
    if (slug === null) return;

    const next = `#${slug}`;
    if (window.location.hash === next) return;

    try {
      window.history.replaceState(null, '', next);
    } catch {
      // A `replaceState` can throw on an opaque origin (a `file://` page, some
      // sandboxes). Falling back keeps the feature working where it can and
      // costs only a history entry where it cannot.
      window.location.hash = next;
    }
  };

  // The hash may already name a screen — a reload, or a shared link. Preload
  // reads it too and boots the right scene; this is what keeps the *store*
  // honest if the two ever disagree.
  const onHashChange = (): void => {
    const wanted = sceneForRoute(window.location.hash);
    if (wanted === null) return;
    if (useGameStore.getState().activeScene === wanted) return;
    GameEvents.emit('ui:goto', { key: wanted });
  };

  window.addEventListener('hashchange', onHashChange);

  const unsubscribe = useGameStore.subscribe((state, previous) => {
    if (state.activeScene !== previous.activeScene) write(state.activeScene);
  });

  // The scene may already be up by the time this runs in a test; in production
  // it is null and the first transition writes.
  write(useGameStore.getState().activeScene);

  return () => {
    window.removeEventListener('hashchange', onHashChange);
    unsubscribe();
  };
}

/** The scene the current URL asks for. Read by `PreloadScene` on hand-off. */
export function bootScene(): ReturnType<typeof landingScene> {
  return landingScene(typeof window === 'undefined' ? '' : window.location.hash);
}
