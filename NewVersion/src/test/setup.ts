import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installCanvasStub } from './canvasStub';

// Must run before any test file imports `phaser`: Phaser probes the 2D context
// at module-load time and throws on jsdom's unimplemented getContext.
installCanvasStub();

/**
 * jsdom does not implement these, and importing Phaser or mounting the canvas
 * host touches both. Stubbing here keeps the stubs out of individual tests.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

afterEach(() => {
  cleanup();
});
