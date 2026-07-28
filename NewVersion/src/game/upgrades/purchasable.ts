/**
 * Which upgrades the shop may sell — i.e. which ones actually do something.
 *
 * The audit found the store lying in two ways. `BulletReflect` and `KillReload`
 * were buyable to level 10 for ~135,000 coins combined with **no runtime read
 * site at all**. Eleven of the twelve secondaries were buyable — `Shield` alone
 * costs up to 12,500 — while `SECONDARY_WEAPONS` contained only `Mine`, so the
 * purchase resolved to `undefined` and the HUD showed `'—'`.
 *
 * Both have since shrunk. `Shield` shipped and appeared on its own, because
 * sellability is derived. `BulletReflect` shipped **with** it: `:1557` is one
 * condition covering the shield and the upgrade, so porting one ported the
 * other's only reader. Neither needed an edit to the withheld list beyond
 * deleting a line.
 *
 * Money is the scarcest thing in the game and it is not refundable. Selling a
 * weapon that cannot fire is worse than not offering it.
 *
 * ── Derived where it can be, declared where it cannot ─────────────────────
 * Primary and secondary weapons are **derived**: a weapon upgrade is sellable
 * exactly when a spec claims its `upgradeId`. Port a secondary, add it to
 * `SECONDARY_WEAPONS`, and it appears in the shop with no edit here — the
 * failure mode where a real weapon stays hidden cannot happen.
 *
 * Misc upgrades have no such link. `Speed` is read by `tankMovement.ts:82-84`
 * and `EnemyAbsorb` by `tankDamage.ts:79`, but nothing structural says so, and
 * a name-grep is not evidence (see CLAUDE.md). So they are declared, with the
 * read site named, and `purchasable.test.ts` pins each claim to that site.
 */
import { ALL_UPGRADES } from './upgradeData';
import type { UpgradeSpec } from './upgradeData';
import { PRIMARY_WEAPONS } from '../weapons/firing';
import { SECONDARY_WEAPONS } from '../weapons/secondaries';

/**
 * Misc upgrades with a runtime reader, and where that reader is.
 *
 * An entry here is a claim that buying it changes play. Adding one without a
 * read site puts a money sink back in the shop.
 */
export const MISC_WITH_EFFECT: Readonly<Record<string, string>> = {
  // `tankStatsFor` reads tracks 0-2 as maxSpeed, accSpeed and friction.
  Speed: 'player/tankMovement.ts absorptionless speed tracks',
  // `absorptionMultiplier` reads track 0 on every contact hit.
  EnemyAbsorb: 'player/tankDamage.ts contact-damage absorption',
  // `bulletReflectChance` reads track 0 on every enemy bullet that reaches the
  // tank. Shipped with the Shield secondary: `:1557` is one condition covering
  // both, so porting Shield ported this upgrade's only reader too.
  BulletReflect: 'weapons/shield.ts bulletReflectChance, the no-shield roll',
};

/**
 * Misc upgrades deliberately withheld, and why.
 *
 * Kept as an explicit list rather than "everything not in MISC_WITH_EFFECT", so
 * a newly added misc upgrade is absent from both and fails the completeness
 * test instead of silently defaulting to hidden.
 */
export const MISC_WITHOUT_EFFECT: Readonly<Record<string, string>> = {
  KillReload: 'no reader; the reload-on-kill rule is unported',
};

/** A weapon upgrade is sellable when some spec claims its id. */
function weaponIsPorted(spec: UpgradeSpec): boolean {
  const specs =
    spec.category === 'primary'
      ? Object.values(PRIMARY_WEAPONS)
      : Object.values(SECONDARY_WEAPONS);
  return specs.some((weapon) => weapon.upgradeId === spec.id);
}

/** Whether the shop may offer this upgrade. */
export function isPurchasable(spec: UpgradeSpec): boolean {
  if (spec.category === 'misc') return spec.id in MISC_WITH_EFFECT;
  return weaponIsPorted(spec);
}

/** The shop's catalogue: everything that does something. */
export function purchasableUpgrades(): readonly UpgradeSpec[] {
  return ALL_UPGRADES.filter(isPurchasable);
}

/** What is withheld, so the shop can say so rather than silently omitting it. */
export function withheldUpgrades(): readonly UpgradeSpec[] {
  return ALL_UPGRADES.filter((spec) => !isPurchasable(spec));
}
