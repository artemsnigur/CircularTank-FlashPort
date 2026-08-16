/**
 * Options — `ScreenOptions.as`.
 *
 * A shell around a React screen, like `BestiaryScene`: the scene owns the
 * store and publishes, React renders and emits. `MainMenuScene` installs the
 * `ui:set-option` listener, so this only has to publish the current values on
 * arrival — a player who opens Options from a fresh store must see the
 * defaults that `initAndLoadOptions` would have written, not an empty form.
 */
import Phaser from 'phaser';
import { publishAffordable } from '../upgrades/affordability';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';
import {
  publishGameplayOptions,
  setGameplayOption,
} from '../options/optionsService';
import { publishAudioOptions, setAudioOption } from '../audio/soundService';

export class OptionsScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.Options);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const camera = this.cameras.main;
    this.backdrop = this.add
      .tileSprite(0, 0, camera.width / camera.zoom, camera.height / camera.zoom, 'ground-grass')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.2);

    // **Installed here, not in `MainMenuScene`.** While this scene is active
    // every other scene is torn down, so a listener living on the menu would
    // be gone exactly when the options screen needs it — the pairing test in
    // `uiEventListeners.test.ts` caught that, which is what it exists for.
    // Subscribed here rather than inside a helper: `uiEventListeners.test.ts`
    // pairs each screen's emits against its scene's subscribes by reading the
    // source, and a subscription hidden in a service is invisible to that
    // check — which would defeat the guarantee for every future screen too.
    const offOptions = GameEvents.subscribe('ui:set-option', (change) => {
      setGameplayOption(this, change);
    });
    publishGameplayOptions(this);
    // The screen reuses `AudioToggles`, so it emits `ui:set-audio` too.
    const offAudio = GameEvents.subscribe('ui:set-audio', (change) => {
      setAudioOption(this, change);
    });
    publishAudioOptions(this);

    // While this scene is active every other scene is torn down, so anything
    // the screen can emit has to be handled here — see uiEventListeners.test.ts,
    // which checks that pairing for every screen rather than the one that broke.
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.Options) this.scene.start(key);
    });
    const onResize = (): void => {
      const c = getViewportController(this);
      if (c) applyViewportToScene(this, c.current);
      this.backdrop.setSize(camera.width / camera.zoom, camera.height / camera.zoom);
    };
    GameEvents.on('viewport:changed', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offGoto();
      offOptions();
      offAudio();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Options });
    });

    // The bottom bar's Upgrades tab shows a different frame when something is
    // affordable — `ButtonUpgrades`' `makeIcon`. The AS3's button reads a
    // global for this; here each screen that shows the bar publishes it.
    publishAffordable(this);
    GameEvents.emit('scene:ready', { key: SceneKeys.Options });
  }
}
