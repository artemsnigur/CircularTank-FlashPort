/**
 * Creates and tears down the Phaser game + viewport controller.
 *
 * Split out of GameCanvas.tsx so that file exports only its component — React
 * Fast Refresh silently stops working for a module that mixes component and
 * non-component exports.
 */
import Phaser from 'phaser';
import { createGameConfig } from '../game/config/gameConfig';
import { ViewportController, VIEWPORT_REGISTRY_KEY } from '../game/systems/ViewportController';

/** What `bootstrap` hands back so the mounting effect can tear it down. */
export interface GameHandle {
  destroy: () => void;
}

export type GameBootstrap = (canvas: HTMLCanvasElement, container: HTMLElement) => GameHandle;

/**
 * The real bootstrap. Injectable through `GameCanvas`'s `bootstrap` prop so
 * the StrictMode lifecycle can be tested without standing up WebGL.
 */
export const defaultBootstrap: GameBootstrap = (canvas, container) => {
  const game = new Phaser.Game(createGameConfig({ canvas }));

  const viewport = new ViewportController(game, container);
  // Scenes reach the controller through the registry rather than a module
  // import, so nothing outlives a destroy holding a stale reference.
  game.registry.set(VIEWPORT_REGISTRY_KEY, viewport);
  viewport.start();

  if (import.meta.env.DEV) {
    (window as unknown as { __PHASER_GAME__?: Phaser.Game }).__PHASER_GAME__ = game;
  }

  return {
    destroy: () => {
      viewport.stop();
      // removeCanvas=false: React owns the element and will remove it itself.
      game.destroy(false, false);
      if (import.meta.env.DEV) {
        delete (window as unknown as { __PHASER_GAME__?: Phaser.Game }).__PHASER_GAME__;
      }
    },
  };
};
