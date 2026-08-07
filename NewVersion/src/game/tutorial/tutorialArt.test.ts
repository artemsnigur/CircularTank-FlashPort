import { describe, expect, it } from 'vitest';

import {
  AS3_PLAY_AREA_HEIGHT,
  AS3_STAGE_HEIGHT,
  HUD_BAND,
  OBJECTIVE_BOTTOM_GAP,
  OBJECTIVE_X,
  TUTORIAL_CLIPS,
  panelPosition,
} from './tutorialArt';

/**
 * Offsets read straight out of `assets.swf`'s PlaceObject matrices, as a
 * **second independent transcription**.
 *
 * "The icons no longer overlap" is satisfied by many wrong layouts, so the
 * composition is pinned against the AS3's own numbers rather than against
 * anything that looks right. These are TWIPS/20, the same conversion the
 * extractor does, taken from the matrix dump.
 */
const AS3_PARTS: Record<string, [number, number, number][]> = {
  // shape, x, y
  Move: [
    [1325, 0, 0],
    [1401, 10, 57],
    [1401, 99, 57],
    [1403, 36.7, 10],
    [1405, 13.65, 10],
  ],
  AimShoot: [
    [1325, 0, 0],
    [1326, 66.3, 33.1],
    [1328, 27.9, 10],
    [1330, 27.9, 10],
  ],
  Objective: [
    [1332, -16, 0],
    [1333, 13.2, 10],
    [1335, 13.2, 10],
  ],
};

describe('the panel composition', () => {
  it('places every part where the AS3 matrix puts it', () => {
    for (const [name, expected] of Object.entries(AS3_PARTS)) {
      const parts = TUTORIAL_CLIPS[name]?.parts ?? [];
      expect(parts.map((p) => [p.shape, p.x, p.y]), name).toEqual(expected);
    }
  });

  it('keeps a shape placed twice as two parts', () => {
    // The display-list parser deduped by shape id; `Move` draws 1401 at two
    // positions — the left and right arrow keys from one glyph. A set-based
    // table silently renders one arrow, which looks like art rather than a bug.
    const move = TUTORIAL_CLIPS['Move'].parts.filter((p) => p.shape === 1401);
    expect(move).toHaveLength(2);
    expect(move[0].x).not.toBe(move[1].x);
  });

  it('does not assume the backdrop sits at the origin', () => {
    // It does not. `Objective`'s backdrop resolves to x = -16 once its own
    // normalisation offset is subtracted — its art extends left of its origin.
    // An "everything starts at 0,0" rule was written here first and was wrong;
    // the panel is positioned by its *anchor*, not by its first part.
    expect(TUTORIAL_CLIPS['Objective'].parts[0].x).toBe(-16);
    expect(TUTORIAL_CLIPS['Move'].parts[0].x).toBe(0);
  });


  it('subtracts each shape`s own normalisation offset', () => {
    // The matrix translate is in shape space; JPEXS re-origins each SVG to its
    // bounding box. `1403` carries a (43.2, 20.95) transform and `1401`
    // carries none, so a single global correction would be wrong for both.
    // Pinned as the pair, on one panel.
    const move = TUTORIAL_CLIPS['Move'].parts;
    expect(move.find((p) => p.shape === 1403)).toMatchObject({ x: 36.7, y: 10 });
    expect(move.filter((p) => p.shape === 1401)[0]).toMatchObject({ x: 10, y: 57 });
  });

});

/**
 * The two extremes of `logicalHeight`, which is `renderHeight / zoom` clamped
 * to `[400, 1440]` (`config/viewport.ts`). A wide desktop window sits at the
 * floor and a portrait phone near the ceiling, so a placement rule that is
 * only checked at one of them is checked on one platform.
 *
 * This is the constants-that-became-variables case by name, which is exactly
 * why both ends are driven rather than the value this machine happens to make.
 */
const DESKTOP_FLOOR = 400;
const PHONE_CEILING = 1440;

describe('panelPosition', () => {
  /**
   * **A rule, not a limitation.** `:319` puts eleven of the twelve panels at a
   * literal (16, 16) and only `Objective` reads a dimension (`:340-341`).
   *
   * This is the counterpart the bottom-anchored rule is pinned against: it must
   * hold at *both* viewport extremes on the *same* call, or "everything is at
   * 16,16" and "everything is bottom-anchored" would both pass the assertions
   * below on their own.
   */
  it('leaves every panel but Objective at the AS3 inset, at both extremes', () => {
    expect(panelPosition('Move', DESKTOP_FLOOR)).toEqual({ x: 16, y: 16 });
    expect(panelPosition('Move', PHONE_CEILING)).toEqual({ x: 16, y: 16 });
    expect(panelPosition('AimShoot', PHONE_CEILING)).toEqual({ x: 16, y: 16 });
  });

  /**
   * **A divergence, not a port.** `PartTutorial.as:341` is
   * `480 - height - 8` = 408, which is *inside* the AS3's 400..480 interface
   * strip. That works there because the panel clears the weapon widgets on
   * **x** — it spans 194..354 and `bgWeapon.x` is 388
   * (`PartInterface.as:234`). This port's HUD row is full-width, so no x
   * clears it and the panel has to sit above the band instead.
   *
   * Recorded as `A5` in `docs/AUDIT-2026-07.md`. If someone restores the
   * faithful `viewportHeight - height - 8`, this fails — which is the point.
   */
  it('seats Objective clear of the HUD band at both extremes', () => {
    const height = TUTORIAL_CLIPS['Objective'].height;

    for (const viewport of [DESKTOP_FLOOR, PHONE_CEILING]) {
      const { y } = panelPosition('Objective', viewport);
      // Read the constants for the relationship...
      expect(y).toBe(viewport - HUD_BAND - height - OBJECTIVE_BOTTOM_GAP);
      // ...and require the actual property: the panel's bottom edge clears
      // the band the HUD owns. This is what the fix is for, and it survives a
      // change to any of the three constants above.
      expect(y + height).toBeLessThanOrEqual(viewport - HUD_BAND);
    }
  });

  /**
   * The live-value rule (rule 7). Transcribing the AS3's frozen 480 would put
   * the panel at one absolute y on every screen: off the bottom at the desktop
   * floor and two thirds up a portrait phone.
   */
  it('tracks the viewport rather than pinning to a frozen stage height', () => {
    const low = panelPosition('Objective', DESKTOP_FLOOR).y;
    const high = panelPosition('Objective', PHONE_CEILING).y;
    expect(high - low).toBe(PHONE_CEILING - DESKTOP_FLOOR);
    // The counterpart: the inset panels do *not* move with it.
    expect(panelPosition('Move', PHONE_CEILING).y).toBe(panelPosition('Move', DESKTOP_FLOOR).y);
  });

  /**
   * The magnitude, stated from the source rather than read back out of the
   * module — a test that copies its expected value out of the code it tests
   * cannot detect a wrong constant.
   *
   * 480 is `PartTutorial.as:341`'s literal (the stage); 400 is
   * `PartInterface.as:232`'s `bg.y` (where the interface strip starts, and the
   * camera height). The band is the difference.
   */
  it('derives the HUD band from the AS3 stage and play area', () => {
    expect(AS3_STAGE_HEIGHT).toBe(480);
    expect(AS3_PLAY_AREA_HEIGHT).toBe(400);
    expect(HUD_BAND).toBe(80);
    expect(OBJECTIVE_X).toBe(194);
    expect(OBJECTIVE_BOTTOM_GAP).toBe(8);
  });
});
