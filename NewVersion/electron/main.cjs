/**
 * The desktop shell — Electron's main process.
 *
 * ── Why Electron and not Tauri ────────────────────────────────────────────
 * Tauri renders in the machine's *own* WebView2, so what the player sees
 * depends on a component this project does not ship or version. That is the
 * exact shape of failure `CLAUDE.md` collects under "a desktop-only visual
 * pass proves nothing about mobile" — a renderer difference that is invisible
 * where you test and total where you ship. Electron carries its own Chromium,
 * so the desktop build draws with the engine every visual decision in this
 * port was checked against.
 *
 * The other half is the toolchain: Tauri needs Rust and the MSVC build tools,
 * several GB of new dependency for a repo that is otherwise pure Node. The
 * cost of choosing Electron is size — a ~200 MB install against Tauri's ~10 —
 * which is the right trade for a game that already ships a Phaser bundle and
 * 123 MP3s.
 *
 * ── `file://` works because `base` was already relative ───────────────────
 * The classic packaging failure is a Vite build with the default `base: '/'`,
 * whose absolute asset URLs resolve against the filesystem root under
 * `file://` and 404 every chunk. `vite.config.ts:8` already sets `base: './'`
 * for Capacitor, so this needed no build change — but do not "tidy" that line
 * away: two shipping targets depend on it and neither fails at build time.
 *
 * ── The window is not a browser window ────────────────────────────────────
 * `nodeIntegration` is off and `contextIsolation` is on, which is Electron's
 * default and is kept explicit here because it is load-bearing rather than
 * incidental: the game is ordinary web code that has never had Node access,
 * so there is nothing to grant and every reason not to. There is deliberately
 * no preload script — adding one would create the bridge this comment is
 * explaining the absence of.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

/** Vite's output, which `npm run build` puts beside this folder. */
const INDEX = path.join(__dirname, '..', 'dist', 'index.html');

/**
 * Set by `npm run desktop:dev`, which points the shell at the Vite dev server
 * instead of the built files so the desktop window gets hot reload.
 */
const DEV_SERVER = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const win = new BrowserWindow({
    // The game is 640 design units wide and scales to whatever it is given
    // (`docs/SCALING.md`), so this is a comfortable starting frame rather than
    // a required size. 16:10 keeps the logical height near the middle of the
    // 400-1440 range the viewport maths clamps to, rather than at either
    // extreme where the two known camera-size defects lived.
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    backgroundColor: '#0b0d12',
    // No flash of white before the first frame: the window is created hidden
    // and shown once the renderer has something to draw.
    show: false,
    title: 'Circular Tank',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  /*
   * The window keeps the title set above.
   *
   * By default Electron mirrors the page's `<title>`, and the two disagree:
   * `index.html` says "Circle Defense" while the executable, the installer and
   * the wordmark on the menu all say "Circular Tank". That produced a taskbar
   * entry named differently from the thing the player launched.
   *
   * Pinned here rather than by editing `index.html`, because that title is
   * also the browser tab for the web build and changing it is a naming
   * decision, not a packaging one. **The two names are still inconsistent in
   * the repo** — this only stops the desktop window from showing the mismatch.
   */
  win.on('page-title-updated', (event) => event.preventDefault());

  // An external link opens in the player's browser, not in a chromeless
  // Electron window with no address bar and no way back.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_SERVER) {
    void win.loadURL(DEV_SERVER);
  } else {
    void win.loadFile(INDEX);
  }

  return win;
}

/*
 * A second launch focuses the running game rather than starting another copy.
 * Two instances would both write the same save keys, and the loser's writes
 * would be silently overwritten — the desktop equivalent of the two-tab
 * problem, except a player has no reason to expect it here.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  void app.whenReady().then(() => {
    createWindow();

    // macOS keeps the app alive with no windows; re-create on dock click.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Windows and Linux quit with the last window. macOS does not, by convention.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
