/**
 * Installs the version-controlled git hooks into `.git/hooks`.
 *
 * ── Why copy rather than point `core.hooksPath` at them ───────────────────
 * `core.hooksPath` resolves inside the working tree, so the hooks only exist on
 * branches that contain them. That breaks the one guard that matters most: a
 * hook refusing commits on `main` is absent on `main`, because `.husky/` is
 * committed on `develop` and not there. It was tested and it let two probe
 * commits straight through.
 *
 * Copying into `.git/hooks` puts them outside the working tree, so they survive
 * every branch switch — while the source of truth stays committed, which is the
 * property native `.git/hooks` alone cannot give ("protected on my machine
 * only" is the failure this whole exercise exists to stop).
 *
 * Runs from `prepare`, so `npm install` on a fresh clone wires it up.
 * Re-running is safe and idempotent.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, '../.husky');
const REPO_ROOT = resolve(HERE, '../..');

/** Ask git where the hooks live rather than assuming `.git/hooks`. */
function hooksDir() {
  const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  return resolve(REPO_ROOT, gitDir, 'hooks');
}

function main() {
  if (!existsSync(SOURCE)) {
    console.warn(`[hooks] ${SOURCE} is missing; nothing to install.`);
    return;
  }

  // A leftover hooksPath from an earlier attempt would silently win over the
  // copies below, so clear it. `|| true` — it is fine if it was never set.
  try {
    execFileSync('git', ['config', '--unset', 'core.hooksPath'], { cwd: REPO_ROOT });
  } catch {
    /* not set; nothing to undo */
  }

  const target = hooksDir();
  mkdirSync(target, { recursive: true });

  const installed = [];
  for (const name of readdirSync(SOURCE)) {
    if (name.startsWith('.')) continue;
    const to = join(target, name);
    copyFileSync(join(SOURCE, name), to);
    // Git skips a hook that is not executable, and does so silently — which is
    // how the first version of this appeared to work while doing nothing.
    chmodSync(to, 0o755);
    installed.push(name);
  }

  console.log(`[hooks] installed ${installed.join(', ')} -> ${target}`);
}

main();
