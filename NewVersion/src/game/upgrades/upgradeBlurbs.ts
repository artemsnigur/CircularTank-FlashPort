/**
 * One-line blurbs for the shop — a hand-authored layer over the AS3's text.
 *
 * ── Why this is a separate file ───────────────────────────────────────────
 * `upgradeDescriptionData.ts` is **generated** from `ButtonUpgradeInfo.as` by
 * `npm run upgrade-descriptions:data`. Editing it would put hand-written copy
 * in a file whose header says "do not edit by hand", and the next regeneration
 * would silently delete the work. So the original strings stay exactly as
 * extracted, and the short forms live here.
 *
 * That also keeps the AS3 text available. It is the spec for *what each weapon
 * does*, and several of these blurbs are the only reason a rule like "gummy
 * bears get stronger each bounce" is recoverable at a glance — the long
 * version is still one lookup away.
 *
 * ── The rule these follow ─────────────────────────────────────────────────
 * **What it fires, and the one thing that makes it different.** Nothing else.
 * The originals run to six lines and spell out damage multipliers and boss
 * resistances; that belongs in the bestiary and the stat rows, not on a tile
 * you glance at while choosing a loadout.
 *
 * Where a weapon's distinguishing rule genuinely cannot survive compression —
 * the gummy bear's bounce scaling, the magic ball's chain limit — the blurb
 * names the *mechanic* rather than its numbers.
 *
 * ── Coverage is mechanised, not promised ──────────────────────────────────
 * `upgradeBlurbs.test.ts` walks `UPGRADE_DESCRIPTIONS` and requires a blurb
 * for every entry, and requires every blurb to correspond to one. A regenerated
 * catalog that gains a thirteenth primary fails there rather than falling back
 * to a bare name in the UI.
 */
import { UPGRADE_DESCRIPTIONS } from './upgradeDescriptionData';
import type { UpgradeDescription } from './upgradeDescriptionData';

/** `${category}:${index}`, with the AS3's 1-based index. */
export type BlurbKey = `${UpgradeDescription['category']}:${number}`;

/**
 * The longest a blurb may be.
 *
 * ── Measured, after the first guess was wrong ─────────────────────────────
 * This was 42, with a docstring claiming it "keeps every blurb to one line".
 * That was asserted, not checked, and it was false: `shopblurb.mjs` found the
 * longest blurb at 36 characters wrapping to **two lines at every viewport**
 * — 28px of text against a 14px line box at 1024x600, and the same ratio all
 * the way up to 3840x2160.
 *
 * 26 is what the column actually holds. The detail window is the narrowest on
 * the screen and its width is a share of the viewport, so the wrap point is
 * roughly constant in characters rather than in pixels — which is why every
 * viewport failed together rather than only the small one.
 *
 * Enforced by the test, and the one-line claim is now driven rather than
 * written down.
 */
export const BLURB_MAX_LENGTH = 26;

export const UPGRADE_BLURBS: Readonly<Record<BlurbKey, string>> = Object.freeze({
  // ── Misc ───────────────────────────────────────────────────────────────
  'misc:1': 'Faster tank.',
  'misc:2': 'Reflects some shots.',
  'misc:3': 'Less collision damage.',
  'misc:4': 'Kills recharge special.',

  // ── Primary ────────────────────────────────────────────────────────────
  'primary:1': 'Explodes on impact.',
  'primary:2': 'Rapid fire.',
  'primary:3': 'Heavy explosive shells.',
  'primary:4': 'Close-range fire.',
  'primary:5': 'Wide bullet spread.',
  'primary:6': 'Sticky timed bombs.',
  'primary:7': 'Bounces hit harder.',
  'primary:8': 'Poisons over time.',
  'primary:9': 'Piercing beam.',
  'primary:10': 'Kills spray slices.',
  'primary:11': 'Explosive and piercing.',
  'primary:12': 'Chains between enemies.',

  // ── Secondary ──────────────────────────────────────────────────────────
  'secondary:1': 'Drops a mine.',
  'secondary:2': 'Timed grenade.',
  'secondary:3': 'Freezing grenade.',
  'secondary:4': 'Poison grenade.',
  'secondary:5': 'Freezing icicle ring.',
  'secondary:6': 'Poison spike ring.',
  'secondary:7': 'Shield shoves enemies.',
  'secondary:8': 'Rockets seek enemies.',
  'secondary:9': 'Freezing ice trail.',
  'secondary:10': 'Burning lava trail.',
  'secondary:11': 'Bouncing cheese spread.',
  'secondary:12': 'Bunny chains between foes.',
});

/**
 * The blurb for one upgrade, or `undefined` if the table does not cover it.
 *
 * Deliberately not falling back to the long description here: the caller knows
 * what it wants to show when there is nothing, and a silent fallback to a
 * six-line string would defeat the point of the layer.
 */
export function blurbFor(category: string, index: number): string | undefined {
  /*
   * `category` is `string`, not the narrower union, because that is what the
   * shop row carries — `ShopRow` is inferred from the store and widens it.
   * Narrowing the parameter would only move a cast to the call site, where it
   * would assert something this function can check for itself: an unknown key
   * simply misses the record and returns `undefined`, which every caller
   * already handles.
   */
  return UPGRADE_BLURBS[`${category}:${index}` as BlurbKey];
}

/** Every key the generated catalog expects a blurb for. */
export function expectedBlurbKeys(): BlurbKey[] {
  /*
   * The callback is annotated rather than the result cast. Without a
   * contextual type a template literal widens to `string` and the return type
   * fails; with an `as` the lint rule calls the assertion redundant. The
   * annotation satisfies both, and unlike a cast it would actually fail if the
   * key format and `BlurbKey` ever stopped agreeing.
   */
  return UPGRADE_DESCRIPTIONS.map((d): BlurbKey => `${d.category}:${d.index}`);
}
