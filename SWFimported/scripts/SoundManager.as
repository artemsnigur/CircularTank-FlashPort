package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Strong;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.media.SoundChannel;
   import flash.media.SoundTransform;
   
   public class SoundManager extends Sprite
   {
      
      public static var soundOn:Boolean = true;
      
      public static var musicOn:Boolean = true;
      
      public static var musicPaused:Boolean = false;
      
      public static var soundVol:Number = 1;
      
      public static var musicVol:Number = 1;
      
      public static var setVolumesBoolean:Boolean = false;
      
      public static var volumeSliderInUse:Boolean = false;
      
      public static var stSound:SoundTransform = new SoundTransform(0,0);
      
      public static var stLoop1:SoundTransform = new SoundTransform(0,0);
      
      public static var stLoop2:SoundTransform = new SoundTransform(0,0);
      
      public static var stMusic1:SoundTransform = new SoundTransform(0,0);
      
      public static var stMusic2:SoundTransform = new SoundTransform(0,0);
      
      public static var currentMusic:String = "None";
      
      public static var changeMusic:String = "None";
      
      public static var flameThrowerPlay:Boolean = false;
      
      public static var flameThrowerActive:Boolean = false;
      
      public static var flameThrowerVolume:Number = 0;
      
      public static var burningPlay:Boolean = false;
      
      public static var burningActive:Boolean = false;
      
      public static var burningVolume:Number = 0;
      
      public static var sfxArray:Array = [];
      
      public static var sfxPlayedArray:Array = [];
      
      private var weaponLaser:sndWeaponLaser = new sndWeaponLaser();
      
      private var weaponGummyBearCannonv1:sndWeaponGummyBearCannonv1 = new sndWeaponGummyBearCannonv1();
      
      private var weaponGummyBearCannonv2:sndWeaponGummyBearCannonv2 = new sndWeaponGummyBearCannonv2();
      
      private var rockets:sndRockets = new sndRockets();
      
      private var flameThrowerLoop:sndFlameThrowerLoop = new sndFlameThrowerLoop();
      
      private var teleportInv1:sndTeleportInv1 = new sndTeleportInv1();
      
      private var channelNumber:Number = 1;
      
      private var teleportInv3:sndTeleportInv3 = new sndTeleportInv3();
      
      private var soundMultiplier:Number = 1;
      
      private var enemyShootv1:sndEnemyShootv1 = new sndEnemyShootv1();
      
      private var enemyShootv2:sndEnemyShootv2 = new sndEnemyShootv2();
      
      private var enemyShootv3:sndEnemyShootv3 = new sndEnemyShootv3();
      
      private var weaponCannon:sndWeaponCannon = new sndWeaponCannon();
      
      private var tankShieldCollisionv1:sndTankShieldCollisionv1 = new sndTankShieldCollisionv1();
      
      private var teleportInv2:sndTeleportInv2 = new sndTeleportInv2();
      
      private var tankShieldCollisionv2:sndTankShieldCollisionv2 = new sndTankShieldCollisionv2();
      
      private var tankDamagedv1:sndTankDamagedv1 = new sndTankDamagedv1();
      
      private var tankDamagedv2:sndTankDamagedv2 = new sndTankDamagedv2();
      
      private var weaponMagicCannonv1:sndWeaponMagicCannonv1 = new sndWeaponMagicCannonv1();
      
      private var weaponShotgun:sndWeaponShotgun = new sndWeaponShotgun();
      
      private var flameThrowerVolChangeValue:Number = 0.1;
      
      private var weaponMagicCannonv2:sndWeaponMagicCannonv2 = new sndWeaponMagicCannonv2();
      
      private var musicDefense:MusicDefense = new MusicDefense();
      
      private var impactLaserv2:sndImpactLaserv2 = new sndImpactLaserv2();
      
      private var scMusicChannel1:SoundChannel = new SoundChannel();
      
      private var impactBulletv3:sndImpactBulletv3 = new sndImpactBulletv3();
      
      private var impactLaserv1:sndImpactLaserv1 = new sndImpactLaserv1();
      
      private var impactBulletv1:sndImpactBulletv1 = new sndImpactBulletv1();
      
      private var scMusicChannel2:SoundChannel = new SoundChannel();
      
      private var impactBulletv2:sndImpactBulletv2 = new sndImpactBulletv2();
      
      private var interfaceButtonClick:sndInterfaceButtonClick = new sndInterfaceButtonClick();
      
      private var valueHolder:Object = new Object();
      
      private var weaponPoisonCannonv2:sndArrowv2 = new sndArrowv2();
      
      private var weaponPoisonCannonv1:sndArrowv1 = new sndArrowv1();
      
      private var borderBigv1:sndBorderBigv1 = new sndBorderBigv1();
      
      private var borderBigv2:sndBorderBigv2 = new sndBorderBigv2();
      
      private var grenadeThrowv1:sndGrenadeThrowv1 = new sndGrenadeThrowv1();
      
      private var grenadeThrowv2:sndGrenadeThrowv2 = new sndGrenadeThrowv2();
      
      private var impactMagicv1:sndImpactMagicv1 = new sndImpactMagicv1();
      
      private var scLoopChannel2:SoundChannel = new SoundChannel();
      
      private var impactMagicv3:sndImpactMagicv3 = new sndImpactMagicv3();
      
      private var borderTinyv1:sndBorderTinyv1 = new sndBorderTinyv1();
      
      private var scLoopChannel1:SoundChannel = new SoundChannel();
      
      private var coinv1:sndCoinv1 = new sndCoinv1();
      
      private var interfaceButtonOver1v1:sndInterfaceButtonOver1v1 = new sndInterfaceButtonOver1v1();
      
      private var interfaceButtonOver1v2:sndInterfaceButtonOver1v2 = new sndInterfaceButtonOver1v2();
      
      private var borderTinyv3:sndBorderTinyv3 = new sndBorderTinyv3();
      
      private var weaponCakeCannonv1:sndWeaponCakeCannonv1 = new sndWeaponCakeCannonv1();
      
      private var coinv2:sndCoinv2 = new sndCoinv2();
      
      private var interfaceButtonOver1v3:sndInterfaceButtonOver1v3 = new sndInterfaceButtonOver1v3();
      
      private var crazyCheese:sndCrazyCheese = new sndCrazyCheese();
      
      private var musicLose:MusicLose = new MusicLose();
      
      private var impactMagicv2:sndImpactMagicv2 = new sndImpactMagicv2();
      
      private var weaponCakeCannonv2:sndWeaponCakeCannonv2 = new sndWeaponCakeCannonv2();
      
      private var coinv3:sndCoinv3 = new sndCoinv3();
      
      private var borderTinyv2:sndBorderTinyv2 = new sndBorderTinyv2();
      
      private var reflectBulletv1:sndReflectv1 = new sndReflectv1();
      
      private var reflectBulletv2:sndReflectv2 = new sndReflectv2();
      
      private var reflectBulletv3:sndReflectv3 = new sndReflectv3();
      
      private var explosionSmallv1:sndExplosionSmallv1 = new sndExplosionSmallv1();
      
      private var weaponChange:sndWeaponChange = new sndWeaponChange();
      
      private var explosionSmallv2:sndExplosionSmallv2 = new sndExplosionSmallv2();
      
      private var burningLoop:sndBurningLoop = new sndBurningLoop();
      
      private var borderMediumv1:sndBorderMediumv1 = new sndBorderMediumv1();
      
      private var borderMediumv2:sndBorderMediumv2 = new sndBorderMediumv2();
      
      private var fireSpikes:sndFireSpikes = new sndFireSpikes();
      
      private var trapFartv1:sndTrapFartv1 = new sndTrapFartv1();
      
      private var trapFartv2:sndTrapFartv2 = new sndTrapFartv2();
      
      private var trapFartv3:sndTrapFartv3 = new sndTrapFartv3();
      
      private var flagPickup:sndFlagPickup = new sndFlagPickup();
      
      private var weaponMinigunv2:sndWeaponMinigunv2 = new sndWeaponMinigunv2();
      
      private var weaponMinigunv1:sndWeaponMinigunv1 = new sndWeaponMinigunv1();
      
      private var impactGummyBearv1:sndImpactGummyBearv1 = new sndImpactGummyBearv1();
      
      private var impactGummyBearv2:sndImpactGummyBearv2 = new sndImpactGummyBearv2();
      
      private var musicMenu:MusicMenu = new MusicMenu();
      
      private var achievement:sndAchievement = new sndAchievement();
      
      private var musicFlag:MusicFlag = new MusicFlag();
      
      private var musicBoss:MusicBoss = new MusicBoss();
      
      private var currentMusicChannel:Number = 1;
      
      private var unlock:sndUnlock = new sndUnlock();
      
      private var bottomCollision:sndBottomCollision = new sndBottomCollision();
      
      private var scSoundChannel1:SoundChannel = new SoundChannel();
      
      private var scSoundChannel2:SoundChannel = new SoundChannel();
      
      private var scSoundChannel3:SoundChannel = new SoundChannel();
      
      private var borderBouncev2:sndBorderBouncev2 = new sndBorderBouncev2();
      
      private var freezev1:sndFreezev1 = new sndFreezev1();
      
      private var freezev2:sndFreezev2 = new sndFreezev2();
      
      private var freezev3:sndFreezev3 = new sndFreezev3();
      
      private var weaponBigCannon:sndWeaponBigCannon = new sndWeaponBigCannon();
      
      private var tutorial:sndTutorial = new sndTutorial();
      
      private var borderBouncev1:sndBorderBouncev1 = new sndBorderBouncev1();
      
      private var shield:sndShield = new sndShield();
      
      private var musicNormal:MusicNormal = new MusicNormal();
      
      private var burningVolChangeValue:Number = 0.2;
      
      private var award1:sndAward1 = new sndAward1();
      
      private var award2:sndAward2 = new sndAward2();
      
      private var award3:sndAward3 = new sndAward3();
      
      private var musicWin:MusicWin = new MusicWin();
      
      private var bossCollisionv1:sndBossCollisionv1 = new sndBossCollisionv1();
      
      private var bossCollisionv2:sndBossCollisionv2 = new sndBossCollisionv2();
      
      private var impactTimedBombv1:sndImpactTimedBombv1 = new sndImpactTimedBombv1();
      
      private var impactTimedBombv2:sndImpactTimedBombv2 = new sndImpactTimedBombv2();
      
      private var tankEnemyCollisionv1:sndTankEnemyCollisionv1 = new sndTankEnemyCollisionv1();
      
      private var impactCakev1:sndImpactCakev1 = new sndImpactCakev1();
      
      private var impactCakev3:sndImpactCakev3 = new sndImpactCakev3();
      
      private var impactCrazyCheesev1:sndImpactCrazyCheesev1 = new sndImpactCrazyCheesev1();
      
      private var impactCrazyCheesev2:sndImpactCrazyCheesev2 = new sndImpactCrazyCheesev2();
      
      private var impactCrazyCheesev3:sndImpactCrazyCheesev3 = new sndImpactCrazyCheesev3();
      
      private var tankEnemyCollisionv2:sndTankEnemyCollisionv2 = new sndTankEnemyCollisionv2();
      
      private var enemySquishv1:sndEnemySquishv1 = new sndEnemySquishv1();
      
      private var musicTween1:Tween = new Tween(this.valueHolder,"musicTweenVar",Strong.easeOut,1,0,30,false);
      
      private var musicTween2:Tween = new Tween(this.valueHolder,"musicTweenVar",Strong.easeOut,0,1,30,false);
      
      private var enemySquishv4:sndEnemySquishv4 = new sndEnemySquishv4();
      
      private var enemySquishv5:sndEnemySquishv5 = new sndEnemySquishv5();
      
      private var enemySquishv6:sndEnemySquishv6 = new sndEnemySquishv6();
      
      private var musicChanging:Boolean = false;
      
      private var enemySquishv3:sndEnemySquishv3 = new sndEnemySquishv3();
      
      private var interfaceButtonMoney:sndInterfaceButtonMoney = new sndInterfaceButtonMoney();
      
      private var enemySquishv2:sndEnemySquishv2 = new sndEnemySquishv2();
      
      private var explosionBig:sndExplosionBig = new sndExplosionBig();
      
      private var musicMultiplier:Number = 0.75;
      
      private var impactCakev2:sndImpactCakev2 = new sndImpactCakev2();
      
      private var specialReloaded:sndSpecialReloaded = new sndSpecialReloaded();
      
      private var magicBunny:sndMagicBunny = new sndMagicBunny();
      
      private var teleportOutv1:sndTeleportOutv1 = new sndTeleportOutv1();
      
      private var teleportOutv2:sndTeleportOutv2 = new sndTeleportOutv2();
      
      private var teleportOutv3:sndTeleportOutv3 = new sndTeleportOutv3();
      
      private var musicTower:MusicTower = new MusicTower();
      
      private var countDownBeep1:sndCountDownBeep1 = new sndCountDownBeep1();
      
      private var countDownBeep2:sndCountDownBeep2 = new sndCountDownBeep2();
      
      private var isAdded:Boolean = false;
      
      private var placeMine:sndPlaceMine = new sndPlaceMine();
      
      private var ball:sndBall = new sndBall();
      
      public function SoundManager()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.musicTween1.stop();
         this.musicTween2.stop();
      }
      
      private function playSound(soundName:String) : void
      {
         var sfxChannel:* = undefined;
         var theSound:* = undefined;
         var randomNum:* = Math.random();
         if(this.channelNumber == 1)
         {
            sfxChannel = this.scSoundChannel1;
            this.channelNumber = 1;
         }
         else if(this.channelNumber == 2)
         {
            sfxChannel = this.scSoundChannel2;
            this.channelNumber = 3;
         }
         else
         {
            sfxChannel = this.scSoundChannel3;
            this.channelNumber = 1;
         }
         if(soundOn && sfxChannel != null)
         {
            if(soundName == "InterfaceButtonOver1")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.interfaceButtonOver1v1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.interfaceButtonOver1v2;
               }
               else
               {
                  theSound = this.interfaceButtonOver1v3;
               }
            }
            else if(soundName == "InterfaceButtonClick")
            {
               theSound = this.interfaceButtonClick;
            }
            else if(soundName == "InterfaceButtonMoney")
            {
               theSound = this.interfaceButtonMoney;
            }
            else if(soundName == "Award1")
            {
               theSound = this.award1;
            }
            else if(soundName == "Award2")
            {
               theSound = this.award2;
            }
            else if(soundName == "Award3")
            {
               theSound = this.award3;
            }
            else if(soundName == "Achievement")
            {
               theSound = this.achievement;
            }
            else if(soundName == "Tutorial")
            {
               theSound = this.tutorial;
            }
            else if(soundName == "FlagPickup")
            {
               theSound = this.flagPickup;
            }
            else if(soundName == "Coin")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.coinv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.coinv2;
               }
               else
               {
                  theSound = this.coinv3;
               }
            }
            else if(soundName == "CountDownBeep1")
            {
               theSound = this.countDownBeep1;
            }
            else if(soundName == "CountDownBeep2")
            {
               theSound = this.countDownBeep2;
            }
            else if(soundName == "Unlock")
            {
               theSound = this.unlock;
            }
            else if(soundName == "EnemySquish")
            {
               if(randomNum < 0.16)
               {
                  theSound = this.enemySquishv1;
               }
               else if(randomNum < 0.33)
               {
                  theSound = this.enemySquishv2;
               }
               else if(randomNum < 0.5)
               {
                  theSound = this.enemySquishv3;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.enemySquishv4;
               }
               else if(randomNum < 0.83)
               {
                  theSound = this.enemySquishv5;
               }
               else
               {
                  theSound = this.enemySquishv6;
               }
            }
            else if(soundName == "EnemyShoot")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.enemyShootv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.enemyShootv2;
               }
               else
               {
                  theSound = this.enemyShootv3;
               }
            }
            else if(soundName == "TrapFart")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.trapFartv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.trapFartv2;
               }
               else
               {
                  theSound = this.trapFartv3;
               }
            }
            else if(soundName == "TeleportIn")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.teleportInv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.teleportInv2;
               }
               else
               {
                  theSound = this.teleportInv3;
               }
            }
            else if(soundName == "TeleportOut")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.teleportOutv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.teleportOutv2;
               }
               else
               {
                  theSound = this.teleportOutv3;
               }
            }
            else if(soundName == "WeaponCannon")
            {
               theSound = this.weaponCannon;
            }
            else if(soundName == "WeaponBigCannon")
            {
               theSound = this.weaponBigCannon;
            }
            else if(soundName == "WeaponShotgun")
            {
               theSound = this.weaponShotgun;
            }
            else if(soundName == "WeaponMinigun")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.weaponMinigunv1;
               }
               else
               {
                  theSound = this.weaponMinigunv2;
               }
            }
            else if(soundName == "WeaponGummyBearCannon")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.weaponGummyBearCannonv1;
               }
               else
               {
                  theSound = this.weaponGummyBearCannonv2;
               }
            }
            else if(soundName == "WeaponPoisonCannon")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.weaponPoisonCannonv1;
               }
               else
               {
                  theSound = this.weaponPoisonCannonv2;
               }
            }
            else if(soundName == "WeaponCakeCannon")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.weaponCakeCannonv1;
               }
               else
               {
                  theSound = this.weaponCakeCannonv2;
               }
            }
            else if(soundName == "WeaponLaser")
            {
               theSound = this.weaponLaser;
            }
            else if(soundName == "WeaponMagicCannon")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.weaponMagicCannonv1;
               }
               else
               {
                  theSound = this.weaponMagicCannonv2;
               }
            }
            else if(soundName == "GrenadeThrow")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.grenadeThrowv1;
               }
               else
               {
                  theSound = this.grenadeThrowv2;
               }
            }
            else if(soundName == "PlaceMine")
            {
               theSound = this.placeMine;
            }
            else if(soundName == "FireSpikes")
            {
               theSound = this.fireSpikes;
            }
            else if(soundName == "Shield")
            {
               theSound = this.shield;
            }
            else if(soundName == "WeaponChange")
            {
               theSound = this.weaponChange;
            }
            else if(soundName == "SpecialReloaded")
            {
               theSound = this.specialReloaded;
            }
            else if(soundName == "Rockets")
            {
               theSound = this.rockets;
            }
            else if(soundName == "Ball")
            {
               theSound = this.ball;
            }
            else if(soundName == "CrazyCheese")
            {
               theSound = this.crazyCheese;
            }
            else if(soundName == "MagicBunny")
            {
               theSound = this.magicBunny;
            }
            else if(soundName == "Freeze")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.freezev1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.freezev2;
               }
               else
               {
                  theSound = this.freezev3;
               }
            }
            else if(soundName == "ImpactTimedBomb")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.impactTimedBombv1;
               }
               else
               {
                  theSound = this.impactTimedBombv2;
               }
            }
            else if(soundName == "ImpactGummyBear")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.impactGummyBearv1;
               }
               else
               {
                  theSound = this.impactGummyBearv2;
               }
            }
            else if(soundName == "ImpactLaser")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.impactLaserv1;
               }
               else
               {
                  theSound = this.impactLaserv2;
               }
            }
            else if(soundName == "ImpactBullet")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.impactBulletv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.impactBulletv2;
               }
               else
               {
                  theSound = this.impactBulletv3;
               }
            }
            else if(soundName == "ImpactCake")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.impactCakev1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.impactCakev2;
               }
               else
               {
                  theSound = this.impactCakev3;
               }
            }
            else if(soundName == "ImpactMagic")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.impactMagicv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.impactMagicv2;
               }
               else
               {
                  theSound = this.impactMagicv3;
               }
            }
            else if(soundName == "ImpactCrazyCheese")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.impactCrazyCheesev1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.impactCrazyCheesev2;
               }
               else
               {
                  theSound = this.impactCrazyCheesev3;
               }
            }
            else if(soundName == "ReflectBullet")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.reflectBulletv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.reflectBulletv2;
               }
               else
               {
                  theSound = this.reflectBulletv3;
               }
            }
            else if(soundName == "BottomCollision")
            {
               theSound = this.bottomCollision;
            }
            else if(soundName == "BorderTiny")
            {
               if(randomNum < 0.33)
               {
                  theSound = this.borderTinyv1;
               }
               else if(randomNum < 0.66)
               {
                  theSound = this.borderTinyv2;
               }
               else
               {
                  theSound = this.borderTinyv3;
               }
            }
            else if(soundName == "BorderMedium")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.borderMediumv1;
               }
               else
               {
                  theSound = this.borderMediumv2;
               }
            }
            else if(soundName == "BorderBig")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.borderBigv1;
               }
               else
               {
                  theSound = this.borderBigv2;
               }
            }
            else if(soundName == "BorderBounce")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.borderBouncev1;
               }
               else
               {
                  theSound = this.borderBouncev2;
               }
            }
            else if(soundName == "TankEnemyCollision")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.tankEnemyCollisionv1;
               }
               else
               {
                  theSound = this.tankEnemyCollisionv2;
               }
            }
            else if(soundName == "TankShieldCollision")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.tankShieldCollisionv1;
               }
               else
               {
                  theSound = this.tankShieldCollisionv2;
               }
            }
            else if(soundName == "BossCollision")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.bossCollisionv1;
               }
               else
               {
                  theSound = this.bossCollisionv2;
               }
            }
            else if(soundName == "TankDamaged")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.tankDamagedv1;
               }
               else
               {
                  theSound = this.tankDamagedv2;
               }
            }
            else if(soundName == "ExplosionSmall")
            {
               if(randomNum < 0.5)
               {
                  theSound = this.explosionSmallv1;
               }
               else
               {
                  theSound = this.explosionSmallv2;
               }
            }
            else if(soundName == "ExplosionBig")
            {
               theSound = this.explosionBig;
            }
            if(theSound != null)
            {
               sfxChannel = theSound.play();
            }
            if(stSound != null && sfxChannel != null)
            {
               sfxChannel.soundTransform = stSound;
            }
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      private function channel1Complete(event:Event) : void
      {
         this.scMusicChannel1.removeEventListener(Event.SOUND_COMPLETE,this.channel1Complete);
         if(this.currentMusicChannel == 1)
         {
            this.playMusicOnChannel(1,currentMusic);
         }
         else
         {
            this.playMusicOnChannel(1,changeMusic);
         }
      }
      
      public function update(event:Event) : void
      {
         this.playSounds();
         this.handleMusicChange();
         this.handleLoops();
         if(setVolumesBoolean)
         {
            this.setVolumes();
            setVolumesBoolean = false;
            if(!volumeSliderInUse)
            {
               SaveManager.saveOptionSoundMusic();
            }
         }
         volumeSliderInUse = false;
      }
      
      private function handleMusicChange() : void
      {
         if(musicOn && !musicPaused)
         {
            if(currentMusic != changeMusic)
            {
               this.musicChanging = true;
               this.musicTween1.stop();
               this.musicTween2.stop();
               if(this.currentMusicChannel == 1)
               {
                  this.scMusicChannel2.stop();
                  this.playMusicOnChannel(2,changeMusic);
                  this.currentMusicChannel = 2;
                  this.musicTween1.start();
               }
               else if(this.currentMusicChannel == 2)
               {
                  this.scMusicChannel1.stop();
                  this.playMusicOnChannel(1,changeMusic);
                  this.currentMusicChannel = 1;
                  this.musicTween2.start();
               }
               currentMusic = changeMusic;
            }
            if(this.musicChanging)
            {
               stMusic1.volume = musicVol * this.musicMultiplier * this.valueHolder.musicTweenVar;
               this.scMusicChannel1.soundTransform = stMusic1;
               stMusic2.volume = musicVol * this.musicMultiplier * (1 - this.valueHolder.musicTweenVar);
               this.scMusicChannel2.soundTransform = stMusic2;
            }
         }
         else if((!musicOn || musicPaused) && currentMusic != "None")
         {
            currentMusic = "None";
            this.musicChanging = false;
            this.musicTween1.stop();
            this.musicTween2.stop();
            if(this.currentMusicChannel == 1)
            {
               this.scMusicChannel1.stop();
               this.scMusicChannel2.stop();
            }
            else if(this.currentMusicChannel == 2)
            {
               this.scMusicChannel2.stop();
               this.scMusicChannel1.stop();
            }
         }
      }
      
      private function handleLoops() : void
      {
         stLoop1.volume = flameThrowerVolume * this.soundMultiplier * soundVol;
         stLoop2.volume = burningVolume * this.soundMultiplier * soundVol;
         if(flameThrowerPlay)
         {
            if(!flameThrowerActive)
            {
               this.scLoopChannel1 = this.flameThrowerLoop.play(0,int.MAX_VALUE);
               flameThrowerActive = true;
            }
            if(flameThrowerVolume < 1)
            {
               if(flameThrowerVolume + this.flameThrowerVolChangeValue < 1)
               {
                  flameThrowerVolume += this.flameThrowerVolChangeValue;
               }
               else
               {
                  flameThrowerVolume = 1;
               }
            }
         }
         else if(flameThrowerVolume <= 0)
         {
            if(flameThrowerActive)
            {
               this.scLoopChannel1.stop();
               flameThrowerActive = false;
            }
         }
         else if(flameThrowerVolume - this.flameThrowerVolChangeValue * 2 > 0)
         {
            flameThrowerVolume -= this.flameThrowerVolChangeValue * 2;
         }
         else
         {
            flameThrowerVolume = 0;
         }
         if(burningPlay)
         {
            if(!burningActive)
            {
               this.scLoopChannel2 = this.burningLoop.play(0,int.MAX_VALUE);
               burningActive = true;
            }
            if(burningVolume < 1)
            {
               if(burningVolume + this.burningVolChangeValue < 1)
               {
                  burningVolume += this.burningVolChangeValue;
               }
               else
               {
                  burningVolume = 1;
               }
            }
         }
         else if(burningVolume <= 0)
         {
            if(burningActive)
            {
               this.scLoopChannel2.stop();
               burningActive = false;
            }
         }
         else if(burningVolume - this.burningVolChangeValue * 2 > 0)
         {
            burningVolume -= this.burningVolChangeValue * 2;
         }
         else
         {
            burningVolume = 0;
         }
         flameThrowerPlay = false;
         burningPlay = false;
         this.scLoopChannel1.soundTransform = stLoop1;
         this.scLoopChannel2.soundTransform = stLoop2;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.musicTween1.addEventListener(TweenEvent.MOTION_FINISH,this.musicTweenFinish);
            this.musicTween2.addEventListener(TweenEvent.MOTION_FINISH,this.musicTweenFinish);
            stSound.volume = soundVol * this.soundMultiplier;
            stMusic1.volume = musicVol * this.musicMultiplier;
            stLoop1.volume = 0;
            stLoop2.volume = 0;
            this.scMusicChannel1.soundTransform = stMusic1;
            this.scMusicChannel2.soundTransform = stMusic2;
         }
      }
      
      private function musicTweenFinish(event:TweenEvent) : void
      {
         this.musicChanging = false;
         if(this.currentMusicChannel == 1)
         {
            this.scMusicChannel2.stop();
         }
         else if(this.currentMusicChannel == 2)
         {
            this.scMusicChannel1.stop();
         }
      }
      
      public function playSounds() : void
      {
         var soundPlayed:* = undefined;
         var ii:* = undefined;
         sfxPlayedArray = [];
         for(var i:* = 0; i < sfxArray.length; i++)
         {
            soundPlayed = false;
            ii = 0;
            while(ii < sfxPlayedArray.length && !soundPlayed)
            {
               if(sfxArray[i] == sfxPlayedArray[ii])
               {
                  soundPlayed = true;
               }
               ii++;
            }
            if(!soundPlayed)
            {
               this.playSound(sfxArray[i]);
               sfxPlayedArray.push(sfxArray[i]);
            }
         }
         sfxArray = [];
      }
      
      private function playMusicOnChannel(channelNumber:Number, music:String) : void
      {
         var track:* = undefined;
         if(music == "Menu")
         {
            track = this.musicMenu;
         }
         else if(music == "Normal")
         {
            track = this.musicNormal;
         }
         else if(music == "Flag")
         {
            track = this.musicFlag;
         }
         else if(music == "Tower")
         {
            track = this.musicTower;
         }
         else if(music == "Defense")
         {
            track = this.musicDefense;
         }
         else if(music == "Boss")
         {
            track = this.musicBoss;
         }
         else if(music == "Win")
         {
            track = this.musicWin;
         }
         else if(music == "Lose")
         {
            track = this.musicLose;
         }
         if(channelNumber == 1)
         {
            this.scMusicChannel1 = track.play(0,int.MAX_VALUE);
            this.scMusicChannel1.addEventListener(Event.SOUND_COMPLETE,this.channel1Complete);
         }
         else if(channelNumber == 2)
         {
            this.scMusicChannel2 = track.play(0,int.MAX_VALUE);
            this.scMusicChannel2.addEventListener(Event.SOUND_COMPLETE,this.channel2Complete);
         }
      }
      
      public function setVolumes() : void
      {
         stSound.volume = soundVol * this.soundMultiplier;
         stLoop1.volume = soundVol * this.soundMultiplier;
         stLoop2.volume = soundVol * this.soundMultiplier;
         stMusic1.volume = musicVol * this.musicMultiplier;
         stMusic2.volume = musicVol * this.musicMultiplier;
         this.scMusicChannel1.soundTransform = stMusic1;
         this.scMusicChannel2.soundTransform = stMusic2;
         this.scSoundChannel1.soundTransform = stSound;
         this.scSoundChannel2.soundTransform = stSound;
         this.scSoundChannel3.soundTransform = stSound;
         this.scLoopChannel1.soundTransform = stLoop1;
         this.scLoopChannel2.soundTransform = stLoop2;
      }
      
      private function channel2Complete(event:Event) : void
      {
         this.scMusicChannel2.removeEventListener(Event.SOUND_COMPLETE,this.channel2Complete);
         if(this.currentMusicChannel == 2)
         {
            this.playMusicOnChannel(2,currentMusic);
         }
         else
         {
            this.playMusicOnChannel(2,changeMusic);
         }
      }
   }
}

