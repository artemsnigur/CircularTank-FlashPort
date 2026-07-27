/**
 * Does the app actually load?
 *
 * The one question a green suite cannot answer. 1413 unit tests, a clean
 * typecheck, a clean lint and a successful production build were all true while
 * the browser refused to start the app — because "the modules compile" and "the
 * page runs" are different claims, and only the first was ever enforced.
 *
 * So this opens a real headless Chromium, loads the page, and fails on:
 *   - any uncaught page error (the module-graph failure that prompted this)
 *   - any console error
 *   - the main menu not rendering within the timeout
 *
 * That last one matters: `BootScene` failing to hand off produces no error at
 * all — the UI simply shows "Loading" forever. An error-only check would pass.
 *
 * ── It brings its own server ──────────────────────────────────────────────
 * Depending on an already-running dev server would make this untriggerable from
 * a hook, and would inherit the exact failure it exists to catch: a stale
 * orphaned server answering on the port you expected. So it starts its own on a
 * free port and kills it afterwards.
 *
 * Vite is spawned **directly** (`node node_modules/vite/bin/vite.js`) rather
 * than through `npm run dev`. Killing an `npm run` wrapper on Windows leaves the
 * vite child alive holding its port — three orphans were created that way in one
 * session, and one of them served a poisoned cache for forty minutes. No
 * wrapper, no orphan.
 *
 * Usage:
 *   npm run smoke              start a server, smoke it, tear it down
 *   npm run smoke -- --url X   smoke an existing server instead
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const BOOT_TIMEOUT_MS = 20_000;
const SERVER_TIMEOUT_MS = 60_000;

/** Asks the OS for a free port rather than guessing one. */
function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {
      /* not up yet */
    }
    await delay(200);
  }
  return false;
}

async function startServer() {
  const port = await freePort();
  const url = `http://localhost:${port}/`;

  const child = spawn(
    process.execPath,
    [resolve(PROJECT, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'],
    { cwd: PROJECT, stdio: 'ignore' },
  );

  const stop = () => {
    if (!child.killed) child.kill();
  };
  // Covers ctrl-C and an exception below, so a failed run cannot leave a server
  // behind either.
  process.once('exit', stop);
  process.once('SIGINT', () => {
    stop();
    process.exit(130);
  });

  if (!(await waitForServer(url, SERVER_TIMEOUT_MS))) {
    stop();
    throw new Error(`vite did not come up on ${url} within ${SERVER_TIMEOUT_MS / 1000}s`);
  }
  return { url, stop };
}

async function smoke(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // The menu only renders once Boot has handed off and Preload has finished, so
  // waiting for it exercises the whole startup chain, not just the module graph.
  let booted = true;
  try {
    await page
      .getByRole('button', { name: /play|continue/i })
      .waitFor({ timeout: BOOT_TIMEOUT_MS, state: 'visible' });
  } catch {
    booted = false;
  }

  const title = await page.title();
  await browser.close();

  const problems = [];
  if (pageErrors.length > 0) problems.push(`uncaught page errors:\n    ${pageErrors.join('\n    ')}`);
  if (consoleErrors.length > 0) {
    problems.push(`console errors:\n    ${consoleErrors.join('\n    ')}`);
  }
  if (!booted) {
    problems.push(
      `the main menu never rendered within ${BOOT_TIMEOUT_MS / 1000}s — the boot ` +
        'chain stranded, which produces no error of its own',
    );
  }
  return { problems, title };
}

async function main() {
  const urlArg = process.argv.indexOf('--url');
  const external = urlArg !== -1 ? process.argv[urlArg + 1] : null;

  let url = external;
  let stop = () => {};
  if (!external) ({ url, stop } = await startServer());

  try {
    const { problems, title } = await smoke(url);
    if (problems.length > 0) {
      console.error(`[smoke] FAILED against ${url}`);
      for (const p of problems) console.error(`  ${p}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[smoke] ok — loaded "${title}", menu rendered, no errors.`);
  } finally {
    stop();
  }
}

main().catch((error) => {
  console.error('[smoke] threw:', error.message ?? error);
  process.exit(1);
});
