/**
 * Which frame a shop tile rests on — `ButtonWeapon.as:193-206` and
 * `ButtonMisc.as:129-160`.
 *
 * ── The rule, and why it is a module rather than three ifs ────────────────
 * Both classes end in the same shape: a resting branch that asks *is it owned*
 * and then *is it equipped*, and picks one of three frames (two for a misc
 * upgrade, which cannot be equipped). Hover and pressed are the other two
 * columns of the grid and belong to a screen that selects one upgrade at a
 * time; this port lists all 28 at once, so only the resting column is drawn.
 *
 * Extracted because the numbers are meaningless on sight — "frame 7" says
 * nothing, and a tile on the wrong frame draws a perfectly ordinary picture of
 * the wrong state. `upgradeTile.test.ts` drives every combination against the
 * generated table.
 */
import { UPGRADE_TILE_CLIPS, UPGRADE_TILE_REST_FRAME } from './upgradeArt';

export interface TileState {
  /** Level > 0 — `levelsArray[number - 1] != 0`. */
  owned: boolean;
  /**
   * In a primary slot, or the equipped secondary.
   *
   * Ignored for the four misc upgrades, which have no equipped row: passing
   * `true` there is not an error, it simply cannot be honoured, and the AS3
   * has the same shape.
   */
  equipped: boolean;
}

/**
 * The resting frame number for this state, 1-based.
 *
 * **Not owned wins over equipped.** The AS3 asks `levelsArray != 0` first
 * (`:193`), so an unowned upgrade draws the unowned art whatever else is true.
 * The port cannot currently produce "equipped but not owned", but ordering the
 * questions the other way would make that state silently draw as equipped if it
 * ever arose.
 */
export function upgradeTileFrame(id: string, { owned, equipped }: TileState): number {
  const clip = UPGRADE_TILE_CLIPS[id];
  if (!clip) return UPGRADE_TILE_REST_FRAME.owned;

  if (!owned) {
    return clip.equippable
      ? UPGRADE_TILE_REST_FRAME.notOwnedWeapon
      : UPGRADE_TILE_REST_FRAME.notOwnedMisc;
  }
  return equipped && clip.equippable
    ? UPGRADE_TILE_REST_FRAME.equipped
    : UPGRADE_TILE_REST_FRAME.owned;
}

/**
 * The shape layers to draw, back to front, or `[]` for an unknown id.
 *
 * Empty rather than a placeholder: a missing tile should leave a gap that shows
 * up, not a wrong picture that does not.
 */
export function upgradeTileLayers(id: string, state: TileState): readonly number[] {
  const clip = UPGRADE_TILE_CLIPS[id];
  if (!clip) return [];
  return clip.frames[upgradeTileFrame(id, state) - 1] ?? [];
}
