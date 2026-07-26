/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run audio:manifest
 *
 * Extracted from SWFimported/scripts/SoundManager.as (the playSound() and
 * playMusicOnChannel() dispatch chains) joined with the [Embed] declarations on
 * the individual sound and music asset classes.
 *
 * Logical names are the strings ~180 AS3 call sites push into
 * `SoundManager.sfxArray`, so ported gameplay code keeps using them verbatim.
 */

export interface SfxVariant {
  /** Original mp3 filename; the leading number is the SWF library ID. */
  file: string;
  /** AS3 class this came from, for traceability. */
  className: string;
}

export interface SfxEntry {
  /** Logical name used at AS3 call sites, e.g. "Coin". */
  name: string;
  variants: SfxVariant[];
  /**
   * Upper bounds compared against a single `Math.random()` draw, in order,
   * exactly as playSound() does. Empty when there is only one variant.
   */
  thresholds: number[];
}

/** Literal union so callers cannot request a track that does not exist. */
export type MusicTrackName = "Menu" | "Normal" | "Flag" | "Tower" | "Defense" | "Boss" | "Win" | "Lose";

export interface TrackEntry<TName extends string = string> {
  name: TName;
  file: string;
  className: string;
}

/** 57 logical SFX names covering 105 mp3 files. */
export const SFX: readonly SfxEntry[] = [
  { name: "InterfaceButtonOver1", variants: [{ file: "72_sndInterfaceButtonOver1v1.mp3", className: "sndInterfaceButtonOver1v1" }, { file: "71_sndInterfaceButtonOver1v2.mp3", className: "sndInterfaceButtonOver1v2" }, { file: "70_sndInterfaceButtonOver1v3.mp3", className: "sndInterfaceButtonOver1v3" }], thresholds: [0.33, 0.66] },
  { name: "InterfaceButtonClick", variants: [{ file: "139_sndInterfaceButtonClick.mp3", className: "sndInterfaceButtonClick" }], thresholds: [] },
  { name: "InterfaceButtonMoney", variants: [{ file: "83_sndInterfaceButtonMoney.mp3", className: "sndInterfaceButtonMoney" }], thresholds: [] },
  { name: "Award1", variants: [{ file: "161_sndAward1.mp3", className: "sndAward1" }], thresholds: [] },
  { name: "Award2", variants: [{ file: "160_sndAward2.mp3", className: "sndAward2" }], thresholds: [] },
  { name: "Award3", variants: [{ file: "159_sndAward3.mp3", className: "sndAward3" }], thresholds: [] },
  { name: "Achievement", variants: [{ file: "165_sndAchievement.mp3", className: "sndAchievement" }], thresholds: [] },
  { name: "Tutorial", variants: [{ file: "53_sndTutorial.mp3", className: "sndTutorial" }], thresholds: [] },
  { name: "FlagPickup", variants: [{ file: "117_sndFlagPickup.mp3", className: "sndFlagPickup" }], thresholds: [] },
  { name: "Coin", variants: [{ file: "138_sndCoinv1.mp3", className: "sndCoinv1" }, { file: "137_sndCoinv2.mp3", className: "sndCoinv2" }, { file: "136_sndCoinv3.mp3", className: "sndCoinv3" }], thresholds: [0.33, 0.66] },
  { name: "CountDownBeep1", variants: [{ file: "134_sndCountDownBeep1.mp3", className: "sndCountDownBeep1" }], thresholds: [] },
  { name: "CountDownBeep2", variants: [{ file: "133_sndCountDownBeep2.mp3", className: "sndCountDownBeep2" }], thresholds: [] },
  { name: "Unlock", variants: [{ file: "52_sndUnlock.mp3", className: "sndUnlock" }], thresholds: [] },
  { name: "EnemySquish", variants: [{ file: "127_sndEnemySquishv1.mp3", className: "sndEnemySquishv1" }, { file: "126_sndEnemySquishv2.mp3", className: "sndEnemySquishv2" }, { file: "125_sndEnemySquishv3.mp3", className: "sndEnemySquishv3" }, { file: "124_sndEnemySquishv4.mp3", className: "sndEnemySquishv4" }, { file: "123_sndEnemySquishv5.mp3", className: "sndEnemySquishv5" }, { file: "122_sndEnemySquishv6.mp3", className: "sndEnemySquishv6" }], thresholds: [0.16, 0.33, 0.5, 0.66, 0.83] },
  { name: "EnemyShoot", variants: [{ file: "130_sndEnemyShootv1.mp3", className: "sndEnemyShootv1" }, { file: "129_sndEnemyShootv2.mp3", className: "sndEnemyShootv2" }, { file: "128_sndEnemyShootv3.mp3", className: "sndEnemyShootv3" }], thresholds: [0.33, 0.66] },
  { name: "TrapFart", variants: [{ file: "56_sndTrapFartv1.mp3", className: "sndTrapFartv1" }, { file: "55_sndTrapFartv2.mp3", className: "sndTrapFartv2" }, { file: "54_sndTrapFartv3.mp3", className: "sndTrapFartv3" }], thresholds: [0.33, 0.66] },
  { name: "TeleportIn", variants: [{ file: "63_sndTeleportInv1.mp3", className: "sndTeleportInv1" }, { file: "62_sndTeleportInv2.mp3", className: "sndTeleportInv2" }, { file: "61_sndTeleportInv3.mp3", className: "sndTeleportInv3" }], thresholds: [0.33, 0.66] },
  { name: "TeleportOut", variants: [{ file: "60_sndTeleportOutv1.mp3", className: "sndTeleportOutv1" }, { file: "59_sndTeleportOutv2.mp3", className: "sndTeleportOutv2" }, { file: "58_sndTeleportOutv3.mp3", className: "sndTeleportOutv3" }], thresholds: [0.33, 0.66] },
  { name: "WeaponCannon", variants: [{ file: "140_sndWeaponCannon.mp3", className: "sndWeaponCannon" }], thresholds: [] },
  { name: "WeaponBigCannon", variants: [{ file: "157_sndWeaponBigCannon.mp3", className: "sndWeaponBigCannon" }], thresholds: [] },
  { name: "WeaponShotgun", variants: [{ file: "75_sndWeaponShotgun.mp3", className: "sndWeaponShotgun" }], thresholds: [] },
  { name: "WeaponMinigun", variants: [{ file: "85_sndWeaponMinigunv1.mp3", className: "sndWeaponMinigunv1" }, { file: "84_sndWeaponMinigunv2.mp3", className: "sndWeaponMinigunv2" }], thresholds: [0.5] },
  { name: "WeaponGummyBearCannon", variants: [{ file: "109_sndWeaponGummyBearCannonv1.mp3", className: "sndWeaponGummyBearCannonv1" }, { file: "108_sndWeaponGummyBearCannonv2.mp3", className: "sndWeaponGummyBearCannonv2" }], thresholds: [0.5] },
  { name: "WeaponPoisonCannon", variants: [{ file: "163_sndArrowv1.mp3", className: "sndArrowv1" }, { file: "162_sndArrowv2.mp3", className: "sndArrowv2" }], thresholds: [0.5] },
  { name: "WeaponCakeCannon", variants: [{ file: "142_sndWeaponCakeCannonv1.mp3", className: "sndWeaponCakeCannonv1" }, { file: "141_sndWeaponCakeCannonv2.mp3", className: "sndWeaponCakeCannonv2" }], thresholds: [0.5] },
  { name: "WeaponLaser", variants: [{ file: "89_sndWeaponLaser.mp3", className: "sndWeaponLaser" }], thresholds: [] },
  { name: "WeaponMagicCannon", variants: [{ file: "87_sndWeaponMagicCannonv1.mp3", className: "sndWeaponMagicCannonv1" }, { file: "86_sndWeaponMagicCannonv2.mp3", className: "sndWeaponMagicCannonv2" }], thresholds: [0.5] },
  { name: "GrenadeThrow", variants: [{ file: "111_sndGrenadeThrowv1.mp3", className: "sndGrenadeThrowv1" }, { file: "110_sndGrenadeThrowv2.mp3", className: "sndGrenadeThrowv2" }], thresholds: [0.5] },
  { name: "PlaceMine", variants: [{ file: "82_sndPlaceMine.mp3", className: "sndPlaceMine" }], thresholds: [] },
  { name: "FireSpikes", variants: [{ file: "118_sndFireSpikes.mp3", className: "sndFireSpikes" }], thresholds: [] },
  { name: "Shield", variants: [{ file: "76_sndShield.mp3", className: "sndShield" }], thresholds: [] },
  { name: "WeaponChange", variants: [{ file: "51_sndWeaponChange.mp3", className: "sndWeaponChange" }], thresholds: [] },
  { name: "SpecialReloaded", variants: [{ file: "74_sndSpecialReloaded.mp3", className: "sndSpecialReloaded" }], thresholds: [] },
  { name: "Rockets", variants: [{ file: "77_sndRockets.mp3", className: "sndRockets" }], thresholds: [] },
  { name: "Ball", variants: [{ file: "158_sndBall.mp3", className: "sndBall" }], thresholds: [] },
  { name: "CrazyCheese", variants: [{ file: "132_sndCrazyCheese.mp3", className: "sndCrazyCheese" }], thresholds: [] },
  { name: "MagicBunny", variants: [{ file: "88_sndMagicBunny.mp3", className: "sndMagicBunny" }], thresholds: [] },
  { name: "Freeze", variants: [{ file: "115_sndFreezev1.mp3", className: "sndFreezev1" }, { file: "114_sndFreezev2.mp3", className: "sndFreezev2" }, { file: "113_sndFreezev3.mp3", className: "sndFreezev3" }], thresholds: [0.33, 0.66] },
  { name: "ImpactTimedBomb", variants: [{ file: "91_sndImpactTimedBombv1.mp3", className: "sndImpactTimedBombv1" }, { file: "90_sndImpactTimedBombv2.mp3", className: "sndImpactTimedBombv2" }], thresholds: [0.5] },
  { name: "ImpactGummyBear", variants: [{ file: "98_sndImpactGummyBearv1.mp3", className: "sndImpactGummyBearv1" }, { file: "97_sndImpactGummyBearv2.mp3", className: "sndImpactGummyBearv2" }], thresholds: [0.5] },
  { name: "ImpactLaser", variants: [{ file: "96_sndImpactLaserv1.mp3", className: "sndImpactLaserv1" }, { file: "95_sndImpactLaserv2.mp3", className: "sndImpactLaserv2" }], thresholds: [0.5] },
  { name: "ImpactBullet", variants: [{ file: "107_sndImpactBulletv1.mp3", className: "sndImpactBulletv1" }, { file: "106_sndImpactBulletv2.mp3", className: "sndImpactBulletv2" }, { file: "105_sndImpactBulletv3.mp3", className: "sndImpactBulletv3" }], thresholds: [0.33, 0.66] },
  { name: "ImpactCake", variants: [{ file: "104_sndImpactCakev1.mp3", className: "sndImpactCakev1" }, { file: "103_sndImpactCakev2.mp3", className: "sndImpactCakev2" }, { file: "102_sndImpactCakev3.mp3", className: "sndImpactCakev3" }], thresholds: [0.33, 0.66] },
  { name: "ImpactMagic", variants: [{ file: "94_sndImpactMagicv1.mp3", className: "sndImpactMagicv1" }, { file: "93_sndImpactMagicv2.mp3", className: "sndImpactMagicv2" }, { file: "92_sndImpactMagicv3.mp3", className: "sndImpactMagicv3" }], thresholds: [0.33, 0.66] },
  { name: "ImpactCrazyCheese", variants: [{ file: "101_sndImpactCrazyCheesev1.mp3", className: "sndImpactCrazyCheesev1" }, { file: "100_sndImpactCrazyCheesev2.mp3", className: "sndImpactCrazyCheesev2" }, { file: "99_sndImpactCrazyCheesev3.mp3", className: "sndImpactCrazyCheesev3" }], thresholds: [0.33, 0.66] },
  { name: "ReflectBullet", variants: [{ file: "81_sndReflectv1.mp3", className: "sndReflectv1" }, { file: "80_sndReflectv2.mp3", className: "sndReflectv2" }, { file: "79_sndReflectv3.mp3", className: "sndReflectv3" }], thresholds: [0.33, 0.66] },
  { name: "BottomCollision", variants: [{ file: "144_sndBottomCollision.mp3", className: "sndBottomCollision" }], thresholds: [] },
  { name: "BorderTiny", variants: [{ file: "149_sndBorderTinyv1.mp3", className: "sndBorderTinyv1" }, { file: "148_sndBorderTinyv2.mp3", className: "sndBorderTinyv2" }, { file: "147_sndBorderTinyv3.mp3", className: "sndBorderTinyv3" }], thresholds: [0.33, 0.66] },
  { name: "BorderMedium", variants: [{ file: "151_sndBorderMediumv1.mp3", className: "sndBorderMediumv1" }, { file: "150_sndBorderMediumv2.mp3", className: "sndBorderMediumv2" }], thresholds: [0.5] },
  { name: "BorderBig", variants: [{ file: "155_sndBorderBigv1.mp3", className: "sndBorderBigv1" }, { file: "154_sndBorderBigv2.mp3", className: "sndBorderBigv2" }], thresholds: [0.5] },
  { name: "BorderBounce", variants: [{ file: "153_sndBorderBouncev1.mp3", className: "sndBorderBouncev1" }, { file: "152_sndBorderBouncev2.mp3", className: "sndBorderBouncev2" }], thresholds: [0.5] },
  { name: "TankEnemyCollision", variants: [{ file: "67_sndTankEnemyCollisionv1.mp3", className: "sndTankEnemyCollisionv1" }, { file: "66_sndTankEnemyCollisionv2.mp3", className: "sndTankEnemyCollisionv2" }], thresholds: [0.5] },
  { name: "TankShieldCollision", variants: [{ file: "65_sndTankShieldCollisionv1.mp3", className: "sndTankShieldCollisionv1" }, { file: "64_sndTankShieldCollisionv2.mp3", className: "sndTankShieldCollisionv2" }], thresholds: [0.5] },
  { name: "BossCollision", variants: [{ file: "146_sndBossCollisionv1.mp3", className: "sndBossCollisionv1" }, { file: "145_sndBossCollisionv2.mp3", className: "sndBossCollisionv2" }], thresholds: [0.5] },
  { name: "TankDamaged", variants: [{ file: "69_sndTankDamagedv1.mp3", className: "sndTankDamagedv1" }, { file: "68_sndTankDamagedv2.mp3", className: "sndTankDamagedv2" }], thresholds: [0.5] },
  { name: "ExplosionSmall", variants: [{ file: "120_sndExplosionSmallv1.mp3", className: "sndExplosionSmallv1" }, { file: "119_sndExplosionSmallv2.mp3", className: "sndExplosionSmallv2" }], thresholds: [0.5] },
  { name: "ExplosionBig", variants: [{ file: "121_sndExplosionBig.mp3", className: "sndExplosionBig" }], thresholds: [] },
];

/** The 8 music tracks, lazy-loaded: together they are 4.8 MB, 87% of all audio. */
export const MUSIC: readonly TrackEntry<MusicTrackName>[] = [
  { name: "Menu", file: "112_MusicMenu.mp3", className: "MusicMenu" },
  { name: "Normal", file: "135_MusicNormal.mp3", className: "MusicNormal" },
  { name: "Flag", file: "131_MusicFlag.mp3", className: "MusicFlag" },
  { name: "Tower", file: "57_MusicTower.mp3", className: "MusicTower" },
  { name: "Defense", file: "78_MusicDefense.mp3", className: "MusicDefense" },
  { name: "Boss", file: "73_MusicBoss.mp3", className: "MusicBoss" },
  { name: "Win", file: "164_MusicWin.mp3", className: "MusicWin" },
  { name: "Lose", file: "156_MusicLose.mp3", className: "MusicLose" },
];

/** Continuous loops with their own volume envelopes (SoundManager.handleLoops). */
export const LOOPS: readonly TrackEntry[] = [
  { name: "FlameThrower", file: "116_sndFlameThrowerLoop.mp3", className: "sndFlameThrowerLoop" },
  { name: "Burning", file: "143_sndBurningLoop.mp3", className: "sndBurningLoop" },
];

/**
 * mp3s present in the export but referenced by no AS3 class. Deliberately not
 * loaded — left here so they are recorded rather than silently dropped.
 */
export const ORPHAN_FILES: readonly string[] = ["169.mp3", "170.mp3", "174.mp3", "175.mp3", "176.mp3", "178.mp3", "182.mp3", "183.mp3"];

