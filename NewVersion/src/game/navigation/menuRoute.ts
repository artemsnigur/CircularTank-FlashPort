/**
 * The menu screen as a URL hash, so a reload keeps you where you were.
 *
 * ── Why the hash rather than storage ──────────────────────────────────────
 * `sessionStorage` would restore the screen too, but the hash also makes the
 * browser's own Back and Forward work: each menu is a history entry, so Back
 * out of the shop lands on the menu you came from rather than leaving the app.
 * That behaviour is free with a hash and would have to be built by hand with
 * storage, and it is what a player already expects from a URL bar.
 *
 * It is also inspectable and shareable — `#upgrades` opens the shop — which is
 * worth something for bug reports, where "which screen" is otherwise prose.
 *
 * ── What is deliberately *not* routable ───────────────────────────────────
 * `Gameplay` has no slug, and that is the whole gameplay exception. A level is
 * a live simulation with a wave clock, spawned enemies and a tank position;
 * none of it is in the URL and reloading into a half-built one would be worse
 * than any menu. Because `Gameplay` never writes a slug, the hash still holds
 * whichever menu the player last stood on, so a refresh mid-level lands them
 * there — Level Select if they came through it, the main menu if they used
 * Continue.
 *
 * `Boot` and `Preload` are excluded for the same reason in miniature: they are
 * transitions, not places, and a slug for either would be a hash that means
 * "reload me forever".
 *
 * The exclusions are enforced rather than described — `menuRoute.test.ts`
 * derives its list from `SceneKeys`, so a new scene fails until it is either
 * given a slug or named as excluded on purpose.
 */

import { SceneKeys } from '../config/constants';
import type { SceneKey } from '../config/constants';

/**
 * Slug to scene. The slugs are what a player sees in the address bar, so they
 * are the screen's own name rather than its `SceneKey` spelling — `#levels`
 * rather than `#LevelSelect`.
 */
export const MENU_ROUTES: Readonly<Record<string, SceneKey>> = {
  menu: SceneKeys.MainMenu,
  levels: SceneKeys.LevelSelect,
  upgrades: SceneKeys.Upgrades,
  enemies: SceneKeys.Enemies,
  bestiary: SceneKeys.Bestiary,
  options: SceneKeys.Options,
  achievements: SceneKeys.Achievements,
};

/** Where a hash that names no menu lands. */
export const DEFAULT_SCENE: SceneKey = SceneKeys.MainMenu;

/** Scenes with no slug, and why. Read by the test that proves the set is total. */
export const UNROUTED_SCENES: Readonly<Record<string, string>> = {
  [SceneKeys.Boot]: 'a transition, not a place',
  [SceneKeys.Preload]: 'a transition, not a place',
  [SceneKeys.Gameplay]: 'a live simulation; see the header',
};

/**
 * The slug for a scene, or `null` where it must not be written.
 *
 * `null` is a real answer and the caller must respect it by leaving the hash
 * **alone** rather than clearing it: the stale menu slug is exactly what makes
 * a refresh during a level land somewhere sensible.
 */
export function routeForScene(scene: SceneKey | null): string | null {
  if (scene === null) return null;
  const found = Object.entries(MENU_ROUTES).find(([, key]) => key === scene);
  return found ? found[0] : null;
}

/**
 * The scene a hash names, or `null` if it names none.
 *
 * Tolerant of what a URL actually looks like: a leading `#`, a leading `/`,
 * surrounding whitespace, any case, and a query tail (`#upgrades?x=1`). A hash
 * arrives from the address bar, so it is user input and cannot be assumed to
 * be in the shape this module writes.
 */
export function sceneForRoute(hash: string): SceneKey | null {
  if (typeof hash !== 'string') return null;

  const slug = hash
    .trim()
    .replace(/^#/, '')
    .replace(/^\//, '')
    .split(/[?&]/)[0]
    .toLowerCase();

  return MENU_ROUTES[slug] ?? null;
}

/**
 * The scene to boot into for a hash — the routed one, or the main menu.
 *
 * Never returns `Gameplay`, whatever the hash says, because `MENU_ROUTES` has
 * no slug that maps to it. That is the gameplay exception enforced by the
 * table rather than by a branch someone has to remember to write.
 */
export function landingScene(hash: string): SceneKey {
  return sceneForRoute(hash) ?? DEFAULT_SCENE;
}
