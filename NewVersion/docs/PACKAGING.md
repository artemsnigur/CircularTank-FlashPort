# Packaging — the Windows desktop build

Status: **shipped, T259.** `npm run desktop:build` produces a working installer
and a portable `.exe` from this repo, and `npm run desktop:smoke` proves the
packaged app actually boots.

## Commands

All from `NewVersion/`:

```bash
npm run desktop:dev      # the game in the Electron shell, against Vite + HMR
npm run desktop:pack     # build + package to a folder (fast, no installer)
npm run desktop:build    # build + NSIS installer *and* portable .exe
npm run desktop:smoke    # launch the packaged app and prove it runs
npm run desktop:icon     # redraw electron/icon.ico
```

Output goes to **`../release/`** — one level up, next to `NewVersion/`, not
inside it. That is deliberate; see *The rename that fails* below.

| artefact | what it is |
|---|---|
| `release/win-unpacked/Circular Tank.exe` | the app, unpacked. What `desktop:smoke` drives |
| `release/Circular Tank Setup <v>.exe` | NSIS installer — Start-menu entry, desktop shortcut, uninstaller, user-choosable install directory |
| `release/CircularTank-<v>-portable.exe` | one self-contained file, runs from anywhere, writes nothing to Program Files |

Both installers are ~122 MB; the unpacked folder is ~511 MB.

## Why Electron and not Tauri

Both were considered. **Electron**, for two reasons:

1. **It ships its own Chromium.** Tauri renders in the machine's own WebView2,
   so what a player sees depends on a component this project neither ships nor
   versions. That is precisely the failure shape `CLAUDE.md` collects under *"a
   desktop-only visual pass proves nothing about mobile"* — a renderer
   difference that is invisible where you test and total where you ship. This
   port has had two of those already, both viewport-related, and neither was
   found by tests. Electron removes the whole class: the desktop build draws
   with the engine every visual decision here was checked against.
2. **No new toolchain.** Tauri needs Rust and the MSVC build tools — several GB
   of new dependency for a repo that is otherwise pure Node. Checked on this
   machine: `cargo` and `rustc` are **not installed**, so choosing Tauri would
   have meant a multi-GB prerequisite before the first build.

The cost is size: ~122 MB against Tauri's ~10. For a game already shipping a
1.4 MB Phaser bundle, 123 MP3s and a 800 KB font, that is the right trade.

**One thing that needed no work at all:** `vite.config.ts:8` already sets
`base: './'` for Capacitor. The classic Electron packaging failure is a Vite
build with the default `base: '/'`, whose absolute asset URLs resolve against
the filesystem root under `file://` and 404 every chunk — a build that is
perfectly green and a window that is perfectly blank. Two shipping targets now
depend on that line and **neither fails at build time if it is removed**, so do
not "tidy" it away.

## The rename that fails — read this before moving the output back

`directories.output` is `../release`, outside the project folder. Moving it back
to `NewVersion/release` will break the build on any machine with a dev server
running, in a way that looks like a permissions bug.

**What happens.** electron-builder extracts Electron to `win-unpacked.tmp` and
renames it into place. With `npm run dev` up, that rename fails:

```
⨯ EPERM: operation not permitted, rename '...\win-unpacked.tmp' -> '...\win-unpacked'
```

**Why.** Vite's dev server watches the project recursively, and on Windows a
watch holds a handle to every directory it covers. A directory containing a
watched subdirectory cannot be renamed.

**Driven, not guessed** — the diagnosis took four experiments, and the first
three all pointed the wrong way:

| probe | result |
|---|---|
| rename an **empty** dir under `release/` | **OK** — so not a blanket permission problem |
| rename a dir holding only **files** | **OK** — content alone is not the issue |
| rename a dir holding a **subdirectory** | **DENIED** |
| the same, on `C:` and elsewhere on `F:` | **OK** — so not the volume |
| every file inside, opened `FileShare.None` | **not locked** — so not a file handle |
| the same rename with the sandbox disabled | **still denied** — so not the tooling |

Only then did `Get-CimInstance Win32_Process` show a `vite.js` running from this
project. The tell was the *shape* of the failure, not the error text: EPERM on a
directory whose files are all unlocked is a directory-handle problem, and a
recursive watcher is the thing that holds those.

Writing one level up puts the output where no watcher is looking, so the build
no longer depends on whether anyone has `npm run dev` open. **Do not solve this
by killing the dev server** — the point is that the build should not care.

## What is deliberately not done

- **No code signing.** `electron-builder` logs `signing with signtool.exe`, but
  that is signing with no certificate: the artefacts are **unsigned**, and
  Windows SmartScreen will warn the first time anyone but the builder runs
  them. Fixing it needs a purchased code-signing certificate — a purchasing
  decision, not a build one. Until then, expect *"Windows protected your PC" →
  More info → Run anyway* on a fresh machine.
- **Windows x64 only.** `electron-builder --win` builds for this platform.
  macOS and Linux targets are one line each in `electron-builder.yml`, but a
  macOS build needs a Mac to sign and notarise on, so it is not a config-only
  change.
- **No auto-update.** `electron-updater` would need a release host and signed
  builds. Neither exists yet.
- **No preload script, and none wanted.** `nodeIntegration` is off and
  `contextIsolation` is on. The game is ordinary web code that has never had
  Node access, so there is nothing to bridge; adding a preload would create the
  attack surface its absence avoids.

## Two names, still inconsistent

`index.html` says **Circle Defense**, the package is `circle-defense`, and the
menu's own wordmark, the executable and the installer all say **Circular Tank**.

`electron/main.cjs` pins the *window* title so the taskbar entry matches the
thing the player launched, but **the underlying inconsistency is untouched** —
the web build's browser tab still reads "Circle Defense". Settling it is a
naming decision and is left open deliberately rather than resolved in passing.

## The icon

`electron/icon.ico` is **generated**, by `scripts/gen-desktop-icon.mjs` — pure
Node, no dependencies, and committed rather than built on demand, because a
build step that generates its own inputs fails differently on a clean clone.

There is no square source to crop: the tank is SVG shapes assembled at runtime
and the one authored raster is a wide menu wallpaper, so rasterising would mean
adding `sharp` or `resvg` to the toolchain for a single 256px image. The script
draws the tank from overhead instead — hull ring, turret, barrel — in the menu's
palette.

Note the ICO directory entry stores width and height as **0**, which means 256.
That is the format, not a placeholder; the older BMP form cannot express 256×256
at all.

## What `desktop:smoke` covers, and what it does not

It launches the **real packaged executable** and fails on: the app not starting,
no window, any uncaught page error, any console error, the main menu not
rendering, or a canvas that is missing or zero-sized.

The canvas is checked separately from the menu **because they fail apart**: the
menu is React DOM and renders whether or not WebGL came up, so a packaged build
with a dead renderer shows a working menu over a canvas of nothing. Asking for
both is what distinguishes them.

It does **not** cover gameplay, input, audio, or anything visual beyond "a
canvas of non-zero size exists". It is the desktop counterpart of `npm run
smoke` — a boot check, not a test.
