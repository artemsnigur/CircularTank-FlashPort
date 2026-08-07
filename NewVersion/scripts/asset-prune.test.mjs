import { describe, expect, it } from 'vitest';

import { orphanedFiles, plannedWrites } from './lib/asset-prune.mjs';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const SVG = ['.svg'];

/**
 * Every case below is a **pair**, driven on one input.
 *
 * A prune is two claims that fail in opposite directions: "the stale file goes"
 * and "the live file stays". Asserted apart, `() => []` satisfies the second
 * and `() => everything` satisfies the first, and each reads as a passing test.
 * So each `it` asserts both halves of one scenario.
 */

describe('prune / preserve', () => {
  it('removes what the run would not write and keeps what it would', () => {
    const extracted = ['351.png', '353.png'];
    const authored = [];
    const dest = ['351.png', '353.png', '351_upscale.png'];

    const planned = plannedWrites(extracted, authored, null);
    const orphans = orphanedFiles(dest, planned, IMAGE_EXTS);

    // Goes: nothing produces it any more.
    expect(orphans).toEqual(['351_upscale.png']);
    // Stays: both live files survive. Without this, "delete everything" passes.
    expect(orphans).not.toContain('351.png');
    expect(orphans).not.toContain('353.png');
  });

  it('prunes nothing when the destination already matches', () => {
    const planned = plannedWrites(['1.svg', '3.svg'], [], null);
    expect(orphanedFiles(['1.svg', '3.svg'], planned, SVG)).toEqual([]);
  });

  it('leaves files it does not own alone', () => {
    // Restricted to the group's extensions, so a prune cannot reach something
    // another tool put in the same folder.
    const planned = plannedWrites(['351.png'], [], null);
    const orphans = orphanedFiles(['351.png', '.DS_Store', 'notes.txt'], planned, IMAGE_EXTS);
    expect(orphans).toEqual([]);
  });
});

describe('the authored overlay', () => {
  /**
   * The failure the BACKLOG entry warns about by name: *"a naive 'delete
   * anything not in the source' would remove the authored ones every run."*
   *
   * Both halves on one input — a shadowing authored file and a standalone one.
   * Drop either and a wrong implementation passes: keeping only shadowing files
   * satisfies the first, keeping only standalone ones satisfies the second.
   */
  it('keeps authored files whether or not they shadow an extracted one', () => {
    const extracted = ['351.png'];
    const authored = ['351.png', '351_upscale.webp'];
    const dest = ['351.png', '351_upscale.webp', 'gone.png'];

    const planned = plannedWrites(extracted, authored, null);
    const orphans = orphanedFiles(dest, planned, IMAGE_EXTS);

    // The shadowing one survives...
    expect(orphans).not.toContain('351.png');
    // ...and so does the one with no extracted counterpart.
    expect(orphans).not.toContain('351_upscale.webp');
    // ...while the genuinely dead file still goes, so this is not just
    // "nothing is ever pruned".
    expect(orphans).toEqual(['gone.png']);
  });

  it('prunes an authored file once it is removed from assets-authored', () => {
    // The re-encode case: the .png was replaced by a .webp, so the .png is in
    // neither root any more and must go. Pinned against the .webp staying.
    const planned = plannedWrites(['351.png'], ['351_upscale.webp'], null);
    const orphans = orphanedFiles(
      ['351.png', '351_upscale.png', '351_upscale.webp'],
      planned,
      IMAGE_EXTS,
    );
    expect(orphans).toEqual(['351_upscale.png']);
    expect(orphans).not.toContain('351_upscale.webp');
  });
});

describe('the curated set', () => {
  /**
   * **The gap `registry.test.ts:218` cannot see.** A shape dropped from
   * `CURATED_SHAPES` is still present in `SWFimported/shapes/`, so it is not a
   * stray by that test's definition — and the eager glob keeps bundling it.
   *
   * Both halves on one input: a curated shape stays, a de-curated one goes.
   * Dropping either lets "curated is ignored" or "everything is pruned" pass.
   */
  it('keeps curated shapes and prunes ones no longer curated', () => {
    const extracted = ['1.svg', '3.svg', '999.svg'];
    const curated = new Set(['1.svg', '3.svg']);
    const dest = ['1.svg', '3.svg', '999.svg'];

    const planned = plannedWrites(extracted, [], curated);
    const orphans = orphanedFiles(dest, planned, SVG);

    expect(orphans).toEqual(['999.svg']);
    expect(orphans).not.toContain('1.svg');
    expect(orphans).not.toContain('3.svg');
  });

  it('keeps every extracted shape when the group is not curated', () => {
    // `--all` passes null, and the same destination must then survive intact —
    // the counterpart to the case above on the identical input.
    const extracted = ['1.svg', '3.svg', '999.svg'];
    const planned = plannedWrites(extracted, [], null);
    expect(orphanedFiles(['1.svg', '3.svg', '999.svg'], planned, SVG)).toEqual([]);
  });

  it('never lets the curated filter drop an authored shape', () => {
    // The curated set is an *extraction* filter. An authored shape is written
    // regardless, so it must not be pruned for being absent from it.
    const planned = plannedWrites(['1.svg'], ['custom.svg'], new Set(['1.svg']));
    expect(orphanedFiles(['1.svg', 'custom.svg'], planned, SVG)).toEqual([]);
  });
});
