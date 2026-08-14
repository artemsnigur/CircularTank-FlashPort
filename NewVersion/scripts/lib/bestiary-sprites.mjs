/**
 * The 20 bestiary tile clips, by SWF symbol id.
 *
 * Hand-kept like `icon-sprites.mjs` and `projectile-sprites.mjs`, and for the
 * same reason: the id only exists on the AS3 class's
 * `[Embed(... symbol="symbolNNN")]` line, and nothing inside the SWF links it
 * back to a name. Each row is greppable as `symbol=` in
 * `SWFimported/scripts/ButtonEnemy<Name>.as`.
 *
 * ── These are the bestiary's enemy pictures, and the *only* ones ───────────
 * Worth stating because there is a second, more obvious-looking candidate.
 * `ImageEnemy.as` instantiates the real gameplay clip (`new EnemyBasic()`,
 * `:57-140`) on a round plate — but `ScreenEnemies` never builds one. It
 * belongs to the level-select detail panel (`ScreenLevelSelect.as:1128`), which
 * this port does not have (divergence `A8`). The bestiary's own art is
 * `ButtonEnemy<Type>`, a four-frame tile:
 *
 *   frame 1  normal        `ButtonEnemy.as:105`
 *   frame 2  hover         `:96`
 *   frame 3  selected      `:90`, and on press at `:47`
 *   frame 4  undiscovered  `:109` — the `else` of every `notDiscovered` branch
 *
 * **Frame 4 is why this table is worth generating rather than reusing
 * `ENEMY_CLIPS`.** The gameplay clips have no locked state; these do, so the
 * screen can withhold an unmet enemy's appearance using the original's own art
 * instead of an invented silhouette.
 *
 * Keyed by bestiary id (`bestiaryData.ts`, spaces removed), which is also the
 * level-table enemy type name — so one id keys the tile, the entry and the
 * stats row.
 */
export const BESTIARY_SPRITE_IDS = Object.freeze({
  Basic: 778,
  Fast: 750,
  Shooting: 748,
  Strong: 746,
  Shrinking: 770,
  Ghost: 752,
  Trap: 744,
  Temperamental: 742,
  Ninja: 754,
  Accelerating: 756,
  Crazy: 758,
  Medic: 760,
  ScaredGhost: 762,
  DamageAddict: 764,
  Random: 766,
  Exploding: 768,
  Tiny: 740,
  GrapplingHook: 772,
  Teleporting: 774,
  Soldier: 776,
});
