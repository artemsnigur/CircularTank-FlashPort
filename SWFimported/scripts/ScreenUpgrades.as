package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Elastic;
   import fl.transitions.easing.Strong;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   
   public class ScreenUpgrades extends Sprite
   {
      
      public static var upgradeType:Number;
      
      public static var money:* = 0;
      
      public static var uMaxHPLevel:* = 1;
      
      public static var levelsArray:Array = [1,0,0,0,0,0,0,0,0,0,0,0];
      
      public static var levelsMaxArray:Array = [10,10,10,10,10,10,10,10,10,10,10,10];
      
      public static var levelsArrayRemoved:Array = [0,0,0,0,0,0,0,0,0,0,0,0];
      
      public static var levelsArrayMisc:Array = [0,0,0,0];
      
      public static var levelsMaxArrayMisc:Array = [10,10,10,10];
      
      public static var levelsArrayMiscRemoved:Array = [0,0,0,0];
      
      public static var levelsArraySecondary:Array = [1,0,0,0,0,0,0,0,0,0,0,0];
      
      public static var levelsMaxArraySecondary:Array = [10,10,10,10,10,10,10,10,10,10,10,10];
      
      public static var levelsArraySecondaryRemoved:Array = [0,0,0,0,0,0,0,0,0,0,0,0];
      
      public static var upgradeArraySpeed:Array = [[2000,2400,2900,3400,4100,4900,5800,7000,8400,10000],[3.25,3.5,3.75,4,4.25,4.5,4.75,5,5.25,5.5,5.75],[0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1],[0.2,0.22,0.24,0.26,0.28,0.3,0.32,0.34,0.36,0.38,0.4]];
      
      public static var upgradeArrayBulletReflect:Array = [[3000,3500,4100,4800,5700,6600,7800,9100,10600,12500],[0.1,0.125,0.15,0.175,0.2,0.225,0.25,0.275,0.3,0.325]];
      
      public static var upgradeArrayEnemyAbsorb:Array = [[3000,3500,4100,4800,5700,6600,7800,9100,10600,12500],[0.1,0.15,0.19,0.24,0.28,0.33,0.37,0.42,0.46,0.5]];
      
      public static var upgradeArrayKillReload:Array = [[4000,4600,5400,6200,7200,8300,9700,11100,13000,15000],[2,3,4,5,6,7,8,9,10,11]];
      
      public static var upgradeArrayCannon:Array = [[0,2000,2400,3000,3700,4500,5500,6700,8200,10000],[13,12.8,12.6,12.3,12.1,11.9,11.6,11.4,11.2,11],[7,7.33,7.66,8,8.33,8.66,9,9.33,9.66,10],[30,33,36,39,42,45,48,51,54,57]];
      
      public static var upgradeArrayMiniGun:Array = [[1300,2000,2400,3000,3700,4500,5500,6700,8200,10000],[1.45,1.4,1.35,1.3,1.25,1.2,1.15,1.1,1.05,1],[1.2,1.35,1.5,1.65,1.8,1.95,2.1,2.25,2.4,2.6]];
      
      public static var upgradeArrayBigCannon:Array = [[1600,2000,2400,3000,3700,4500,5500,6700,8200,10000],[23.8,23.6,23.4,23.2,23,22.8,22.6,22.4,22.2,22],[7,7.33,7.66,8,8.33,8.66,9,9.33,9.66,10],[80,82,84,87,89,91,93,95,98,100]];
      
      public static var upgradeArrayFlamethrower:Array = [[1900,2000,2400,3000,3700,4500,5500,6700,8200,10000],[3.15,3.02,2.89,2.77,2.64,2.52,2.39,2.27,2.14,2],[0.28,0.31,0.33,0.36,0.38,0.41,0.43,0.46,0.48,0.5],[100,105.5,111.1,116.65,122.2,127.75,133.3,138.85,144.4,150]];
      
      public static var upgradeArrayShotgun:Array = [[2200,2000,2400,3000,3700,4500,5500,6700,8200,10000],[19.5,19.4,19.3,19.2,19.1,19,18.9,18.8,18.7,18.6],[2.9,2.96,3.03,3.09,3.16,3.23,3.29,3.36,3.43,3.5],[18,20,22,24,26,28,30,32,34,36],[5,5,5,7,7,7,9,9,9,9]];
      
      public static var upgradeArrayTimedBombCannon:Array = [[2400,2000,2400,3000,3700,4500,5500,6700,8200,10000],[9,8.89,8.78,8.67,8.56,8.45,8.34,8.23,8.12,8],[8,8.78,9.56,10.34,11.12,11.9,12.68,13.46,14.24,15],[110,111,112,113,114,115,116,117,118,120],[150,147,144,140,137,134,130,127,124,120]];
      
      public static var upgradeArrayGummyBearCannon:Array = [[2700,2000,2400,3000,3700,4500,5500,6700,8200,10000],[17,16.8,16.6,16.4,16.2,16,15.8,15.6,15.4,15.2],[6,6.5,7.1,7.7,8.2,8.8,9.3,9.9,10.4,11]];
      
      public static var upgradeArrayPoisonCannon:Array = [[3100,2000,2400,3000,3700,4500,5500,6700,8200,10000],[14,13.8,13.6,13.4,13.2,13,12.8,12.6,12.4,12.2],[1,1.2,1.4,1.6,1.8,2,2.2,2.4,2.6,2.8],[150,153.33,156.66,160,163.33,166.66,170,173.33,176.66,180],[2.5,2.77,3.05,3.32,3.6,3.87,4.15,4.42,4.7,5]];
      
      public static var upgradeArrayLaserCannon:Array = [[3500,2000,2400,3000,3700,4500,5500,6700,8200,10000],[23,22.8,22.6,22.4,22.2,22,21.8,21.6,21.4,21.2],[5.5,6.22,6.94,7.66,8.38,9.1,9.82,10.54,11.26,12]];
      
      public static var upgradeArrayCakeCannon:Array = [[3900,2000,2400,3000,3700,4500,5500,6700,8200,10000],[14,13.8,13.6,13.4,13.2,13,12.8,12.6,12.4,12.2],[5,5.66,6.33,7,7.66,8.33,9,9.66,10.33,11],[6,6,6,7,7,7,7,8,8,8]];
      
      public static var upgradeArrayPenetrationCannon:Array = [[4400,2000,2400,3000,3700,4500,5500,6700,8200,10000],[19,18.78,18.56,18.34,18.12,17.9,17.68,17.46,17.24,17],[6,6.44,6.88,7.22,7.66,8,8.44,8.88,9.22,10],[40,43,46,49,52,55,58,61,64,67]];
      
      public static var upgradeArrayMagicCannon:Array = [[5000,2000,2400,3000,3700,4500,5500,6700,8200,10000],[15,14.8,14.6,14.4,14.2,14,13.8,13.6,13.4,13.2],[2.2,2.35,2.49,2.64,2.78,2.93,3.07,3.22,3.36,3.5],[3,3,3,3,3,4,4,4,4,4]];
      
      public static var upgradeArrayMine:Array = [[0,2500,3000,3700,4500,5500,6800,8300,10200,12500],[600,600,600,600,600,600,600,600,600,600],[26,27,28,29,30,31,32,33,34,35],[195,200,205,210,215,220,225,230,235,240]];
      
      public static var upgradeArrayGrenade:Array = [[2000,2500,3000,3700,4500,5500,6800,8300,10200,12500],[650,650,650,650,650,650,650,650,650,650],[22,23,24,25,26,27,28,29,30,31],[175,180,185,190,195,200,205,210,215,220]];
      
      public static var upgradeArrayIceGrenade:Array = [[2000,2500,3000,3700,4500,5500,6800,8300,10200,12500],[400,400,400,400,400,400,400,400,400,400],[8,8.4,8.9,9.3,9.8,10.3,10.7,11.1,11.6,12],[150,157,165,173,181,188,196,204,212,220],[175,189,203,217,231,244,258,272,286,300]];
      
      public static var upgradeArrayPoisonGrenade:Array = [[2000,2500,3000,3700,4500,5500,6800,8300,10200,12500],[650,650,650,650,650,650,650,650,650,650],[4,4.2,4.4,4.6,4.8,5.1,5.3,5.5,5.7,6],[175,180,185,190,195,200,205,210,215,220],[360,370,380,390,400,410,420,430,440,450],[2,2.03,2.06,2.1,2.13,2.16,2.2,2.23,2.26,2.3]];
      
      public static var upgradeArrayIcicles:Array = [[2000,2500,3000,3700,4500,5500,6800,8300,10200,12500],[400,400,400,400,400,400,400,400,400,400],[8,8.4,8.9,9.3,9.8,10.3,10.7,11.1,11.6,12],[175,192,208,225,242,259,276,292,308,325],[23,24,25,26,27,28,29,30,31,32]];
      
      public static var upgradeArrayPoisonSpikes:Array = [[2000,2500,3000,3700,4500,5500,6800,8300,10200,12500],[700,700,700,700,700,700,700,700,700,700],[6,6.3,6.6,7,7.3,7.6,8,8.3,8.6,9],[310,320,330,340,350,360,370,380,390,400],[2.52,2.52,2.53,2.53,2.53,2.54,2.54,2.54,2.55,2.55],[32,32,32,32,32,32,32,32,32,32]];
      
      public static var upgradeArrayShield:Array = [[2500,3000,3600,4300,5100,6100,7300,8700,10500,12500],[700,700,700,700,700,700,700,700,700,700],[100,110,122,136,152,170,190,212,236,262]];
      
      public static var upgradeArrayRockets:Array = [[2500,3000,3600,4300,5100,6100,7300,8700,10500,12500],[700,700,700,700,700,700,700,700,700,700],[17,17.3,17.6,18,18.3,18.6,19,19.3,19.6,20],[51,52,53,54,55,56,57,58,59,60],[3,3,3,3,4,4,4,5,5,5]];
      
      public static var upgradeArrayIceball:Array = [[3000,3500,4100,4800,5700,6600,7800,9100,10700,12500],[400,400,400,400,400,400,400,400,400,400],[14,14.9,15.8,16.7,17.6,18.4,19.3,20.2,21.1,22],[100,104,109,113,118,122,127,131,136,140],[175,192,208,225,242,259,276,292,308,325],[220,229,238,247,256,264,273,282,291,300]];
      
      public static var upgradeArrayLavaball:Array = [[3000,3500,4100,4800,5700,6600,7800,9100,10700,12500],[700,700,700,700,700,700,700,700,700,700],[15,16.11,17.22,18.33,19.44,20.55,21.66,22.77,23.88,25],[110,117,123,130,137,144,150,157,163,170],[15,16.4,17.9,19.3,20.8,22.2,23.7,25.1,26.6,28],[250,253,256,260,263,266,270,273,276,280]];
      
      public static var upgradeArrayCrazyCheese:Array = [[3500,4000,4600,5300,6200,7100,8200,9400,10900,12500],[700,700,700,700,700,700,700,700,700,700],[16,16.7,17.3,18,18.7,19.3,20,20.7,21.3,22],[40,42.5,45,47.5,50,52.5,55,57.5,60,62.5],[6,6,7,7,7,8,8,8,9,9]];
      
      public static var upgradeArrayMagicBunny:Array = [[3500,4000,4600,5300,6200,7100,8200,9400,10900,12500],[900,900,900,900,900,900,900,900,900,900],[16,17.6,19.1,20.7,22.2,23.8,25.3,26.9,28.4,30],[5,5,5,5,5,6,6,6,6,6]];
      
      public static var primaryNameArray:Array = ["Cannon","MiniGun","Big Cannon","Flamethrower","Shotgun","Timed Bomb Cannon","Gummy Bear Cannon","Poison Cannon","Laser Cannon","Cake Cannon","Penetration Cannon","Magic Cannon"];
      
      public static var miscNameArray:Array = ["Tank Speed","Bullet Reflection","Enemy Absorption","Kill Reload"];
      
      public static var secondaryNameArray:Array = ["Mine","Grenade","Ice Grenade","Poison Grenade","Icicles","Poison Spikes","Shield","Rockets","Ice Ball","Lava Ball","Crazy Cheese","Magic Bunny"];
      
      public static var upgradeArraysArray1:Array = [upgradeArraySpeed,upgradeArrayBulletReflect,upgradeArrayEnemyAbsorb,upgradeArrayKillReload];
      
      public static var upgradeArraysArray2:Array = [upgradeArrayCannon,upgradeArrayMiniGun,upgradeArrayBigCannon,upgradeArrayFlamethrower,upgradeArrayShotgun,upgradeArrayTimedBombCannon,upgradeArrayGummyBearCannon,upgradeArrayPoisonCannon,upgradeArrayLaserCannon,upgradeArrayCakeCannon,upgradeArrayPenetrationCannon,upgradeArrayMagicCannon];
      
      public static var upgradeArraysArray3:Array = [upgradeArrayMine,upgradeArrayGrenade,upgradeArrayIceGrenade,upgradeArrayPoisonGrenade,upgradeArrayIcicles,upgradeArrayPoisonSpikes,upgradeArrayShield,upgradeArrayRockets,upgradeArrayIceball,upgradeArrayLavaball,upgradeArrayCrazyCheese,upgradeArrayMagicBunny];
      
      public static var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      public static var textFormat2:TextFormat = new TextFormat("JG",14,16777215,true,false,false);
      
      public static var textFormatGreen:TextFormat = new TextFormat("JG",14,65280,true,false,false);
      
      private static var moneyText:TextField = new TextField();
      
      private static var nameText:TextField = new TextField();
      
      private static var levelText:TextField = new TextField();
      
      private static var damageTypeText:TextField = new TextField();
      
      private static var priceText:TextField = new TextField();
      
      private static var infoText1:TextField = new TextField();
      
      private static var infoText2:TextField = new TextField();
      
      private static var infoText3:TextField = new TextField();
      
      private static var infoText4:TextField = new TextField();
      
      private static var infoText5:TextField = new TextField();
      
      private static var levelTextWeapon1:TextField = new TextField();
      
      private static var levelTextWeapon2:TextField = new TextField();
      
      private static var levelTextWeapon3:TextField = new TextField();
      
      private static var levelTextWeapon4:TextField = new TextField();
      
      private static var levelTextWeapon5:TextField = new TextField();
      
      private static var levelTextWeapon6:TextField = new TextField();
      
      private static var levelTextWeapon7:TextField = new TextField();
      
      private static var levelTextWeapon8:TextField = new TextField();
      
      private static var levelTextWeapon9:TextField = new TextField();
      
      private static var levelTextWeapon10:TextField = new TextField();
      
      private static var levelTextWeapon11:TextField = new TextField();
      
      private static var levelTextWeapon12:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon1:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon2:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon3:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon4:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon5:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon6:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon7:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon8:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon9:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon10:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon11:TextField = new TextField();
      
      private static var levelTextSecondaryWeapon12:TextField = new TextField();
      
      private static var levelTextMisc1:TextField = new TextField();
      
      private static var levelTextMisc2:TextField = new TextField();
      
      private static var levelTextMisc3:TextField = new TextField();
      
      private static var levelTextMisc4:TextField = new TextField();
      
      public static var selectedMisc:Number = 0;
      
      public static var selectedWeapon:Number = 0;
      
      public static var selectedSecondary:Number = 0;
      
      public static var contentMoving:Boolean = true;
      
      public static var playSlot1Tween:Boolean = false;
      
      public static var playSlot2Tween:Boolean = false;
      
      public static var tempPrimaryWeaponsMaxed:Number = 0;
      
      public static var tempSecondaryWeaponsMaxed:Number = 0;
      
      private var bPrimaryMiniGun:ButtonPrimaryMiniGun = new ButtonPrimaryMiniGun();
      
      private var weaponSlotImage1:WeaponSlotImage = new WeaponSlotImage();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var bSecondaryPoisonGrenade:ButtonSecondaryPoisonGrenade = new ButtonSecondaryPoisonGrenade();
      
      private var bSecondaryIceGrenade:ButtonSecondaryIceGrenade = new ButtonSecondaryIceGrenade();
      
      private var weaponSlotImage2:WeaponSlotImage = new WeaponSlotImage();
      
      private var shadowArray:Array = filters;
      
      private var bgUpgradeMenu:BackgroundUpgradeMenu = new BackgroundUpgradeMenu();
      
      private var textLayer:MovieClip = new MovieClip();
      
      private var bUpgradeInfo:ButtonUpgradeInfo = new ButtonUpgradeInfo();
      
      private var slotImageTween1X:Tween = new Tween(this.weaponSlotImage1,"scaleX",Elastic.easeOut,1.5,1,20,false);
      
      private var bSecondaryCrazyCheese:ButtonSecondaryCrazyCheese = new ButtonSecondaryCrazyCheese();
      
      private var bSecondaryLavaball:ButtonSecondaryLavaball = new ButtonSecondaryLavaball();
      
      private var shadowArray2:Array = filters;
      
      private var bMore1:ButtonMoreWeapons = new ButtonMoreWeapons();
      
      private var bSecondaryShield:ButtonSecondaryShield = new ButtonSecondaryShield();
      
      private var slotImageTween1Y:Tween = new Tween(this.weaponSlotImage1,"scaleY",Elastic.easeOut,1.5,1,20,false);
      
      private var bgWindowBar:BackgroundWindowBar = new BackgroundWindowBar();
      
      private var buttonLayer:MovieClip = new MovieClip();
      
      private var bMore2:ButtonMoreWeapons = new ButtonMoreWeapons();
      
      private var bPrimaryLaserCannon:ButtonPrimaryLaserCannon = new ButtonPrimaryLaserCannon();
      
      private var slotImageTween2Y:Tween = new Tween(this.weaponSlotImage2,"scaleY",Elastic.easeOut,1.5,1,20,false);
      
      private var bUpgrades:ButtonUpgrades = new ButtonUpgrades();
      
      private var bUpgrade:ButtonUpgrade = new ButtonUpgrade();
      
      private var bSecondaryIcicles:ButtonSecondaryIcicles = new ButtonSecondaryIcicles();
      
      private var bPrimaryCannon:ButtonPrimaryCannon = new ButtonPrimaryCannon();
      
      private var slotImageTween2X:Tween = new Tween(this.weaponSlotImage2,"scaleX",Elastic.easeOut,1.5,1,20,false);
      
      private var theTitle:TitleUpgrades = new TitleUpgrades();
      
      private var bMiscSpeed:ButtonMiscSpeed = new ButtonMiscSpeed();
      
      private var bPrimaryTimedBombCannon:ButtonPrimaryTimedBombCannon = new ButtonPrimaryTimedBombCannon();
      
      private var bSecondaryIceball:ButtonSecondaryIceball = new ButtonSecondaryIceball();
      
      private var contentTween:Tween;
      
      private var contentHolder:MovieClip = new MovieClip();
      
      private var bMiscEnemyAbsorb:ButtonMiscEnemyAbsorb = new ButtonMiscEnemyAbsorb();
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var bPrimaryPoisonCannon:ButtonPrimaryPoisonCannon = new ButtonPrimaryPoisonCannon();
      
      private var bMiscBulletReflect:ButtonMiscBulletReflect = new ButtonMiscBulletReflect();
      
      private var textLayerTop:MovieClip = new MovieClip();
      
      private var bSecondaryRockets:ButtonSecondaryRockets = new ButtonSecondaryRockets();
      
      private var bgWindow:BackgroundWindow = new BackgroundWindow();
      
      private var iconDamageType:IconDamageTypes = new IconDamageTypes();
      
      private var bEquipSlot1:ButtonEquipSlot1 = new ButtonEquipSlot1();
      
      private var bEquipSlot2:ButtonEquipSlot2 = new ButtonEquipSlot2();
      
      private var bSecondaryPoisonSpikes:ButtonSecondaryPoisonSpikes = new ButtonSecondaryPoisonSpikes();
      
      private var bPrimaryMagicCannon:ButtonPrimaryMagicCannon = new ButtonPrimaryMagicCannon();
      
      private var bSecondaryMagicBunny:ButtonSecondaryMagicBunny = new ButtonSecondaryMagicBunny();
      
      private var bMiscKillReload:ButtonMiscKillReload = new ButtonMiscKillReload();
      
      private var bPrimaryShotgun:ButtonPrimaryShotgun = new ButtonPrimaryShotgun();
      
      public var pAchievements:PartAchievements;
      
      private var bgWindowBar3:BackgroundWindowBar3 = new BackgroundWindowBar3();
      
      private var bgWindowBar5:BackgroundWindowBar5 = new BackgroundWindowBar5();
      
      private var bPrimaryBigCannon:ButtonPrimaryBigCannon = new ButtonPrimaryBigCannon();
      
      private var bSecondaryGrenade:ButtonSecondaryGrenade = new ButtonSecondaryGrenade();
      
      private var bBuy:ButtonBuy = new ButtonBuy();
      
      private var myShadow2:* = new DropShadowFilter(0,0,0,1,2,2,5,2);
      
      private var bSecondaryMine:ButtonSecondaryMine = new ButtonSecondaryMine();
      
      private var bPrimaryPenetrationCannon:ButtonPrimaryPenetrationCannon = new ButtonPrimaryPenetrationCannon();
      
      private var tweenVar:Object = new Object();
      
      private var bPrimaryCakeCannon:ButtonPrimaryCakeCannon = new ButtonPrimaryCakeCannon();
      
      private var levelGuide:LevelGuide = new LevelGuide();
      
      private var bgUpgradeMenu2:BackgroundUpgradeMenu2 = new BackgroundUpgradeMenu2();
      
      private var bLevelSelect:ButtonLevelSelect = new ButtonLevelSelect();
      
      private var bPrimaryFlamethrower:ButtonPrimaryFlamethrower = new ButtonPrimaryFlamethrower();
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var bEquip:ButtonEquip = new ButtonEquip();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var isAdded:Boolean = false;
      
      private var bWeaponSwitch:ButtonWeaponSwitch = new ButtonWeaponSwitch();
      
      private var bPrimaryGummyBearCannon:ButtonPrimaryGummyBearCannon = new ButtonPrimaryGummyBearCannon();
      
      public function ScreenUpgrades()
      {
         this.contentTween = new Tween(this.tweenVar,"x",Strong.easeOut,-410,0,20,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
         this.shadowArray2.push(this.myShadow2);
         this.contentTween.stop();
         this.slotImageTween1X.stop();
         this.slotImageTween1Y.stop();
         this.slotImageTween2X.stop();
         this.slotImageTween2Y.stop();
         this.weaponSlotImage1.scaleX = 1;
         this.weaponSlotImage1.scaleY = 1;
         this.weaponSlotImage2.scaleX = 1;
         this.weaponSlotImage2.scaleY = 1;
      }
      
      public static function setTempVar(variable:String) : void
      {
         var i:* = undefined;
         var ii:* = undefined;
         if(variable == "tempPrimaryWeaponsMaxed")
         {
            tempPrimaryWeaponsMaxed = 0;
            for(i = 0; i < levelsArray.length; i++)
            {
               if(levelsArray[i] == 10)
               {
                  ++tempPrimaryWeaponsMaxed;
               }
            }
         }
         else if(variable == "tempSecondaryWeaponsMaxed")
         {
            tempSecondaryWeaponsMaxed = 0;
            for(ii = 0; ii < levelsArraySecondary.length; ii++)
            {
               if(levelsArraySecondary[ii] == 10)
               {
                  ++tempSecondaryWeaponsMaxed;
               }
            }
         }
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.contentTween.addEventListener(TweenEvent.MOTION_FINISH,this.contentTweenFinish);
            contentMoving = true;
            playSlot1Tween = false;
            playSlot2Tween = false;
            this.resetTempVariables("Start");
            upgradeType = 0;
            addChild(this.bgTitle);
            addChild(this.bgUpgradeMenu);
            this.bgUpgradeMenu.y = this.bgTitle.height;
            this.contentHolder.addChild(this.bgUpgradeMenu2);
            this.bgUpgradeMenu2.y = this.bgTitle.height;
            addChild(this.bgWindow);
            this.bgWindow.x = 640 - this.bgWindow.width;
            this.bgWindow.y = this.bgTitle.height;
            addChild(this.bgWindowBar);
            this.bgWindowBar.x = this.bgWindow.x;
            this.bgWindowBar.y = this.bgWindow.y;
            addChild(this.bgWindowBar3);
            this.bgWindowBar3.x = this.bgWindow.x;
            this.bgWindowBar3.y = this.bgWindow.y + this.bgWindowBar.height;
            this.bgWindowBar3.alpha = 0;
            addChild(this.bgWindowBar5);
            this.bgWindowBar5.x = this.bgWindow.x;
            this.bgWindowBar5.y = this.bgWindowBar3.y + this.bgWindowBar3.height;
            this.bgWindowBar5.alpha = 0;
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            addChild(this.sponsorLogo);
            addChild(this.buttonLayer);
            addChild(this.textLayer);
            this.textLayer.mouseEnabled = false;
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 480 - this.bottomBar.height;
            selectedMisc = 0;
            selectedWeapon = 0;
            selectedSecondary = 0;
            this.bPrimaryCannon.number = 1;
            this.contentHolder.addChild(this.bPrimaryCannon);
            this.bPrimaryCannon.x = 36 - 18;
            this.bPrimaryCannon.y = 36 * 2 - 18 + 88;
            this.bPrimaryMiniGun.number = 2;
            this.contentHolder.addChild(this.bPrimaryMiniGun);
            this.bPrimaryMiniGun.x = 36 * 2 - 18;
            this.bPrimaryMiniGun.y = 36 * 2 - 18 + 88;
            this.bPrimaryBigCannon.number = 3;
            this.contentHolder.addChild(this.bPrimaryBigCannon);
            this.bPrimaryBigCannon.x = 36 * 3 - 18;
            this.bPrimaryBigCannon.y = 36 * 2 - 18 + 88;
            this.bPrimaryFlamethrower.number = 4;
            this.contentHolder.addChild(this.bPrimaryFlamethrower);
            this.bPrimaryFlamethrower.x = 36 * 4 - 18;
            this.bPrimaryFlamethrower.y = 36 * 2 - 18 + 88;
            this.bPrimaryShotgun.number = 5;
            this.contentHolder.addChild(this.bPrimaryShotgun);
            this.bPrimaryShotgun.x = 36 * 5 - 18;
            this.bPrimaryShotgun.y = 36 * 2 - 18 + 88;
            this.bPrimaryTimedBombCannon.number = 6;
            this.contentHolder.addChild(this.bPrimaryTimedBombCannon);
            this.bPrimaryTimedBombCannon.x = 36 * 6 - 18;
            this.bPrimaryTimedBombCannon.y = 36 * 2 - 18 + 88;
            this.bPrimaryGummyBearCannon.number = 7;
            this.contentHolder.addChild(this.bPrimaryGummyBearCannon);
            this.bPrimaryGummyBearCannon.x = 36 - 18;
            this.bPrimaryGummyBearCannon.y = 36 * 3 - 18 + 88;
            this.bPrimaryPoisonCannon.number = 8;
            this.contentHolder.addChild(this.bPrimaryPoisonCannon);
            this.bPrimaryPoisonCannon.x = 36 * 2 - 18;
            this.bPrimaryPoisonCannon.y = 36 * 3 - 18 + 88;
            this.bPrimaryLaserCannon.number = 9;
            this.contentHolder.addChild(this.bPrimaryLaserCannon);
            this.bPrimaryLaserCannon.x = 36 * 3 - 18;
            this.bPrimaryLaserCannon.y = 36 * 3 - 18 + 88;
            this.bPrimaryCakeCannon.number = 10;
            this.contentHolder.addChild(this.bPrimaryCakeCannon);
            this.bPrimaryCakeCannon.x = 36 * 4 - 18;
            this.bPrimaryCakeCannon.y = 36 * 3 - 18 + 88;
            if(Main.extraStuff)
            {
               this.bPrimaryPenetrationCannon.number = 11;
               this.contentHolder.addChild(this.bPrimaryPenetrationCannon);
               this.bPrimaryPenetrationCannon.x = 36 * 5 - 18;
               this.bPrimaryPenetrationCannon.y = 36 * 3 - 18 + 88;
               this.bPrimaryMagicCannon.number = 12;
               this.contentHolder.addChild(this.bPrimaryMagicCannon);
               this.bPrimaryMagicCannon.x = 36 * 6 - 18;
               this.bPrimaryMagicCannon.y = 36 * 3 - 18 + 88;
            }
            else
            {
               this.contentHolder.addChild(this.bMore1);
               this.bMore1.x = 36 * 5 - 18;
               this.bMore1.y = 36 * 3 - 18 + 88;
            }
            this.bSecondaryMine.number = 1;
            this.contentHolder.addChild(this.bSecondaryMine);
            this.bSecondaryMine.x = 36 * 1 - 18;
            this.bSecondaryMine.y = 36 * 2 - 18 + 214;
            this.bSecondaryGrenade.number = 2;
            this.contentHolder.addChild(this.bSecondaryGrenade);
            this.bSecondaryGrenade.x = 36 * 2 - 18;
            this.bSecondaryGrenade.y = 36 * 2 - 18 + 214;
            this.bSecondaryIceGrenade.number = 3;
            this.contentHolder.addChild(this.bSecondaryIceGrenade);
            this.bSecondaryIceGrenade.x = 36 * 3 - 18;
            this.bSecondaryIceGrenade.y = 36 * 2 - 18 + 214;
            this.bSecondaryPoisonGrenade.number = 4;
            this.contentHolder.addChild(this.bSecondaryPoisonGrenade);
            this.bSecondaryPoisonGrenade.x = 36 * 4 - 18;
            this.bSecondaryPoisonGrenade.y = 36 * 2 - 18 + 214;
            this.bSecondaryIcicles.number = 5;
            this.contentHolder.addChild(this.bSecondaryIcicles);
            this.bSecondaryIcicles.x = 36 * 5 - 18;
            this.bSecondaryIcicles.y = 36 * 2 - 18 + 214;
            this.bSecondaryPoisonSpikes.number = 6;
            this.contentHolder.addChild(this.bSecondaryPoisonSpikes);
            this.bSecondaryPoisonSpikes.x = 36 * 6 - 18;
            this.bSecondaryPoisonSpikes.y = 36 * 2 - 18 + 214;
            this.bSecondaryShield.number = 7;
            this.contentHolder.addChild(this.bSecondaryShield);
            this.bSecondaryShield.x = 36 * 1 - 18;
            this.bSecondaryShield.y = 36 * 3 - 18 + 214;
            this.bSecondaryRockets.number = 8;
            this.contentHolder.addChild(this.bSecondaryRockets);
            this.bSecondaryRockets.x = 36 * 2 - 18;
            this.bSecondaryRockets.y = 36 * 3 - 18 + 214;
            this.bSecondaryIceball.number = 9;
            this.contentHolder.addChild(this.bSecondaryIceball);
            this.bSecondaryIceball.x = 36 * 3 - 18;
            this.bSecondaryIceball.y = 36 * 3 - 18 + 214;
            this.bSecondaryLavaball.number = 10;
            this.contentHolder.addChild(this.bSecondaryLavaball);
            this.bSecondaryLavaball.x = 36 * 4 - 18;
            this.bSecondaryLavaball.y = 36 * 3 - 18 + 214;
            if(Main.extraStuff)
            {
               this.bSecondaryCrazyCheese.number = 11;
               this.contentHolder.addChild(this.bSecondaryCrazyCheese);
               this.bSecondaryCrazyCheese.x = 36 * 5 - 18;
               this.bSecondaryCrazyCheese.y = 36 * 3 - 18 + 214;
               this.bSecondaryMagicBunny.number = 12;
               this.contentHolder.addChild(this.bSecondaryMagicBunny);
               this.bSecondaryMagicBunny.x = 36 * 6 - 18;
               this.bSecondaryMagicBunny.y = 36 * 3 - 18 + 214;
            }
            else
            {
               this.contentHolder.addChild(this.bMore2);
               this.bMore2.x = 36 * 5 - 18;
               this.bMore2.y = 36 * 3 - 18 + 214;
            }
            this.bMiscSpeed.number = 1;
            this.contentHolder.addChild(this.bMiscSpeed);
            this.bMiscSpeed.x = 36 * 1 - 18;
            this.bMiscSpeed.y = 36 * 5 + 214;
            this.bMiscBulletReflect.number = 2;
            this.contentHolder.addChild(this.bMiscBulletReflect);
            this.bMiscBulletReflect.x = 36 * 2 - 18;
            this.bMiscBulletReflect.y = 36 * 5 + 214;
            this.bMiscEnemyAbsorb.number = 3;
            this.contentHolder.addChild(this.bMiscEnemyAbsorb);
            this.bMiscEnemyAbsorb.x = 36 * 3 - 18;
            this.bMiscEnemyAbsorb.y = 36 * 5 + 214;
            this.bMiscKillReload.number = 4;
            this.contentHolder.addChild(this.bMiscKillReload);
            this.bMiscKillReload.x = 36 * 4 - 18;
            this.bMiscKillReload.y = 36 * 5 + 214;
            this.contentHolder.addChild(this.weaponSlotImage1);
            this.weaponSlotImage1.slot = 1;
            this.weaponSlotImage1.x = 284;
            this.weaponSlotImage1.y = 178;
            this.contentHolder.addChild(this.weaponSlotImage2);
            this.weaponSlotImage2.slot = 2;
            this.weaponSlotImage2.x = 340;
            this.weaponSlotImage2.y = 178;
            this.contentHolder.addChild(this.bWeaponSwitch);
            this.bWeaponSwitch.x = 312;
            this.bWeaponSwitch.y = 178;
            this.addText(moneyText,textFormat,65280,"$" + money,32,230,this.bgWindow.x,this.bgWindow.y + 5,true);
            this.addText(nameText,textFormat,16777215,"",32,230,this.bgWindow.x,this.bgWindow.y + 36,true);
            this.addText(levelText,textFormat,16777215,"",32,230,this.bgWindow.x,this.bgWindow.y + 60,true);
            this.addText(damageTypeText,textFormat,16711680,"",32,230,this.bgWindow.x,this.bgWindow.y + 92,true);
            this.addText(priceText,textFormat,16777215,"",32,230,this.bgWindow.x,229,true,false);
            this.addText(infoText1,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 211);
            this.addText(infoText2,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 235);
            this.addText(infoText3,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 259);
            this.addText(infoText4,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 283);
            this.addText(infoText5,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 308);
            priceText.filters = this.shadowArray2;
            addChild(this.contentHolder);
            this.contentHolder.x = -410;
            this.contentTween.start();
            this.contentHolder.addChild(this.textLayerTop);
            this.textLayerTop.mouseEnabled = false;
            this.addText(levelTextWeapon1,textFormat2,16777215,"",20,20,this.bPrimaryCannon.x + 1,this.bPrimaryCannon.y + 2,true,true,true);
            this.addText(levelTextWeapon2,textFormat2,16777215,"",20,20,this.bPrimaryMiniGun.x + 1,this.bPrimaryMiniGun.y + 2,true,true,true);
            this.addText(levelTextWeapon3,textFormat2,16777215,"",20,20,this.bPrimaryBigCannon.x + 1,this.bPrimaryBigCannon.y + 2,true,true,true);
            this.addText(levelTextWeapon4,textFormat2,16777215,"",20,20,this.bPrimaryFlamethrower.x + 1,this.bPrimaryFlamethrower.y + 2,true,true,true);
            this.addText(levelTextWeapon5,textFormat2,16777215,"",20,20,this.bPrimaryShotgun.x + 1,this.bPrimaryShotgun.y + 2,true,true,true);
            this.addText(levelTextWeapon6,textFormat2,16777215,"",20,20,this.bPrimaryTimedBombCannon.x + 1,this.bPrimaryTimedBombCannon.y + 2,true,true,true);
            this.addText(levelTextWeapon7,textFormat2,16777215,"",20,20,this.bPrimaryGummyBearCannon.x + 1,this.bPrimaryGummyBearCannon.y + 2,true,true,true);
            this.addText(levelTextWeapon8,textFormat2,16777215,"",20,20,this.bPrimaryPoisonCannon.x + 1,this.bPrimaryPoisonCannon.y + 2,true,true,true);
            this.addText(levelTextWeapon9,textFormat2,16777215,"",20,20,this.bPrimaryLaserCannon.x + 1,this.bPrimaryLaserCannon.y + 2,true,true,true);
            this.addText(levelTextWeapon10,textFormat2,16777215,"",20,20,this.bPrimaryCakeCannon.x + 1,this.bPrimaryCakeCannon.y + 2,true,true,true);
            if(Main.extraStuff)
            {
               this.addText(levelTextWeapon11,textFormat2,16777215,"",20,20,this.bPrimaryPenetrationCannon.x + 1,this.bPrimaryPenetrationCannon.y + 2,true,true,true);
               this.addText(levelTextWeapon12,textFormat2,16777215,"",20,20,this.bPrimaryMagicCannon.x + 1,this.bPrimaryMagicCannon.y + 2,true,true,true);
            }
            this.addText(levelTextSecondaryWeapon1,textFormat2,16777215,"",20,20,this.bSecondaryMine.x + 1,this.bSecondaryMine.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon2,textFormat2,16777215,"",20,20,this.bSecondaryGrenade.x + 1,this.bSecondaryGrenade.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon3,textFormat2,16777215,"",20,20,this.bSecondaryIceGrenade.x + 1,this.bSecondaryIceGrenade.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon4,textFormat2,16777215,"",20,20,this.bSecondaryPoisonGrenade.x + 1,this.bSecondaryPoisonGrenade.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon5,textFormat2,16777215,"",20,20,this.bSecondaryIcicles.x + 1,this.bSecondaryIcicles.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon6,textFormat2,16777215,"",20,20,this.bSecondaryPoisonSpikes.x + 1,this.bSecondaryPoisonSpikes.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon7,textFormat2,16777215,"",20,20,this.bSecondaryShield.x + 1,this.bSecondaryShield.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon8,textFormat2,16777215,"",20,20,this.bSecondaryRockets.x + 1,this.bSecondaryRockets.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon9,textFormat2,16777215,"",20,20,this.bSecondaryIceball.x + 1,this.bSecondaryIceball.y + 2,true,true,true);
            this.addText(levelTextSecondaryWeapon10,textFormat2,16777215,"",20,20,this.bSecondaryLavaball.x + 1,this.bSecondaryLavaball.y + 2,true,true,true);
            if(Main.extraStuff)
            {
               this.addText(levelTextSecondaryWeapon11,textFormat2,16777215,"",20,20,this.bSecondaryCrazyCheese.x + 1,this.bSecondaryCrazyCheese.y + 2,true,true,true);
               this.addText(levelTextSecondaryWeapon12,textFormat2,16777215,"",20,20,this.bSecondaryMagicBunny.x + 1,this.bSecondaryMagicBunny.y + 2,true,true,true);
            }
            this.addText(levelTextMisc1,textFormat2,16777215,"",20,20,this.bMiscSpeed.x + 1,this.bMiscSpeed.y + 2,true,true,true);
            this.addText(levelTextMisc2,textFormat2,16777215,"",20,20,this.bMiscBulletReflect.x + 1,this.bMiscBulletReflect.y + 2,true,true,true);
            this.addText(levelTextMisc3,textFormat2,16777215,"",20,20,this.bMiscEnemyAbsorb.x + 1,this.bMiscEnemyAbsorb.y + 2,true,true,true);
            this.addText(levelTextMisc4,textFormat2,16777215,"",20,20,this.bMiscKillReload.x + 1,this.bMiscKillReload.y + 2,true,true,true);
            this.levelGuide.pText = this.pInfoText;
            this.contentHolder.addChild(this.levelGuide);
            this.levelGuide.x = 258;
            this.levelGuide.y = 348;
            if(PartAchievements.achievementPopUp)
            {
               this.pAchievements = new PartAchievements();
               addChild(this.pAchievements);
            }
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
            this.changeContent();
         }
      }
      
      private function resetTempVariables(type:String) : void
      {
         switch(type)
         {
            case "Start":
               setTempVar("tempPrimaryWeaponsMaxed");
               setTempVar("tempSecondaryWeaponsMaxed");
               break;
            case "Quit":
               tempPrimaryWeaponsMaxed = 0;
               tempSecondaryWeaponsMaxed = 0;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         ScreenAchievements.updateAchievements();
         this.resetTempVariables("Quit");
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function calculateTotalPrice() : void
      {
         var upgradeArrayContainer:Array = null;
         var i:* = undefined;
         var ii:* = undefined;
         var totalPrice:* = 0;
         for(var u:* = 0; u < 3; u++)
         {
            switch(u)
            {
               case 0:
                  upgradeArrayContainer = upgradeArraysArray1;
                  break;
               case 1:
                  upgradeArrayContainer = upgradeArraysArray2;
                  break;
               case 2:
                  upgradeArrayContainer = upgradeArraysArray3;
            }
            for(i = 0; i < upgradeArrayContainer.length; i++)
            {
               for(ii = 0; ii < upgradeArrayContainer[i][0].length; ii++)
               {
                  trace("price: " + upgradeArrayContainer[i][0][ii]);
                  totalPrice += upgradeArrayContainer[i][0][ii];
               }
            }
         }
         trace("Total Price: $" + totalPrice);
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = true, topLayer:Boolean = false) : void
      {
         textFormat.color = textCol;
         if(centerText)
         {
            textFormat.align = TextFormatAlign.CENTER;
         }
         else
         {
            textFormat.align = TextFormatAlign.LEFT;
         }
         if(!topLayer)
         {
            this.textLayer.addChild(textName);
         }
         else
         {
            this.textLayerTop.addChild(textName);
         }
         textName.defaultTextFormat = textFormat;
         textName.antiAliasType = AntiAliasType.ADVANCED;
         textName.embedFonts = true;
         textName.wordWrap = true;
         textName.selectable = false;
         textName.mouseEnabled = false;
         textName.text = theText;
         textName.width = w;
         textName.height = h;
         textName.x = xPos;
         textName.y = yPos;
         if(shadowText)
         {
            textName.filters = this.shadowArray;
         }
      }
      
      private function changeContent() : void
      {
         var maxedOut:* = undefined;
         var infoText1Length:* = undefined;
         var infoText2Length:* = undefined;
         var infoText3Length:* = undefined;
         var infoText4Length:* = undefined;
         var infoText5Length:* = undefined;
         if(upgradeType == 1 && selectedMisc == 0 || upgradeType == 2 && selectedWeapon == 0 || upgradeType == 3 && selectedSecondary == 0)
         {
            nameText.text = "";
            levelText.text = "";
         }
         this.handleDamageTypeUI();
         if(upgradeType == 1 && selectedMisc > 0)
         {
            nameText.text = miscNameArray[selectedMisc - 1];
            levelText.text = "Level: " + levelsArrayMisc[selectedMisc - 1] + " / " + levelsMaxArrayMisc[selectedMisc - 1];
            maxedOut = false;
            if(levelsArrayMisc[selectedMisc - 1] == levelsMaxArrayMisc[selectedMisc - 1])
            {
               maxedOut = true;
            }
            if(!maxedOut)
            {
               priceText.text = "$" + Functions.formatNumber(upgradeArraysArray1[selectedMisc - 1][0][levelsArrayMisc[selectedMisc - 1]]);
               if(upgradeArraysArray1[selectedMisc - 1][0][levelsArrayMisc[selectedMisc - 1]] <= money)
               {
                  textFormat.color = 16777215;
               }
               else
               {
                  textFormat.color = 6710886;
               }
               textFormat.align = TextFormatAlign.CENTER;
               priceText.defaultTextFormat = textFormat;
            }
            else
            {
               priceText.text = "";
            }
            if(levelsArrayMisc[selectedMisc - 1] != 0)
            {
               if(selectedMisc == 1)
               {
                  infoText1.text = "Max Speed: " + upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] * 30 + " PX/Sec";
               }
               else if(selectedMisc == 2)
               {
                  infoText1.text = "Reflect Chance: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] - 1] * 100) + "%";
               }
               else if(selectedMisc == 3)
               {
                  infoText1.text = "Reduce: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] - 1] * 100) + "% Damage";
               }
               else if(selectedMisc == 4)
               {
                  infoText1.text = "Reload: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] - 1] / 3) / 10 + " Sec/Kill";
               }
               else
               {
                  infoText1.text = "";
               }
               if(selectedMisc == 1)
               {
                  infoText2.text = "Acceleration: " + upgradeArraysArray1[selectedMisc - 1][2][levelsArrayMisc[selectedMisc - 1]] * 30 + " PX/Sec";
               }
               else
               {
                  infoText2.text = "";
               }
               if(this.bUpgrade.currentFrame == 2 || this.bUpgrade.currentFrame == 3 && !maxedOut || this.bUpgrade.currentFrame == 4)
               {
                  infoText1Length = infoText1.length;
                  if(selectedMisc == 1)
                  {
                     infoText1.text = "Max Speed: " + upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] * 30 + " PX/Sec " + upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] + 1] * 30;
                  }
                  else if(selectedMisc == 2)
                  {
                     infoText1.text = "Reflect Chance: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] - 1] * 100) + "% " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] * 100) + "%";
                  }
                  else if(selectedMisc == 3)
                  {
                     infoText1.text = "Reduce: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] - 1] * 100) + "% Damage " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] * 100) + "%";
                  }
                  else if(selectedMisc == 4)
                  {
                     infoText1.text = "Reload: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] - 1] / 3) / 10 + " Sec/Kill " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] / 3) / 10;
                  }
                  if(infoText1.text != "")
                  {
                     infoText1.setTextFormat(textFormatGreen,infoText1Length,infoText1.length);
                  }
                  infoText2Length = infoText2.length;
                  if(selectedMisc == 1)
                  {
                     infoText2.text = "Acceleration: " + upgradeArraysArray1[selectedMisc - 1][2][levelsArrayMisc[selectedMisc - 1]] * 30 + " PX/Sec " + upgradeArraysArray1[selectedMisc - 1][2][levelsArrayMisc[selectedMisc - 1] + 1] * 30;
                  }
                  if(infoText2.text != "")
                  {
                     infoText2.setTextFormat(textFormatGreen,infoText2Length,infoText2.length);
                  }
               }
               if(!stage.contains(this.bUpgrade))
               {
                  this.buttonLayer.addChild(this.bUpgrade);
                  this.bUpgrade.x = this.bgWindow.x + 4;
                  this.bUpgrade.y = 210;
               }
               if(stage.contains(this.bBuy))
               {
                  this.buttonLayer.removeChild(this.bBuy);
               }
            }
            else
            {
               if(selectedMisc == 1)
               {
                  infoText1.text = "Max Speed: ";
                  infoText1Length = infoText1.length;
                  infoText1.text = "Max Speed: " + upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1] + 1] * 30 + " PX/Sec";
               }
               else if(selectedMisc == 2)
               {
                  infoText1.text = "Reflect Chance: ";
                  infoText1Length = infoText1.length;
                  infoText1.text = "Reflect Chance: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] * 100) + "%";
               }
               else if(selectedMisc == 3)
               {
                  infoText1.text = "Reduce: ";
                  infoText1Length = infoText1.length;
                  infoText1.text = "Reduce: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] * 100) + "% Damage";
               }
               else if(selectedMisc == 4)
               {
                  infoText1.text = "Reload: ";
                  infoText1Length = infoText1.length;
                  infoText1.text = "Reload: " + Math.round(upgradeArraysArray1[selectedMisc - 1][1][levelsArrayMisc[selectedMisc - 1]] / 3) / 10 + " Sec/Kill";
               }
               else
               {
                  infoText1.text = "";
               }
               if(infoText1.text != "")
               {
                  infoText1.setTextFormat(textFormatGreen,infoText1Length,infoText1.length);
               }
               if(selectedMisc == 1)
               {
                  infoText2.text = "Acceleration: ";
                  infoText2Length = infoText2.length;
                  infoText2.text = "Acceleration: " + upgradeArraysArray1[selectedMisc - 1][2][levelsArrayMisc[selectedMisc - 1] + 1] * 30 + " PX/Sec";
               }
               else
               {
                  infoText2.text = "";
               }
               if(infoText2.text != "")
               {
                  infoText2.setTextFormat(textFormatGreen,infoText2Length,infoText2.length);
               }
               if(!stage.contains(this.bBuy))
               {
                  this.buttonLayer.addChild(this.bBuy);
                  this.bBuy.x = this.bgWindow.x + 4;
                  this.bBuy.y = 210;
               }
               if(stage.contains(this.bUpgrade))
               {
                  this.buttonLayer.removeChild(this.bUpgrade);
               }
            }
            if(stage.contains(this.bEquip))
            {
               this.buttonLayer.removeChild(this.bEquip);
            }
            if(stage.contains(this.bEquipSlot1))
            {
               this.buttonLayer.removeChild(this.bEquipSlot1);
            }
            if(stage.contains(this.bEquipSlot2))
            {
               this.buttonLayer.removeChild(this.bEquipSlot2);
            }
            infoText3.text = "";
            infoText4.text = "";
            infoText5.text = "";
         }
         else if(upgradeType == 2 && selectedWeapon > 0)
         {
            nameText.text = primaryNameArray[selectedWeapon - 1];
            levelText.text = "Level: " + levelsArray[selectedWeapon - 1] + " / " + levelsMaxArray[selectedWeapon - 1];
            maxedOut = false;
            if(levelsArray[selectedWeapon - 1] == levelsMaxArray[selectedWeapon - 1])
            {
               maxedOut = true;
            }
            if(!maxedOut)
            {
               priceText.text = "$" + Functions.formatNumber(upgradeArraysArray2[selectedWeapon - 1][0][levelsArray[selectedWeapon - 1]]);
               if(upgradeArraysArray2[selectedWeapon - 1][0][levelsArray[selectedWeapon - 1]] <= money)
               {
                  textFormat.color = 16777215;
               }
               else
               {
                  textFormat.color = 6710886;
               }
               textFormat.align = TextFormatAlign.CENTER;
               priceText.defaultTextFormat = textFormat;
            }
            else
            {
               priceText.text = "";
            }
            if(levelsArray[selectedWeapon - 1] != 0)
            {
               if(selectedWeapon == 4)
               {
                  infoText1.text = "Damage: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1] - 1] * 3000) / 100 + " HP" + "/Sec";
               }
               else
               {
                  infoText1.text = "Damage: " + upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1] - 1] + " HP";
               }
               if(selectedWeapon == 4)
               {
                  infoText2.text = "Reload: " + 0 + " Sec";
               }
               else
               {
                  infoText2.text = "Reload: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][1][levelsArray[selectedWeapon - 1] - 1] / 0.3) / 100 + " Sec";
               }
               if(selectedWeapon == 1 || selectedWeapon == 3 || selectedWeapon == 6 || selectedWeapon == 11)
               {
                  infoText3.text = "Explosion: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] * 2 + " PX";
               }
               else if(selectedWeapon == 4)
               {
                  infoText3.text = "Range: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] + " PX";
               }
               else if(selectedWeapon == 5)
               {
                  infoText3.text = "Bullets: " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1] - 1];
               }
               else if(selectedWeapon == 8)
               {
                  infoText3.text = "Poison Dmg: " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1] - 1] + " HP/Sec";
               }
               else if(selectedWeapon == 10)
               {
                  infoText3.text = "Pieces: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1];
               }
               else if(selectedWeapon == 12)
               {
                  infoText3.text = "Targets: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1];
               }
               else
               {
                  infoText3.text = "";
               }
               if(selectedWeapon == 6)
               {
                  infoText4.text = "Time: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else if(selectedWeapon == 8)
               {
                  infoText4.text = "Poison Time: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else
               {
                  infoText4.text = "";
               }
               infoText5.text = "";
               if(this.bUpgrade.currentFrame == 2 || this.bUpgrade.currentFrame == 3 && !maxedOut || this.bUpgrade.currentFrame == 4)
               {
                  infoText1Length = infoText1.length;
                  if(selectedWeapon == 4)
                  {
                     infoText1.text = "Damage: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1] - 1] * 3000) / 100 + " HP" + "/Sec" + "  " + Math.round(upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1]] * 3000) / 100;
                  }
                  else
                  {
                     infoText1.text = "Damage: " + upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1] - 1] + " HP" + "  " + upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1]];
                  }
                  infoText1.setTextFormat(textFormatGreen,infoText1Length,infoText1.length);
                  infoText2Length = infoText2.length;
                  if(selectedWeapon == 4)
                  {
                     infoText2.text = "Reload: " + 0 + " Sec" + "  0";
                  }
                  else
                  {
                     infoText2.text = "Reload: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][1][levelsArray[selectedWeapon - 1] - 1] / 0.3) / 100 + " Sec" + "  " + Math.round(upgradeArraysArray2[selectedWeapon - 1][1][levelsArray[selectedWeapon - 1]] / 0.3) / 100;
                  }
                  infoText2.setTextFormat(textFormatGreen,infoText2Length,infoText2.length);
                  infoText3Length = infoText3.length;
                  if(selectedWeapon == 1 || selectedWeapon == 3 || selectedWeapon == 6 || selectedWeapon == 11)
                  {
                     infoText3.text = "Explosion: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] * 2 + " PX" + "  " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]] * 2;
                  }
                  else if(selectedWeapon == 4)
                  {
                     infoText3.text = "Range: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] + " PX" + "  " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]];
                  }
                  else if(selectedWeapon == 5)
                  {
                     infoText3.text = "Bullets: " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1] - 1] + "  " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1]];
                  }
                  else if(selectedWeapon == 8)
                  {
                     infoText3.text = "Poison Dmg: " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1] - 1] + " HP/Sec" + "  " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1]];
                  }
                  else if(selectedWeapon == 10)
                  {
                     infoText3.text = "Pieces: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] + "  " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]];
                  }
                  else if(selectedWeapon == 12)
                  {
                     infoText3.text = "Targets: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] + "  " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]];
                  }
                  if(infoText3.text != "")
                  {
                     infoText3.setTextFormat(textFormatGreen,infoText3Length,infoText3.length);
                  }
                  infoText4Length = infoText4.length;
                  if(selectedWeapon == 6)
                  {
                     infoText4.text = "Time: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1] - 1] / 0.3) / 100 + " Sec" + "  " + Math.round(upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1]] / 0.3) / 100;
                  }
                  else if(selectedWeapon == 8)
                  {
                     infoText4.text = "Poison Time: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1] - 1] / 0.3) / 100 + " Sec" + "  " + Math.round(upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]] / 0.3) / 100;
                  }
                  if(infoText4.text != "")
                  {
                     infoText4.setTextFormat(textFormatGreen,infoText4Length,infoText4.length);
                  }
               }
               if(!stage.contains(this.bEquipSlot1))
               {
                  this.buttonLayer.addChild(this.bEquipSlot1);
                  this.bEquipSlot1.slot = 1;
                  this.bEquipSlot1.x = 414;
                  this.bEquipSlot1.y = 254;
               }
               if(!stage.contains(this.bEquipSlot2))
               {
                  this.buttonLayer.addChild(this.bEquipSlot2);
                  this.bEquipSlot2.slot = 2;
                  this.bEquipSlot2.x = 527;
                  this.bEquipSlot2.y = 254;
               }
               if(!stage.contains(this.bUpgrade))
               {
                  this.buttonLayer.addChild(this.bUpgrade);
                  this.bUpgrade.x = this.bgWindow.x + 4;
                  this.bUpgrade.y = 210;
               }
               if(stage.contains(this.bBuy))
               {
                  this.buttonLayer.removeChild(this.bBuy);
               }
               if(stage.contains(this.bEquip))
               {
                  this.buttonLayer.removeChild(this.bEquip);
               }
            }
            else
            {
               infoText1.text = "Damage: ";
               infoText2.text = "Reload: ";
               infoText1Length = infoText1.length;
               if(selectedWeapon == 4)
               {
                  infoText1.text = "Damage: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1]] * 3000) / 100 + " HP" + "/Sec";
               }
               else
               {
                  infoText1.text = "Damage: " + upgradeArraysArray2[selectedWeapon - 1][2][levelsArray[selectedWeapon - 1]] + " HP";
               }
               infoText1.setTextFormat(textFormatGreen,infoText1Length,infoText1.length);
               infoText2Length = infoText2.length;
               if(selectedWeapon == 4)
               {
                  infoText2.text = "Reload: " + 0 + " Sec";
               }
               else
               {
                  infoText2.text = "Reload: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][1][levelsArray[selectedWeapon - 1]] / 0.3) / 100 + " Sec";
               }
               infoText2.setTextFormat(textFormatGreen,infoText2Length,infoText2.length);
               if(selectedWeapon == 1 || selectedWeapon == 3 || selectedWeapon == 6 || selectedWeapon == 11)
               {
                  infoText3.text = "Explosion: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Explosion: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]] * 2 + " PX";
               }
               else if(selectedWeapon == 4)
               {
                  infoText3.text = "Range: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Range: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]] + " PX";
               }
               else if(selectedWeapon == 5)
               {
                  infoText3.text = "Bullets: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Bullets: " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1]];
               }
               else if(selectedWeapon == 8)
               {
                  infoText3.text = "Poison Dmg: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Poison Dmg: " + upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1]] + " HP/Sec";
               }
               else if(selectedWeapon == 10)
               {
                  infoText3.text = "Pieces: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Pieces: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]];
               }
               else if(selectedWeapon == 12)
               {
                  infoText3.text = "Targets: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Targets: " + upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]];
               }
               else
               {
                  infoText3.text = "";
               }
               if(infoText3.text != "")
               {
                  infoText3.setTextFormat(textFormatGreen,infoText3Length,infoText3.length);
               }
               if(selectedWeapon == 6)
               {
                  infoText4.text = "Time: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Time: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][4][levelsArray[selectedWeapon - 1]] / 0.3) / 100 + " Sec";
               }
               else if(selectedWeapon == 8)
               {
                  infoText4.text = "Poison Time: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Poison Time: " + Math.round(upgradeArraysArray2[selectedWeapon - 1][3][levelsArray[selectedWeapon - 1]] / 0.3) / 100 + " Sec";
               }
               else
               {
                  infoText4.text = "";
               }
               if(infoText4.text != "")
               {
                  infoText4.setTextFormat(textFormatGreen,infoText4Length,infoText4.length);
               }
               infoText5.text = "";
               if(!stage.contains(this.bBuy))
               {
                  this.buttonLayer.addChild(this.bBuy);
                  this.bBuy.x = this.bgWindow.x + 4;
                  this.bBuy.y = 210;
               }
               if(stage.contains(this.bEquip))
               {
                  this.buttonLayer.removeChild(this.bEquip);
               }
               if(stage.contains(this.bEquipSlot1))
               {
                  this.buttonLayer.removeChild(this.bEquipSlot1);
               }
               if(stage.contains(this.bEquipSlot2))
               {
                  this.buttonLayer.removeChild(this.bEquipSlot2);
               }
               if(stage.contains(this.bUpgrade))
               {
                  this.buttonLayer.removeChild(this.bUpgrade);
               }
            }
         }
         else if(upgradeType == 3 && selectedSecondary > 0)
         {
            nameText.text = secondaryNameArray[selectedSecondary - 1];
            levelText.text = "Level: " + levelsArraySecondary[selectedSecondary - 1] + " / " + levelsMaxArraySecondary[selectedSecondary - 1];
            maxedOut = false;
            if(levelsArraySecondary[selectedSecondary - 1] == levelsMaxArraySecondary[selectedSecondary - 1])
            {
               maxedOut = true;
            }
            if(!maxedOut)
            {
               priceText.text = "$" + Functions.formatNumber(upgradeArraysArray3[selectedSecondary - 1][0][levelsArraySecondary[selectedSecondary - 1]]);
               if(upgradeArraysArray3[selectedSecondary - 1][0][levelsArraySecondary[selectedSecondary - 1]] <= money)
               {
                  textFormat.color = 16777215;
               }
               else
               {
                  textFormat.color = 6710886;
               }
               textFormat.align = TextFormatAlign.CENTER;
               priceText.defaultTextFormat = textFormat;
            }
            else
            {
               priceText.text = "";
            }
            if(levelsArraySecondary[selectedSecondary - 1] != 0)
            {
               if(selectedSecondary == 7)
               {
                  infoText1.text = "Shield Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else
               {
                  infoText1.text = "Damage: " + upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP";
               }
               infoText2.text = "Reload: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][1][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               if(selectedSecondary == 1 || selectedSecondary == 2 || selectedSecondary == 3 || selectedSecondary == 4 || selectedSecondary == 8 || selectedSecondary == 9 || selectedSecondary == 10)
               {
                  infoText3.text = "Explosion: " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] + " PX";
               }
               else if(selectedSecondary == 5)
               {
                  infoText3.text = "Freeze: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 6)
               {
                  infoText3.text = "Poison Dmg: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP/Sec";
               }
               else if(selectedSecondary == 11)
               {
                  infoText3.text = "Pieces: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1];
               }
               else if(selectedSecondary == 12)
               {
                  infoText3.text = "Targets: " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1];
               }
               else
               {
                  infoText3.text = "";
               }
               if(selectedSecondary == 3 || selectedSecondary == 9)
               {
                  infoText4.text = "Freeze: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 4)
               {
                  infoText4.text = "Poison Dmg: " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP/Sec";
               }
               else if(selectedSecondary == 5)
               {
                  infoText4.text = "Icicles: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1];
               }
               else if(selectedSecondary == 6)
               {
                  infoText4.text = "Poison Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 8)
               {
                  infoText4.text = "Rockets: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1];
               }
               else if(selectedSecondary == 10)
               {
                  infoText4.text = "Lava Dmg: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP/Sec";
               }
               else
               {
                  infoText4.text = "";
               }
               if(selectedSecondary == 4)
               {
                  infoText5.text = "Poison Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 6)
               {
                  infoText5.text = "Spikes: " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1] - 1];
               }
               else if(selectedSecondary == 9 || selectedSecondary == 10)
               {
                  infoText5.text = "Trail Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec";
               }
               else
               {
                  infoText5.text = "";
               }
               if(this.bUpgrade.currentFrame == 2 || this.bUpgrade.currentFrame == 3 && !maxedOut || this.bUpgrade.currentFrame == 4)
               {
                  infoText1Length = infoText1.length;
                  if(selectedSecondary == 7)
                  {
                     infoText1.text = "Shield Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + "  " + Math.round(upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  }
                  else
                  {
                     infoText1.text = "Damage: " + upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP" + "  " + upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  infoText1.setTextFormat(textFormatGreen,infoText1Length,infoText1.length);
                  infoText2Length = infoText2.length;
                  infoText2.text = "Reload: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][1][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + "  " + Math.round(upgradeArraysArray3[selectedSecondary - 1][1][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  infoText2.setTextFormat(textFormatGreen,infoText2Length,infoText2.length);
                  infoText3Length = infoText3.length;
                  if(selectedSecondary == 1 || selectedSecondary == 2 || selectedSecondary == 3 || selectedSecondary == 4 || selectedSecondary == 8 || selectedSecondary == 9 || selectedSecondary == 10)
                  {
                     infoText3.text = "Explosion: " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] + " PX" + " " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 5)
                  {
                     infoText3.text = "Freeze: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + " " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  }
                  else if(selectedSecondary == 6)
                  {
                     infoText3.text = "Poison Dmg: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP/Sec" + " " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 11)
                  {
                     infoText3.text = "Pieces: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 12)
                  {
                     infoText3.text = "Targets: " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] + " " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  if(infoText3.text != "")
                  {
                     infoText3.setTextFormat(textFormatGreen,infoText3Length,infoText3.length);
                  }
                  infoText4Length = infoText4.length;
                  if(selectedSecondary == 3 || selectedSecondary == 9)
                  {
                     infoText4.text = "Freeze: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + " " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  }
                  else if(selectedSecondary == 4)
                  {
                     infoText4.text = "Poison Dmg: " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP/Sec" + " " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 5)
                  {
                     infoText4.text = "Icicles: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 6)
                  {
                     infoText4.text = "Poison Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + " " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  }
                  else if(selectedSecondary == 8)
                  {
                     infoText4.text = "Rockets: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 10)
                  {
                     infoText4.text = "Lava Dmg: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] + " HP/Sec" + " " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  if(infoText4.text != "")
                  {
                     infoText4.setTextFormat(textFormatGreen,infoText4Length,infoText4.length);
                  }
                  infoText5Length = infoText5.length;
                  if(selectedSecondary == 4)
                  {
                     infoText5.text = "Poison Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + " " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  }
                  else if(selectedSecondary == 6)
                  {
                     infoText5.text = "Spikes: " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1] - 1] + " " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1]];
                  }
                  else if(selectedSecondary == 9 || selectedSecondary == 10)
                  {
                     infoText5.text = "Trail Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1] - 1] / 0.3) / 100 + " Sec" + " " + Math.round(upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100;
                  }
                  if(infoText5.text != "")
                  {
                     infoText5.setTextFormat(textFormatGreen,infoText5Length,infoText5.length);
                  }
               }
               if(!stage.contains(this.bEquip))
               {
                  this.buttonLayer.addChild(this.bEquip);
                  this.bEquip.x = 414;
                  this.bEquip.y = 254;
               }
               if(!stage.contains(this.bUpgrade))
               {
                  this.buttonLayer.addChild(this.bUpgrade);
                  this.bUpgrade.x = this.bgWindow.x + 4;
                  this.bUpgrade.y = 210;
               }
               if(stage.contains(this.bBuy))
               {
                  this.buttonLayer.removeChild(this.bBuy);
               }
               if(stage.contains(this.bEquipSlot1))
               {
                  this.buttonLayer.removeChild(this.bEquipSlot1);
               }
               if(stage.contains(this.bEquipSlot2))
               {
                  this.buttonLayer.removeChild(this.bEquipSlot2);
               }
            }
            else
            {
               if(selectedSecondary == 7)
               {
                  infoText1.text = "Shield Time: ";
                  infoText1Length = infoText1.length;
                  infoText1.text = "Shield Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " HP";
               }
               else
               {
                  infoText1.text = "Damage: ";
                  infoText1Length = infoText1.length;
                  infoText1.text = "Damage: " + upgradeArraysArray3[selectedSecondary - 1][2][levelsArraySecondary[selectedSecondary - 1]] + " HP";
               }
               infoText1.setTextFormat(textFormatGreen,infoText1Length,infoText1.length);
               infoText2.text = "Reload: ";
               infoText2Length = infoText2.length;
               infoText2.text = "Reload: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][1][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " Sec";
               infoText2.setTextFormat(textFormatGreen,infoText2Length,infoText2.length);
               if(selectedSecondary == 1 || selectedSecondary == 2 || selectedSecondary == 3 || selectedSecondary == 4 || selectedSecondary == 8 || selectedSecondary == 9 || selectedSecondary == 10)
               {
                  infoText3.text = "Explosion: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Explosion: " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]] + " PX";
               }
               else if(selectedSecondary == 5)
               {
                  infoText3.text = "Freeze: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Freeze: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 6)
               {
                  infoText3.text = "Poison Dmg: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Poison Dmg: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]] + " HP/Sec";
               }
               else if(selectedSecondary == 11)
               {
                  infoText3.text = "Pieces: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Pieces: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
               }
               else if(selectedSecondary == 12)
               {
                  infoText3.text = "Targets: ";
                  infoText3Length = infoText3.length;
                  infoText3.text = "Targets: " + upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]];
               }
               else
               {
                  infoText3.text = "";
               }
               if(infoText3.text != "")
               {
                  infoText3.setTextFormat(textFormatGreen,infoText3Length,infoText3.length);
               }
               if(selectedSecondary == 3 || selectedSecondary == 9)
               {
                  infoText4.text = "Freeze: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Freeze: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 4)
               {
                  infoText4.text = "Poison Dmg: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Poison Dmg: " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1]] + " HP/Sec";
               }
               else if(selectedSecondary == 5)
               {
                  infoText4.text = "Icicles: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Icicles: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
               }
               else if(selectedSecondary == 6)
               {
                  infoText4.text = "Poison Time: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Poison Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][3][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 8)
               {
                  infoText4.text = "Rockets: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Rockets: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]];
               }
               else if(selectedSecondary == 10)
               {
                  infoText4.text = "Lava Dmg: ";
                  infoText4Length = infoText4.length;
                  infoText4.text = "Lava Dmg: " + upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]] + " HP/Sec";
               }
               else
               {
                  infoText4.text = "";
               }
               if(infoText4.text != "")
               {
                  infoText4.setTextFormat(textFormatGreen,infoText4Length,infoText4.length);
               }
               if(selectedSecondary == 4)
               {
                  infoText5.text = "Poison Time: ";
                  infoText5Length = infoText5.length;
                  infoText5.text = "Poison Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][4][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " Sec";
               }
               else if(selectedSecondary == 6)
               {
                  infoText5.text = "Spikes: ";
                  infoText5Length = infoText5.length;
                  infoText5.text = "Spikes: " + upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1]];
               }
               else if(selectedSecondary == 9 || selectedSecondary == 10)
               {
                  infoText5.text = "Trail Time: ";
                  infoText5Length = infoText5.length;
                  infoText5.text = "Trail Time: " + Math.round(upgradeArraysArray3[selectedSecondary - 1][5][levelsArraySecondary[selectedSecondary - 1]] / 0.3) / 100 + " Sec";
               }
               else
               {
                  infoText5.text = "";
               }
               if(infoText5.text != "")
               {
                  infoText5.setTextFormat(textFormatGreen,infoText5Length,infoText5.length);
               }
               if(!stage.contains(this.bBuy))
               {
                  this.buttonLayer.addChild(this.bBuy);
                  this.bBuy.x = this.bgWindow.x + 4;
                  this.bBuy.y = 210;
               }
               if(stage.contains(this.bEquip))
               {
                  this.buttonLayer.removeChild(this.bEquip);
               }
               if(stage.contains(this.bEquipSlot1))
               {
                  this.buttonLayer.removeChild(this.bEquipSlot1);
               }
               if(stage.contains(this.bEquipSlot2))
               {
                  this.buttonLayer.removeChild(this.bEquipSlot2);
               }
               if(stage.contains(this.bUpgrade))
               {
                  this.buttonLayer.removeChild(this.bUpgrade);
               }
            }
         }
         else
         {
            priceText.text = "";
            infoText1.text = "";
            infoText2.text = "";
            infoText3.text = "";
            infoText4.text = "";
            infoText5.text = "";
            if(stage.contains(this.bEquip))
            {
               this.buttonLayer.removeChild(this.bEquip);
            }
            if(stage.contains(this.bUpgrade))
            {
               this.buttonLayer.removeChild(this.bUpgrade);
            }
            if(stage.contains(this.bBuy))
            {
               this.buttonLayer.removeChild(this.bBuy);
            }
         }
      }
      
      public function update(event:Event) : void
      {
         this.contentHolder.x = this.tweenVar.x;
         moneyText.text = "$" + Functions.formatNumber(money);
         this.changeContent();
         if(playSlot1Tween)
         {
            playSlot1Tween = false;
            this.slotImageTween1X.start();
            this.slotImageTween1Y.start();
         }
         if(playSlot2Tween)
         {
            playSlot2Tween = false;
            this.slotImageTween2X.start();
            this.slotImageTween2Y.start();
         }
         if(selectedMisc != 0 || selectedWeapon != 0 || selectedSecondary != 0)
         {
            this.bgWindowBar3.alpha = 1;
            this.bgWindowBar5.alpha = 1;
            if(!stage.contains(this.bUpgradeInfo))
            {
               this.buttonLayer.addChild(this.bUpgradeInfo);
               this.bUpgradeInfo.pText = this.pInfoText;
               this.bUpgradeInfo.x = this.bgWindowBar3.x + 14;
               this.bUpgradeInfo.y = this.bgWindowBar3.y + 14;
            }
            if(!stage.contains(this.iconDamageType))
            {
               this.buttonLayer.addChild(this.iconDamageType);
               this.iconDamageType.x = this.bgWindowBar5.x + 16;
               this.iconDamageType.y = this.bgWindowBar5.y + 16;
            }
         }
         if(levelsArray[0] != 0)
         {
            levelTextWeapon1.text = levelsArray[0];
         }
         if(levelsArray[1] != 0)
         {
            levelTextWeapon2.text = levelsArray[1];
         }
         if(levelsArray[2] != 0)
         {
            levelTextWeapon3.text = levelsArray[2];
         }
         if(levelsArray[3] != 0)
         {
            levelTextWeapon4.text = levelsArray[3];
         }
         if(levelsArray[4] != 0)
         {
            levelTextWeapon5.text = levelsArray[4];
         }
         if(levelsArray[5] != 0)
         {
            levelTextWeapon6.text = levelsArray[5];
         }
         if(levelsArray[6] != 0)
         {
            levelTextWeapon7.text = levelsArray[6];
         }
         if(levelsArray[7] != 0)
         {
            levelTextWeapon8.text = levelsArray[7];
         }
         if(levelsArray[8] != 0)
         {
            levelTextWeapon9.text = levelsArray[8];
         }
         if(levelsArray[9] != 0)
         {
            levelTextWeapon10.text = levelsArray[9];
         }
         if(levelsArray[10] != 0)
         {
            levelTextWeapon11.text = levelsArray[10];
         }
         if(levelsArray[11] != 0)
         {
            levelTextWeapon12.text = levelsArray[11];
         }
         if(levelsArraySecondary[0] != 0)
         {
            levelTextSecondaryWeapon1.text = levelsArraySecondary[0];
         }
         if(levelsArraySecondary[1] != 0)
         {
            levelTextSecondaryWeapon2.text = levelsArraySecondary[1];
         }
         if(levelsArraySecondary[2] != 0)
         {
            levelTextSecondaryWeapon3.text = levelsArraySecondary[2];
         }
         if(levelsArraySecondary[3] != 0)
         {
            levelTextSecondaryWeapon4.text = levelsArraySecondary[3];
         }
         if(levelsArraySecondary[4] != 0)
         {
            levelTextSecondaryWeapon5.text = levelsArraySecondary[4];
         }
         if(levelsArraySecondary[5] != 0)
         {
            levelTextSecondaryWeapon6.text = levelsArraySecondary[5];
         }
         if(levelsArraySecondary[6] != 0)
         {
            levelTextSecondaryWeapon7.text = levelsArraySecondary[6];
         }
         if(levelsArraySecondary[7] != 0)
         {
            levelTextSecondaryWeapon8.text = levelsArraySecondary[7];
         }
         if(levelsArraySecondary[8] != 0)
         {
            levelTextSecondaryWeapon9.text = levelsArraySecondary[8];
         }
         if(levelsArraySecondary[9] != 0)
         {
            levelTextSecondaryWeapon10.text = levelsArraySecondary[9];
         }
         if(levelsArraySecondary[10] != 0)
         {
            levelTextSecondaryWeapon11.text = levelsArraySecondary[10];
         }
         if(levelsArraySecondary[11] != 0)
         {
            levelTextSecondaryWeapon12.text = levelsArraySecondary[11];
         }
         if(levelsArrayMisc[0] != 0)
         {
            levelTextMisc1.text = levelsArrayMisc[0];
         }
         if(levelsArrayMisc[1] != 0)
         {
            levelTextMisc2.text = levelsArrayMisc[1];
         }
         if(levelsArrayMisc[2] != 0)
         {
            levelTextMisc3.text = levelsArrayMisc[2];
         }
         if(levelsArrayMisc[3] != 0)
         {
            levelTextMisc4.text = levelsArrayMisc[3];
         }
      }
      
      private function contentTweenFinish(event:TweenEvent) : void
      {
         contentMoving = false;
      }
      
      private function handleDamageTypeUI() : void
      {
         if(upgradeType == 1)
         {
            damageTypeText.text = "No Damage";
            if(this.iconDamageType.currentFrame != 1)
            {
               this.iconDamageType.gotoAndStop(1);
            }
         }
         else if(upgradeType == 2)
         {
            if(selectedWeapon == 1 || selectedWeapon == 3 || selectedWeapon == 6 || selectedWeapon == 11)
            {
               damageTypeText.text = "Explosion Damage";
               this.iconDamageType.gotoAndStop(2);
            }
            else if(selectedWeapon == 2 || selectedWeapon == 5)
            {
               damageTypeText.text = "Bullet Damage";
               this.iconDamageType.gotoAndStop(4);
            }
            else if(selectedWeapon == 4)
            {
               damageTypeText.text = "Fire/Lava Damage";
               this.iconDamageType.gotoAndStop(3);
            }
            else if(selectedWeapon == 7 || selectedWeapon == 10)
            {
               damageTypeText.text = "Food Damage";
               this.iconDamageType.gotoAndStop(8);
            }
            else if(selectedWeapon == 8)
            {
               damageTypeText.text = "Poison Damage";
               this.iconDamageType.gotoAndStop(5);
            }
            else if(selectedWeapon == 9)
            {
               damageTypeText.text = "Laser Damage";
               this.iconDamageType.gotoAndStop(6);
            }
            else if(selectedWeapon == 12)
            {
               damageTypeText.text = "Magic Damage";
               this.iconDamageType.gotoAndStop(9);
            }
         }
         else if(upgradeType == 3)
         {
            if(selectedSecondary == 1 || selectedSecondary == 2 || selectedSecondary == 8)
            {
               damageTypeText.text = "Explosion Damage";
               this.iconDamageType.gotoAndStop(2);
            }
            else if(selectedSecondary == 3 || selectedSecondary == 5 || selectedSecondary == 9)
            {
               damageTypeText.text = "Ice Damage";
               this.iconDamageType.gotoAndStop(7);
            }
            else if(selectedSecondary == 4 || selectedSecondary == 6)
            {
               damageTypeText.text = "Poison Damage";
               this.iconDamageType.gotoAndStop(5);
            }
            else if(selectedSecondary == 7)
            {
               damageTypeText.text = "No Damage";
               this.iconDamageType.gotoAndStop(1);
            }
            else if(selectedSecondary == 10)
            {
               damageTypeText.text = "Fire/Lava Damage";
               this.iconDamageType.gotoAndStop(3);
            }
            else if(selectedSecondary == 11)
            {
               damageTypeText.text = "Food Damage";
               this.iconDamageType.gotoAndStop(8);
            }
            else if(selectedSecondary == 12)
            {
               damageTypeText.text = "Magic Damage";
               this.iconDamageType.gotoAndStop(9);
            }
         }
      }
   }
}

