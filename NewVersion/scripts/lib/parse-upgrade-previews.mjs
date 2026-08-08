/**
 * Parses the shop's stat-preview lines out of `ScreenUpgrades.changeContent()`.
 *
 * Split from the generator so the parser can be driven directly by tests
 * against real AS3 text, without writing a file.
 *
 * ── What these lines are ──────────────────────────────────────────────────
 * **Not descriptions.** `ScreenUpgrades.as` has no description table; the shop
 * shows *computed* stat previews, assembled inline from the same upgrade tracks
 * `gen-upgrades.mjs` already extracts. `BACKLOG`'s "data absent too" was
 * misleading: the numbers are present, the *formatting* is what is missing.
 *
 * A line looks like one of:
 *
 *   infoText1.text = "Max Speed: " + T[lvl] * 30 + " PX/Sec";
 *   infoText1.text = "Damage: " + T[lvl-1] + " HP" + "  " + T[lvl];
 *
 * The second shape is the *preview*: current level, then the value the next
 * level would give. Misc upgrades show one value, weapons and secondaries two.
 *
 * ── The index convention is already solved ────────────────────────────────
 * `T[lvl]` against `T[lvl - 1]` is the same split `gen-upgrades.mjs:12-22`
 * documents and `UpgradeSpec.statsIncludeLevelZero` encodes, citing
 * `Tank.as:64`: an 11-entry track is indexed by level directly, a 10-entry one
 * by `level - 1`. This parser records which form each expression used and the
 * consumer resolves it through the existing flag rather than re-deriving it.
 */

/** The six transforms the whole block uses. Order matters — see `classify`. */
const TRANSFORMS = [
  // `Math.round(v * 3000) / 100` — a per-frame damage read as per-second, 2dp.
  { kind: 'damagePerSecond', test: /Math\.round\([^)]*\* 3000\) \/ 100/ },
  // `Math.round(v * 100)` — a 0..1 fraction as a percentage.
  { kind: 'percent', test: /Math\.round\([^)]*\* 100\)/ },
  // `Math.round(v / 0.3) / 100` — frames to seconds, 2dp.
  { kind: 'seconds2', test: /Math\.round\([^)]*\/ 0\.3\) \/ 100/ },
  // `Math.round(v / 3) / 10` — frames to seconds, 1dp.
  { kind: 'seconds1', test: /Math\.round\([^)]*\/ 3\) \/ 10/ },
  // `v * 30` — a per-frame distance read as per-second. Checked after 3000.
  { kind: 'perSecond', test: /\]\s*\* 30(?!\d)/ },
];

/**
 * Which transform an expression applies.
 *
 * `damagePerSecond` is tested before `perSecond` because `* 3000` contains
 * `* 30`, and `percent` before `seconds2` because both start `Math.round(`.
 * Getting that order wrong mislabels silently rather than failing, which is why
 * the order is stated here and pinned by test.
 */
function classify(expression) {
  for (const { kind, test } of TRANSFORMS) {
    if (test.test(expression)) return kind;
  }
  return 'raw';
}

const CATEGORY_BY_SELECTOR = {
  selectedMisc: 'misc',
  selectedWeapon: 'primary',
  selectedSecondary: 'secondary',
};

/**
 * Every stat-preview assignment, with the upgrade it belongs to.
 *
 * Attribution is by enclosing `if (selectedX == N)` guard, tracked on a brace
 * stack — the assignments carry no upgrade name themselves, so the guard is the
 * only thing that says which upgrade a line describes.
 *
 * @param {string} source the full text of ScreenUpgrades.as
 * @param {{ from: number, to: number }} range 1-based line bounds to scan
 */
export function parseUpgradePreviews(source, range) {
  const lines = source.split('\n');
  const out = [];
  /** @type {{ category: string, index: number, depth: number }[]} */
  const guards = [];
  let depth = 0;

  for (let i = range.from - 1; i < Math.min(range.to, lines.length); i += 1) {
    const line = lines[i];

    // A guard opens on the line *before* its brace, so record it and let the
    // brace counting below associate it with the block that follows.
    const guard = /(?:else )?if\((selected(?:Misc|Weapon|Secondary)) == (\d+)\)/.exec(line);
    if (guard) {
      // `entered` exists because the decompiler puts the opening brace on the
      // *next* line. At push time the depth is still the enclosing one, so a
      // pop test would fire immediately and orphan every assignment inside —
      // which it did, leaving all 158 rows unattributed. The guard only becomes
      // poppable once the body has actually been entered.
      guards.push({
        category: CATEGORY_BY_SELECTOR[guard[1]],
        index: Number(guard[2]),
        depth,
        entered: false,
      });
    }

    const assignment = /infoText(\d)\.text = (.+);\s*$/.exec(line);
    if (assignment) {
      const slot = Number(assignment[1]);
      const expression = assignment[2];
      const active = guards[guards.length - 1];

      // `infoTextN.text = ""` clears a slot the current upgrade does not use.
      // Kept rather than skipped: "this upgrade has no fourth line" is a fact
      // the renderer needs, and dropping it would leave a stale line on screen.
      const strings = [...expression.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
      const isClear = expression.trim() === '""';

      // **Three** index forms, not two, and they encode which branch the line
      // is in — so capturing the offsets removes any need to track the
      // `if (level != 0)` / `else` structure separately:
      //
      //   [level - 1]  the current level's value   (owned)
      //   [level]      the next level's value      (owned, the preview half)
      //   [level + 1]  the next level's value      (**not owned**, where the
      //                current level is 0 and there is nothing to show yet)
      //
      // `+ 1` appears 4 times and was missed by the first version of this
      // regex, which only allowed `- 1`. It is rare enough to have looked like
      // a parse failure rather than a third case.
      const reads = [
        ...expression.matchAll(/\[levels\w*\[[^\]]*\](\s*([+-])\s*1)?\]/g),
      ].map((m) => (m[2] === '-' ? -1 : m[2] === '+' ? 1 : 0));
      const track = /\]\[(\d+)\]\[/.exec(expression);

      // **Measurement scaffolding, not a display line.** The block assigns the
      // bare label, reads `infoTextN.length` to size a column, then assigns the
      // real value on the next line:
      //
      //   infoText1.text = "Max Speed: ";
      //   infoText1Length = infoText1.length;
      //   infoText1.text = "Max Speed: " + ... ;
      //
      // Both assignments match, and taking the first as real would emit a
      // label with no value. Identified by shape — a lone string literal with
      // no concatenation — rather than by looking ahead, so a reordering of the
      // idiom cannot slip past.
      const isScaffold = !isClear && strings.length === 1 && !expression.includes('+');
      if (isScaffold) continue;

      out.push({
        line: i + 1,
        category: active?.category ?? null,
        upgradeIndex: active?.index ?? null,
        slot,
        label: isClear ? null : (strings[0] ?? null),
        // Trailing literals after the first are the unit(s) and separators.
        units: isClear ? [] : strings.slice(1),
        track: track ? Number(track[1]) : null,
        transform: isClear ? null : classify(expression),
        // Two reads means current *and* next — the preview shape.
        readOffsets: reads,
        showsNext: reads.length > 1,
        // A literal `+ 0 +` rather than a table read: a weapon whose value is
        // fixed at zero. Recorded so it is not mistaken for a parse failure.
        literal: !isClear && reads.length === 0,
        clears: isClear,
        raw: expression,
      });
    }

    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;

    const top = guards[guards.length - 1];
    if (top && !top.entered && depth > top.depth) top.entered = true;
    while (guards.length > 0 && guards[guards.length - 1].entered && depth <= guards[guards.length - 1].depth) {
      guards.pop();
    }
  }

  return out;
}
