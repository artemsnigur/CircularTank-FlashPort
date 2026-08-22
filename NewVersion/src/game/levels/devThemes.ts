/**
 * DEV-AID: the nine ground themes as comparable facts, for choosing between them.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The campaign redesign (`docs/CAMPAIGN-REDESIGN-PLAN.md`, decision `D-4`) cuts
 * nine worlds to four and keeps **one theme per world**, so five of the nine
 * grounds are being retired. That choice is made by eye, and there was nowhere
 * to put the nine side by side: each one is reachable only by playing into the
 * world that uses it, and worlds 7-9 are 270 levels in.
 *
 * This module is the data half of that comparison — no rendering, so it can be
 * driven by a test. `ui/screens/ThemeGalleryScreen.tsx` draws it and
 * `levels/devLevels.ts` turns a theme into a playable empty arena.
 *
 * ── Derived, not listed ───────────────────────────────────────────────────
 * The set of themes comes from `GROUND_KEYS`, which is the table of themes that
 * **have art**; the order comes from where each first appears in `LEVELS`. Two
 * consequences, both wanted:
 *
 *   - a theme added by a future extraction shows up here with no edit;
 *   - a theme that no world uses any more still shows up, ordered last. That
 *     is the case this tool exists for. Deriving the *set* from `LEVELS` would
 *     have made the gallery shrink to four the moment the redesign lands,
 *     hiding exactly the five grounds someone might want back.
 */

import {
  BASE_TEXTURE_SIZE,
  GROUND_KEYS,
  groundForTheme,
  UPSCALE_TEXTURE_SIZE,
  UPSCALED_THEMES,
} from './groundTexture';
import { THEME_PROPS } from './backgroundProps';
import { LEVELS } from './levelData';
import type { LevelTheme } from './levelData';

/** Every theme that has a ground texture. */
export function allThemes(): LevelTheme[] {
  return Object.keys(GROUND_KEYS) as LevelTheme[];
}

/**
 * Worlds that use a theme today, 1-based and ascending.
 *
 * Reads every level rather than each world's first, because the data carries
 * the theme **per level** — one theme per world is true of all 405 rows today
 * and is not a rule the format enforces. The redesign plans mid-world switches
 * in one of its options, so assuming otherwise here would go stale.
 */
export function themeWorlds(theme: LevelTheme): number[] {
  const worlds: number[] = [];
  LEVELS.forEach((levels, index) => {
    if (levels.some((spec) => spec.theme === theme)) worlds.push(index + 1);
  });
  return worlds;
}

/**
 * The ordering rule, separated from the data it runs on.
 *
 * Themes sort by the world they first appear in, and a theme **no world uses**
 * sorts last, alphabetically among its peers. That second half is the one the
 * gallery is for — it is what keeps a retired ground visible after the redesign
 * drops five of them — and it is unreachable from the live level table, where
 * all nine are in use. Taking the lookup as an argument is what lets a test
 * drive it at all; called with real data it is `themeOrder()`.
 */
export function orderThemes(
  themes: readonly LevelTheme[],
  firstWorld: (theme: LevelTheme) => number | undefined,
): LevelTheme[] {
  return [...themes].sort((a, b) => {
    const wa = firstWorld(a) ?? Number.POSITIVE_INFINITY;
    const wb = firstWorld(b) ?? Number.POSITIVE_INFINITY;
    // Compared, not subtracted. `a - b` is the usual idiom and it is wrong
    // here: an unused theme is `Infinity`, so `Infinity - 1` is `Infinity` and
    // `1 - Infinity` is `-Infinity` — neither is a finite sort key, and
    // `Infinity - Infinity` is `NaN`, which a comparator treats as "equal" and
    // silently leaves the array however it arrived. Written the subtracting way
    // first, and `devThemes.test.ts` caught it putting an unused theme second.
    if (wa !== wb) return wa < wb ? -1 : 1;
    return a.localeCompare(b);
  });
}

/**
 * The campaign level a theme first appears on, counted from 1 across all
 * worlds, or undefined if nothing uses it.
 */
export function themeFirstLevel(theme: LevelTheme): number | undefined {
  let index = 0;
  for (const world of LEVELS) {
    for (const spec of world) {
      index += 1;
      if (spec.theme === theme) return index;
    }
  }
  return undefined;
}

/**
 * Themes in first-appearance order, with unused ones last.
 *
 * Keyed on the **level** a theme first appears on, not the world. Those were
 * the same thing while a world had one theme; since `D-4` world 1 crosses
 * Desert, Grass and Beach, and keying on the world made all three tie and fall
 * to the alphabetical tiebreak — which put Beach first, in a gallery whose
 * whole job is showing the order the player meets them in.
 */
export function themeOrder(): LevelTheme[] {
  return orderThemes(allThemes(), themeFirstLevel);
}

/** One prop type and how much of a theme's scatter it is. */
export interface ThemePropShare {
  type: string;
  /** `THEME_PROPS` proportion, 0..1. */
  share: number;
}

/** Everything the gallery shows about one theme. */
export interface ThemeCard {
  theme: LevelTheme;
  /** Texture key, as `PreloadScene` registers it. */
  groundKey: string;
  /** `tileScale` the game draws it at — 0.25 for an upscale, 1 otherwise. */
  tileScale: number;
  /** Design units one texture repeat covers. Equal for every theme by design. */
  repeatUnits: number;
  /** Worlds using it today; empty once a theme is retired. */
  worlds: number[];
  /** Levels using it today. */
  levels: number;
  props: ThemePropShare[];
  /** `THEME_PROPS` density, as `[min, max]` props per 256-unit tile. */
  perTile: [number, number];
}

/**
 * The gallery's rows.
 *
 * `repeatUnits` is computed rather than assumed equal: it is the one number
 * that would betray a ground whose texture and tile scale disagree, which is
 * the defect the Desert upscale could plausibly have introduced (a 1024 texture
 * at scale 1 covers 1024 units and renders every feature 4x too large).
 */
export function themeCards(): ThemeCard[] {
  return themeOrder().map((theme) => {
    const ground = groundForTheme(theme);
    const props = THEME_PROPS[theme];
    const worlds = themeWorlds(theme);
    // Derived from which set the theme is in, exactly as `groundForTheme`
    // derives the scale, so the two cannot disagree about the same texture.
    const textureSize = UPSCALED_THEMES.has(theme) ? UPSCALE_TEXTURE_SIZE : BASE_TEXTURE_SIZE;

    return {
      theme,
      groundKey: ground.key,
      tileScale: ground.tileScale,
      repeatUnits: Math.round(textureSize * ground.tileScale),
      worlds,
      levels: LEVELS.reduce(
        (sum, world) => sum + world.filter((spec) => spec.theme === theme).length,
        0,
      ),
      props: props
        ? props.proportions.map(([type, share]) => ({ type, share }))
        : [],
      perTile: props ? [props.minPerTile, props.maxPerTile] : [0, 0],
    };
  });
}
