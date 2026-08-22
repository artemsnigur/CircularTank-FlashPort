/**
 * Runs the game in the Electron shell against the Vite dev server.
 *
 * Without this, `electron/main.cjs`'s `VITE_DEV_SERVER_URL` branch would have
 * no caller — a branch nothing reaches, which is the shape this project keeps
 * finding on the wrong end of a green test suite. This is that caller.
 *
 * Why it waits for the URL rather than sleeping: Vite picks a different port
 * when the default is taken, and the reviewer who ends up talking to a stale
 * process on 5173 is a documented failure here. The port is read from what
 * Vite actually prints, never assumed.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';

/** Vite's "Local:   http://host:port/" line, whatever port it settled on. */
const URL_PATTERN = /(https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+\/?)/;

const vite = spawn('npm', ['run', 'dev'], {
  shell: true,
  stdio: ['ignore', 'pipe', 'inherit'],
});

let electron = null;
let buffered = '';

function shutdown(code) {
  if (electron !== null && electron.exitCode === null) electron.kill();
  if (vite.exitCode === null) vite.kill();
  process.exit(code ?? 0);
}

vite.stdout.on('data', (chunk) => {
  const text = String(chunk);
  process.stdout.write(text);
  if (electron !== null) return;

  buffered += text;
  const match = URL_PATTERN.exec(buffered);
  if (match === null) return;

  const url = match[1];
  console.log(`\n[desktop] launching Electron against ${url}\n`);

  electron = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron', '.'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: url },
  });

  // Closing the game window ends the session — leaving the Vite server behind
  // is the orphaned-process trap this repo has hit three times in one sitting.
  electron.on('exit', (code) => shutdown(code ?? 0));
});

vite.on('exit', (code) => shutdown(code ?? 0));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
