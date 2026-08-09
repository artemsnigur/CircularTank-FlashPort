/**
 * The level guide widget's clips, by SWF symbol id.
 *
 * Hand-kept like `projectile-sprites.mjs` and `icon-sprites.mjs`, and for the
 * same reason: the id is only discoverable from the `[Embed(... symbol=...)]`
 * line on the AS3 class, which nothing in the SWF links back to a name.
 *
 *   1434  `BackgroundLevelGuide`        the panel behind everything, 1 frame
 *    196  `ButtonLevelGuideArrow`       8 frames — 4 states x 2 directions
 *   1452  `ButtonLevelGuideAutoSelect`  4 frames — on/off x idle/hover
 *   1437  `ButtonLevelGuideInfo`        2 frames — idle/hover
 *   1442  `ButtonLevelGuidePrevious`    3 frames each; these three are *art
 *   1447  `ButtonLevelGuideLast`        variants of one behaviour class,
 *   1457  `ButtonLevelGuideUpcoming`    each `extends ButtonLevelGuideSelect`
 *                                       with nothing but a different symbol
 *
 * `LevelGuide` itself and `ButtonLevelGuideSelect` carry no `[Embed]` — the
 * first is a plain `Sprite` container, the second is the base class the three
 * variants above inherit from. So eight classes, seven clips.
 */
export const LEVEL_GUIDE_SPRITE_IDS = [1434, 196, 1452, 1437, 1442, 1447, 1457];
