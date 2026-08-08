/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrade-descriptions:data
 *
 * The shop's info-tooltip text, from `ButtonUpgradeInfo.as`. One per upgrade,
 * keyed by category and the AS3's 1-based selector index.
 *
 * See scripts/gen-upgrade-descriptions.mjs for why these are not in
 * `ScreenUpgrades.as` and why M2 recorded them as absent.
 */

export interface UpgradeDescription {
  category: 'misc' | 'primary' | 'secondary';
  /** 1-based, as `selectedMisc`/`selectedWeapon`/`selectedSecondary` are. */
  index: number;
  text: string;
}

export const UPGRADE_DESCRIPTIONS: readonly UpgradeDescription[] = Object.freeze([
  { category: 'misc', index: 1, text: "Increases the speed of the tank." },
  { category: 'misc', index: 2, text: "The tank has a chance to reflect an enemy bullet." },
  { category: 'misc', index: 3, text: "Reduce the amount of damage taken when colliding with an enemy." },
  { category: 'misc', index: 4, text: "Every time an enemy is killed, the special weapon will be closer to being reloaded." },
  { category: 'primary', index: 1, text: "Shoots exploding bullets.\nThe bullets explode on impact." },
  { category: 'primary', index: 2, text: "Shoots bullets at a fast rate.\nThe bullets do damage on impact." },
  { category: 'primary', index: 3, text: "Shoots big exploding bullets.\nThe bullets explode on impact." },
  { category: 'primary', index: 4, text: "Shoots fire.\nThe fire does damage to every enemy it touches." },
  { category: 'primary', index: 5, text: "Shoots multiple bullets at once.\nThe bullets do damage on impact." },
  { category: 'primary', index: 6, text: "Shoots timed bombs.\nThe timed bombs stick to enemies and explode when the time is up." },
  { category: 'primary', index: 7, text: "Shoots gummy bears.\nThe gummy bears do damage on impact.\nEvery time a gummy bear collides with the outer walls, the gummy bear becomes more powerful.\nNo collision means 1X damage,\n1 collision means 3X damage,\n2 collisions means 4X damage,\n3 collisions will destroy the gummy bear." },
  { category: 'primary', index: 8, text: "Shoots poisoned arrows.\nThe poisoned arrows do damage on impact, and poison enemies.\nThe poison does damage over time, until the time is up." },
  { category: 'primary', index: 9, text: "Shoots laser beams.\nThe laser beams do damage to every enemy they touch." },
  { category: 'primary', index: 10, text: "Shoots cakes.\nThe cakes do damage on impact.\nIf an enemy is killed by a cake or a cake slice, the enemy will shoot cake slices.\nCake slices do half the damage of cakes." },
  { category: 'primary', index: 11, text: "Shoots penetrating bullets.\nThe penetrating bullets explode on impact.\nPenetrating bullets don't break on impact." },
  { category: 'primary', index: 12, text: "Shoots magic balls.\nThe magic balls do damage on impact.\nWhen a magic ball collides with an enemy, the magic ball will move towards a new enemy, until it has damaged its max amount of targets.\nMagic balls always move towards their closest enemy." },
  { category: 'secondary', index: 1, text: "Places a mine on the ground.\nWhen an enemy touches it the mine explodes." },
  { category: 'secondary', index: 2, text: "Throws a grenade towards the crosshair.\nThe grenade explodes after some time." },
  { category: 'secondary', index: 3, text: "Throws an ice grenade towards the crosshair.\nThe ice grenade explodes after some time.\nEvery enemy touching the explosion freezes.\nBosses only freeze for 25% of the freeze time." },
  { category: 'secondary', index: 4, text: "Throws a poison grenade towards the crosshair.\nThe poison grenade explodes after some time.\nEvery enemy touching the explosion gets poisoned.\nThe poison does damage over time, until the time is up." },
  { category: 'secondary', index: 5, text: "Shoots a ring of icicles from the tank.\nThe icicles cause the enemy to freeze on impact.\nBosses only take 30% damage and freeze for 25% of the freeze time." },
  { category: 'secondary', index: 6, text: "Shoots a ring of poison spikes from the tank.\nThe poison spikes do damage on impact, and poison enemies.\nThe poison does damage over time, until the time is up.\nBosses only take 25% impact damage." },
  { category: 'secondary', index: 7, text: "Makes a shield around the tank.\nThe shield will push away enemies." },
  { category: 'secondary', index: 8, text: "Fires rockets at the closest enemies.\nIf there are less enemies visible on the screen than the amount of rockets, the amount of rockets fired will be the same as the amount of visible enemies." },
  { category: 'secondary', index: 9, text: "Fires an ice ball that leaves a trail of ice in its wake and explodes on impact.\nEnemies that touch the trail or are caught in the explosion freeze temporarily.\nBosses don't freeze when touching the ice trail, but are affected by the explosion for 25% of the freeze time." },
  { category: 'secondary', index: 10, text: "Fires a lava ball that leaves a trail of lava in its wake and explodes on impact.\nEnemies that touch the trail take damage.\nBosses take 20% of the damage from touching the lava trail." },
  { category: 'secondary', index: 11, text: "Shoots multiple pieces of crazy cheese, just like a shotgun.\nThe cheese does damage on impact, but doesn't break.\nA piece of cheese breaks after colliding 4 times with the outer walls.\nBosses only take 20% damage." },
  { category: 'secondary', index: 12, text: "Shoots a magic bunny.\nThe magic bunny does damage on impact.\nWhen the magic bunny collides with an enemy, the magic bunny will move towards a new enemy, until it has damaged its max amount of targets.\nThe magic bunny always moves towards its closest enemy." },
]);
