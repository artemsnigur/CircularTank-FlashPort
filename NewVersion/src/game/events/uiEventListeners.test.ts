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
 *
 * ── Why this is table-driven now ──────────────────────────────────────────
 * The first version of this file checked exactly one pair — Hud against
 * GameplayScene — because that was the pair that had broken. So when the
 * Enemy behaviour screen later grew a Test button emitting `ui:start-game`,
 * and `EnemiesScene` subscribed only to `ui:goto`, the identical bug shipped
 * under a green suite: the screen was not in the table, and neither was its
 * scene.
 *
 * A screen is only ever on screen while *its* scene is running, so the rule is
 * per-pair and there is no reason to check one pair rather than all of them.
 * `PAIRS` is checked for completeness against the files on disk, so adding a
 * screen without pairing it fails here instead of failing in the browser.
 */
import { readdirSync, readFileSync } from 'node:fs';
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

const SCENE_DIR = 'src/game/scenes';
const SCREEN_DIR = 'src/ui/screens';

/**
 * Which scene is guaranteed to be alive while a given piece of DOM is visible.
 *
 * This is the whole contract: React renders off `activeScene`, so a screen's
 * buttons can only be pressed while the scene it is keyed to is running. Every
 * other scene has been torn down and its listeners removed.
 */
const PAIRS: { screen: string; scene: string }[] = [
  { screen: 'src/ui/Hud.tsx', scene: `${SCENE_DIR}/GameplayScene.ts` },
  { screen: `${SCREEN_DIR}/MainMenuScreen.tsx`, scene: `${SCENE_DIR}/MainMenuScene.ts` },
  { screen: `${SCREEN_DIR}/LevelSelectScreen.tsx`, scene: `${SCENE_DIR}/LevelSelectScene.ts` },
  { screen: `${SCREEN_DIR}/UpgradesScreen.tsx`, scene: `${SCENE_DIR}/UpgradesScene.ts` },
  { screen: `${SCREEN_DIR}/EnemiesScreen.tsx`, scene: `${SCENE_DIR}/EnemiesScene.ts` },
  { screen: `${SCREEN_DIR}/BestiaryScreen.tsx`, scene: `${SCENE_DIR}/BestiaryScene.ts` },
  { screen: `${SCREEN_DIR}/OptionsScreen.tsx`, scene: `${SCENE_DIR}/OptionsScene.ts` },
  {
    screen: `${SCREEN_DIR}/AchievementsScreen.tsx`,
    scene: `${SCENE_DIR}/AchievementsScene.ts`,
  },
  // Shown during Boot and Preload, which run before any screen can be used.
  // Listed so the completeness check below stays honest; it emits nothing.
  { screen: `${SCREEN_DIR}/LoadingScreen.tsx`, scene: `${SCENE_DIR}/PreloadScene.ts` },
  // The slot picker is drawn over the menu, so MainMenuScene is what is alive
  // behind it — same pairing, different DOM.
  { screen: `${SCREEN_DIR}/SaveSlotScreen.tsx`, scene: `${SCENE_DIR}/MainMenuScene.ts` },
];

/**
 * Events that are answered by `state/bridge.ts` rather than by any scene.
 *
 * A narrow, named exception. The contract above exists because a screen button
 * whose event nothing handles is silently dead — that was the `EnemiesScreen`
 * bug. A *UI-state* event has the same shape and a different answer: nothing in
 * the game reacts to it, the bridge sets a store flag, and React re-renders.
 *
 * Listed rather than pattern-matched, so a genuinely dead event cannot hide
 * behind a naming convention. If an entry here ever needs the game to react, it
 * belongs in a scene and comes off this list.
 */
const UI_ONLY: Readonly<Record<string, { handler: string; why: string }>> = {
  'ui:slot-picker': {
    handler: 'src/state/bridge.ts',
    why: 'opens/closes the save-slot overlay; the bridge sets slotPickerOpen',
  },
  /**
   * Added T74 with the medal stamp-in, which emits `Award1-3` from the results
   * overlay.
   *
   * **The handler is named per entry rather than assumed to be the bridge.**
   * This one is answered by the sound service, installed once at module scope
   * and alive for every scene — so a scene subscription would be the wrong
   * shape, not a missing one. Verifying against the named file keeps the
   * exemption honest: it still has to point at something that actually
   * subscribes, which is the property that stops this list becoming a way to
   * silence the contract.
   */
  'ui:sound': {
    handler: 'src/game/audio/soundService.ts',
    why: 'one-shot SFX from DOM controls; the sound service queues it globally',
  },
};

describe('the screen/scene event contract', () => {
  it('covers every screen that exists', () => {
    // The reason the EnemiesScreen bug shipped: its pair was simply absent, so
    // no assertion was false — there was no assertion. A new screen must be
    // paired deliberately rather than defaulting to unchecked.
    const onDisk = readdirSync(SCREEN_DIR)
      .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
      .map((f) => `${SCREEN_DIR}/${f}`);
    const listed = new Set(PAIRS.map((p) => p.screen));

    for (const screen of onDisk) {
      expect(listed.has(screen), `${screen} is not paired with a scene in PAIRS`).toBe(true);
    }
  });

  it.each(PAIRS)('$screen only emits events $scene handles', ({ screen, scene }) => {
    const handled = subscribed(read(scene));

    for (const event of emitted(read(screen))) {
      if (event in UI_ONLY) continue;
      expect(
        handled.has(event),
        `${screen} emits "${event}" but ${scene} does not subscribe to it. ` +
          `That scene is the only one running while this screen is visible, ` +
          `so the event reaches nobody and the button silently does nothing.`,
      ).toBe(true);
    }
  });

  it('every UI-only event is actually handled by the module it names', () => {
    // The exemption is only safe while something answers these. Without this,
    // adding a name to UI_ONLY would be a way to silence the contract rather
    // than satisfy it.
    //
    // Checked against the **named** handler rather than always the bridge:
    // these events are exempt because a *scene* is the wrong listener, not
    // because the bridge is the only alternative. Hard-coding the bridge would
    // have forced `ui:sound` to either lie about its handler or stay outside
    // the list — the guard being narrower than the thing it guards, which is
    // trap 9's shape.
    for (const [event, { handler }] of Object.entries(UI_ONLY)) {
      expect(
        subscribed(read(handler)).has(event),
        `${event} is exempt from the scene contract but ${handler} does not handle it either.`,
      ).toBe(true);
    }
  });
});

describe('regressions this file exists for', () => {
  it('GameplayScene handles ui:start-game — the Next-level freeze', () => {
    expect(subscribed(read(`${SCENE_DIR}/GameplayScene.ts`)).has('ui:start-game')).toBe(true);
  });

  it('EnemiesScene handles ui:start-game — the dead per-type Test button', () => {
    expect(subscribed(read(`${SCENE_DIR}/EnemiesScene.ts`)).has('ui:start-game')).toBe(true);
  });
});

describe('every scene offers a way out', () => {
  it.each(PAIRS.map((p) => p.scene).filter((s) => !s.endsWith('PreloadScene.ts')))(
    '%s handles ui:goto',
    (scene) => {
      expect(subscribed(read(scene)).has('ui:goto')).toBe(true);
    },
  );
});

describe('the shop', () => {
  /**
   * **The requirement outlived its mechanism, and this test had pinned the
   * mechanism.**
   *
   * The original defect: the shop's Back button sat in a scrolling header, so
   * it left the viewport once the 28-row catalogue was scrolled and there was
   * no way out. The fix at the time was `position: sticky` on that header, and
   * this test asserted exactly that CSS.
   *
   * T156 removed the header entirely — the exit moved into the bottom
   * navigation bar, where `BottomBar.as` puts it. The guarantee is stronger
   * than before: the bar is a **grid row**, outside the scrolling body, so it
   * cannot leave the viewport rather than being pinned back into it. But the
   * old assertion failed, and deleting it would have taken the guarantee with
   * it.
   *
   * So it is restated against the new mechanism. Source-shape, and flagged as
   * such: it proves the layout is *written* this way, not that anything is
   * reachable on a real viewport.
   */
  it('keeps an exit outside the scrolling area', () => {
    const css = read('src/styles/global.css');

    // Three rows: title bar, body, navigation. Only the middle one flexes.
    expect(css).toMatch(/\.screen-shell \{[^}]*grid-template-rows: auto 1fr auto/);
    // ...and the scroller is the body, not the shell, so the bars sit outside it.
    expect(css).toMatch(/\.screen-shell__body \{[^}]*overflow-y: auto/);

    // The shop is one of the screens that uses it.
    expect(read('src/ui/screens/UpgradesScreen.tsx')).toContain('<ScreenShell');
  });

  it('and the bar it moved into carries a route to the menu', () => {
    // The counterpart: a layout that reserves a row for navigation proves
    // nothing if the navigation has no way out of the shop.
    expect(read('src/ui/BottomNav.tsx')).toContain("key: 'MainMenu'");
  });
});
