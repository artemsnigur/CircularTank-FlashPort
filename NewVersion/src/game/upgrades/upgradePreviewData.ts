/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrade-previews:data
 *
 * The shop's stat-preview lines, from `ScreenUpgrades.changeContent()`
 * (`:738`-`:1612`). See scripts/gen-upgrade-previews.mjs.
 *
 * **These are not descriptions.** The original has no description text; each
 * line is computed from an upgrade stat track at display time. The arithmetic
 * is `transform`, applied by `upgrades/upgradePreview.ts`.
 *
 * `upgradeIndex: null` is the **category default** — the `else` branch every
 * upgrade takes unless it has its own entry. `:1019` (Flamethrower) against
 * `:1023` (everything else) is the pattern.
 */

/** The six arithmetic shapes the shop uses. */
export type PreviewTransform =
  | 'raw'
  | 'perSecond'
  | 'percent'
  | 'seconds1'
  | 'seconds2'
  | 'damagePerSecond';

export interface PreviewSpec {
  /** null for the category default. */
  category: 'misc' | 'primary' | 'secondary' | null;
  /** 1-based, as the AS3 selectors are. null for the default. */
  upgradeIndex: number | null;
  /** Which of the five lines, 1-5. */
  slot: number;
  label: string;
  /** Index into `UpgradeSpec.stats`. */
  track: number;
  transform: PreviewTransform;
  unit: string;
  /**
   * The unit used when the upgrade is not yet owned, when it differs.
   *
   * Only Shield does, and it is a typo in the original: `:1445` prints a
   * duration as " HP" where every other Shield branch says " Sec". Reproduced
   * rather than corrected — see `docs/AUDIT-2026-07.md`.
   */
  unitUnowned?: string;
}

export const UPGRADE_PREVIEWS: readonly PreviewSpec[] = Object.freeze([
  { category: "misc", upgradeIndex: 1, slot: 1, label: "Max Speed: ", track: 0, transform: 'perSecond', unit: " PX/Sec" }, // :783 :814 :859
  { category: "misc", upgradeIndex: 1, slot: 2, label: "Acceleration: ", track: 1, transform: 'perSecond', unit: " PX/Sec" }, // :803 :835 :891
  { category: "misc", upgradeIndex: 2, slot: 1, label: "Reflect Chance: ", track: 0, transform: 'percent', unit: "%" }, // :787 :818 :865
  { category: "misc", upgradeIndex: 3, slot: 1, label: "Reduce: ", track: 0, transform: 'percent', unit: "% Damage" }, // :791 :822 :871
  { category: "misc", upgradeIndex: 4, slot: 1, label: "Reload: ", track: 0, transform: 'seconds1', unit: " Sec/Kill" }, // :795 :826 :877
  { category: "primary", upgradeIndex: null, slot: 1, label: "Damage: ", track: 1, transform: 'raw', unit: " HP" }, // :963 :1023 :1119
  { category: "primary", upgradeIndex: null, slot: 2, label: "Reload: ", track: 0, transform: 'seconds2', unit: " Sec" }, // :971 :1033 :1129
  { category: "primary", upgradeIndex: null, slot: 3, label: "Explosion: ", track: 2, transform: 'raw', unit: " PX" }, // :975 :1039 :1136
  { category: "primary", upgradeIndex: 4, slot: 1, label: "Damage: ", track: 1, transform: 'damagePerSecond', unit: " HP/Sec" }, // :959 :1019 :1115
  { category: "primary", upgradeIndex: 4, slot: 3, label: "Range: ", track: 2, transform: 'raw', unit: " PX" }, // :979 :1043 :1142
  { category: "primary", upgradeIndex: 5, slot: 3, label: "Bullets: ", track: 3, transform: 'raw', unit: "" }, // :983 :1047 :1148
  { category: "primary", upgradeIndex: 6, slot: 4, label: "Time: ", track: 3, transform: 'seconds2', unit: " Sec" }, // :1003 :1068 :1180
  { category: "primary", upgradeIndex: 8, slot: 3, label: "Poison Dmg: ", track: 3, transform: 'raw', unit: " HP/Sec" }, // :987 :1051 :1154
  { category: "primary", upgradeIndex: 8, slot: 4, label: "Poison Time: ", track: 2, transform: 'seconds2', unit: " Sec" }, // :1007 :1072 :1186
  { category: "primary", upgradeIndex: 10, slot: 3, label: "Pieces: ", track: 2, transform: 'raw', unit: "" }, // :991 :1055 :1160
  { category: "primary", upgradeIndex: 12, slot: 3, label: "Targets: ", track: 2, transform: 'raw', unit: "" }, // :995 :1059 :1166
  { category: "secondary", upgradeIndex: null, slot: 1, label: "Damage: ", track: 1, transform: 'raw', unit: " HP" }, // :1256 :1336 :1451
  { category: "secondary", upgradeIndex: null, slot: 2, label: "Reload: ", track: 0, transform: 'seconds2', unit: " Sec" }, // :1258 :1340 :1456
  { category: "secondary", upgradeIndex: null, slot: 3, label: "Explosion: ", track: 2, transform: 'raw', unit: " PX" }, // :1261 :1345 :1462
  { category: "secondary", upgradeIndex: null, slot: 4, label: "Freeze: ", track: 3, transform: 'seconds2', unit: " Sec" }, // :1285 :1370 :1500
  { category: "secondary", upgradeIndex: null, slot: 5, label: "Trail Time: ", track: 4, transform: 'seconds2', unit: " Sec" }, // :1321 :1407 :1556
  { category: "secondary", upgradeIndex: 4, slot: 4, label: "Poison Dmg: ", track: 4, transform: 'raw', unit: " HP/Sec" }, // :1289 :1374 :1506
  { category: "secondary", upgradeIndex: 4, slot: 5, label: "Poison Time: ", track: 3, transform: 'seconds2', unit: " Sec" }, // :1313 :1399 :1544
  { category: "secondary", upgradeIndex: 5, slot: 3, label: "Freeze: ", track: 2, transform: 'seconds2', unit: " Sec" }, // :1265 :1349 :1468
  { category: "secondary", upgradeIndex: 5, slot: 4, label: "Icicles: ", track: 3, transform: 'raw', unit: "" }, // :1293 :1378 :1512
  { category: "secondary", upgradeIndex: 6, slot: 3, label: "Poison Dmg: ", track: 3, transform: 'raw', unit: " HP/Sec" }, // :1269 :1353 :1474
  { category: "secondary", upgradeIndex: 6, slot: 4, label: "Poison Time: ", track: 2, transform: 'seconds2', unit: " Sec" }, // :1297 :1382 :1518
  { category: "secondary", upgradeIndex: 6, slot: 5, label: "Spikes: ", track: 4, transform: 'raw', unit: "" }, // :1317 :1403 :1550
  { category: "secondary", upgradeIndex: 7, slot: 1, label: "Shield Time: ", track: 1, transform: 'seconds2', unit: " Sec", unitUnowned: " HP" }, // :1252 :1332 :1445
  { category: "secondary", upgradeIndex: 8, slot: 4, label: "Rockets: ", track: 3, transform: 'raw', unit: "" }, // :1301 :1386 :1524
  { category: "secondary", upgradeIndex: 10, slot: 4, label: "Lava Dmg: ", track: 3, transform: 'raw', unit: " HP/Sec" }, // :1305 :1390 :1530
  { category: "secondary", upgradeIndex: 11, slot: 3, label: "Pieces: ", track: 3, transform: 'raw', unit: "" }, // :1273 :1357 :1480
  { category: "secondary", upgradeIndex: 12, slot: 3, label: "Targets: ", track: 2, transform: 'raw', unit: "" }, // :1277 :1361 :1486
]);
