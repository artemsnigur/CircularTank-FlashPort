/**
 * The shop tooltip text — `ButtonUpgradeInfo.as`, extracted by
 * `scripts/gen-upgrade-descriptions.mjs`.
 */
import { describe, expect, it } from 'vitest';

import { UPGRADE_DESCRIPTIONS } from './upgradeDescriptionData';

describe('the extracted descriptions', () => {
  /**
   * The count is stated, not derived from the array, so a parse that silently
   * drops a guard shape fails here rather than shrinking quietly. 4 misc, 12
   * primary and 12 secondary — the shop's own three sections.
   */
  it('covers every upgrade', () => {
    const byCategory = UPGRADE_DESCRIPTIONS.reduce<Record<string, number>>(
      (acc, d) => ({ ...acc, [d.category]: (acc[d.category] ?? 0) + 1 }),
      {},
    );
    expect(byCategory).toEqual({ misc: 4, primary: 12, secondary: 12 });

    for (const category of ['misc', 'primary', 'secondary'] as const) {
      const indices = UPGRADE_DESCRIPTIONS.filter((d) => d.category === category)
        .map((d) => d.index)
        .sort((a, b) => a - b);
      // 1-based and contiguous, as the AS3 selectors are.
      expect(indices, category).toEqual(
        Array.from({ length: indices.length }, (_, i) => i + 1),
      );
    }
  });

  /**
   * **The escape bug, pinned.** The first extraction unescaped `\'` and not
   * `\n`, so the shop rendered `...towards the crosshair.\nThe ice grenade...`
   * with a visible backslash. Nothing in typecheck, lint or the suite could
   * see it — the string was valid, just wrong — and it took a frame from
   * `npm run look --tooltips` to find.
   *
   * Driven as a pair, because "no backslashes anywhere" is also satisfied by an
   * extraction that stripped the line breaks instead of converting them:
   * the negative is worthless without the positive beside it.
   */
  it('has real line breaks, not literal backslash-n', () => {
    const withLiteral = UPGRADE_DESCRIPTIONS.filter((d) => d.text.includes('\\'));
    expect(withLiteral.map((d) => `${d.category} ${d.index}`)).toEqual([]);

    // The counterpart: the breaks survived as breaks.
    const multiline = UPGRADE_DESCRIPTIONS.filter((d) => d.text.includes('\n'));
    expect(multiline.length).toBeGreaterThan(0);
    expect(
      UPGRADE_DESCRIPTIONS.find((d) => d.category === 'primary' && d.index === 4)?.text,
    ).toBe('Shoots fire.\nThe fire does damage to every enemy it touches.');
  });

  it('has no empty or untrimmed text', () => {
    for (const d of UPGRADE_DESCRIPTIONS) {
      expect(d.text.trim(), `${d.category} ${d.index}`).toBe(d.text);
      expect(d.text.length).toBeGreaterThan(0);
    }
  });
});
