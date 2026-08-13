/**
 * Every gameplay option must have a reader — the mechanism T140 was missing.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * `crosshair` shipped for months as a fully working *preference*: persisted
 * under the AS3 key, shown on the options screen, toggled, saved, republished —
 * and read by nothing. `GameplayScene` drew the reticle with `setVisible(true)`.
 * Every test of the option module passed, because every one of them was about
 * storage.
 *
 * That is this repo's signature failure (`CLAUDE.md`, "a green unit test says
 * nothing about the wiring") in its purest form: the rule was right, the seam
 * was absent. `autoPause` sat in the same state until T127, and `windowUL` sat
 * in it from the start.
 *
 * ── What this proves, and what it does not ────────────────────────────────
 * **It proves a spelling.** It scans `src/` for a property read of each option
 * on one of the two channels that carry them, and requires one to exist. It
 * cannot see whether that read reaches a render, whether the branch behind it
 * is reachable, or whether the value is used the right way round —
 * `crosshairVisibility.test.ts` is what drives the rule itself.
 *
 * What it does catch is the whole-option no-show, which is the failure that
 * actually happened, twice.
 *
 * A future consumer written in a shape neither regex knows — destructuring,
 * say — fails this test rather than passing it. That is the intended
 * direction: a loud failure asking for the pattern to be added beats a silent
 * pass.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_GAMEPLAY_OPTIONS } from './gameplayOptions';

const SRC = join(process.cwd(), 'src');

/**
 * Options with no reader *by design*, each with the decision that made it so.
 *
 * Adding a key here is a deliberate act: it says the setting governs nothing
 * and the project knows why.
 */
const DELIBERATELY_UNREAD: Record<string, string> = {
  // Divergence `A11`: "UL" is Upgrade Limit, and per-level upgrade limits are
  // not enforced. The key is kept so an existing player's stored value is not
  // orphaned; its row is gone from the options screen.
  windowUL: 'A11 — upgrade limits are not enforced; the key is kept for save compatibility',
};

/** Every `.ts`/`.tsx` under `src/`, excluding tests and the options module. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
    // The options module declares and stores them; reading one there is not
    // consuming it. Excluded so the test cannot be satisfied by its own source.
    if (path.includes(join('src', 'game', 'options'))) continue;
    out.push(path);
  }
  return out;
}

/**
 * The two channels an option actually travels on, and nothing else:
 *
 *  - `readGameplayOptions(store).<key>` — the scene side, read from the save.
 *  - `gameplayOptions.<key>` — the React side, off the store mirror that
 *    `options:changed` feeds.
 *
 * Deliberately narrow. A bare `.autoSelect` would also match `LevelGuide`'s
 * unrelated field of the same name and report a dead option as live.
 */
const CHANNELS = [
  // One level of nesting is required, not optional: every real call site reads
  // `readGameplayOptions(getOptionsStore(this)).key`, so a `[^)]*` argument
  // matcher stops at the inner bracket and finds nothing. It did exactly that
  // on the first run of this file, and the instrument check below is what said
  // so — keep both.
  /readGameplayOptions\((?:[^()]|\([^()]*\))*\)\s*\.\s*(\w+)/g,
  /gameplayOptions\s*\.\s*(\w+)/g,
];

function consumedKeys(root: string = SRC): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, 'utf8');
    for (const channel of CHANNELS) {
      for (const [, key] of text.matchAll(channel)) {
        if (!key) continue;
        found.set(key, [...(found.get(key) ?? []), file]);
      }
    }
  }
  return found;
}

describe('every gameplay option is read somewhere', () => {
  const consumed = consumedKeys();
  const keys = Object.keys(DEFAULT_GAMEPLAY_OPTIONS);

  it.each(keys.filter((key) => !(key in DELIBERATELY_UNREAD)))(
    '`%s` has at least one reader outside the options module',
    (key) => {
      expect(consumed.get(key) ?? []).not.toHaveLength(0);
    },
  );

  it('finds nothing for the options that are unread on purpose', () => {
    // The counterpart, and the reason the list above is not just a mute button:
    // if `windowUL` ever gains a reader, this fails and the exemption has to be
    // removed rather than sitting there stale. A test that only skipped them
    // could never notice.
    for (const key of Object.keys(DELIBERATELY_UNREAD)) {
      expect(consumed.get(key) ?? []).toHaveLength(0);
    }
  });

  /**
   * **The negative control**, and the reason the assertions above are not
   * vacuous: the same function over a subtree that reads no options at all must
   * come back empty. Without it, a sweep that silently matched everything —
   * or one whose regex matched the option *names* rather than reads of them —
   * would look identical to a working one.
   *
   * Driven against the real defect too: run over the pre-fix `GameplayScene`
   * this file reports **0** readers for `crosshair` and 1 after, which is what
   * makes it a mechanism rather than a description.
   */
  it('comes back empty over code that reads no options', () => {
    const waves = consumedKeys(join(SRC, 'game', 'waves'));

    expect([...waves.keys()]).toEqual([]);
  });

  it('is actually looking at the right files', () => {
    // The instrument check. A broken path or a regex that matches nothing
    // returns "every option unread", which would fail loudly — but a glob that
    // matched *nothing* would make the exemption test pass for the wrong
    // reason. So: the sweep must see a real file count and a known reader.
    expect(sourceFiles(SRC).length).toBeGreaterThan(100);
    expect(consumed.get('crosshair') ?? []).not.toHaveLength(0);
  });
});
