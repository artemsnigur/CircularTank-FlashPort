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
import { GameEvents } from '../events/GameEvents';
import { runAudioSelfTest } from '../audio/audioSelfTest';
import { getSoundManager } from '../audio/soundService';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

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

    const offStart = GameEvents.subscribe('ui:start-game', ({ levelIndex }) => {
      this.scene.start(SceneKeys.Gameplay, { levelIndex });
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
