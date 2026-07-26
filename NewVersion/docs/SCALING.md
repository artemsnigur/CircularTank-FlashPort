# Scaling and safe-area strategy

**Decision: `Phaser.Scale.RESIZE`, with a fixed 640-unit design width and a
device-pixel backing store.**

Implementation: [`src/game/config/viewport.ts`](../src/game/config/viewport.ts)
(pure maths, unit-tested) and
[`src/game/systems/ViewportController.ts`](../src/game/systems/ViewportController.ts)
(applies it).

## Why RESIZE and not FIT

The original Flash build ran a **640 × 400** camera scrolling over rooms of
640×400, 800×600, 900×720, 640×640 and 640×960 (`PartGameArea.cameraWidth` /
`cameraHeight`, and the `levelDataModelW1..W9` tables in `ScreenGame.as`). The
camera already scrolls, so there is no single "true" aspect ratio to preserve.

| | `FIT` | `RESIZE` |
|---|---|---|
| Full-bleed on a 19.5:9 phone | No — ~25% black bars | Yes |
| DOM HUD alignment | Must track the canvas rect, which moves | Sits on real screen edges |
| `env(safe-area-inset-*)` | Fights the letterbox offset | Works directly |
| Visible play area | Identical everywhere | Varies by device |
| Scene code | Simplest | Must handle resize |

The deciding factor is the React HUD. With `FIT`, the canvas is centred inside
a letterboxed area, so every DOM overlay has to be positioned against the
canvas rectangle rather than the viewport — and then safe-area insets have to
be composed on top of that offset. With `RESIZE` the canvas *is* the viewport,
the overlay is a plain `position: absolute; inset: 0` element padded by
`env(safe-area-inset-*)`, and the two never disagree.

The cost of `RESIZE` is that visible play area varies by device, which matters
for fairness. That is bounded, not ignored — see below.

## The rule

```
zoom  = renderWidth / 640          # 640 design units always span the width
logicalHeight = renderHeight / zoom
```

Pinning the **width** to 640 means every extracted sprite and every coordinate
lifted from the AS3 source keeps its authored proportions: an object that was
64 px wide in Flash is 64 design units wide here, on every device. Taller
phones simply see more of the room vertically, which is exactly what a
wave-defense game wants.

Two clamps bound the variance:

| Constant | Value | Why |
|---|---|---|
| `MIN_LOGICAL_HEIGHT` | 400 | The original camera height. Below this the player would see *less* than the Flash build ever showed, so we zoom out instead — used on landscape phones. |
| `MAX_LOGICAL_HEIGHT` | 1440 | Above this the tank gets comically small. 1440 admits every mainstream aspect through 20:9 (a 19.5:9 iPhone needs 1387 units) and clamps only genuinely extreme viewports. |

When a clamp fires, the fit becomes height-driven and the visible width is no
longer 640 — narrower on very tall screens, wider in landscape.

Worked examples (all in `viewport.test.ts`):

| Device | CSS | Visible world | Notes |
|---|---|---|---|
| iPhone 15 Pro | 393×852 @3 | 640 × 1388 | fixed-width rule |
| Pixel 8 | 412×915 @2.625 | 640 × 1421 | fixed-width rule |
| iPad mini | 744×1133 @2 | 640 × 975 | fixed-width rule |
| iPhone 15 Pro landscape | 852×393 @3 | 867 × 400 | MIN clamp: wider, not cropped |
| 320×2000 | @1 | 230 × 1440 | MAX clamp |

## Device pixel ratio

Phaser's `RESIZE` mode sets `canvas.width = parentSize.width` in **CSS**
pixels (`ScaleManager.updateScale`), so a 3× phone would render at one third of
its native resolution. To get `RESIZE` semantics without that loss:

1. React owns the `<canvas>` and passes it in via `config.canvas`; the game
   config sets `parent: undefined`. With no parent, `ScaleManager.step()`
   returns early and never overwrites `parentSize` from a bounding rect.
2. A `ResizeObserver` calls `setParentSize(cssW × dpr, cssH × dpr)`, so the
   backing store is in device pixels.
3. CSS sizes the canvas at `100%` of the container, so it *displays* at
   cssW × cssH. Backing store : display = dpr : 1 — pixel-exact.

DPR is clamped to **2** (`MAX_PIXEL_RATIO`): a 3× phone rendering full-screen
WebGL natively costs ~2.25× the fill rate of a 2× one for a difference nobody
sees on a 6" panel.

Consequence: because `config.canvas` is supplied, Phaser refuses `type: AUTO`
(`CreateRenderer` throws "Must set explicit renderType in custom
environment"). `detectRendererType()` probes for WebGL itself and pins
`WEBGL` or `CANVAS`, preserving the fallback.

## Safe areas

Three things have to line up, and all three are easy to get silently wrong:

1. **`viewport-fit=cover`** in `index.html`. Without it the browser insets the
   layout viewport itself and every `env()` reads `0px` — which looks exactly
   like "safe areas are handled" until the app is packaged.
2. **`apple-mobile-web-app-status-bar-style: black-translucent`** (and
   `contentInset: 'never'` in `capacitor.config.ts`). The status bar has to
   overlay the web view for `safe-area-inset-top` to be non-zero.
3. **Reading the values.** There is no JS API for `env()`, so
   [`src/state/safeArea.ts`](../src/state/safeArea.ts) puts the insets on the
   padding of a hidden fixed probe element and reads them back with
   `getComputedStyle`. Rotation on iOS reports stale insets for a frame or
   two, so it re-reads on a 50/200/500 ms tail.

The insets then go two places:

- **DOM UI** — `.app__overlay` is padded by the `env()` values directly.
- **In-canvas UI** — Phaser has no notion of a notch, so
  `ViewportController.safeRect` converts the CSS-pixel insets into design
  units. Anything drawn inside the canvas (the HUD text in `GameplayScene`,
  later the pause button and boss health bar) anchors to that rect rather than
  to `camera.width/height`.

The game world itself is deliberately **not** inset — it renders full bleed
under the notch, which is what you want for a background.

## Testing on a real device

`vite.config.ts` sets `server.host: true`, so `npm run dev` prints a LAN URL.
Open it on a phone and expand the diagnostics panel (bottom right): it shows
CSS size, DPR, camera zoom, world size in units, and the live inset values.
Rotate the device and watch them change — that is the only way to confirm the
inset plumbing actually works, since a desktop browser always reports zeros.
