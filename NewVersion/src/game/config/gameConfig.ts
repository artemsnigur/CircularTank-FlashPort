import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { LevelSelectScene } from '../scenes/LevelSelectScene';
import { GameplayScene } from '../scenes/GameplayScene';
import { UpgradesScene } from '../scenes/UpgradesScene';
import { EnemiesScene } from '../scenes/EnemiesScene';
import { OptionsScene } from '../scenes/OptionsScene';
import { AchievementsScene } from '../scenes/AchievementsScene';
import { BestiaryScene } from '../scenes/BestiaryScene';
import { INITIAL_HEIGHT, INITIAL_WIDTH } from './viewport';

/**
 * Probes for WebGL so we can pin `type` explicitly.
 *
 * Phaser's AUTO detection is unavailable to us: CreateRenderer throws
 * "Must set explicit renderType in custom environment" when `config.canvas` is
 * supplied, and we supply a React-owned canvas so that ViewportController can
 * control the backing-store resolution.
 */
function detectRendererType(): number {
  if (typeof document === 'undefined') return Phaser.CANVAS;
  try {
    const probe = document.createElement('canvas');
    const gl =
      probe.getContext('webgl2') ??
      probe.getContext('webgl') ??
      probe.getContext('experimental-webgl');
    return gl ? Phaser.WEBGL : Phaser.CANVAS;
  } catch {
    return Phaser.CANVAS;
  }
}

export interface GameConfigOptions {
  canvas: HTMLCanvasElement;
  /** Enables the FPS emitter and the on-canvas debug text. */
  debug?: boolean;
}

export function createGameConfig({
  canvas,
  debug = import.meta.env.DEV,
}: GameConfigOptions): Phaser.Types.Core.GameConfig {
  return {
    type: detectRendererType(),
    canvas,

    // `null`, emphatically not `undefined`. ScaleManager.getParent() only
    // hands parent management back to the caller when it sees an explicit
    // null; `undefined` falls through to GetTarget(), which defaults to
    // document.body. With a parent set, ScaleManager.step() polls
    // getBoundingClientRect() every `resizeInterval` and would overwrite the
    // device-pixel size ViewportController installs via setParentSize().
    //
    // AddToDOM also short-circuits on `parent === null`, so the React-owned
    // canvas is left exactly where React put it.
    parent: null,

    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: INITIAL_WIDTH,
      height: INITIAL_HEIGHT,
      autoRound: true,
      // Nothing to poll — parent is unset — so keep the check cheap.
      resizeInterval: 500,
    },

    // Flash's stage was opaque; a transparent canvas would let the page
    // background show through during scene transitions.
    backgroundColor: '#12161f',
    transparent: false,

    render: {
      antialias: true,
      // The extracted art is vector-derived and gets scaled continuously by
      // the camera zoom, so snapping to integers would make it shimmer.
      roundPixels: false,
      pixelArt: false,
      powerPreference: 'high-performance',
    },

    physics: {
      default: 'arcade',
      arcade: {
        // Top-down game: the AS3 source applies no gravity (Tank.as moves via
        // explicit velocity), so neither do we.
        gravity: { x: 0, y: 0 },
        debug,
      },
    },

    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      // The original supports multi-touch-free play; two pointers is enough
      // for a virtual stick plus a fire button.
      activePointers: 3,
    },

    audio: {
      // Web Audio gives us access to the decoded AudioBuffer, which the audio
      // self-test needs in order to measure leading silence and DC offset.
      disableWebAudio: false,
      noAudio: false,
    },

    // Pausing on blur is right for a single-player game and stops the phone
    // burning battery behind a lock screen.
    autoFocus: true,
    disableContextMenu: true,
    banner: false,

    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      LevelSelectScene,
      UpgradesScene,
      EnemiesScene,
      BestiaryScene,
      OptionsScene,
      AchievementsScene,
      GameplayScene,
    ],
  };
}
