/**
 * Main menu.
 *
 * The buttons are React (see src/ui/screens/MainMenuScreen.tsx) — this scene
 * only draws the backdrop and the title. That split is the text-rendering
 * policy in miniature: interactive, laid-out, translatable text is DOM;
 * in-world text is Phaser. See docs/TEXT_RENDERING.md.
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import { getPlayerProfile } from '../player/playerProfile';
import { getCurrentWorldAndLevel } from '../levels/levelProgress';
import { GameEvents } from '../events/GameEvents';
import { runAudioSelfTest } from '../audio/audioSelfTest';
import { getSoundManager } from '../audio/soundService';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

/** Matches LevelSelect's pinned world until the world picker is ported. */
const SELECTABLE_WORLDS = 1;

export class MainMenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;
  private title!: Phaser.GameObjects.Text;
  private selfTestRan = false;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const camera = this.cameras.main;
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;

    this.backdrop = this.add
      .tileSprite(0, 0, width, height, 'menu-backdrop')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTileScale(1, 1);

    // Phaser Text in the extracted display face. Proves the font is available
    // to the canvas 2D text path, not just to the DOM.
    this.title = this.add
      .text(width / 2, height * 0.18, 'CIRCLE DEFENSE', {
        fontFamily: '"SWFMainFont", sans-serif',
        fontSize: '44px',
        color: '#ffe9a8',
        stroke: '#221a08',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setShadow(0, 4, 'rgba(0,0,0,0.55)', 6, false, true);

    this.tweens.add({
      targets: this.title,
      scale: { from: 0.97, to: 1.03 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // The audio self-test needs an unlocked AudioContext, which needs a
    // gesture. The first tap anywhere is the earliest honest moment to run it.
    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      void this.runSelfTestOnce();
      // Menu music is the one track worth loading eagerly; the crossfade
      // retries each frame until the lazy load lands.
      getSoundManager(this)?.setMusic('Menu');
    });

    this.publishResumePoint();

    const offStart = GameEvents.subscribe('ui:start-game', ({ world, level, sandbox, equipped }) => {
      this.scene.start(SceneKeys.Gameplay, { world, level, sandbox, equipped });
    });
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.MainMenu) this.scene.start(key);
    });
    const offSelfTest = GameEvents.subscribe('ui:run-audio-selftest', () => {
      this.selfTestRan = false;
      void this.runSelfTestOnce();
    });
    const onResize = (): void => this.layout();
    GameEvents.on('viewport:changed', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offStart();
      offGoto();
      offSelfTest();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.MainMenu });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.MainMenu });
  }

  private async runSelfTestOnce(): Promise<void> {
    if (this.selfTestRan) return;
    this.selfTestRan = true;
    try {
      const report = await runAudioSelfTest(this);
      GameEvents.emit('audio:selftest', report);
    } catch (error) {
      console.error('[MainMenuScene] Audio self-test threw:', error);
      this.selfTestRan = false;
    }
  }

  /**
   * Publishes the level "Play" should start.
   *
   * `getCurrentWorldAndLevel` is `ScreenLevelSelect.getCurrentWorldAndLevel()`
   * — the first level with nothing earned on any difficulty, i.e. the furthest
   * the player has reached. It reads the same progress table LevelSelect locks
   * levels from, so Play and the grid can never disagree.
   *
   * The scan is limited to one world to match LevelSelect, which pins world 1
   * until the world picker is ported. Without that, Play could launch a level
   * the grid cannot show.
   *
   * `[0, 0]` means every scanned level has been played, which the AS3 returns
   * from its zero-initialised locals. Falls back to the last level played, and
   * then to 1-1.
   */
  private publishResumePoint(): void {
    const profile = getPlayerProfile(this);
    const [world, level] = getCurrentWorldAndLevel(profile.progress, SELECTABLE_WORLDS);

    const resume =
      world > 0 && level > 0
        ? { world, level }
        : {
            world: profile.slot.levelSelect.previousWorld || 1,
            level: profile.slot.levelSelect.previousLevel || 1,
          };

    GameEvents.emit('menu:resume-point', resume);
  }

  private layout(): void {
    const camera = this.cameras.main;
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;

    this.backdrop.setSize(width, height);
    const safe = controller?.safeRect;
    this.title.setPosition(width / 2, (safe ? safe.y : 0) + height * 0.18);
  }
}
