import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SCENE,
  MENU_ROUTES,
  UNROUTED_SCENES,
  landingScene,
  routeForScene,
  sceneForRoute,
} from './menuRoute';
import { SceneKeys } from '../config/constants';

describe('the slug table', () => {
  it('accounts for every scene, either with a slug or with a reason', () => {
    /*
     * Derived from `SceneKeys` rather than restated, so a scene added to the
     * game fails here until someone decides whether a reload should land on
     * it. A hand-written list of seven would simply not mention the eighth.
     */
    for (const key of Object.values(SceneKeys)) {
      const routed = routeForScene(key) !== null;
      const excused = key in UNROUTED_SCENES;
      expect(routed !== excused, `${key} is neither routed nor excused`).toBe(true);
    }
  });

  it('round-trips every slug it defines', () => {
    for (const [slug, scene] of Object.entries(MENU_ROUTES)) {
      expect(sceneForRoute(`#${slug}`)).toBe(scene);
      expect(routeForScene(scene)).toBe(slug);
    }
  });

  it('gives gameplay no slug, in either direction', () => {
    /*
     * The gameplay exception, and the reason it is a property of the table
     * rather than a branch: there is no slug to write on the way in and none
     * that can name it on the way back.
     */
    expect(routeForScene(SceneKeys.Gameplay)).toBeNull();
    expect(Object.values(MENU_ROUTES)).not.toContain(SceneKeys.Gameplay);
    expect(sceneForRoute('#gameplay')).toBeNull();

    // Beside a scene that *does* route, so "returns null" is a rule here and
    // not something this function does for everything.
    expect(routeForScene(SceneKeys.Upgrades)).toBe('upgrades');
  });
});

describe('sceneForRoute', () => {
  it('reads the shapes a real address bar produces', () => {
    // A hash is user input: it arrives with or without the `#`, with a stray
    // slash from a copied path, cased however it was typed, and sometimes with
    // a query tail from a link.
    for (const form of ['#upgrades', 'upgrades', '#/upgrades', '  #Upgrades  ', '#upgrades?x=1']) {
      expect(sceneForRoute(form), form).toBe(SceneKeys.Upgrades);
    }
  });

  it('returns null for anything that names no menu', () => {
    // The counterpart to the line above: tolerant of *shape*, not of content.
    for (const form of ['', '#', '#nonsense', '#upgrade', '#levels/1']) {
      expect(sceneForRoute(form), form).toBeNull();
    }
  });

  it('separates two slugs that start alike', () => {
    // `enemies` and `bestiary` are two different screens about enemies, and a
    // prefix match would collapse them.
    expect(sceneForRoute('#enemies')).toBe(SceneKeys.Enemies);
    expect(sceneForRoute('#bestiary')).toBe(SceneKeys.Bestiary);
  });
});

describe('landingScene', () => {
  it('lands on the menu a slug names', () => {
    expect(landingScene('#options')).toBe(SceneKeys.Options);
  });

  it('falls back to the main menu, and never into a level', () => {
    /*
     * Both halves of the boot contract. The fallback covers a first visit, a
     * bookmark to a slug that has since been renamed, and a hand-typed URL;
     * the second line is the gameplay exception at the one call site where it
     * would actually hurt.
     */
    for (const form of ['', '#', '#gameplay', '#Gameplay', '#anything-else']) {
      expect(landingScene(form), form).toBe(DEFAULT_SCENE);
    }
    expect(DEFAULT_SCENE).toBe(SceneKeys.MainMenu);
  });
});
