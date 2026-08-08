/**
 * The call-site table, checked against the AS3 it claims to record.
 *
 * ── This is a derivation, not a spelling check ────────────────────────────
 * CLAUDE.md's rule is that a test copying a constant out of the code it tests
 * cannot detect a wrong constant. The corners in `INFO_TEXT_SITES` are exactly
 * that kind of constant — two positional booleans, wrong once already — so they
 * are read back out of `SWFimported/scripts/*.as` here rather than restated.
 *
 * Two argument shapes exist and both are handled:
 *   `changeText(text, false, true)`      — literals, read directly
 *   `changeText(text, right, bottom)`    — locals, resolved from their
 *                                          assignments in the same file
 *
 * The second is the one that matters: `right`/`bottom` map to parameters named
 * `left`/`top` (`:168`), which is where the shop's pair was transcribed wrong.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { INFO_TEXT_SITES, siteCorner } from './infoTextSites';

const AS3 = '../SWFimported/scripts';

const fileCache = new Map<string, string[]>();
function linesOf(file: string): string[] {
  const hit = fileCache.get(file);
  if (hit) return hit;
  const lines = readFileSync(`${AS3}/${file}`, 'utf8').split('\n');
  fileCache.set(file, lines);
  return lines;
}

/**
 * Resolves a `changeText` argument to a boolean.
 *
 * A literal answers itself. A local is resolved by finding every `name = <bool>`
 * assignment in the file and requiring them to agree — if a file ever assigns
 * both values the answer is genuinely ambiguous from here and this throws
 * rather than picking one, which is the honest result.
 */
function resolveArg(file: string, arg: string): boolean {
  if (arg === 'true' || arg === 'false') return arg === 'true';
  const assignments = linesOf(file)
    // `(?::\\s*\\S+)?` for the decompiler's type annotation — the declarations
    // read `var right:* = false;`, and a regex without it matches nothing in
    // `ImageEnemy.as` and reports the argument as unresolvable.
    .map((l) => new RegExp(`(?:^|[^.\\w])${arg}(?::\\s*\\S+)?\\s*=\\s*(true|false)\\s*;`).exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1] === 'true');
  expect(assignments.length, `${file}: no boolean assignment found for \`${arg}\``)
    .toBeGreaterThan(0);
  const distinct = new Set(assignments);
  expect(distinct.size, `${file}: \`${arg}\` is assigned both values — ambiguous`).toBe(1);
  return assignments[0];
}

/** `changeText(<text>, <left>, <top>[, <special>, ...])` at a known line. */
function callAt(source: string): { showLeft: boolean; showTop: boolean; special?: string } {
  const [file, lineNo] = source.split(':');
  const line = linesOf(file)[Number(lineNo) - 1];
  expect(line, `${source} has no such line`).toBeDefined();
  const call = /changeText\((.*)\)\s*;/.exec(line);
  expect(call, `${source} is not a changeText call: ${line?.trim()}`).not.toBeNull();

  // Split on top-level commas only — the text argument contains commas, and one
  // site concatenates (`theText + " Boss"`).
  const args: string[] = [];
  let depth = 0;
  let inString = false;
  let current = '';
  for (const ch of call![1]) {
    if (ch === '"') inString = !inString;
    if (!inString && (ch === '(' || ch === '[')) depth += 1;
    if (!inString && (ch === ')' || ch === ']')) depth -= 1;
    if (ch === ',' && depth === 0 && !inString) {
      args.push(current.trim());
      current = '';
    } else current += ch;
  }
  args.push(current.trim());

  return {
    showLeft: resolveArg(file, args[1]),
    showTop: resolveArg(file, args[2]),
    special: args[3]?.replace(/"/g, ''),
  };
}

describe('every recorded corner matches its AS3 line', () => {
  it.each(INFO_TEXT_SITES.map((s) => [s.source, s] as const))('%s', (_source, site) => {
    const actual = callAt(site.source);
    expect({ showLeft: actual.showLeft, showTop: actual.showTop }).toEqual({
      showLeft: site.showLeft,
      showTop: site.showTop,
    });
    expect(actual.special).toBe(site.special);
  });

  /**
   * The counterpart, and the reason the table above is not self-satisfying:
   * the corners must not all be the same value, or "reads the source" and
   * "returns `false, false` for everything" are indistinguishable.
   */
  it('records more than one corner', () => {
    const corners = new Set(INFO_TEXT_SITES.map((s) => `${s.showLeft}/${s.showTop}`));
    expect(corners.size).toBeGreaterThan(1);
    // The two wired sites specifically disagree on both axes — which is what
    // made the shop's wrong `showTop` survive a screenshot of the other screen.
    expect(siteCorner('ButtonUpgradeInfo.as:163')).toEqual({ showLeft: false, showTop: true });
    expect(siteCorner('Achievement.as:99')).toEqual({ showLeft: true, showTop: false });
  });
});

describe('the table covers the source', () => {
  /**
   * **Says by what method, per CLAUDE.md's vocabulary rule.** This is a name
   * grep for `changeText(`, so it is a floor: a site that inlined the call or
   * reached it through an alias would not be counted. It is still the check
   * that matters here, because a *new* call site appearing and going unrecorded
   * is the drift this table exists to prevent.
   */
  it('records every changeText call found by name in SWFimported/scripts', () => {
    const found: string[] = [];
    for (const file of readdirSync(AS3).filter((f) => f.endsWith('.as'))) {
      linesOf(file).forEach((line, i) => {
        // `PartInfoText.as` declares it; every other hit is a call.
        if (/\.changeText\(/.test(line)) found.push(`${file}:${i + 1}`);
      });
    }
    expect(found.length, 'no call sites found — did the source move?').toBeGreaterThan(0);
    expect([...found].sort()).toEqual([...INFO_TEXT_SITES.map((s) => s.source)].sort());
  });

  it('has the wired sites recorded, and says what the rest wait on', () => {
    const wired = INFO_TEXT_SITES.filter((s) => s.status === 'wired');
    expect(wired.map((s) => s.source)).toEqual([
      'ButtonUpgradeInfo.as:163',
      'IconStrongWeak.as:48',
      'ButtonNextLevel.as:208',
      'Achievement.as:99',
    ]);
    // Every unwired row must carry a reason — a blank note is the "documented
    // in a commit message" failure this table replaces.
    for (const site of INFO_TEXT_SITES) {
      expect(site.note.length, site.source).toBeGreaterThan(20);
    }
  });
});
