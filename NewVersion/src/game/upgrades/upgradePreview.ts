/**
 * The shop's stat-preview lines — `ScreenUpgrades.changeContent()`.
 *
 * Pure functions over the extracted table (`upgradePreviewData.ts`) and an
 * upgrade's own stat tracks. Separate from the render so the arithmetic can be
 * driven without a DOM, which matters here because the arithmetic is the part
 * with the traps in it.
 *
 * ── Which index is "current" ──────────────────────────────────────────────
 * The AS3 reads `track[level - 1]` for the value the player has and
 * `track[level]` for what the next level would give — **except** where the
 * track carries a level-0 baseline, when it is `track[level]` and
 * `track[level + 1]`.
 *
 * That is not a second rule: it is `UpgradeSpec.statsIncludeLevelZero`, already
 * derived by `gen-upgrades.mjs:12-22` from the track's length and documented
 * there against `Tank.as:64`. Only `upgradeArraySpeed` is like this, which is
 * why an implementation that ignores the flag looks correct on 27 of the 28
 * upgrades.
 */
import { UPGRADE_PREVIEWS } from './upgradePreviewData';
import type { PreviewSpec, PreviewTransform } from './upgradePreviewData';
import type { UpgradeSpec } from './upgradeData';

/** The AS3 runs at 30 fps — the divisor behind every per-second figure. */
const AS3_FPS = 30;

/**
 * The six arithmetic shapes, transcribed from the expressions they came from.
 *
 * Written as the AS3 writes them rather than simplified: `Math.round(v / 0.3) /
 * 100` and `Math.round(v / 3) / 10` are both "frames to seconds", but they
 * round to two places and one, and collapsing them would silently change what
 * the shop prints.
 */
const TRANSFORMS: Record<PreviewTransform, (value: number) => number> = {
  raw: (v) => v,
  // `v * 30` — a per-frame distance shown per second.
  perSecond: (v) => v * AS3_FPS,
  // `Math.round(v * 100)` — a 0..1 fraction as a percentage.
  percent: (v) => Math.round(v * 100),
  // `Math.round(v / 3) / 10` — frames to seconds, one decimal.
  seconds1: (v) => Math.round(v / 3) / 10,
  // `Math.round(v / 0.3) / 100` — frames to seconds, two decimals.
  seconds2: (v) => Math.round(v / 0.3) / 100,
  // `Math.round(v * 3000) / 100` — per-frame damage shown per second.
  damagePerSecond: (v) => Math.round(v * 3000) / 100,
};

export function applyTransform(kind: PreviewTransform, value: number): number {
  return TRANSFORMS[kind](value);
}

/**
 * The track index holding the value the player currently has.
 *
 * `-1` when nothing is owned yet and the track has no level-0 baseline: there
 * is no current value, only a preview of the first one.
 */
export function currentIndex(level: number, statsIncludeLevelZero: boolean): number {
  return statsIncludeLevelZero ? level : level - 1;
}

/**
 * The spec for one slot of one upgrade — the per-upgrade override if there is
 * one, otherwise the category default, otherwise nothing.
 *
 * `:1019` against `:1023` is the shape: the Flamethrower overrides slot 1 to
 * show damage per second, and every other primary falls through to the default
 * that shows it flat. A lookup that only read the defaults would print the
 * wrong unit for one weapon in twelve; one that only read the overrides would
 * print nothing for the other eleven.
 */
export function specFor(
  category: 'misc' | 'primary' | 'secondary',
  upgradeIndex: number,
  slot: number,
): PreviewSpec | null {
  const override = UPGRADE_PREVIEWS.find(
    (s) => s.category === category && s.upgradeIndex === upgradeIndex && s.slot === slot,
  );
  if (override) return override;

  return (
    UPGRADE_PREVIEWS.find(
      (s) => s.category === category && s.upgradeIndex === null && s.slot === slot,
    ) ?? null
  );
}

const trim = (value: number): string => String(Number(value.toFixed(4)));

/**
 * One rendered line, or `''` when this slot shows nothing for this upgrade.
 *
 * **The empty string is a real result, not a failure.** The AS3 assigns `""` to
 * clear a slot the current upgrade does not use, and a renderer that skipped it
 * would leave the previous upgrade's line on screen when the player clicked
 * along the shop.
 */
export function previewLine(
  upgrade: UpgradeSpec,
  category: 'misc' | 'primary' | 'secondary',
  upgradeIndex: number,
  slot: number,
  level: number,
): string {
  const spec = specFor(category, upgradeIndex, slot);
  if (!spec) return '';

  const track = upgrade.stats[spec.track];
  if (!track) return '';

  const current = currentIndex(level, upgrade.statsIncludeLevelZero);
  const next = current + 1;

  const show = (index: number): string | null => {
    const raw = track[index];
    if (raw === undefined) return null;
    return trim(applyTransform(spec.transform, raw));
  };

  // Not owned: there is no current value, so the AS3 shows the first level's
  // figure alone — and for Shield, with a different unit. See `unitUnowned`.
  if (current < 0) {
    const preview = show(next);
    if (preview === null) return '';
    return `${spec.label}${preview}${spec.unitUnowned ?? spec.unit}`;
  }

  const now = show(current);
  if (now === null) return '';

  // Maxed: nothing left to preview, so only the current figure is printed.
  const then = show(next);
  if (then === null) return `${spec.label}${now}${spec.unit}`;

  return `${spec.label}${now}${spec.unit}  ${then}`;
}

/** All five lines for an upgrade, in slot order. */
export function previewLines(
  upgrade: UpgradeSpec,
  category: 'misc' | 'primary' | 'secondary',
  upgradeIndex: number,
  level: number,
): string[] {
  return [1, 2, 3, 4, 5].map((slot) =>
    previewLine(upgrade, category, upgradeIndex, slot, level),
  );
}
