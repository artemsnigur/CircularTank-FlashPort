/**
 * The HUD's weapon icon clip, by SWF symbol id.
 *
 * Hand-kept like `marker-sprites.mjs`: the id only exists on the AS3 class's
 * `[Embed(... symbol="symbolNNN")]` line — `WeaponInterface.as:6`.
 *
 * **One clip, three instances.** `PartInterface` builds `weaponInterface`,
 * `weaponInterfaceSpecial` and `weaponInterfaceUnused` from this same class
 * (`:106`, `:116`, `:130`) and tells them apart with two public flags, so there
 * is exactly one symbol here and not three.
 *
 * Its 25 frames are `WeaponInterface.update`'s `gotoAndStop` ladder
 * (`:57-157`): frame 1 `None`, frames 2-13 the twelve primaries, frames 14-25
 * the twelve secondaries. `gen-weapon-art.mjs` asserts the count.
 */
export const WEAPON_PANEL_SPRITE_ID = 1198;
