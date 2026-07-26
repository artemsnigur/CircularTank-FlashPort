/**
 * Every `ui:` event must reach a listener when it can be emitted.
 *
 * The "Next level" freeze was not a crash: `ui:start-game` was emitted while
 * only MainMenuScene and LevelSelectScene subscribed to it, and both are torn
 * down during a level. The event reached nobody, the overlay had dismissed
 * itself, and the paused scene had no input path left.
 *
 * Scenes are too heavy to instantiate here, so this asserts the *contract*:
 * which events each scene file subscribes to, read from source. Crude, but it
 * fails when a scene stops handling something a screen still emits.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(path, 'utf8');

/** Events a file subscribes to via GameEvents.subscribe / .on. */
function subscribed(source: string): Set<string> {
  const found = new Set<string>();
  for (const m of source.matchAll(/(?:subscribe|\bon)\(\s*'(ui:[^']+)'/g)) found.add(m[1]);
  return found;
}

/** Events a file emits. */
function emitted(source: string): Set<string> {
  const found = new Set<string>();
  for (const m of source.matchAll(/emit\(\s*'(ui:[^']+)'/g)) found.add(m[1]);
  return found;
}

const SCENES = {
  gameplay: read('src/game/scenes/GameplayScene.ts'),
  mainMenu: read('src/game/scenes/MainMenuScene.ts'),
  levelSelect: read('src/game/scenes/LevelSelectScene.ts'),
  upgrades: read('src/game/scenes/UpgradesScene.ts'),
};

describe('the in-game overlay', () => {
  it('GameplayScene handles everything the results overlay can emit', () => {
    // The overlay renders only while Gameplay is the active scene, so
    // Gameplay is the only scene guaranteed to be alive when it is used.
    const fromOverlay = emitted(read('src/ui/Hud.tsx'));
    const handled = subscribed(SCENES.gameplay);

    for (const event of fromOverlay) {
      expect(handled.has(event), `GameplayScene must handle "${event}"`).toBe(true);
    }
  });

  it('specifically handles ui:start-game, which caused the freeze', () => {
    expect(subscribed(SCENES.gameplay).has('ui:start-game')).toBe(true);
  });
});

describe('every scene offers a way out', () => {
  it('all four handle ui:goto', () => {
    for (const [name, source] of Object.entries(SCENES)) {
      expect(subscribed(source).has('ui:goto'), `${name} must handle ui:goto`).toBe(true);
    }
  });
});

describe('the shop', () => {
  it('handles its own purchase events', () => {
    const handled = subscribed(SCENES.upgrades);
    for (const event of emitted(read('src/ui/screens/UpgradesScreen.tsx'))) {
      // Navigation is handled by ui:goto; the rest must be the shop's own.
      if (event === 'ui:goto') continue;
      expect(handled.has(event), `UpgradesScene must handle "${event}"`).toBe(true);
    }
  });

  it('offers an exit that does not depend on scrolling', () => {
    // The Back button existed but sat in a scrolling header, so it left the
    // viewport once the 28-row catalogue was scrolled.
    const css = read('src/styles/global.css');
    expect(css).toContain('.screen--shop .screen__header');
    expect(css).toMatch(/\.screen--shop \.screen__header \{[^}]*position: sticky/);
  });
});
