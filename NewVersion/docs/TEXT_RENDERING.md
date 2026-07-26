# Text rendering: what is DOM and what is Phaser

## The rule

> **If it is part of the interface, it is DOM. If it is part of the world, it
> is Phaser.**

The test to apply: *does this text need to be tappable, selectable, laid out,
scrollable, translated, or read by a screen reader?* If yes it belongs in
React. If it needs to scroll with the camera, sit behind a sprite, or be
tweened alongside game objects, it belongs in Phaser.

## DOM / React

| Text | Where |
|---|---|
| Menu buttons, level select | `src/ui/screens/` |
| HUD counters (coins, health, ammo, wave) | `src/ui/Hud.tsx` |
| Achievement toasts | `src/ui/Hud.tsx` |
| Loading / error screens | `src/ui/screens/LoadingScreen.tsx` |
| Settings, shop, credits (not yet ported) | `src/ui/screens/` |

Why: buttons in the DOM get focus rings, screen-reader semantics, native tap
targets, `min-height: 44px` compliance, text that reflows when translated, and
`env(safe-area-inset-*)` — all for free. Rebuilding any of it inside a canvas
is real work with no payoff, and canvas text is invisible to accessibility
tooling entirely.

Both extracted fonts are declared as `@font-face` in
[`src/styles/fonts.css`](../src/styles/fonts.css) and exposed as
`--font-display` / `--font-body`.

## Phaser

| Text | Where |
|---|---|
| Title on the menu backdrop | `MainMenuScene` |
| In-play readout (level, coins, speed) | `GameplayScene` |
| Floating damage numbers *(not yet built)* | — |
| Enemy/boss name plates *(not yet built)* | — |

Why: this text is welded to the play area. It has to scroll with the camera,
scale with the zoom, and layer between sprites. Reproducing that with absolutely
positioned DOM elements means converting world coordinates to screen
coordinates every frame — which is slower *and* jitters, because DOM updates
are not synchronised with the WebGL frame.

## Font families

| CSS family | File | Internal name | Glyphs | Use |
|---|---|---|---|---|
| `SWFMainFont` | `50_Main_font_JG.ttf` | `JG` | 581 | Display: titles, headings, numeric readouts |
| `SWFMainFont2` | `49_Main_font2_Arial.ttf` | `Arial` | 3130 | Body: paragraphs, hints, arbitrary text |

Two things to know:

- **The family names are deliberately renamed.** The second font literally
  identifies itself as `Arial`; registering it under that name would shadow
  the system Arial across the whole document.
- **`SWFMainFont` has only 581 glyphs.** It covers the game's original
  strings and little else — no extended Latin, no Cyrillic, no CJK. It is safe
  for headings you control and unsafe for user- or translator-supplied text.
  That is why `--font-body` is the *other* face.

## Why Boot blocks on font loading

Phaser's `Text` game object renders through the Canvas 2D API and rasterises
the result **to a texture**. If the `@font-face` has not finished loading when
the first `Text` is drawn, the browser silently substitutes a fallback and
Phaser caches that bitmap. The text then stays wrong until something
invalidates the texture — a bug that looks intermittent and is miserable to
chase.

So `BootScene` blocks before any scene draws:

```ts
await Promise.all(SAMPLE_FONTS.map((f) => document.fonts.load(`16px "${f.family}"`)));
await document.fonts.ready;
```

`document.fonts.load()` is the part that matters. `document.fonts.ready` alone
resolves immediately when nothing has been requested yet — a `@font-face` rule
is lazy, and a face nothing has asked for is never fetched. This is the single
most common reason "the font is loaded" but the first Phaser text still renders
in Times.

Boot then **verifies** rather than assuming, because `document.fonts.check()`
can return `true` for a face the browser did not actually apply. It measures a
sample string in the custom family and again in `monospace`; identical widths
mean the fallback was substituted. Results go to `boot:fonts-ready` and show up
in the diagnostics panel as `ok` or `fallback`. A 6 s timeout keeps a font that
never resolves from deadlocking boot.

## `Text` vs `BitmapText`

Currently everything in-canvas uses `Phaser.GameObjects.Text`, which is right
for the skeleton: it accepts any `@font-face` family, supports strokes and
shadows, and there is no glyph atlas to maintain.

Switch to `BitmapText` when text changes **every frame** — floating damage
numbers over dozens of enemies is the case that will force it. Each `setText()`
on a `Text` object re-rasterises to a canvas and re-uploads a texture to the
GPU; at 60 fps across many instances that dominates the frame. `BitmapText`
draws from a pre-baked glyph atlas with no re-upload.

The migration cost is real (bake an atlas per size and colour with a tool like
`msdf-bmfont` or Littera), so do it when profiling says to, not before. The
in-play readout in `GameplayScene` updates ~60 times a second on a single
object, which is nowhere near the threshold.

## Outstanding

- **Convert both TTFs to WOFF2.** They ship as raw JPEXS exports —
  821 KB + 201 KB — and typically shrink 60-75%. Tracked in `PROGRESS.md`.
- **Check the licence on `49_Main_font2_Arial.ttf`.** It is a Flash-embedded
  copy of Arial (Monotype). Redistributing it in an app bundle is a different
  licensing question from embedding it in a SWF, and a system font stack
  (`system-ui, -apple-system, 'Segoe UI', sans-serif`) would be both smaller
  and safer. Worth resolving before shipping.
