/**
 * DEV-AID: the theme gallery's scene shell — `#themes`.
 *
 * A shell around a React screen, like `OptionsScene` and `BestiaryScene`: this
 * owns the scene lifecycle and the `ui:goto` handling, `ThemeGalleryScreen`
 * draws. There is nothing in-canvas to draw here beyond a backdrop, because
 * the nine grounds are compared as DOM images — the tiles are ordinary bitmaps
 * and CSS repeats them at the right size without a WebGL context.
 *
 * ── Why the gallery is not itself a rendered scene ────────────────────────
 * A contact sheet answers "which of these nine", and a level answers "what is
 * it like to play on". Drawing nine tile sprites here would answer neither
 * well: nine viewports at a ninth of the size each show a ninth of the ground.
 * So the comparison is DOM, and the walk-around is a real level —
 * `createThemeLevel` in `levels/devLevels.ts`, launched from the screen.
 *
 * **Registered only under `import.meta.env.DEV`** (`config/gameConfig.ts`), so
 * a production build has no scene behind `SceneKeys.ThemeGallery` and nothing
 * can start it. `menuRoute.ts` withholds the slug there too.
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

export class ThemeGalleryScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.ThemeGallery);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const camera = this.cameras.main;
    // Dimmed almost to nothing: the screen above is a colour comparison, and a
    // tinted backdrop bleeding through would bias it. This is here to stop the
    // canvas showing through as flat black, not to decorate.
    this.backdrop = this.add
      .tileSprite(0, 0, camera.width / camera.zoom, camera.height / camera.zoom, 'ground-concrete')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.08);

    // While this scene is active every other scene is torn down, so anything
    // the screen can emit has to be handled here — see uiEventListeners.test.ts,
    // which checks that pairing for every screen rather than the one that broke.
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.ThemeGallery) this.scene.start(key);
    });
    // The screen launches a theme's arena, which is an ordinary dev level.
    // `MainMenuScene` owns `ui:start-game` normally and is not up while this
    // scene is, so the pairing rule above applies to this one too.
    const offStart = GameEvents.subscribe(
      'ui:start-game',
      ({ world, level, difficulty, sandbox, equipped }) => {
        this.scene.start(SceneKeys.Gameplay, { world, level, difficulty, sandbox, equipped });
      },
    );

    const onResize = (): void => {
      const c = getViewportController(this);
      if (c) applyViewportToScene(this, c.current);
      this.backdrop.setSize(camera.width / camera.zoom, camera.height / camera.zoom);
    };
    GameEvents.on('viewport:changed', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offGoto();
      offStart();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.ThemeGallery });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.ThemeGallery });
  }
}
