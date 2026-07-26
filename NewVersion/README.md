# Circle Defense — Flash/AS3 → mobile port

Skeleton for porting a wave-defense Flash game to the web and (later) to
iOS/Android. The original assets and decompiled ActionScript live in
`../SWFimported/`, extracted from the SWF with JPEXS.

**Status: the core gameplay loop runs.** A level plays end to end — paced wave
spawning from the real level tables, a tank that drives and fires all 12
primary weapons, enemies that steer, shoot, take typed damage and pay out, a
completion rule for every level mode, and a working shop, save and progression
layer.

Coverage behind that is uneven, and deliberately tracked rather than estimated:
**9 of the 20 enemy types** have their characteristic behaviour built, and
**1 of the 12 secondaries** (Mine). `src/game/enemies/enemyBehaviour.ts` is the
honest board for the enemy half — it derives what it can from the code and pins
the rest to branches in `PartGameArea.as`, so it cannot quietly drift
optimistic. `docs/ENEMIES.md` is generated from it. See `PROGRESS.md` for the
643-class checklist.

## Stack

| | |
|---|---|
| App shell | Vite 6 + React 19 + TypeScript (`strict: true`) |
| Game engine | Phaser 3.90 |
| Shared state | Zustand 5 |
| Tests | Vitest 3 + Testing Library (jsdom) |
| Lint | ESLint 9 flat config, type-checked rules |
| Packaging | Capacitor 7 (configured, no platform added yet) |

## Getting started

```bash
npm install
npm run assets:sync     # copy ../SWFimported/{images,fonts,sounds,shapes} -> src/assets/
npm run dev             # http://localhost:5173 (also binds to your LAN IP)
```

`assets:sync` must run before the first `dev` or `test` — `src/assets/` is
gitignored, with `../SWFimported/` as the source of truth.

In the browser: tap once to unlock audio, press **Play**, then drive with
**WASD**/arrows, aim with the mouse, **Space** to fire. Collect a coin and
watch the React counter in the top left update from a Phaser event. The
**diagnostics** button (bottom right, dev only) opens the pipeline report:
viewport, DPR, font resolution, and audio self-test results.

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server, bound to all interfaces for phone testing |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run typecheck` | `tsc --noEmit` over app + Node configs |
| `npm run lint` | ESLint (`lint:fix` to autofix) |
| `npm run assets:sync` | Copy extracted assets in (`:sync:all` for all 1015 shapes) |
| `npm run audio:audit` | Audit exported MP3s for Flash-era header problems |
| `npm run progress` | Regenerate `PROGRESS.md` (preserves recorded statuses) |
| `npm run cap:sync` | Capacitor sync (after `npx cap add ios/android`) |

## Layout

```
scripts/            Node tooling — asset sync, MP3 audit, PROGRESS.md generator
src/
  assets/           Synced SWF exports. Original filenames = SWF library IDs.
    registry.ts     import.meta.glob -> hashed URLs, verified at build time
    manifest.ts     the sample set the preloader proves the pipeline with
  game/
    config/         constants, viewport maths, Phaser game config
    scenes/         Boot -> Preload -> MainMenu -> LevelSelect -> Gameplay
    entities/       PlayerTank, Pickup  (placeholders)
    systems/        ViewportController
    events/         GameEvents — the typed React <-> Phaser bus
    audio/          PCM analysis + runtime self-test
  state/            Zustand store, event bridge, safe-area watcher
  ui/               React shell: canvas host, HUD, screens, diagnostics
  styles/           global.css, fonts.css
docs/               Design decisions (read these before changing behaviour)
```

## How the pieces connect

### React ↔ Phaser

One typed event bus, backed by Phaser's own `EventEmitter`:

```
Phaser scene --emit--> GameEvents --> state/bridge.ts --> Zustand --> React
React UI     --emit--> GameEvents --> scene listener   --> gameplay
```

Every event and payload is declared in `GameEventMap`
([`src/game/events/GameEvents.ts`](src/game/events/GameEvents.ts)); adding a
member there is the only way to add an event, so a typo or a missing field is
a compile error.

No polling anywhere. React components subscribe to store *slices*, so the
currency counter re-rendering does not re-render the health bar. React never
holds a reference to a `Scene` — scenes are torn down and rebuilt constantly,
and a stale reference is a leak that only shows after twenty restarts.

The worked example the brief asked for: drive over a coin in `GameplayScene` →
`currency:earned` → bridge → store → `CurrencyCounter` re-renders. Asserted in
[`src/ui/Hud.test.tsx`](src/ui/Hud.test.tsx).

### One Phaser instance, StrictMode-safe

StrictMode runs effects twice in development (`mount → effect → cleanup →
effect`). The naive create-in-effect/destroy-in-cleanup pattern therefore
builds a game, tears it down mid-boot, and builds another — leaving orphaned
RAF callbacks, doubled input handlers, and leaked WebGL contexts.

[`GameCanvas.tsx`](src/ui/GameCanvas.tsx) makes teardown **deferred and
cancellable**: cleanup schedules the destroy on a macrotask, and a re-running
effect cancels it. StrictMode's synthetic remount happens well inside one
macrotask so the destroy never fires; a real unmount has no follow-up effect so
it does. Guarded by tests in
[`GameCanvas.test.tsx`](src/ui/GameCanvas.test.tsx).

### Assets

`src/assets/` rather than `public/`: going through Vite means every file gets a
content hash, is verified to exist at build time, and appears in the bundle
report. A typo in an asset name fails the build instead of 404-ing on a phone.

**Filenames are never changed.** The leading number is the SWF library ID,
which cross-references `../SWFimported/symbolClass/symbols.csv` — the only link
back to the original symbol names. There is a test asserting this.

## Design decisions

Read these before changing rendering, text, or audio behaviour:

- **[docs/SCALING.md](docs/SCALING.md)** — why `Scale.RESIZE` over `FIT`, the
  fixed 640-unit design width, DPR handling, and safe-area plumbing.
- **[docs/TEXT_RENDERING.md](docs/TEXT_RENDERING.md)** — which text is DOM and
  which is Phaser, why Boot blocks on font loading, `Text` vs `BitmapText`.
- **[docs/AUDIO_PIPELINE.md](docs/AUDIO_PIPELINE.md)** — what the JPEXS MP3
  exports actually contain, and the two-layer verification.

## Porting workflow

1. Pick a class from `PROGRESS.md`, starting with **Core systems**.
2. Read the AS3 in `../SWFimported/scripts/<Name>.as`.
3. Write the TypeScript equivalent. Keep the AS3 origin in a comment on any
   constant lifted verbatim — the level tables and enemy stat rows are dense
   magic numbers and unattributed ones become unverifiable.
4. Mark it `ported`, then `tested` once it has a test or is confirmed running.
5. Re-run `npm run progress` if the source set changes; statuses are preserved.

Do not port the ~81 third-party classes (`com/google/analytics`, `FGL`, `fl`,
`mx`) — replace them with modern equivalents or drop them.

## Known gaps

- Touch controls (virtual stick + fire button) — keyboard only for now
- Both TTFs ship unconverted (821 KB + 201 KB); convert to WOFF2
- `49_Main_font2_Arial.ttf` is an embedded Arial — check licensing before shipping
- Music loops need re-encoding to OGG/AAC (see the audio doc)
- No native platform added yet: `npx cap add ios` / `npx cap add android`
