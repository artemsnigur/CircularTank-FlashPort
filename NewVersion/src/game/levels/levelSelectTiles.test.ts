/**
 * The roster tile plate — synced, undrawn, and that being on purpose.
 *
 * `BackgroundEnemyImage` (symbol 865 -> shapes 862/863/864) backs one
 * `ImageEnemy` tile in the AS3's selected-level detail panel
 * (`ScreenLevelSelect.as:1112-1160`). This port has no selection step —
 * divergence `A8` — so `ImageEnemy` is `no-consumer` and nothing draws the
 * plate.
 *
 * **The point of this file is that "unused" and "missing" must not look alike.**
 * Three synced shapes nothing references would otherwise read as an oversight,
 * and the obvious tidy-up is to delete them from the sync — which would then
 * have to be undone if the tiles are ever built.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { shapeUrls } from '../../assets/registry';

/** `shapeIdsForSprites([865])`, stated so a change to the clip fails here. */
const TILE_SHAPES = [862, 863, 864];

describe('the enemy tile plate', () => {
  it('is present in the extraction and synced', () => {
    for (const id of TILE_SHAPES) {
      expect(existsSync(`../SWFimported/shapes/${id}.svg`), `${id} in extraction`).toBe(true);
      expect(`${id}.svg` in shapeUrls, `${id} synced`).toBe(true);
    }
  });

  /**
   * **Nothing draws it, deliberately.** Asserted rather than described, so the
   * day someone wires the tiles this test fails and points at the reason.
   *
   * The counterpart on the same input is the check above: the shapes are
   * genuinely there, so this is "synced and unused", not "absent".
   */
  it('is drawn by nothing, because ImageEnemy has no consumer under A8', async () => {
    const art = await import('./levelGuideArt');
    const icons = await import('../enemies/resistanceIconArt');
    const drawn = new Set<number>([
      ...Object.values(art.LEVEL_GUIDE_CLIPS).flatMap((c) => c.frames.flat()),
      ...icons.RESISTANCE_ICON_SHAPE_IDS,
    ]);
    for (const id of TILE_SHAPES) {
      expect(drawn.has(id), `${id} is drawn by a clip table`).toBe(false);
    }
  });
});
