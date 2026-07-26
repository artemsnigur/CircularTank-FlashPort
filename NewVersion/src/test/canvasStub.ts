/**
 * Minimal 2D-canvas stub for jsdom.
 *
 * jsdom leaves `HTMLCanvasElement.prototype.getContext` unimplemented unless
 * the native `canvas` package is installed — which needs a C++ toolchain and
 * is a heavy dependency for a project that never renders in Node.
 *
 * Phaser touches the 2D context at *module load* time (device/CanvasFeatures
 * probes `supportNewBlendModes` and `supportInverseAlpha` on import), so any
 * test that transitively imports `phaser` crashes on import without this.
 * BootScene's font measurement uses `measureText` for the same reason.
 *
 * This is deliberately not a rendering emulator. It returns plausible values
 * so feature detection resolves, and nothing here should ever be asserted on:
 * anything that needs real pixels belongs in a browser test, not jsdom.
 */

interface StubImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace;
}

function makeImageData(width: number, height: number): StubImageData {
  // Opaque red. `checkBlendMode` looks for (255, 0, 0), and `checkInverseAlpha`
  // only compares two reads against each other, so a constant satisfies both.
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' };
}

function createContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const noop = (): void => undefined;

  const context = {
    canvas,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineWidth: 1,
    imageSmoothingEnabled: true,

    fillRect: noop,
    clearRect: noop,
    strokeRect: noop,
    fillText: noop,
    strokeText: noop,
    drawImage: noop,
    save: noop,
    restore: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    putImageData: noop,

    getImageData: (_x: number, _y: number, w: number, h: number) =>
      makeImageData(Math.max(1, w), Math.max(1, h)),
    createImageData: (w: number, h: number) => makeImageData(Math.max(1, w), Math.max(1, h)),

    /**
     * Width proportional to the string length and the px size parsed out of
     * `font`. BootScene compares a custom family against a fallback and expects
     * them to differ, so vary the result by family name too.
     */
    measureText: (text: string) => {
      const size = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(context.font)?.[1] ?? '10');
      const familyBias = context.font.includes('SWFMainFont') ? 0.58 : 0.5;
      return { width: text.length * size * familyBias } as TextMetrics;
    },

    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
  };

  return context as unknown as CanvasRenderingContext2D;
}

/** Installs the stub. Safe to call more than once. */
export function installCanvasStub(): void {
  if (typeof HTMLCanvasElement === 'undefined') return;

  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: (id: string) => unknown;
    toDataURL: () => string;
    __stubbed?: boolean;
  };
  if (proto.__stubbed) return;
  proto.__stubbed = true;

  proto.getContext = function getContext(this: HTMLCanvasElement, contextId: string) {
    // Only 2D is stubbed. Returning null for webgl is correct and meaningful:
    // `detectRendererType()` then reports CANVAS, which is what a headless
    // environment should look like.
    return contextId === '2d' ? createContext2D(this) : null;
  };

  proto.toDataURL = () => 'data:image/png;base64,';
}
