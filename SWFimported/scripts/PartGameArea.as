package
{
   import fl.motion.AdjustColor;
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.*;
   import flash.display.Bitmap;
   import flash.display.BitmapData;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.ColorMatrixFilter;
   import flash.geom.ColorTransform;
   import flash.geom.Point;
   
   public class PartGameArea extends MovieClip
   {
      
      public static var canPause:Boolean;
      
      public static var levelDone:Boolean;
      
      public static var roomWidth:*;
      
      public static var quitting:Boolean;
      
      public static var gamePaused:Boolean;
      
      public static var roomHeight:*;
      
      public static var countDownDone:Boolean;
      
      public static var cameraWidth:* = 640;
      
      public static var cameraHeight:* = 400;
      
      public static var cameraPosX:* = 0;
      
      public static var cameraPosY:* = 0;
      
      public static var tempEnemyKills:Number = 0;
      
      public static var tempDoctorPoisoned:Boolean = false;
      
      public static var tempTemperamentalFrozen:Boolean = false;
      
      public static var tempTrapEnemyMineKill:Boolean = false;
      
      public static var tempDamageAddictEnemyCake:Boolean = false;
      
      public static var tempHitBottom:Boolean = false;
      
      public static var tempValuesEarned:Number = 0;
      
      public static var tempNoWeaponsUsed:Boolean = true;
      
      public static var tempTimedBombsFired:Boolean = false;
      
      public static var tempOtherThanTimedBombsFired:Boolean = false;
      
      public static var tempOnlySpecialWeapons:Boolean = true;
      
      public static var tempNothingPressed:Boolean = true;
      
      public static var tempThreeBosses:Boolean = false;
      
      public static var enemyStrengthTrigger:Boolean = false;
      
      public static var enemyWeaknessTrigger:Boolean = false;
      
      private var debugPercentageBulletDamage:Number = 0;
      
      private var medicIndicatorLayer:MovieClip = new MovieClip();
      
      private var groundLayer:MovieClip = new MovieClip();
      
      private var debugTotalBulletsFired:Number = 0;
      
      private var bgText:* = new BackgroundText();
      
      public var medicIndicatorArray:Array = new Array();
      
      public var groundArray:Array = new Array();
      
      public var warningArray:Array = new Array();
      
      private var debugTotalBulletsHitting:Number = 0;
      
      public var leastAmountTimerMax:Number = 360;
      
      public var shieldOn:Boolean = false;
      
      private var spaces:RegExp = / /gi;
      
      public var flagOutTweenX:Tween;
      
      public var flagOutTweenY:Tween;
      
      public var enemyIndicatorArray:Array = new Array();
      
      private var debugCalculatedDPS:Number = 0;
      
      public var explosionArray:Array = new Array();
      
      private var bg:Sprite = new Sprite();
      
      private var debugActualAverageReloadTime:Number = 0;
      
      public var flagInTweenAlpha:Tween;
      
      private var backgroundObjectArray:Array = new Array();
      
      private var debugActualAverageBulletDamage:Number = 0;
      
      private var debugPercentageReloadTime:Number = 0;
      
      public var shieldTimer:Number = 0;
      
      public var flagInTweenX:Tween;
      
      public var flagInTweenY:Tween;
      
      private var shieldLayer:MovieClip = new MovieClip();
      
      public var shield:TankShield = new TankShield();
      
      private var particleLayer:MovieClip = new MovieClip();
      
      public var flag:ItemFlag = new ItemFlag();
      
      private var debugLevelTime:Number = 0;
      
      private var bulletLayer:MovieClip = new MovieClip();
      
      public var particleArray:Array = new Array();
      
      private var bulletArray:Array = new Array();
      
      private var moneyArray:Array = new Array();
      
      private var enemyTrapLayer:MovieClip = new MovieClip();
      
      private var debugTotalDamage:Number = 0;
      
      private var indicatorLayer:MovieClip = new MovieClip();
      
      private var selectedEnemyModel:Array = [];
      
      private var debugOn:Boolean = false;
      
      private var debugTotalFreezeTime:Number = 0;
      
      private var iceTrailID:Number = 0;
      
      private var hookRopeLayer:MovieClip = new MovieClip();
      
      private var tweenStarted:Boolean = false;
      
      public var leastAmountTimer:Number = 0;
      
      public var bossHealthLayer:MovieClip = new MovieClip();
      
      private var enemyLayer:MovieClip = new MovieClip();
      
      private var debugBulletsMissing:Number = 0;
      
      public var enemyArray:Array = new Array();
      
      public var explosionQueueArray:Array = new Array();
      
      private var levelDoneTimer:Number = 15;
      
      private var selectedFlagModel:Array = [];
      
      private var basicLayer:MovieClip = new MovieClip();
      
      private var debugPercentageBulletsHitting:Number = 0;
      
      public var mineArray:Array = new Array();
      
      private var enemyBulletLayer:MovieClip = new MovieClip();
      
      private var enemyBulletArray:Array = new Array();
      
      public var tank:Tank;
      
      private var iceIndicatorLayer:MovieClip = new MovieClip();
      
      private var debugActualDPS:Number = 0;
      
      private var selectedLevelDataModel:Array = [];
      
      private var isAdded:Boolean = false;
      
      private var itemLayer:MovieClip = new MovieClip();
      
      public function PartGameArea()
      {
         this.flagInTweenAlpha = new Tween(this.flag,"alpha",Regular.easeOut,0,1,20,false);
         this.flagInTweenX = new Tween(this.flag,"scaleX",Regular.easeOut,1.2,0.9,15,false);
         this.flagInTweenY = new Tween(this.flag,"scaleY",Regular.easeOut,1.2,0.9,15,false);
         this.flagOutTweenX = new Tween(this.flag,"scaleX",Regular.easeIn,0.9,1.2,15,false);
         this.flagOutTweenY = new Tween(this.flag,"scaleY",Regular.easeIn,0.9,1.2,15,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.flagInTweenAlpha.stop();
         this.flagInTweenX.stop();
         this.flagInTweenY.stop();
         this.flagOutTweenX.stop();
         this.flagOutTweenY.stop();
      }
      
      private static function moveTempVariablesWhenCompleted() : void
      {
         ScreenAchievements.enemyKills += tempEnemyKills;
         ScreenAchievements.moneyEarned += ScreenGame.money;
      }
      
      public static function resetTempVariables(type:String) : void
      {
         var difficulty:* = undefined;
         var valueType:* = undefined;
         tempEnemyKills = 0;
         if(type == "LevelStart")
         {
            switch(ScreenLevelSelect.levelDifficulty)
            {
               case "Easy":
                  difficulty = 1;
                  break;
               case "Medium":
                  difficulty = 2;
                  break;
               case "Hard":
                  difficulty = 3;
            }
            switch(ScreenLevelSelect.levelMode)
            {
               case "Normal":
                  valueType = "Stars";
                  break;
               case "Flag":
                  valueType = "Flags";
                  break;
               case "Tower":
                  valueType = "Towers";
                  break;
               case "Defense":
                  valueType = "Shields";
                  break;
               case "Boss":
                  valueType = "Bosses";
            }
            tempDoctorPoisoned = false;
            tempTemperamentalFrozen = false;
            tempTrapEnemyMineKill = false;
            tempDamageAddictEnemyCake = false;
            tempHitBottom = false;
            tempValuesEarned = ScreenLevelSelect.getTotalValues(valueType,difficulty);
            tempNoWeaponsUsed = true;
            tempTimedBombsFired = false;
            tempOtherThanTimedBombsFired = false;
            tempOnlySpecialWeapons = true;
            tempNothingPressed = true;
            tempThreeBosses = false;
         }
         else if(type == "Quit")
         {
            tempDoctorPoisoned = false;
            tempTemperamentalFrozen = false;
            tempTrapEnemyMineKill = false;
            tempDamageAddictEnemyCake = false;
            tempHitBottom = false;
            tempNoWeaponsUsed = false;
            tempTimedBombsFired = false;
            tempOtherThanTimedBombsFired = false;
            tempOnlySpecialWeapons = false;
            tempNothingPressed = false;
            tempValuesEarned = 0;
            ScreenGame.money = 0;
            tempThreeBosses = false;
         }
         else
         {
            tempValuesEarned = 0;
         }
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.flagInTweenX.addEventListener(TweenEvent.MOTION_FINISH,this.flagInTweenFinish);
            this.flagOutTweenX.addEventListener(TweenEvent.MOTION_FINISH,this.flagOutTweenFinish);
            enemyStrengthTrigger = false;
            enemyWeaknessTrigger = false;
            resetTempVariables("LevelStart");
            this.selectedEnemyModel = ScreenGame.worldModels[ScreenGame.world * 3 - 3];
            this.selectedLevelDataModel = ScreenGame.worldModels[ScreenGame.world * 3 - 2];
            this.selectedFlagModel = ScreenGame.worldModels[ScreenGame.world * 3 - 1];
            if(ScreenGame.bossAmount >= 3)
            {
               tempThreeBosses = true;
            }
            countDownDone = false;
            levelDone = false;
            gamePaused = false;
            canPause = true;
            quitting = false;
            this.iceTrailID = 0;
            roomWidth = this.selectedLevelDataModel[ScreenGame.level - 1][0];
            roomHeight = this.selectedLevelDataModel[ScreenGame.level - 1][1];
            this.createBackground();
            addChild(this.bg);
            this.bg.x = 0;
            this.bg.y = 0;
            this.shiftHue(this.bg,this.selectedLevelDataModel[ScreenGame.level - 1][2],this.selectedLevelDataModel[ScreenGame.level - 1][3],this.selectedLevelDataModel[ScreenGame.level - 1][4]);
            addChild(this.medicIndicatorLayer);
            addChild(this.groundLayer);
            addChild(this.enemyTrapLayer);
            addChild(this.itemLayer);
            addChild(this.basicLayer);
            addChild(this.indicatorLayer);
            addChild(this.enemyLayer);
            addChild(this.bossHealthLayer);
            addChild(this.iceIndicatorLayer);
            addChild(this.bulletLayer);
            addChild(this.hookRopeLayer);
            addChild(this.enemyBulletLayer);
            addChild(this.particleLayer);
            addChild(this.shieldLayer);
            this.tank = new Tank();
            this.basicLayer.addChild(this.tank);
            if(ScreenLevelSelect.levelMode != "Defense")
            {
               this.tank.x = roomWidth / 2;
               this.tank.y = roomHeight / 2;
            }
            else
            {
               this.tank.x = cameraWidth / 2;
               this.tank.y = cameraHeight / 2;
            }
            this.setCamera();
         }
      }
      
      private function spawnMoney(count:Number, posX:Number, posY:Number, move:Boolean = true, distance:Number = 0) : void
      {
         var startAngle:* = undefined;
         var coinSpaceArray:* = undefined;
         var coins:* = undefined;
         var c:* = undefined;
         var i:* = undefined;
         var theSpace:* = undefined;
         var coin:* = undefined;
         var item:* = undefined;
         var itemType:* = undefined;
         var speed:* = undefined;
         var randomDist:* = undefined;
         startAngle = Math.random() * 360;
         coinSpaceArray = [];
         coins = 0;
         if(ScreenGame.hp == 0)
         {
            count = 0;
         }
         for(c = 0; c < count; c += 0)
         {
            if(count - c >= 1000)
            {
               itemType = "Money1000";
               c += 1000;
            }
            else if(count - c >= 500)
            {
               itemType = "Money500";
               c += 500;
            }
            else if(count - c >= 250)
            {
               itemType = "Money250";
               c += 250;
            }
            else if(count - c >= 200)
            {
               itemType = "Money200";
               c += 200;
            }
            else if(count - c >= 150)
            {
               itemType = "Money150";
               c += 150;
            }
            else if(count - c >= 100)
            {
               itemType = "Money100";
               c += 100;
            }
            else if(count - c >= 75)
            {
               itemType = "Money75";
               c += 75;
            }
            else if(count - c >= 50)
            {
               itemType = "Money50";
               c += 50;
            }
            else if(count - c >= 25)
            {
               itemType = "Money25";
               c += 25;
            }
            else if(count - c >= 20)
            {
               itemType = "Money20";
               c += 20;
            }
            else if(count - c >= 15)
            {
               itemType = "Money15";
               c += 15;
            }
            else if(count - c >= 10)
            {
               itemType = "Money10";
               c += 10;
            }
            else if(count - c >= 5)
            {
               itemType = "Money5";
               c += 5;
            }
            else if(count - c >= 2)
            {
               itemType = "Money2";
               c += 2;
            }
            else
            {
               itemType = "Money1";
               c++;
            }
            coinSpaceArray.push(coins);
            coins++;
         }
         for(i = 0; i < count; i += 0)
         {
            theSpace = Math.round(Math.random() * (coinSpaceArray.length - 1));
            coin = coinSpaceArray[theSpace];
            coinSpaceArray.splice(theSpace,1);
            item = new ItemMoney();
            if(count - i >= 1000)
            {
               itemType = "Money1000";
               i += 1000;
            }
            else if(count - i >= 500)
            {
               itemType = "Money500";
               i += 500;
            }
            else if(count - i >= 250)
            {
               itemType = "Money250";
               i += 250;
            }
            else if(count - i >= 200)
            {
               itemType = "Money200";
               i += 200;
            }
            else if(count - i >= 150)
            {
               itemType = "Money150";
               i += 150;
            }
            else if(count - i >= 100)
            {
               itemType = "Money100";
               i += 100;
            }
            else if(count - i >= 75)
            {
               itemType = "Money75";
               i += 75;
            }
            else if(count - i >= 50)
            {
               itemType = "Money50";
               i += 50;
            }
            else if(count - i >= 25)
            {
               itemType = "Money25";
               i += 25;
            }
            else if(count - i >= 20)
            {
               itemType = "Money20";
               i += 20;
            }
            else if(count - i >= 15)
            {
               itemType = "Money15";
               i += 15;
            }
            else if(count - i >= 10)
            {
               itemType = "Money10";
               i += 10;
            }
            else if(count - i >= 5)
            {
               itemType = "Money5";
               i += 5;
            }
            else if(count - i >= 2)
            {
               itemType = "Money2";
               i += 2;
            }
            else
            {
               itemType = "Money1";
               i++;
            }
            if(itemType == "Money1")
            {
               item.money = 1;
               item.gotoAndStop(1);
            }
            else if(itemType == "Money2")
            {
               item.money = 2;
               item.gotoAndStop(2);
            }
            else if(itemType == "Money5")
            {
               item.money = 5;
               item.gotoAndStop(3);
            }
            else if(itemType == "Money10")
            {
               item.money = 10;
               item.gotoAndStop(4);
            }
            else if(itemType == "Money15")
            {
               item.money = 15;
               item.gotoAndStop(5);
            }
            else if(itemType == "Money20")
            {
               item.money = 20;
               item.gotoAndStop(6);
            }
            else if(itemType == "Money25")
            {
               item.money = 25;
               item.gotoAndStop(7);
            }
            else if(itemType == "Money50")
            {
               item.money = 50;
               item.gotoAndStop(8);
            }
            else if(itemType == "Money75")
            {
               item.money = 75;
               item.gotoAndStop(9);
            }
            else if(itemType == "Money100")
            {
               item.money = 100;
               item.gotoAndStop(10);
            }
            else if(itemType == "Money150")
            {
               item.money = 150;
               item.gotoAndStop(11);
            }
            else if(itemType == "Money200")
            {
               item.money = 200;
               item.gotoAndStop(12);
            }
            else if(itemType == "Money250")
            {
               item.money = 250;
               item.gotoAndStop(13);
            }
            else if(itemType == "Money500")
            {
               item.money = 500;
               item.gotoAndStop(14);
            }
            else if(itemType == "Money1000")
            {
               item.money = 1000;
               item.gotoAndStop(15);
            }
            this.itemLayer.addChild(item);
            item.x = posX;
            item.y = posY;
            item.radius = item.width / 2;
            item.friction = 2.15;
            if(ScreenLevelSelect.levelMode == "Flag")
            {
               item.moveAngle = startAngle + 360 / coins * coin;
               item.x += Math.cos(item.moveAngle / 180 * Math.PI) * distance;
               item.y += Math.sin(item.moveAngle / 180 * Math.PI) * distance;
            }
            else
            {
               item.moveAngle = Math.random() * 360;
               randomDist = Math.random() * distance;
               item.x += Math.cos(item.moveAngle / 180 * Math.PI) * randomDist;
               item.y += Math.sin(item.moveAngle / 180 * Math.PI) * randomDist;
            }
            if(move)
            {
               speed = 1.2 + Math.random() * 1;
            }
            else
            {
               speed = 0;
            }
            item.xVel = Math.cos(item.moveAngle / 180 * Math.PI) * speed;
            item.yVel = Math.sin(item.moveAngle / 180 * Math.PI) * speed;
            this.moneyArray.push(item);
         }
      }
      
      private function shiftHue(obj:DisplayObject, hue:*, brightness:* = 0, contrast:* = 0, saturation:* = 0) : void
      {
         var colourFilter:AdjustColor = null;
         var mColourMatrix:ColorMatrixFilter = null;
         var mMatrix:Array = null;
         colourFilter = new AdjustColor();
         colourFilter.brightness = brightness;
         colourFilter.contrast = contrast;
         colourFilter.saturation = saturation;
         colourFilter.hue = hue;
         mMatrix = colourFilter.CalculateFinalFlatArray();
         mColourMatrix = new ColorMatrixFilter(mMatrix);
         obj.filters = [mColourMatrix];
      }
      
      private function levelDoneFunction() : void
      {
         var moneyCount:* = undefined;
         var i:* = undefined;
         moneyCount = 0;
         for(i = 0; i < this.moneyArray.length; i++)
         {
            if(this.moneyArray[i] == "[object ItemMoney]")
            {
               moneyCount++;
            }
         }
         if(levelDone && (moneyCount == 0 || ScreenGame.hp == 0))
         {
            if(this.levelDoneTimer > 0)
            {
               --this.levelDoneTimer;
            }
            else
            {
               Main.changeScreen = "Status";
               ScreenUpgrades.money += ScreenGame.money;
            }
         }
      }
      
      private function setCamera() : void
      {
         if(-this.tank.y + cameraHeight / 2 < 0 && -this.tank.y + cameraHeight / 2 > -roomHeight + cameraHeight)
         {
            y = -this.tank.y + cameraHeight / 2;
         }
         else if(-this.tank.y + cameraHeight / 2 > 0)
         {
            y = 0;
         }
         else if(-this.tank.y + cameraHeight / 2 < -roomHeight + cameraHeight)
         {
            y = -roomHeight + cameraHeight;
         }
         if(-this.tank.x + cameraWidth / 2 < 0 && -this.tank.x + cameraWidth / 2 > -roomWidth + cameraWidth)
         {
            x = -this.tank.x + cameraWidth / 2;
         }
         else if(-this.tank.x + cameraWidth / 2 > 0)
         {
            x = 0;
         }
         else if(-this.tank.x + cameraWidth / 2 < -roomWidth + cameraWidth)
         {
            x = -roomWidth + cameraWidth;
         }
         cameraPosX = x;
         cameraPosY = y;
      }
      
      private function getRandomPointWithinCircle(randGenerator:PM_PRNG, circleCenterPosX:Number, circleCenterPosY:Number, circleRadius:Number) : *
      {
         var c:* = undefined;
         var object:Object = new Object();
         var a:* = randGenerator.nextDouble();
         var b:* = randGenerator.nextDouble();
         if(b < a)
         {
            c = b;
            b = a;
            a = c;
         }
         object.posX = circleCenterPosX + b * circleRadius * Math.cos(2 * Math.PI * a / b);
         object.posY = circleCenterPosY + b * circleRadius * Math.sin(2 * Math.PI * a / b);
         return object;
      }
      
      private function spawnParticle(particleType:String, count:Number, posX:Number, posY:Number, distance:Number = 5, startAngle:Number = 0, randAngle:Number = 360, addVel:Number = 0, addMaxScale:Number = 0, addMinScale:Number = 0) : void
      {
         var i:* = undefined;
         var particle:* = undefined;
         var speed:* = undefined;
         var friction:* = undefined;
         var killVelocity:* = undefined;
         var randomDistance:* = undefined;
         var randomNum:* = undefined;
         var randomFactor:* = undefined;
         for(i = 0; i < count; i++)
         {
            killVelocity = 0;
            randomDistance = false;
            if(particleType != "BulletDestroy" && particleType != "Poison" && particleType != "PoisonBoss" && particleType != "Smoke" && particleType != "Magic" && particleType != "MuzzleFlareSmall" && particleType != "MuzzleFlareMedium" && particleType != "MuzzleFlareBig" && particleType != "Reflect" && particleType != "Heal" && particleType != "HealBoss" && particleType != "Immune" && particleType != "Strength" && particleType != "Weakness")
            {
               if(particleType == "EnemyGreen")
               {
                  particle = new ParticleGreen();
               }
               else if(particleType == "EnemyGreen2")
               {
                  particle = new ParticleGreen2();
               }
               else if(particleType == "EnemyGreen3")
               {
                  particle = new ParticleGreen3();
               }
               else if(particleType == "EnemyGrey")
               {
                  particle = new ParticleGrey();
               }
               else if(particleType == "EnemyYellow")
               {
                  particle = new ParticleYellow();
               }
               else if(particleType == "EnemyYellow2")
               {
                  particle = new ParticleYellow2();
               }
               else if(particleType == "EnemyBlack")
               {
                  particle = new ParticleBlack();
               }
               else if(particleType == "EnemyRedGrey")
               {
                  particle = new ParticleRedGrey();
               }
               else if(particleType == "EnemyRed")
               {
                  particle = new ParticleRed();
               }
               else if(particleType == "EnemyWhite")
               {
                  particle = new ParticleWhite();
               }
               else if(particleType == "EnemyWhite2")
               {
                  particle = new ParticleWhite2();
               }
               else if(particleType == "EnemyOrangeBrown")
               {
                  particle = new ParticleOrangeBrown();
               }
               else if(particleType == "EnemyWhiteRed")
               {
                  particle = new ParticleWhiteRed();
               }
               else if(particleType == "EnemyPurple")
               {
                  particle = new ParticlePurple();
               }
               else if(particleType == "EnemyLightBlue")
               {
                  particle = new ParticleLightBlue();
               }
               else if(particleType == "EnemyPink")
               {
                  particle = new ParticlePink();
               }
               else if(particleType == "EnemyOrange")
               {
                  particle = new ParticleOrange();
               }
               else if(particleType == "EnemyCyan")
               {
                  particle = new ParticleCyan();
               }
               else if(particleType == "EnemyBlue")
               {
                  particle = new ParticleBlue();
               }
               particle.velocity = 1.5 + addVel + Math.random();
               particle.friction = 0.2;
               particle.lifeTime = Math.round(5 + Math.random() * 10);
               particle.lifeTimeMax = 15;
               particle.scaleMax = 2 + addMaxScale;
               particle.scaleMin = 0.2 + addMinScale;
            }
            else if(particleType == "BulletDestroy")
            {
               particle = new ParticleBlack();
               particle.velocity = 0.5 + addVel + Math.random() * 1.5;
               particle.friction = 0.1;
               particle.lifeTime = Math.round(5 + Math.random() * 5);
               particle.lifeTimeMax = 10;
               particle.scaleMax = 1.5 + addMaxScale;
               particle.scaleMin = 0.2 + addMinScale;
            }
            else if(particleType == "Poison" || particleType == "PoisonBoss")
            {
               particle = new ParticlePoison();
               particle.velocity = 0 + addVel;
               particle.friction = 0.1;
               particle.scaleMax = addMaxScale;
               particle.scaleMin = addMinScale;
               if(particleType == "Poison")
               {
                  particle.gotoAndStop(1);
                  particle.lifeTime = 10;
                  particle.lifeTimeMax = 8;
               }
               else if(particleType == "PoisonBoss")
               {
                  particle.gotoAndStop(2);
                  particle.lifeTime = 20;
                  particle.lifeTimeMax = 16;
               }
            }
            else if(particleType == "Smoke")
            {
               particle = new ParticleSmoke();
               particle.velocity = 1.5 + addVel + Math.random() * 1;
               particle.friction = 0.5;
               particle.lifeTime = Math.round(15 + Math.random() * 10);
               particle.lifeTimeMax = 25;
               particle.scaleMax = 3 + addMaxScale;
               particle.scaleMin = 0.2 + addMinScale;
               killVelocity = -1;
            }
            else if(particleType == "Magic")
            {
               particle = new ParticleMagic();
               randomNum = Math.random();
               if(randomNum < 0.33)
               {
                  particle.gotoAndStop(1);
               }
               else if(randomNum < 0.66)
               {
                  particle.gotoAndStop(2);
               }
               else
               {
                  particle.gotoAndStop(3);
               }
               particle.rotation = Math.random() * 360;
               particle.velocity = 2 + addVel + Math.random() * 1.4;
               particle.friction = 0.6;
               particle.lifeTime = Math.round(5 + Math.random() * 5);
               particle.lifeTimeMax = 10;
               particle.scaleMax = 1 + addMaxScale;
               particle.scaleMin = 0.2 + addMinScale;
               killVelocity = -1;
            }
            else if(particleType == "MuzzleFlareSmall" || particleType == "MuzzleFlareMedium" || particleType == "MuzzleFlareBig")
            {
               if(particleType == "MuzzleFlareSmall")
               {
                  particle = new ParticleMuzzleFlareSmall();
               }
               else if(particleType == "MuzzleFlareSmall")
               {
                  particle = new ParticleMuzzleFlareMedium();
               }
               else
               {
                  particle = new ParticleMuzzleFlareBig();
               }
               particle.rotation = startAngle;
               particle.velocity = 0;
               particle.friction = 0;
               particle.lifeTime = 2;
               particle.lifeTimeMax = 2;
               particle.scaleMax = 1;
               particle.scaleMin = 1;
               killVelocity = -1;
               particle.gotoAndStop(Math.round(1 + Math.random() * 3));
            }
            else if(particleType == "Reflect")
            {
               particle = new ParticleReflect();
               particle.rotation = startAngle;
               particle.velocity = 0;
               particle.friction = 0;
               particle.lifeTime = 4;
               particle.lifeTimeMax = 4;
               particle.scaleMax = 1;
               particle.scaleMin = 1;
               killVelocity = -1;
            }
            else if(particleType == "Heal" || particleType == "HealBoss")
            {
               if(particleType == "Heal")
               {
                  particle = new ParticleHeal();
                  particle.scaleMax = 1;
                  particle.scaleMin = 0.5;
               }
               else
               {
                  particle = new ParticleHealBoss();
                  particle.scaleMax = 2;
                  particle.scaleMin = 0.5;
               }
               particle.velocity = 2.75;
               particle.friction = 0.1;
               particle.lifeTime = 20;
               particle.lifeTimeMax = 20;
               killVelocity = -1;
            }
            else if(particleType == "Immune")
            {
               particle = new ParticleImmune();
               particle.velocity = 1.5 + addVel + Math.random() * 1;
               particle.friction = 0.5;
               particle.lifeTime = Math.round(15 + Math.random() * 10);
               particle.lifeTimeMax = 25;
               particle.scaleMax = 3 + addMaxScale;
               particle.scaleMin = 0.2 + addMinScale;
               killVelocity = -1;
            }
            else if(particleType == "Strength" || particleType == "Weakness")
            {
               if(particleType == "Strength")
               {
                  particle = new ParticleStrength();
                  enemyStrengthTrigger = true;
               }
               else if(particleType == "Weakness")
               {
                  particle = new ParticleWeakness();
                  enemyWeaknessTrigger = true;
               }
               particle.rotation = 0;
               particle.velocity = 0;
               particle.friction = 0;
               particle.lifeTime = 20;
               particle.lifeTimeMax = 20;
               particle.scaleMax = 1.1 + addMaxScale;
               particle.scaleMin = 0;
               killVelocity = -1;
               randomDistance = true;
            }
            particle.killVelocity = killVelocity;
            this.particleLayer.addChild(particle);
            particle.x = posX;
            particle.y = posY;
            particle.moveAngle = startAngle - randAngle / 2 + Math.random() * randAngle;
            if(distance > 0)
            {
               if(!randomDistance)
               {
                  particle.x += Math.cos(particle.moveAngle / 180 * Math.PI) * distance;
                  particle.y += Math.sin(particle.moveAngle / 180 * Math.PI) * distance;
               }
               else
               {
                  randomFactor = 1 - Math.random() * Math.random();
                  particle.x += Math.cos(particle.moveAngle / 180 * Math.PI) * (distance * randomFactor);
                  particle.y += Math.sin(particle.moveAngle / 180 * Math.PI) * (distance * randomFactor);
               }
            }
            particle.xVel = Math.cos(particle.moveAngle / 180 * Math.PI) * particle.velocity;
            particle.yVel = Math.sin(particle.moveAngle / 180 * Math.PI) * particle.velocity;
            this.particleArray.push(particle);
         }
      }
      
      private function handleTankShield() : void
      {
         if(this.shieldOn)
         {
            if(this.shieldTimer > 0)
            {
               if(this.shieldTimer < 120)
               {
                  this.shield.alpha = this.shieldTimer / 120 * 0.9 + 0.1;
               }
               --this.shieldTimer;
            }
            else
            {
               this.shieldOn = false;
            }
            if(!stage.contains(this.shield))
            {
               this.shield.alpha = 1;
               this.shieldLayer.addChild(this.shield);
               this.shield.gotoAndPlay(1);
            }
            if(stage.contains(this.shield))
            {
               this.shield.x = this.tank.x;
               this.shield.y = this.tank.y;
               if(this.shield.currentFrame == 4)
               {
                  this.shield.gotoAndStop(4);
               }
            }
         }
         else if(stage.contains(this.shield))
         {
            this.shieldLayer.removeChild(this.shield);
         }
      }
      
      private function handleMines() : void
      {
         var i:* = undefined;
         var theMine:* = undefined;
         var ii:* = undefined;
         var theEnemy:* = undefined;
         var distance:* = undefined;
         for(i = 0; i < this.mineArray.length; i++)
         {
            theMine = this.mineArray[i];
            for(ii = 0; ii < this.enemyArray.length; ii++)
            {
               theEnemy = this.enemyArray[ii];
               if((theEnemy.invisible == null || !theEnemy.invisible) && (theEnemy.teleporting == null || !theEnemy.teleporting))
               {
                  distance = this.distanceBetween(theMine.x,theMine.y,theEnemy.x,theEnemy.y);
                  if(distance <= theMine.radius + theEnemy.radius)
                  {
                     if(stage.contains(theMine))
                     {
                        this.explosionQueueArray.push([theMine.x,theMine.y,theMine.explosionRadius,theMine.damage,"Normal",0,0,false,"Mine"]);
                        this.mineArray.splice(i,1);
                        this.groundLayer.removeChild(theMine);
                        i--;
                     }
                  }
               }
            }
         }
      }
      
      private function flagOutTweenFinish(event:TweenEvent) : void
      {
         this.flagInTweenX.start();
         this.flagInTweenY.start();
      }
      
      private function handleExplosions() : void
      {
         var i:* = undefined;
         var theExplosion:* = undefined;
         for(i = 0; i < this.explosionArray.length; i++)
         {
            theExplosion = this.explosionArray[i];
            theExplosion.canDamage = false;
            if(theExplosion.currentFrame == theExplosion.totalFrames)
            {
               if(stage.contains(theExplosion))
               {
                  this.explosionArray.splice(i,1);
                  this.particleLayer.removeChild(theExplosion);
                  i--;
               }
            }
         }
      }
      
      private function createBackground() : void
      {
         var topLayer:Sprite = null;
         var ii:* = undefined;
         var image:* = undefined;
         var f:* = undefined;
         var proportionCurrent:* = undefined;
         var proportionMax:* = undefined;
         var scale:* = undefined;
         var posX:* = undefined;
         var posY:* = undefined;
         var theRotation:* = undefined;
         var stopAt:* = undefined;
         var typeNumber:* = undefined;
         var type:* = undefined;
         var maxCountPossible:* = undefined;
         var minGroupCount:* = undefined;
         var maxGroupCount:* = undefined;
         var groupChance:* = undefined;
         var minGroupDistance:* = undefined;
         var maxGroupDistance:* = undefined;
         var addAsGroup:* = undefined;
         var countToPlace:* = undefined;
         var uu:* = undefined;
         var groupSizeFactor:* = undefined;
         var groupDistance:* = undefined;
         var circleObject:* = undefined;
         var newPosX:* = undefined;
         var newPosY:* = undefined;
         var newScale:* = undefined;
         var newRotation:* = undefined;
         var newStopAt:* = undefined;
         var imageSize:* = 256;
         var tileCountX:* = Math.floor(roomWidth / imageSize) + 1;
         var tileCountY:* = Math.floor(roomHeight / imageSize) + 1;
         var backgroundType:* = ScreenGame.worldModels[ScreenGame.world * 3 - 2][ScreenGame.level - 1][8];
         for(var i:* = 0; i < tileCountX; i++)
         {
            for(ii = 0; ii < tileCountY; ii++)
            {
               image = new GameBG();
               image.x = i * imageSize;
               image.y = ii * imageSize;
               this.bg.addChild(image);
               if(backgroundType == "Desert")
               {
                  image.gotoAndStop(1);
               }
               else if(backgroundType == "Grass")
               {
                  image.gotoAndStop(2);
               }
               else if(backgroundType == "BlueDirt")
               {
                  image.gotoAndStop(3);
               }
               else if(backgroundType == "Beach")
               {
                  image.gotoAndStop(4);
               }
               else if(backgroundType == "Concrete")
               {
                  image.gotoAndStop(5);
               }
               else if(backgroundType == "Biology")
               {
                  image.gotoAndStop(6);
               }
               else if(backgroundType == "Hell")
               {
                  image.gotoAndStop(7);
               }
               else if(backgroundType == "MagicStone")
               {
                  image.gotoAndStop(8);
               }
               else if(backgroundType == "Futuristic")
               {
                  image.gotoAndStop(9);
               }
            }
         }
         var randGenerator:PM_PRNG = new PM_PRNG();
         randGenerator.seed = ScreenGame.worldModels[ScreenGame.world * 3 - 2][ScreenGame.level - 1][9];
         var minAmount:* = 0;
         var maxAmount:* = 0;
         var randomOrder:* = false;
         var objectProportions:* = [];
         if(backgroundType == "Desert")
         {
            objectProportions = ["Crack",0.3,"Rock",0.7];
            minAmount = 8;
            maxAmount = 9;
         }
         else if(backgroundType == "Grass")
         {
            objectProportions = ["FlowerWhite",0.33,"FlowerRed",0.33,"FlowerPurple",0.33];
            minAmount = 10;
            maxAmount = 11;
         }
         else if(backgroundType == "BlueDirt")
         {
            objectProportions = ["Crack",0.2,"Rock",0.8];
            minAmount = 9;
            maxAmount = 10;
         }
         else if(backgroundType == "Beach")
         {
            objectProportions = ["Rock",0.8,"Seastuff",0.2];
            minAmount = 4;
            maxAmount = 5;
         }
         else if(backgroundType == "Concrete")
         {
            objectProportions = ["Crack",0.6,"Trash",0.4];
            minAmount = 6;
            maxAmount = 7;
         }
         else if(backgroundType == "MagicStone")
         {
            objectProportions = ["Diamond",0.5,"Dirt",0.5];
            minAmount = 9;
            maxAmount = 10;
         }
         else if(backgroundType == "Hell")
         {
            objectProportions = ["Rock",0.8,"Skeleton",0.2];
            minAmount = 6;
            maxAmount = 7;
         }
         else if(backgroundType == "Biology")
         {
            objectProportions = ["RedBloodCell",0.45,"WhiteBloodCell",0.3,"Bacteria",0.25];
            minAmount = 6;
            maxAmount = 7;
         }
         else if(backgroundType == "Futuristic")
         {
            objectProportions = ["FuturisticSquare",0.5,"FuturisticLines",0.5];
            minAmount = 9;
            maxAmount = 10;
         }
         minAmount = Math.round(minAmount * tileCountX * tileCountY);
         maxAmount = Math.round(maxAmount * tileCountX * tileCountY);
         var amount:* = minAmount + Math.round(randGenerator.nextDouble() * (maxAmount - minAmount));
         var objectList:* = [];
         for(var g:* = 0; g < objectProportions.length / 2; g++)
         {
            objectList.push(objectProportions[g * 2]);
            objectList.push(0);
         }
         var objectTypes:* = objectProportions.length / 2;
         var objectCount:* = 0;
         var currentType:* = 1;
         if(objectTypes > 1)
         {
            for(f = 0; f < amount; f++)
            {
               proportionCurrent = objectCount / amount;
               proportionMax = objectProportions[currentType * 2 - 1];
               if(currentType == objectTypes || proportionCurrent < proportionMax)
               {
                  objectCount++;
                  ++objectList[currentType * 2 - 1];
               }
               else
               {
                  objectCount = 1;
                  currentType++;
                  ++objectList[currentType * 2 - 1];
               }
            }
         }
         else
         {
            objectList = [objectProportions[0],amount];
         }
         for(var u:* = 0; u < amount; u++)
         {
            scale = randGenerator.nextDouble();
            posX = Math.round(randGenerator.nextDouble() * roomWidth);
            posY = Math.round(randGenerator.nextDouble() * roomHeight);
            theRotation = Math.round(randGenerator.nextDouble() * 360);
            stopAt = randGenerator.nextDouble();
            if(randomOrder == true)
            {
               typeNumber = Math.floor(randGenerator.nextDouble() * (objectList.length / 2));
               if(typeNumber > objectList.length / 2 - 1)
               {
                  typeNumber--;
               }
            }
            else
            {
               typeNumber = 0;
            }
            type = objectList[typeNumber * 2];
            maxCountPossible = objectList[typeNumber * 2 + 1];
            minGroupCount = 1;
            maxGroupCount = 1;
            groupChance = 0;
            minGroupDistance = 0;
            maxGroupDistance = 0;
            addAsGroup = false;
            if(type == "Rock")
            {
               minGroupCount = 3;
               maxGroupCount = 7;
               groupChance = 0.3;
               minGroupDistance = 15;
               maxGroupDistance = 60;
            }
            else if(type == "FlowerWhite" || type == "FlowerRed" || type == "FlowerPurple")
            {
               minGroupCount = 3;
               maxGroupCount = 7;
               groupChance = 0.4;
               minGroupDistance = 30;
               maxGroupDistance = 100;
            }
            else if(type == "Trash")
            {
               minGroupCount = 3;
               maxGroupCount = 6;
               groupChance = 0.5;
               minGroupDistance = 15;
               maxGroupDistance = 45;
            }
            else if(type == "Diamond")
            {
               minGroupCount = 3;
               maxGroupCount = 7;
               groupChance = 0.3;
               minGroupDistance = 20;
               maxGroupDistance = 80;
            }
            else if(type == "Skeleton")
            {
               minGroupCount = 2;
               maxGroupCount = 3;
               groupChance = 0.2;
               minGroupDistance = 40;
               maxGroupDistance = 60;
            }
            else if(type == "Dirt")
            {
               minGroupCount = 2;
               maxGroupCount = 4;
               groupChance = 0.3;
               minGroupDistance = 30;
               maxGroupDistance = 80;
            }
            else if(type == "RedBloodCell" || type == "WhiteBloodCell" || type == "Bacteria")
            {
               minGroupCount = 3;
               maxGroupCount = 5;
               groupChance = 0.6;
               minGroupDistance = 60;
               maxGroupDistance = 100;
            }
            else if(type == "FuturisticSquare")
            {
               minGroupCount = 2;
               maxGroupCount = 5;
               groupChance = 0.3;
               minGroupDistance = 30;
               maxGroupDistance = 120;
            }
            groupChance *= 1 / ((maxGroupCount - minGroupCount) / 2);
            if(randGenerator.nextDouble() <= groupChance)
            {
               addAsGroup = true;
               groupSizeFactor = randGenerator.nextDouble();
               countToPlace = Math.floor(minGroupCount + groupSizeFactor * (maxGroupCount - minGroupCount + 1));
               if(countToPlace >= maxCountPossible)
               {
                  countToPlace = maxCountPossible;
               }
               objectList[typeNumber * 2 + 1] -= countToPlace;
               if(objectList[typeNumber * 2 + 1] == 0)
               {
                  objectList.splice(typeNumber * 2,2);
               }
            }
            else
            {
               countToPlace = 1;
               --objectList[typeNumber * 2 + 1];
               if(objectList[typeNumber * 2 + 1] == 0)
               {
                  objectList.splice(typeNumber * 2,2);
               }
            }
            if(addAsGroup)
            {
               groupDistance = minGroupDistance + groupSizeFactor * (maxGroupDistance - minGroupDistance);
            }
            u += countToPlace - 1;
            for(uu = 0; uu < countToPlace; uu++)
            {
               if(!addAsGroup)
               {
                  this.addBackgroundObject(backgroundType,type,posX,posY,scale,theRotation,stopAt);
               }
               else
               {
                  circleObject = this.getRandomPointWithinCircle(randGenerator,posX,posY,groupDistance);
                  newPosX = circleObject.posX;
                  newPosY = circleObject.posY;
                  newScale = randGenerator.nextDouble();
                  newRotation = Math.round(randGenerator.nextDouble() * 360);
                  newStopAt = randGenerator.nextDouble();
                  this.addBackgroundObject(backgroundType,type,newPosX,newPosY,newScale,newRotation,newStopAt);
               }
            }
         }
         this.removeBackgroundObjectsColliding(randGenerator);
         if(ScreenLevelSelect.levelMode == "Tower" || ScreenLevelSelect.levelMode == "Defense")
         {
            if(ScreenLevelSelect.levelMode == "Tower")
            {
               topLayer = new TopLayerTower();
               topLayer.x = 320;
               topLayer.y = 320;
            }
            else if(ScreenLevelSelect.levelMode == "Defense")
            {
               topLayer = new TopLayerDefense();
               topLayer.x = 0;
               topLayer.y = 0;
            }
            this.bg.addChild(topLayer);
            switch(ScreenGame.world)
            {
               case 1:
                  topLayer.alpha = 0.45;
                  break;
               case 2:
                  topLayer.alpha = 0.4;
                  break;
               case 3:
                  topLayer.alpha = 0.6;
                  break;
               case 4:
                  topLayer.alpha = 0.35;
                  break;
               case 5:
                  topLayer.alpha = 0.5;
                  break;
               case 6:
                  topLayer.alpha = 0.65;
                  break;
               case 7:
                  topLayer.alpha = 0.55;
                  break;
               case 8:
                  topLayer.alpha = 0.7;
                  break;
               case 9:
                  topLayer.alpha = 0.75;
            }
         }
         var renderedBGBitmapData:* = new BitmapData(roomWidth,roomHeight);
         renderedBGBitmapData.draw(this.bg);
         var renderedBGBitmap:* = new Bitmap(renderedBGBitmapData);
         for(var c:* = int(this.bg.numChildren - 1); c >= 0; c--)
         {
            this.bg.removeChildAt(c);
         }
         this.bg.addChild(renderedBGBitmap);
      }
      
      private function handleEnemyBullets() : void
      {
         var i:* = undefined;
         var theBullet:* = undefined;
         var tankBulletDistance:* = undefined;
         var totalVelocity:* = undefined;
         var angleVelocity:* = undefined;
         var angleToTank:* = undefined;
         var angleDifference:* = undefined;
         var rotSpeed:* = undefined;
         var theAngleToTank:* = undefined;
         var bulletVel:* = undefined;
         var tankRadius:* = undefined;
         var angleFromEnemy:* = undefined;
         var distanceToEnemy:* = undefined;
         var endPosX:* = undefined;
         var endPosY:* = undefined;
         for(i = 0; i < this.enemyBulletArray.length; i++)
         {
            theBullet = this.enemyBulletArray[i];
            theBullet.x += theBullet.xVel;
            theBullet.y += theBullet.yVel;
            if(theBullet.lifeTime != 0)
            {
               --theBullet.lifeTime;
               if(theBullet.lifeTime <= 10)
               {
                  theBullet.alpha = 0.3 + 0.7 * (theBullet.lifeTime / 10);
               }
            }
            if(theBullet.lifeTime == 0 || (theBullet.x < 0 - theBullet.width / 2 || theBullet.x > roomWidth + theBullet.width / 2 || theBullet.y < 0 - theBullet.height / 2 || theBullet.y > roomHeight + theBullet.height / 2))
            {
               if(theBullet == "[object EnemyBulletHook]")
               {
                  if(theBullet.enemy != null && stage.contains(theBullet.enemy))
                  {
                     --theBullet.enemy.bulletsShooting;
                  }
               }
               if(stage.contains(theBullet))
               {
                  this.enemyBulletArray.splice(i,1);
                  theBullet.parent.removeChild(theBullet);
                  i--;
               }
            }
            else if(!levelDone)
            {
               if((theBullet == "[object EnemyBulletFollowing]" || theBullet == "[object EnemyBulletFollowingBoss]") && !theBullet.reflected)
               {
                  if(this.tank != null && stage.contains(this.tank))
                  {
                     totalVelocity = this.distanceBetween(0,0,theBullet.xVel,theBullet.yVel);
                     angleVelocity = theBullet.rotation / 180 * Math.PI;
                     angleToTank = this.angleBetween(this.tank.x,this.tank.y,theBullet.x,theBullet.y);
                     angleDifference = this.differenceBetweenAngles(angleVelocity * 180 / Math.PI,angleToTank * 180 / Math.PI);
                     if(theBullet == "[object EnemyBulletFollowing]")
                     {
                        rotSpeed = 1.2;
                     }
                     else
                     {
                        rotSpeed = 1.5;
                     }
                     if(Math.abs(angleDifference) < rotSpeed / 180 * Math.PI)
                     {
                        theBullet.rotation = angleToTank * 180 / Math.PI;
                     }
                     else if(angleDifference > 0)
                     {
                        theBullet.rotation -= rotSpeed;
                     }
                     else if(angleDifference < 0)
                     {
                        theBullet.rotation += rotSpeed;
                     }
                     theBullet.xVel = Math.cos(theBullet.rotation / 180 * Math.PI) * totalVelocity;
                     theBullet.yVel = Math.sin(theBullet.rotation / 180 * Math.PI) * totalVelocity;
                  }
               }
               tankBulletDistance = this.distanceBetween(theBullet.x,theBullet.y,this.tank.x + this.tank.xVel,this.tank.y + this.tank.yVel);
               if(!theBullet.reflected && (tankBulletDistance < theBullet.radius + this.tank.radius || this.shieldOn && tankBulletDistance < theBullet.radius + this.tank.radius * 2))
               {
                  if(!this.shieldOn && (ScreenUpgrades.levelsArrayMisc[1] == 0 || Math.random() > ScreenUpgrades.upgradeArrayBulletReflect[1][ScreenUpgrades.levelsArrayMisc[1] - 1]) || theBullet == "[object EnemyBulletTrap]" && tankBulletDistance < theBullet.radius + this.tank.radius)
                  {
                     if(theBullet == "[object EnemyBulletHook]")
                     {
                        --theBullet.enemy.bulletsShooting;
                     }
                     if(theBullet == "[object EnemyBulletHook]")
                     {
                        if(theBullet.enemy != null && stage.contains(theBullet.enemy))
                        {
                           theBullet.enemy.isGrapping = true;
                           if(theBullet.enemy.enemyLevel == "B")
                           {
                              this.tank.grappingEnemy = theBullet.enemy;
                           }
                        }
                     }
                     if(ScreenGame.hp - theBullet.damage > 0)
                     {
                        SoundManager.sfxArray.push("TankDamaged");
                        ScreenGame.hp -= theBullet.damage;
                        this.colorClip(this.tank,16711680,0.6);
                        this.tank.damageIndicator = 20;
                     }
                     else
                     {
                        ScreenGame.hp = 0;
                     }
                     if(stage.contains(theBullet))
                     {
                        this.enemyBulletArray.splice(i,1);
                        theBullet.parent.removeChild(theBullet);
                        i--;
                     }
                  }
                  else if(theBullet != "[object EnemyBulletTrap]")
                  {
                     theAngleToTank = this.angleBetween(this.tank.x,this.tank.y,theBullet.x,theBullet.y) * (180 / Math.PI);
                     theBullet.rotation = theAngleToTank;
                     bulletVel = 10;
                     theBullet.xVel = Math.cos(theBullet.rotation / 180 * Math.PI) * bulletVel;
                     theBullet.yVel = Math.sin(theBullet.rotation / 180 * Math.PI) * bulletVel;
                     theBullet.lifeTime = 18;
                     theBullet.gotoAndStop(2);
                     theBullet.reflected = true;
                     if(this.shieldOn)
                     {
                        tankRadius = this.tank.width;
                     }
                     else
                     {
                        tankRadius = this.tank.width / 2;
                     }
                     SoundManager.sfxArray.push("ReflectBullet");
                     this.spawnParticle("Reflect",1,theBullet.x - Math.cos(theBullet.rotation / 180 * Math.PI) * 0,theBullet.y - Math.sin(theBullet.rotation / 180 * Math.PI) * 0,0,theBullet.rotation,0);
                  }
               }
               if(theBullet == "[object EnemyBulletHook]")
               {
                  if(theBullet.enemy != null && stage.contains(theBullet.enemy))
                  {
                     angleFromEnemy = this.angleBetween(theBullet.enemy.x,theBullet.enemy.y,theBullet.x,theBullet.y);
                     distanceToEnemy = this.distanceBetween(theBullet.x,theBullet.y,theBullet.enemy.x,theBullet.enemy.y);
                     endPosX = theBullet.enemy.x + Math.cos(angleFromEnemy) * theBullet.enemy.radius;
                     endPosY = theBullet.enemy.y + Math.sin(angleFromEnemy) * theBullet.enemy.radius;
                     this.hookRopeLayer.graphics.lineStyle(1,0,theBullet.alpha);
                     this.hookRopeLayer.graphics.beginFill(0);
                     this.hookRopeLayer.graphics.moveTo(theBullet.x,theBullet.y);
                     this.hookRopeLayer.graphics.lineTo(endPosX,endPosY);
                     this.hookRopeLayer.graphics.endFill();
                  }
               }
            }
         }
      }
      
      private function handleExplosionQueue() : void
      {
         var i:* = undefined;
         for(i = 0; i < this.explosionQueueArray.length; i++)
         {
            if(this.explosionQueueArray[i][8] != null)
            {
               this.spawnExplosion(this.explosionQueueArray[i][0],this.explosionQueueArray[i][1],this.explosionQueueArray[i][2],this.explosionQueueArray[i][3],this.explosionQueueArray[i][4],this.explosionQueueArray[i][5],this.explosionQueueArray[i][6],this.explosionQueueArray[i][7],this.explosionQueueArray[i][8]);
            }
            else
            {
               this.spawnExplosion(this.explosionQueueArray[i][0],this.explosionQueueArray[i][1],this.explosionQueueArray[i][2],this.explosionQueueArray[i][3],this.explosionQueueArray[i][4],this.explosionQueueArray[i][5],this.explosionQueueArray[i][6],this.explosionQueueArray[i][7]);
            }
            this.explosionQueueArray.splice(i,1);
            i--;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         if(levelDone)
         {
            moveTempVariablesWhenCompleted();
            resetTempVariables("LevelCompleted");
         }
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function handleBullets() : void
      {
         var i:* = undefined;
         var theBullet:* = undefined;
         var angleToTarget:* = undefined;
         var angle:* = undefined;
         var partX:* = undefined;
         var partY:* = undefined;
         var angleDegrees:* = undefined;
         var closestDist:* = undefined;
         var e:* = undefined;
         var alreadyHit:* = undefined;
         var ee:* = undefined;
         var enemyDistance:* = undefined;
         var groundItem:* = undefined;
         var randomDistance:* = undefined;
         var randomAngle:* = undefined;
         var closeFireballs:* = undefined;
         var o:* = undefined;
         var theOtherBullet:* = undefined;
         var hitTopBottom:* = undefined;
         var hitLeftRight:* = undefined;
         for(i = 0; i < this.bulletArray.length; i++)
         {
            theBullet = this.bulletArray[i];
            if(theBullet.dead)
            {
               if(stage.contains(theBullet))
               {
                  this.bulletArray.splice(i,1);
                  this.bulletLayer.removeChild(theBullet);
                  i--;
               }
            }
            if(theBullet == "[object BulletLaser]")
            {
               theBullet.canDamage = false;
               if(theBullet.currentFrame == theBullet.totalFrames)
               {
                  if(stage.contains(theBullet))
                  {
                     this.bulletArray.splice(i,1);
                     this.bulletLayer.removeChild(theBullet);
                     i--;
                  }
               }
            }
            if(!levelDone || ScreenGame.hp > 0)
            {
               if(theBullet == "[object BulletMagic]" && theBullet.neverHitTarget == false && theBullet.targetsLeft > 0 || theBullet == "[object BulletMagicBunny]" && theBullet.neverHitTarget == false && theBullet.targetsLeft > 0)
               {
                  if(theBullet.targetEnemy == null || !stage.contains(theBullet.targetEnemy) || !(theBullet.targetEnemy.invisible == null || !theBullet.targetEnemy.invisible) || (theBullet.targetEnemy.teleporting == null || !theBullet.targetEnemy.teleporting) || (theBullet.targetEnemy.x < 0 - theBullet.targetEnemy.width / 2 - cameraPosX || theBullet.targetEnemy.x > roomWidth + theBullet.targetEnemy.width / 2 - cameraPosX - (roomWidth - cameraWidth) || theBullet.targetEnemy.y < 0 - theBullet.targetEnemy.height / 2 - cameraPosY || theBullet.targetEnemy.y > roomHeight + theBullet.targetEnemy.height / 2 - cameraPosY - (roomHeight - cameraHeight)))
                  {
                     for(e = 0; e < this.enemyArray.length; e++)
                     {
                        if(this.checkWithinScreen(this.enemyArray[e].x,this.enemyArray[e].y,this.enemyArray[e].width,this.enemyArray[e].height) && (this.enemyArray[e].invisible == null || !this.enemyArray[e].invisible) && (this.enemyArray[e].teleporting == null || !this.enemyArray[e].teleporting))
                        {
                           alreadyHit = false;
                           for(ee = 0; ee < theBullet.enemiesArray.length; ee++)
                           {
                              if(this.enemyArray[e] == theBullet.enemiesArray[ee])
                              {
                                 alreadyHit = true;
                                 break;
                              }
                           }
                           if(!alreadyHit)
                           {
                              enemyDistance = this.distanceBetween(theBullet.x,theBullet.y,this.enemyArray[e].x,this.enemyArray[e].y) - this.enemyArray[e].radius;
                              if(closestDist == null || enemyDistance < closestDist)
                              {
                                 theBullet.targetEnemy = this.enemyArray[e];
                                 closestDist = enemyDistance;
                              }
                           }
                        }
                     }
                  }
                  if(theBullet.targetEnemy != null && stage.contains(theBullet.targetEnemy) && (theBullet.targetEnemy.invisible == null || !theBullet.targetEnemy.invisible) && (theBullet.targetEnemy.teleporting == null || !theBullet.targetEnemy.teleporting) && !(theBullet.targetEnemy.x < 0 - theBullet.targetEnemy.width / 2 - cameraPosX || theBullet.targetEnemy.x > roomWidth + theBullet.targetEnemy.width / 2 - cameraPosX - (roomWidth - cameraWidth) || theBullet.targetEnemy.y < 0 - theBullet.targetEnemy.height / 2 - cameraPosY || theBullet.targetEnemy.y > roomHeight + theBullet.targetEnemy.height / 2 - cameraPosY - (roomHeight - cameraHeight)))
                  {
                     angleToTarget = this.angleBetween(theBullet.x,theBullet.y,theBullet.targetEnemy.x,theBullet.targetEnemy.y);
                     theBullet.xVel = Math.cos(angleToTarget) * theBullet.speed;
                     theBullet.yVel = Math.sin(angleToTarget) * theBullet.speed;
                     if(theBullet == "[object BulletMagicBunny]")
                     {
                        theBullet.rotation = angleToTarget * 180 / Math.PI;
                     }
                  }
                  else
                  {
                     theBullet.targetEnemy = null;
                  }
               }
               if(theBullet == "[object BulletMagic]" || theBullet == "[object BulletMagicBunny]")
               {
                  this.spawnParticle("Magic",1,theBullet.x,theBullet.y,0);
               }
               if(theBullet == "[object BulletRocket]")
               {
                  if(theBullet.targetEnemy != null && stage.contains(theBullet.targetEnemy))
                  {
                     if((theBullet.targetEnemy.invisible == null || !theBullet.targetEnemy.invisible) && (theBullet.targetEnemy.teleporting == null || !theBullet.targetEnemy.teleporting))
                     {
                        angleToTarget = this.angleBetween(theBullet.x,theBullet.y,theBullet.targetEnemy.x,theBullet.targetEnemy.y);
                        theBullet.rotation = angleToTarget * 180 / Math.PI;
                        theBullet.xVel = Math.cos(angleToTarget) * theBullet.speed;
                        theBullet.yVel = Math.sin(angleToTarget) * theBullet.speed;
                     }
                     else
                     {
                        theBullet.targetEnemy = null;
                     }
                  }
                  else
                  {
                     theBullet.targetEnemy = null;
                  }
                  this.spawnParticle("Smoke",1,theBullet.x + Math.cos((theBullet.rotation - 180) / 180 * Math.PI) * 8,theBullet.y + Math.sin((theBullet.rotation - 180) / 180 * Math.PI) * 8,0);
               }
               if(theBullet == "[object BulletIceball]" || theBullet == "[object BulletLavaball]")
               {
                  if(theBullet == "[object BulletIceball]")
                  {
                     groundItem = new ObjectGroundIce();
                     groundItem.lifeTime = ScreenUpgrades.upgradeArrayIceball[5][ScreenUpgrades.levelsArraySecondary[8] - 1] + 15;
                     groundItem.frozenTime = theBullet.frozenTime;
                  }
                  else if(theBullet == "[object BulletLavaball]")
                  {
                     groundItem = new ObjectGroundLava();
                     groundItem.lifeTime = ScreenUpgrades.upgradeArrayLavaball[5][ScreenUpgrades.levelsArraySecondary[9] - 1];
                     groundItem.damage = ScreenUpgrades.upgradeArrayLavaball[4][ScreenUpgrades.levelsArraySecondary[9] - 1];
                     groundItem.scaleMin = 0.75;
                     groundItem.scaleMax = 1.25;
                  }
                  groundItem.radius = 18;
                  randomDistance = Math.random() * 8;
                  randomAngle = Math.random() * 360 / 180 * Math.PI;
                  groundItem.x = theBullet.x + Math.cos(randomAngle) * randomDistance;
                  groundItem.y = theBullet.y + Math.sin(randomAngle) * randomDistance;
                  this.groundLayer.addChild(groundItem);
                  groundItem.gotoAndStop(Math.round(Math.random() * 2 + 1));
                  groundItem.rotation = Math.random() * 360;
                  this.groundArray.push(groundItem);
               }
               theBullet.x += theBullet.xVel;
               theBullet.y += theBullet.yVel;
               if(theBullet != "[object BulletLaser]" && theBullet != "[object ObjectGrenade]" && theBullet != "[object ObjectIceGrenade]" && theBullet != "[object ObjectPoisonGrenade]" && (theBullet != "[object BulletGummyBear]" || theBullet == "[object BulletGummyBear]" && theBullet.currentFrame == 3) && (theBullet != "[object BulletCrazyCheese]" || theBullet == "[object BulletCrazyCheese]" && theBullet.bounces < 1))
               {
                  if(theBullet.x < 0 - theBullet.width / 2 - cameraPosX || theBullet.x > roomWidth + theBullet.width / 2 - cameraPosX - (roomWidth - cameraWidth) || theBullet.y < 0 - theBullet.height / 2 - cameraPosY || theBullet.y > roomHeight + theBullet.height / 2 - cameraPosY - (roomHeight - cameraHeight))
                  {
                     partX = theBullet.x;
                     partY = theBullet.y;
                     if(theBullet.x < 0 - theBullet.width / 2 - cameraPosX)
                     {
                        partX = -cameraPosX;
                        this.spawnParticle("BulletDestroy",3,partX,partY,10,0,90);
                     }
                     else if(theBullet.x > roomWidth + theBullet.width / 2 - cameraPosX - (roomWidth - cameraWidth))
                     {
                        partX = roomWidth - cameraPosX - (roomWidth - cameraWidth);
                        this.spawnParticle("BulletDestroy",3,partX,partY,10,180,90);
                     }
                     if(theBullet.y < 0 - theBullet.height / 2 - cameraPosY)
                     {
                        partY = -cameraPosY;
                        this.spawnParticle("BulletDestroy",3,partX,partY,10,90,90);
                     }
                     else if(theBullet.y > roomHeight + theBullet.height / 2 - cameraPosY - (roomHeight - cameraHeight))
                     {
                        partY = roomHeight - cameraPosY - (roomHeight - cameraHeight);
                        this.spawnParticle("BulletDestroy",3,partX,partY,10,270,90);
                     }
                     if(stage.contains(theBullet))
                     {
                        this.bulletArray.splice(i,1);
                        this.bulletLayer.removeChild(theBullet);
                        i--;
                     }
                     if(theBullet.borderSound != null)
                     {
                        if(theBullet.borderSound == "Tiny")
                        {
                           SoundManager.sfxArray.push("BorderTiny");
                        }
                        else if(theBullet.borderSound == "Medium")
                        {
                           SoundManager.sfxArray.push("BorderMedium");
                        }
                        else if(theBullet.borderSound == "Big")
                        {
                           SoundManager.sfxArray.push("BorderBig");
                        }
                     }
                  }
                  else if(theBullet == "[object BulletFire]")
                  {
                     if(theBullet.lifetime == 0)
                     {
                        if(stage.contains(theBullet))
                        {
                           this.bulletArray.splice(i,1);
                           this.bulletLayer.removeChild(theBullet);
                           i--;
                        }
                     }
                     else
                     {
                        if(theBullet.lifetime == theBullet.lifetimeMax - 2)
                        {
                           closeFireballs = 0;
                           for(o = 0; o < this.bulletArray.length; o++)
                           {
                              theOtherBullet = this.bulletArray[o];
                              if(this.distanceBetween(theBullet.x,theBullet.y,theOtherBullet.x,theOtherBullet.y) < 50)
                              {
                                 closeFireballs++;
                              }
                           }
                           if(closeFireballs < 5)
                           {
                              theBullet.lifetime = closeFireballs;
                              theBullet.deadFlame = true;
                           }
                        }
                        --theBullet.lifetime;
                        if(theBullet.lifetime <= 5)
                        {
                        }
                        if(theBullet.deadFlame == false)
                        {
                           theBullet.scaleX = 1 + (theBullet.lifetimeMax - theBullet.lifetime) * 0.2;
                           theBullet.scaleY = 1 + (theBullet.lifetimeMax - theBullet.lifetime) * 0.2;
                        }
                        theBullet.radius = 10 * theBullet.scaleX;
                     }
                  }
               }
               else if(theBullet == "[object BulletGummyBear]" || theBullet == "[object BulletCrazyCheese]")
               {
                  angleDegrees = theBullet.angle * 180 / Math.PI;
                  if(theBullet.x < 0 - cameraPosX + theBullet.radius || theBullet.x > roomWidth - cameraPosX - (roomWidth - cameraWidth) - theBullet.radius || theBullet.y < 0 - cameraPosY + theBullet.radius || theBullet.y > roomHeight - cameraPosY - (roomHeight - cameraHeight) - theBullet.radius)
                  {
                     angle = this.angleBetween(0,0,theBullet.xVel,theBullet.yVel) * 180 / Math.PI + 180;
                     partX = theBullet.x;
                     partY = theBullet.y;
                     hitTopBottom = false;
                     hitLeftRight = false;
                     if(theBullet.x < 0 - cameraPosX + theBullet.radius)
                     {
                        partX = 0 - cameraPosX + theBullet.radius;
                        theBullet.x = partX;
                        theBullet.xVel = Math.abs(theBullet.xVel);
                        hitTopBottom = true;
                     }
                     else if(theBullet.x > roomWidth - cameraPosX - (roomWidth - cameraWidth) - theBullet.radius)
                     {
                        partX = roomWidth - cameraPosX - (roomWidth - cameraWidth) - theBullet.radius;
                        theBullet.x = partX;
                        theBullet.xVel = -Math.abs(theBullet.xVel);
                        hitTopBottom = true;
                     }
                     if(theBullet.y < 0 - cameraPosY + theBullet.radius)
                     {
                        partY = 0 - cameraPosY + theBullet.radius;
                        theBullet.y = partY;
                        theBullet.yVel = Math.abs(theBullet.yVel);
                        hitLeftRight = true;
                     }
                     else if(theBullet.y > roomHeight - cameraPosY - (roomHeight - cameraHeight) - theBullet.radius)
                     {
                        partY = roomHeight - cameraPosY - (roomHeight - cameraHeight) - theBullet.radius;
                        theBullet.y = partY;
                        theBullet.yVel = -Math.abs(theBullet.yVel);
                        hitLeftRight = true;
                     }
                     if(Boolean(hitTopBottom) && !hitLeftRight)
                     {
                        if(angleDegrees < 0)
                        {
                           theBullet.angle = (-180 - angleDegrees) / 180 * Math.PI;
                        }
                        else
                        {
                           theBullet.angle = (180 - angleDegrees) / 180 * Math.PI;
                        }
                        if(theBullet == "[object BulletGummyBear]")
                        {
                           theBullet.gotoAndStop(theBullet.currentFrame + 1);
                           if(theBullet.currentFrame == 2)
                           {
                              theBullet.damage *= 3;
                           }
                           else if(theBullet.currentFrame == 3)
                           {
                              theBullet.damage = theBullet.damage / 3 * 4;
                           }
                        }
                        else if(theBullet == "[object BulletCrazyCheese]")
                        {
                           --theBullet.bounces;
                           theBullet.enemiesArray = [];
                        }
                     }
                     else if(Boolean(hitLeftRight) && !hitTopBottom)
                     {
                        theBullet.angle = -angleDegrees / 180 * Math.PI;
                        if(theBullet == "[object BulletGummyBear]")
                        {
                           theBullet.gotoAndStop(theBullet.currentFrame + 1);
                           if(theBullet.currentFrame == 2)
                           {
                              theBullet.damage *= 3;
                           }
                           else if(theBullet.currentFrame == 3)
                           {
                              theBullet.damage = theBullet.damage / 3 * 4;
                           }
                        }
                        else if(theBullet == "[object BulletCrazyCheese]")
                        {
                           --theBullet.bounces;
                           theBullet.enemiesArray = [];
                        }
                     }
                     else
                     {
                        theBullet.angle = (angleDegrees + 180) / 180 * Math.PI;
                        if(theBullet == "[object BulletGummyBear]")
                        {
                           if(theBullet.currentFrame == 1)
                           {
                              theBullet.damage *= 4;
                           }
                           else if(theBullet.currentFrame == 2)
                           {
                              theBullet.damage = theBullet.damage / 3 * 4;
                           }
                           theBullet.gotoAndStop(3);
                        }
                        else if(theBullet == "[object BulletCrazyCheese]")
                        {
                           theBullet.bounces = 0;
                           theBullet.enemiesArray = [];
                        }
                     }
                     SoundManager.sfxArray.push("BorderBounce");
                     theBullet.rotation = theBullet.angle * 180 / Math.PI;
                  }
               }
               else if(theBullet == "[object ObjectGrenade]" || theBullet == "[object ObjectIceGrenade]" || theBullet == "[object ObjectPoisonGrenade]")
               {
                  if(theBullet.timeLeft > 0)
                  {
                     --theBullet.timeLeft;
                     if(theBullet.speed * (1 - theBullet.friction) > 0.5)
                     {
                        theBullet.speed *= 1 - theBullet.friction;
                     }
                     else
                     {
                        theBullet.speed = 0;
                     }
                     theBullet.xVel = Math.cos(theBullet.angle) * theBullet.speed;
                     theBullet.yVel = Math.sin(theBullet.angle) * theBullet.speed;
                     theBullet.rotation += theBullet.speed * 3;
                     angleDegrees = theBullet.angle * 180 / Math.PI;
                     if(theBullet.x < 0 + theBullet.radius || theBullet.x > roomWidth - theBullet.radius || theBullet.y < 0 + theBullet.radius || theBullet.y > roomHeight - theBullet.radius)
                     {
                        angle = this.angleBetween(0,0,theBullet.xVel,theBullet.yVel) * 180 / Math.PI + 180;
                        partX = theBullet.x;
                        partY = theBullet.y;
                        if(theBullet.x < 0 + theBullet.radius)
                        {
                           partX = 0 + theBullet.radius;
                           theBullet.x = partX;
                           theBullet.xVel = Math.abs(theBullet.xVel);
                           if(angleDegrees < 0)
                           {
                              theBullet.angle = (-180 - angleDegrees) / 180 * Math.PI;
                           }
                           else
                           {
                              theBullet.angle = (180 - angleDegrees) / 180 * Math.PI;
                           }
                        }
                        else if(theBullet.x > roomWidth - theBullet.radius)
                        {
                           partX = roomWidth - theBullet.radius;
                           theBullet.x = partX;
                           theBullet.xVel = -Math.abs(theBullet.xVel);
                           if(angleDegrees < 0)
                           {
                              theBullet.angle = (-180 - angleDegrees) / 180 * Math.PI;
                           }
                           else
                           {
                              theBullet.angle = (180 - angleDegrees) / 180 * Math.PI;
                           }
                        }
                        if(theBullet.y < 0 + theBullet.radius)
                        {
                           partY = 0 + theBullet.radius;
                           theBullet.y = partY;
                           theBullet.yVel = Math.abs(theBullet.yVel);
                           theBullet.angle = -angleDegrees / 180 * Math.PI;
                        }
                        else if(theBullet.y > roomHeight - theBullet.radius)
                        {
                           partY = roomHeight - theBullet.radius;
                           theBullet.y = partY;
                           theBullet.yVel = -Math.abs(theBullet.yVel);
                           theBullet.angle = -angleDegrees / 180 * Math.PI;
                        }
                     }
                  }
                  else
                  {
                     if(theBullet == "[object ObjectGrenade]")
                     {
                        this.explosionQueueArray.push([theBullet.x,theBullet.y,theBullet.explosionRadius,theBullet.damage,"Normal",0,0,false]);
                     }
                     else if(theBullet == "[object ObjectIceGrenade]")
                     {
                        this.explosionQueueArray.push([theBullet.x,theBullet.y,theBullet.explosionRadius,theBullet.damage,"Ice",theBullet.frozenTime,0,false]);
                     }
                     else if(theBullet == "[object ObjectPoisonGrenade]")
                     {
                        this.explosionQueueArray.push([theBullet.x,theBullet.y,theBullet.explosionRadius,theBullet.damage,"Poison",theBullet.poisonTime,theBullet.poisonDamage,false]);
                     }
                     if(stage.contains(theBullet))
                     {
                        this.bulletArray.splice(i,1);
                        this.groundLayer.removeChild(theBullet);
                        i--;
                     }
                  }
               }
            }
         }
      }
      
      private function flagInTweenFinish(event:TweenEvent) : void
      {
         this.flagOutTweenX.start();
         this.flagOutTweenY.start();
      }
      
      public function colorClip(mc:*, val:Number, trans:Number = 1) : *
      {
         var color:uint = 0;
         var ctMul:Number = NaN;
         var ctRedOff:Number = NaN;
         var ctGreenOff:Number = NaN;
         var ctBlueOff:Number = NaN;
         var ct:* = undefined;
         color = val;
         ctMul = 1 - trans;
         ctRedOff = Math.round(trans * (color >> 16 & 0xFF));
         ctGreenOff = Math.round(trans * (color >> 8 & 0xFF));
         ctBlueOff = Math.round(trans * (color & 0xFF));
         ct = new ColorTransform(ctMul,ctMul,ctMul,1,ctRedOff,ctGreenOff,ctBlueOff,0);
         mc.transform.colorTransform = ct;
      }
      
      private function handleMoney() : void
      {
         var i:* = undefined;
         var theItem:* = undefined;
         var distance:* = undefined;
         var speed:* = undefined;
         var friction:* = undefined;
         var angle:* = undefined;
         var newSpeed:* = undefined;
         for(i = 0; i < this.moneyArray.length; i++)
         {
            theItem = this.moneyArray[i];
            distance = this.distanceBetween(theItem.x,theItem.y,this.tank.x,this.tank.y);
            if(distance <= theItem.radius + this.tank.radius)
            {
               if(stage.contains(theItem))
               {
                  this.moneyArray.splice(i,1);
                  this.itemLayer.removeChild(theItem);
                  i--;
               }
               ScreenGame.money += theItem.money;
               SoundManager.sfxArray.push("Coin");
            }
            speed = this.distanceBetween(0,0,theItem.xVel,theItem.yVel);
            angle = this.angleBetween(theItem.x,theItem.y,this.tank.x,this.tank.y);
            theItem.xVel += Math.cos(angle) * 2.5;
            theItem.yVel += Math.sin(angle) * 2.5;
            speed = this.distanceBetween(0,0,theItem.xVel,theItem.yVel);
            angle = this.angleBetween(0,0,theItem.xVel,theItem.yVel);
            if(speed > 8)
            {
               theItem.xVel = Math.cos(angle) * 8;
               theItem.yVel = Math.sin(angle) * 8;
            }
            if(speed > 0)
            {
               theItem.x += theItem.xVel;
               theItem.y += theItem.yVel;
               if(speed - theItem.friction > 0)
               {
                  newSpeed = speed - theItem.friction;
                  theItem.xVel *= newSpeed / speed;
                  theItem.yVel *= newSpeed / speed;
               }
               else
               {
                  theItem.xVel = 0;
                  theItem.yVel = 0;
               }
               if(theItem.xVel > 0)
               {
                  if(theItem.x + theItem.xVel < PartGameArea.roomWidth - theItem.radius)
                  {
                     theItem.x += theItem.xVel;
                  }
                  else
                  {
                     theItem.x = PartGameArea.roomWidth - theItem.radius;
                     theItem.xVel = -theItem.xVel;
                  }
               }
               else if(theItem.xVel < 0)
               {
                  if(theItem.x + theItem.xVel > 0 + theItem.radius)
                  {
                     theItem.x += theItem.xVel;
                  }
                  else
                  {
                     theItem.x = theItem.radius;
                     theItem.xVel = -theItem.xVel;
                  }
               }
               if(theItem.yVel > 0)
               {
                  if(theItem.y + theItem.yVel < PartGameArea.roomHeight - theItem.radius)
                  {
                     theItem.y += theItem.yVel;
                  }
                  else
                  {
                     theItem.y = PartGameArea.roomHeight - theItem.radius;
                     theItem.yVel = -theItem.yVel;
                  }
               }
               else if(theItem.yVel < 0)
               {
                  if(theItem.y + theItem.yVel > 0 + theItem.radius)
                  {
                     theItem.y += theItem.yVel;
                  }
                  else
                  {
                     theItem.y = theItem.radius;
                     theItem.yVel = -theItem.yVel;
                  }
               }
            }
         }
      }
      
      private function handleParticles() : void
      {
         var i:* = undefined;
         var theParticle:* = undefined;
         var scale:* = undefined;
         for(i = 0; i < this.particleArray.length; i++)
         {
            theParticle = this.particleArray[i];
            if(theParticle.velocity - theParticle.friction > 0)
            {
               theParticle.velocity -= theParticle.friction;
            }
            else
            {
               theParticle.velocity = 0;
            }
            theParticle.xVel = Math.cos(theParticle.moveAngle / 180 * Math.PI) * theParticle.velocity;
            theParticle.yVel = Math.sin(theParticle.moveAngle / 180 * Math.PI) * theParticle.velocity;
            theParticle.x += theParticle.xVel;
            theParticle.y += theParticle.yVel;
            --theParticle.lifeTime;
            scale = theParticle.scaleMin + (theParticle.scaleMax - theParticle.scaleMin) * (theParticle.lifeTime / theParticle.lifeTimeMax);
            theParticle.scaleX = scale;
            theParticle.scaleY = scale;
            if(theParticle == "[object ParticleHeal]" || theParticle == "[object ParticleHealBoss]")
            {
               theParticle.alpha = theParticle.lifeTime / theParticle.lifeTimeMax * 0.75;
            }
            else if(theParticle == "[object ParticleStrength]" || theParticle == "[object ParticleWeakness]")
            {
               if(theParticle.lifeTime < theParticle.lifeTimeMax)
               {
                  theParticle.alpha = theParticle.lifeTime / theParticle.lifeTimeMax * (theParticle.lifeTime / theParticle.lifeTimeMax);
               }
            }
            if(theParticle.lifeTime == 0 || theParticle != "[object ParticlePoison]" && theParticle.velocity == theParticle.killVelocity)
            {
               if(stage.contains(theParticle))
               {
                  this.particleArray.splice(i,1);
                  this.particleLayer.removeChild(theParticle);
                  i--;
               }
            }
         }
      }
      
      private function handleMedicIndicators() : void
      {
         var i:* = undefined;
         var indicator:* = undefined;
         for(i = 0; i < this.medicIndicatorArray.length; i++)
         {
            indicator = this.medicIndicatorArray[i];
            if(indicator.enemy == null || !stage.contains(indicator.enemy))
            {
               this.medicIndicatorArray.splice(i,1);
               this.medicIndicatorLayer.removeChild(indicator);
               i--;
            }
            else
            {
               indicator.x = indicator.enemy.x;
               indicator.y = indicator.enemy.y;
            }
         }
      }
      
      private function getTotalHealth(enemy:Object) : *
      {
         var multiplierHealth:* = undefined;
         var multiplierLevel:* = undefined;
         var totalHealth:* = undefined;
         multiplierHealth = 1;
         multiplierLevel = 1;
         if(ScreenLevelSelect.levelDifficulty == "Medium")
         {
            if(enemy.enemyLevel != "B")
            {
               multiplierHealth = DifficultyMultipliers.multiplierHealthMedium;
            }
            else
            {
               multiplierHealth = 1;
            }
         }
         if(ScreenLevelSelect.levelDifficulty == "Hard")
         {
            if(enemy.enemyLevel != "B")
            {
               multiplierHealth = DifficultyMultipliers.multiplierHealthHard;
            }
            else
            {
               multiplierHealth = 1;
            }
         }
         if(enemy.enemyLevel == "2")
         {
            multiplierLevel = DifficultyMultipliers.multiplierLevel2;
         }
         else if(enemy.enemyLevel == "3")
         {
            multiplierLevel = DifficultyMultipliers.multiplierLevel3;
         }
         totalHealth = ScreenGame["enemy" + enemy.enemyType + "Stats"][1] * multiplierHealth * multiplierLevel;
         if(enemy.enemyLevel == "B")
         {
            totalHealth /= ScreenGame.bossAmount;
         }
         return Math.round(totalHealth);
      }
      
      private function distanceBetween(xPos1:Number, yPos1:Number, xPos2:Number, yPos2:Number) : *
      {
         var dx:* = undefined;
         var dy:* = undefined;
         dx = xPos1 - xPos2;
         dy = yPos1 - yPos2;
         return Math.sqrt(dx * dx + dy * dy);
      }
      
      private function checkRectanglesOverlap(r1x:Number, r1y:Number, r1h:Number, r1w:Number, r2x:Number, r2y:Number, r2w:Number, r2h:Number) : Boolean
      {
         return !(r1x + r1w < r2x || r1y + r1h < r2y || r1x > r2x + r2w || r1y > r2y + r2h);
      }
      
      private function spawnFlag() : void
      {
         var startAngle:* = undefined;
         var distance:* = undefined;
         var positionsArray:* = undefined;
         var i:* = undefined;
         var randomNum:* = undefined;
         var xPos:* = undefined;
         var yPos:* = undefined;
         this.itemLayer.addChild(this.flag);
         this.flag.radius = this.flag.width / 2;
         this.flag.timer = 10;
         this.flag.moneyCount = this.selectedFlagModel[ScreenGame.level - 1][1];
         this.flagInTweenAlpha.start();
         if(!this.tweenStarted)
         {
            this.tweenStarted = true;
            this.flagInTweenX.start();
            this.flagInTweenY.start();
         }
         startAngle = Math.random() * 360;
         distance = roomWidth / 2 - 10 - Math.random() * roomWidth / 4;
         positionsArray = [];
         for(i = 0; i < 89; i++)
         {
            xPos = this.tank.x + Math.cos((startAngle + i * 4) / 180 * Math.PI) * distance;
            yPos = this.tank.y + Math.sin((startAngle + i * 4) / 180 * Math.PI) * distance;
            if(!(xPos < 0 + this.flag.radius || xPos > roomWidth - this.flag.radius || yPos < 0 + this.flag.radius || yPos > roomHeight - this.flag.radius))
            {
               positionsArray.push([xPos,yPos]);
               if(positionsArray.length >= 10)
               {
                  break;
               }
            }
         }
         randomNum = Math.round(Math.random() * (positionsArray.length - 1));
         this.flag.x = positionsArray[randomNum][0];
         this.flag.y = positionsArray[randomNum][1];
      }
      
      private function convertPrimaryWeaponStringToNumber(weapon:String) : *
      {
         if(weapon == "Cannon")
         {
            return 1;
         }
         if(weapon == "MiniGun")
         {
            return 2;
         }
         if(weapon == "Big Cannon")
         {
            return 3;
         }
         if(weapon == "Flamethrower")
         {
            return 4;
         }
         if(weapon == "Shotgun")
         {
            return 5;
         }
         if(weapon == "Timed Bomb Cannon")
         {
            return 6;
         }
         if(weapon == "Gummy Bear Cannon")
         {
            return 7;
         }
         if(weapon == "Poison Cannon")
         {
            return 8;
         }
         if(weapon == "Laser Cannon")
         {
            return 9;
         }
         if(weapon == "Cake Cannon")
         {
            return 10;
         }
         if(weapon == "Penetration Cannon")
         {
            return 11;
         }
         if(weapon == "Magic Cannon")
         {
            return 12;
         }
      }
      
      private function handleWarnings() : void
      {
         var i:* = undefined;
         var theWarning:* = undefined;
         for(i = 0; i < this.warningArray.length; i++)
         {
            theWarning = this.warningArray[i];
            if(theWarning.timeLeft == 0)
            {
               this.spawnEnemy(theWarning);
               if(stage.contains(theWarning))
               {
                  this.warningArray.splice(i,1);
                  this.particleLayer.removeChild(theWarning);
                  i--;
               }
            }
            else
            {
               --theWarning.timeLeft;
               theWarning.scaleX = theWarning.timeLeft / 100 * 0.7 + 0.3;
               theWarning.scaleY = theWarning.timeLeft / 100 * 0.7 + 0.3;
            }
         }
      }
      
      private function handleEnemyIndicators() : void
      {
         var bombIndicatorsNeeded:* = undefined;
         var ii:* = undefined;
         var difference:* = undefined;
         var i:* = undefined;
         var iii:* = undefined;
         var b:* = undefined;
         var warningTimedBomb:* = undefined;
         var b2:* = undefined;
         var theEnemy:* = undefined;
         var theIndicator:* = undefined;
         var scaleValue:* = undefined;
         bombIndicatorsNeeded = 0;
         for(ii = 0; ii < this.enemyArray.length; ii++)
         {
            this.enemyArray[ii].gotBombIndicator = false;
            if(this.enemyArray[ii].gotBomb)
            {
               bombIndicatorsNeeded++;
            }
         }
         difference = bombIndicatorsNeeded - this.enemyIndicatorArray.length;
         if(bombIndicatorsNeeded > this.enemyIndicatorArray.length)
         {
            for(b = 0; b < difference; b++)
            {
               warningTimedBomb = new WarningTimedBomb();
               this.indicatorLayer.addChild(warningTimedBomb);
               this.enemyIndicatorArray.push(warningTimedBomb);
            }
         }
         else if(bombIndicatorsNeeded < this.enemyIndicatorArray.length)
         {
            for(b2 = 0; b2 < -difference; b2++)
            {
               if(this.enemyIndicatorArray[b2] != null)
               {
                  this.indicatorLayer.removeChild(this.enemyIndicatorArray[b2]);
                  this.enemyIndicatorArray.splice(b2,1);
               }
            }
         }
         i = 0;
         for(iii = 0; iii < this.enemyArray.length; iii++)
         {
            theEnemy = this.enemyArray[iii];
            if(Boolean(theEnemy.gotBomb) && theEnemy.gotBombIndicator == false)
            {
               theIndicator = this.enemyIndicatorArray[i];
               theEnemy.gotBombIndicator = true;
               theIndicator.x = theEnemy.x;
               theIndicator.y = theEnemy.y;
               scaleValue = theEnemy.radius / 75 + 0.01 + theEnemy.bombTimer / theEnemy.bombTimerMax * (0.003 * theEnemy.radius + 0.06);
               if(theEnemy.enemyLevel != "B" && theIndicator.currentFrame != 1)
               {
                  theIndicator.gotoAndStop(1);
               }
               else if(theEnemy.enemyLevel == "B" && theIndicator.currentFrame != 2)
               {
                  theIndicator.gotoAndStop(2);
               }
               theIndicator.scaleX = scaleValue;
               theIndicator.scaleY = scaleValue;
               theIndicator.alpha = 0.2 + 0.8 * (1 - theEnemy.bombTimer / theEnemy.bombTimerMax);
               i++;
            }
         }
      }
      
      private function reduceValue(theValue:Number, theReducer:Number, theLimit:Number = 0) : *
      {
         if(theValue > theLimit)
         {
            if(theValue - theReducer > theLimit)
            {
               theValue -= theReducer;
            }
            else
            {
               theValue = theLimit;
            }
         }
         else if(theValue + theReducer < theLimit)
         {
            theValue += theReducer;
         }
         else
         {
            theValue = theLimit;
         }
         return theValue;
      }
      
      private function handleFlag() : void
      {
         if(ScreenGame.flagsLeft > 0 && !stage.contains(this.flag))
         {
            this.spawnFlag();
         }
         if(this.flag.timer > 0)
         {
            --this.flag.timer;
         }
         else if(this.distanceBetween(this.flag.x,this.flag.y,this.tank.x,this.tank.y) < this.flag.radius * this.flag.scaleX + this.tank.radius)
         {
            if(stage.contains(this.flag))
            {
               SoundManager.sfxArray.push("FlagPickup");
               this.itemLayer.removeChild(this.flag);
               --ScreenGame.flagsLeft;
               this.spawnMoney(this.flag.moneyCount,this.tank.x,this.tank.y,false,100);
            }
         }
      }
      
      private function angleBetween(x1:Number, y1:Number, x2:Number, y2:Number) : Number
      {
         var dx:Number = NaN;
         var dy:Number = NaN;
         dx = x2 - x1;
         dy = y2 - y1;
         return Math.atan2(dy,dx);
      }
      
      private function removeBackgroundObjectsColliding(randGenerator:PM_PRNG) : void
      {
         var object:* = undefined;
         var radius:* = undefined;
         var otherObject:* = undefined;
         var otherRadius:* = undefined;
         var collisionCount:* = undefined;
         var collisionCountDie:* = undefined;
         var removeMethod:* = undefined;
         var ii:* = undefined;
         var canCollide:* = undefined;
         for(var i:* = 0; i < this.backgroundObjectArray.length; i++)
         {
            object = this.backgroundObjectArray[i];
            radius = (object.height + object.width) * 0.2;
            collisionCount = 0;
            collisionCountDie = 1;
            removeMethod = "Random";
            if(object == "[object BGObjectFuturisticLines]")
            {
               collisionCountDie = 6;
               removeMethod = "Object";
            }
            for(ii = 0; ii < this.backgroundObjectArray.length; ii++)
            {
               if(i != ii)
               {
                  otherObject = this.backgroundObjectArray[ii];
                  otherRadius = (otherObject.height + otherObject.width) * 0.2;
                  canCollide = true;
                  if(object == "[object BGObjectCrack]" && otherObject != "[object BGObjectCrack]" || otherObject == "[object BGObjectCrack]" && object != "[object BGObjectCrack]" || (object == "[object BGObjectFuturisticSquare]" || otherObject == "[object BGObjectFuturisticSquare]"))
                  {
                     canCollide = false;
                  }
                  if(Boolean(canCollide) && this.distanceBetween(object.x,object.y,otherObject.x,otherObject.y) < radius + otherRadius)
                  {
                     collisionCount++;
                  }
                  if(collisionCount >= collisionCountDie)
                  {
                     removeMethod = "Random";
                     if(removeMethod)
                     {
                        if(randGenerator.nextDouble() < 0.5)
                        {
                           this.bg.removeChild(object);
                           this.backgroundObjectArray.splice(i,1);
                        }
                        else
                        {
                           this.bg.removeChild(otherObject);
                           this.backgroundObjectArray.splice(ii,1);
                        }
                        i--;
                        ii--;
                        break;
                     }
                     this.bg.removeChild(object);
                     this.backgroundObjectArray.splice(i,1);
                     i--;
                     ii--;
                     break;
                  }
               }
            }
         }
      }
      
      public function update(event:Event) : void
      {
         var interF:* = undefined;
         var weaponNumber:* = undefined;
         var weaponReloadTime:* = undefined;
         var bulletPotentialDamage:* = undefined;
         var valuesAlready:* = undefined;
         var values:* = undefined;
         if(!Main.screenChanging)
         {
            interF = MovieClip(parent).pInterface;
            if(canPause && (Main.keyP || Main.keyEsc || ScreenOptions.optionAutoPauseOn && !Main.gameActive && !gamePaused))
            {
               if(gamePaused)
               {
                  interF.unPauseGame();
                  SoundManager.musicPaused = false;
                  SoundManager.setVolumesBoolean = true;
               }
               else
               {
                  interF.pauseGame();
                  SoundManager.musicPaused = true;
                  SoundManager.setVolumesBoolean = true;
               }
               SoundManager.sfxArray.push("InterfaceButtonClick");
               gamePaused = !gamePaused;
               canPause = false;
            }
            else if(!canPause && !(Main.keyP || Main.keyEsc))
            {
               canPause = true;
            }
         }
         if(!Main.screenChanging && !gamePaused)
         {
            this.hookRopeLayer.graphics.clear();
            if(ScreenGame.currentEnemies + ScreenGame.enemiesLeft == 0 && ScreenLevelSelect.levelMode != "Flag" && ScreenLevelSelect.levelMode != "Boss" || ScreenLevelSelect.levelMode == "Flag" && ScreenGame.flagsLeft == 0 || ScreenLevelSelect.levelMode == "Boss" && ScreenGame.bossAmountKilled == ScreenGame.bossAmount || ScreenGame.hp == 0)
            {
               if(this.debugOn && !levelDone)
               {
                  trace("debugLevelTime: " + this.debugLevelTime + " Frames");
                  trace("debugTotalDamage: " + this.debugTotalDamage);
                  trace(" ");
                  trace("debugTotalBulletsFired: " + this.debugTotalBulletsFired);
                  trace("debugTotalBulletsHitting: " + this.debugTotalBulletsHitting);
                  this.debugBulletsMissing = this.debugTotalBulletsFired - this.debugTotalBulletsHitting;
                  trace("debugBulletsMissing: " + this.debugBulletsMissing);
                  this.debugPercentageBulletsHitting = this.debugTotalBulletsHitting / this.debugTotalBulletsFired;
                  trace("debugPercentageBulletsHitting: " + this.debugPercentageBulletsHitting);
                  trace(" ");
                  this.debugActualAverageReloadTime = this.debugLevelTime / this.debugTotalBulletsFired;
                  trace("debugActualAverageReloadTime: " + this.debugActualAverageReloadTime + " frames/bullet");
                  weaponNumber = this.convertPrimaryWeaponStringToNumber(ScreenGame.primaryWeapon);
                  weaponReloadTime = ScreenUpgrades.upgradeArraysArray2[weaponNumber - 1][1][ScreenUpgrades.levelsArray[weaponNumber - 1] - 1];
                  trace("weaponReloadTime: " + weaponReloadTime + " frames/bullet");
                  this.debugPercentageReloadTime = this.debugActualAverageReloadTime / weaponReloadTime;
                  trace("debugPercentageReloadTime: " + this.debugPercentageReloadTime);
                  trace(" ");
                  bulletPotentialDamage = ScreenUpgrades.upgradeArraysArray2[weaponNumber - 1][2][ScreenUpgrades.levelsArray[weaponNumber - 1] - 1];
                  this.debugActualAverageBulletDamage = this.debugTotalDamage / this.debugTotalBulletsHitting;
                  trace("debugActualAverageBulletDamage: " + this.debugActualAverageBulletDamage);
                  this.debugPercentageBulletDamage = this.debugActualAverageBulletDamage / bulletPotentialDamage;
                  trace("debugPercentageBulletDamage: " + this.debugPercentageBulletDamage);
                  trace(" ");
                  this.debugActualDPS = this.debugTotalDamage / (this.debugLevelTime / 30);
                  trace("debugActualDPS: " + this.debugActualDPS);
                  this.debugCalculatedDPS = bulletPotentialDamage * this.debugPercentageBulletDamage / (weaponReloadTime / 30 * this.debugPercentageReloadTime) * this.debugPercentageBulletsHitting;
                  trace("debugCalculatedDPS: " + this.debugCalculatedDPS);
                  trace("");
                  trace("averageTotalFreezeTime: " + this.debugTotalFreezeTime / (this.debugLevelTime / 30));
                  trace("------------------------------------------------------------------");
               }
               if(!levelDone)
               {
                  valuesAlready = ScreenLevelSelect.getLevelValues(ScreenGame.world,ScreenGame.level,ScreenLevelSelect.levelDifficulty);
                  values = 0;
                  if(ScreenGame.hp >= 95)
                  {
                     values = 3;
                  }
                  else if(ScreenGame.hp >= 75)
                  {
                     values = 2;
                  }
                  else if(ScreenGame.hp >= 1)
                  {
                     values = 1;
                  }
                  else
                  {
                     values = 0;
                  }
                  if(ScreenGame.hp < 95)
                  {
                     tempNoWeaponsUsed = false;
                     tempTimedBombsFired = false;
                     tempOtherThanTimedBombsFired = false;
                     tempOnlySpecialWeapons = false;
                  }
                  values -= valuesAlready;
                  tempValuesEarned += values;
               }
               levelDone = true;
               this.levelDoneFunction();
               if(ScreenGame.hp == 0)
               {
                  if(stage.contains(this.tank))
                  {
                     this.explosionQueueArray.push([this.tank.x,this.tank.y,150,0,"Normal",0,0,false]);
                     this.basicLayer.removeChild(this.tank);
                  }
                  if(this.shieldOn && stage.contains(this.shield))
                  {
                     this.shieldLayer.removeChild(this.shield);
                     this.shieldOn = false;
                  }
                  SoundManager.changeMusic = "Lose";
               }
               else
               {
                  SoundManager.changeMusic = "Win";
               }
            }
            if(this.tank.damageIndicator == 0)
            {
               this.uncolorClip(this.tank);
            }
            else
            {
               this.colorClip(this.tank,16711680,this.tank.damageIndicator / 20 * 0.8);
               --this.tank.damageIndicator;
            }
            this.handleBullets();
            this.handleEnemyBullets();
            if(!levelDone)
            {
               if(countDownDone)
               {
                  if(this.debugOn)
                  {
                     ++this.debugLevelTime;
                  }
                  this.handleMines();
                  this.handleGround();
                  if(ScreenLevelSelect.levelMode != "Tower")
                  {
                     this.tank.moveTank();
                  }
                  this.tankAttack();
                  this.handleTankShield();
                  if(ScreenLevelSelect.levelMode == "Flag")
                  {
                     this.handleFlag();
                  }
                  if(Main.mouse || Main.space || Main.up || Main.down || Main.right || Main.left)
                  {
                     tempNothingPressed = false;
                  }
               }
               this.spawnWarnings();
               this.handleWarnings();
               this.handleEnemies();
            }
            this.handleEnemyIndicators();
            this.handleMedicIndicators();
            this.handleExplosions();
            this.handleExplosionQueue();
            this.handleParticles();
            this.handleMoney();
            this.setCamera();
         }
         else if(gamePaused && !Main.screenChanging && !(Main.keyP || Main.keyEsc) && !quitting)
         {
            if(Main.keyQ)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
               Main.changeScreen = "LevelSelect";
               resetTempVariables("Quit");
               quitting = true;
               SoundManager.musicPaused = false;
               SoundManager.setVolumesBoolean = true;
               SoundManager.currentMusic = "None";
               SoundManager.changeMusic = "None";
            }
            else if(Main.keyR)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
               Main.changeScreen = "Reset";
               resetTempVariables("Quit");
               quitting = true;
               SoundManager.musicPaused = false;
               SoundManager.setVolumesBoolean = true;
            }
         }
      }
      
      private function spawnEnemy(instance:*) : void
      {
         var enemy:* = undefined;
         var multiplierHealth:* = undefined;
         var multiplierDamage:* = undefined;
         var multiplierSpeed:* = undefined;
         var multiplierRotation:* = undefined;
         var multiplierReloadTime:* = undefined;
         var multiplierLevel:* = undefined;
         var enemyStatsArray:* = undefined;
         var strengthsArray:* = undefined;
         var e:* = undefined;
         var weaknessesArray:* = undefined;
         var ee:* = undefined;
         var indicator:* = undefined;
         var theStrength:* = undefined;
         var theWeakness:* = undefined;
         var dist:* = undefined;
         var randRotSide:* = undefined;
         var randRot:* = undefined;
         var speedMultiplier:* = undefined;
         var enemyRotation:* = undefined;
         multiplierHealth = 1;
         multiplierDamage = 1;
         multiplierSpeed = 1;
         multiplierRotation = 1;
         multiplierReloadTime = 1;
         multiplierLevel = 1;
         if(ScreenLevelSelect.levelDifficulty == "Medium")
         {
            if(instance.enemyLevel != "B")
            {
               multiplierHealth = DifficultyMultipliers.multiplierHealthMedium;
            }
            else
            {
               multiplierHealth = 1;
            }
            multiplierDamage = DifficultyMultipliers.multiplierDamageMedium;
            multiplierSpeed = DifficultyMultipliers.multiplierSpeedMedium;
            multiplierRotation = DifficultyMultipliers.multiplierRotationMedium;
            multiplierReloadTime = DifficultyMultipliers.multiplierReloadTimeMedium;
         }
         else if(ScreenLevelSelect.levelDifficulty == "Hard")
         {
            if(instance.enemyLevel != "B")
            {
               multiplierHealth = DifficultyMultipliers.multiplierHealthHard;
            }
            else
            {
               multiplierHealth = 1;
            }
            multiplierDamage = DifficultyMultipliers.multiplierDamageHard;
            multiplierSpeed = DifficultyMultipliers.multiplierSpeedHard;
            multiplierRotation = DifficultyMultipliers.multiplierRotationHard;
            multiplierReloadTime = DifficultyMultipliers.multiplierReloadTimeHard;
         }
         if(instance.enemyLevel == "2")
         {
            multiplierLevel = DifficultyMultipliers.multiplierLevel2;
         }
         else if(instance.enemyLevel == "3")
         {
            multiplierLevel = DifficultyMultipliers.multiplierLevel3;
         }
         if(instance.enemy == "Basic")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyBasic();
               enemyStatsArray = ScreenGame.enemyBasicStats;
            }
            else
            {
               enemy = new EnemyBasicBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyBasicBStats;
            }
         }
         else if(instance.enemy == "Fast")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyFast();
               enemyStatsArray = ScreenGame.enemyFastStats;
            }
            else
            {
               enemy = new EnemyFastBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyFastBStats;
            }
         }
         else if(instance.enemy == "Shooting")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyShooting();
               enemyStatsArray = ScreenGame.enemyShootingStats;
            }
            else
            {
               enemy = new EnemyShootingBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyShootingBStats;
            }
         }
         else if(instance.enemy == "Strong")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyStrong();
               enemyStatsArray = ScreenGame.enemyStrongStats;
            }
            else
            {
               enemy = new EnemyStrongBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyStrongBStats;
            }
         }
         else if(instance.enemy == "Tiny")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyTiny();
               enemyStatsArray = ScreenGame.enemyTinyStats;
            }
            else
            {
               enemy = new EnemyTinyBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyTinyBStats;
            }
         }
         else if(instance.enemy == "Ghost")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyGhost();
               enemyStatsArray = ScreenGame.enemyGhostStats;
            }
            else
            {
               enemy = new EnemyGhostBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyGhostBStats;
            }
            enemy.gotoAndStop(1);
            enemy.invisible = false;
            enemy.ghostTimerMax = 150;
            enemy.ghostTimer = enemy.ghostTimerMax;
         }
         else if(instance.enemy == "Trap")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyTrap();
               enemyStatsArray = ScreenGame.enemyTrapStats;
            }
            else
            {
               enemy = new EnemyTrapBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyTrapBStats;
            }
         }
         else if(instance.enemy == "Temperamental")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyTemperamental();
               enemyStatsArray = ScreenGame.enemyTemperamentalStats;
            }
            else
            {
               enemy = new EnemyTemperamentalBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyTemperamentalBStats;
            }
            enemy.gotoAndStop(1);
            enemy.angry = false;
            enemy.turnAngry = false;
            enemy.turnPeaceful = false;
            enemy.angryTimerMax = 225;
            enemy.angryTimer = enemy.angryTimerMax;
         }
         else if(instance.enemy == "Ninja")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyNinja();
               enemyStatsArray = ScreenGame.enemyNinjaStats;
            }
            else
            {
               enemy = new EnemyNinjaBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyNinjaBStats;
            }
         }
         else if(instance.enemy == "Accelerating")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyAccelerating();
               enemyStatsArray = ScreenGame.enemyAcceleratingStats;
               enemy.speedTimerMax = 225;
            }
            else
            {
               enemy = new EnemyAcceleratingBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyAcceleratingBStats;
               enemy.speedTimerMax = 450;
            }
            enemy.speedTimer = enemy.speedTimerMax;
         }
         else if(instance.enemy == "Crazy")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyCrazy();
               enemyStatsArray = ScreenGame.enemyCrazyStats;
            }
            else
            {
               enemy = new EnemyCrazyBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyCrazyBStats;
            }
         }
         else if(instance.enemy == "Medic")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyMedic();
               enemy.healDistance = 50;
               enemyStatsArray = ScreenGame.enemyMedicStats;
            }
            else
            {
               enemy = new EnemyMedicBoss();
               enemy.healDistance = 100;
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyMedicBStats;
            }
            enemy.healTimerMax = 15;
            enemy.healTimer = enemy.healTimerMax;
            indicator = new IndicatorMedic();
            indicator.enemy = enemy;
            indicator.scaleX = enemy.healDistance / 100;
            indicator.scaleY = enemy.healDistance / 100;
            this.medicIndicatorLayer.addChild(indicator);
            this.medicIndicatorArray.push(indicator);
         }
         else if(instance.enemy == "Random")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyRandom();
               enemyStatsArray = ScreenGame.enemyRandomStats;
            }
            else
            {
               enemy = new EnemyRandomBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyRandomBStats;
            }
         }
         else if(instance.enemy == "ScaredGhost")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyScaredGhost();
               enemyStatsArray = ScreenGame.enemyScaredGhostStats;
            }
            else
            {
               enemy = new EnemyScaredGhostBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyScaredGhostBStats;
            }
            enemy.gotoAndStop(1);
            enemy.invisible = false;
            enemy.ghostTimerMax = 150;
            enemy.ghostTimer = enemy.ghostTimerMax;
         }
         else if(instance.enemy == "DamageAddict")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyDamageAddict();
               enemyStatsArray = ScreenGame.enemyDamageAddictStats;
            }
            else
            {
               enemy = new EnemyDamageAddictBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyDamageAddictBStats;
            }
         }
         else if(instance.enemy == "Exploding")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyExploding();
               enemyStatsArray = ScreenGame.enemyExplodingStats;
            }
            else
            {
               enemy = new EnemyExplodingBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyExplodingBStats;
            }
         }
         else if(instance.enemy == "Shrinking")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyShrinking();
               enemyStatsArray = ScreenGame.enemyShrinkingStats;
            }
            else
            {
               enemy = new EnemyShrinkingBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyShrinkingBStats;
            }
            enemy.radiusStart = enemy.width / 2;
         }
         else if(instance.enemy == "GrapplingHook")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyGrapplingHook();
               enemyStatsArray = ScreenGame.enemyGrapplingHookStats;
            }
            else
            {
               enemy = new EnemyGrapplingHookBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyGrapplingHookBStats;
            }
            enemy.bulletsShooting = 0;
            enemy.isGrapping = false;
         }
         else if(instance.enemy == "Teleporting")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemyTeleporting();
               enemyStatsArray = ScreenGame.enemyTeleportingStats;
               enemy.teleStartTimerMax = 150;
               enemy.teleStartTimerMin = 120;
            }
            else
            {
               enemy = new EnemyTeleportingBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemyTeleportingBStats;
               enemy.teleStartTimerMax = 225;
               enemy.teleStartTimerMin = 150;
            }
            enemy.gotoAndStop(1);
            enemy.teleporting = false;
            enemy.teleportingAway = false;
            enemy.teleStartTimer = enemy.teleStartTimerMin + Math.random() * (enemy.teleStartTimerMax - enemy.teleStartTimerMin);
            enemy.teleTimerMax = 30;
            enemy.teleTimer = 30;
            enemy.distEnemyTank = 0;
            enemy.angleToTank = 0;
            enemy.newDistance = 0;
            enemy.randomAngle = 0;
            enemy.velocityAngle = 0;
            enemy.velocitySpeed = 0;
         }
         else if(instance.enemy == "Soldier")
         {
            if(instance.enemyLevel != "B")
            {
               enemy = new EnemySoldier();
               enemyStatsArray = ScreenGame.enemySoldierStats;
            }
            else
            {
               enemy = new EnemySoldierBoss();
               ++ScreenGame.bossAmountSpawnedFull;
               enemyStatsArray = ScreenGame.enemySoldierBStats;
            }
         }
         enemy.enemyLevel = instance.enemyLevel;
         enemy.enemyType = instance.enemy;
         if(enemy.enemyLevel == "B")
         {
            enemy.enemyType += "B";
         }
         enemy.damage = Math.round(enemyStatsArray[0] * multiplierDamage * multiplierLevel);
         if(enemy.enemyLevel != "B")
         {
            enemy.hp = Math.round(enemyStatsArray[1] * multiplierHealth * multiplierLevel);
            enemy.money = Math.round(enemyStatsArray[2] * multiplierLevel);
         }
         else
         {
            enemy.hp = Math.round(enemyStatsArray[1] * multiplierHealth * multiplierLevel / ScreenGame.bossAmount);
            enemy.money = Math.round(enemyStatsArray[2] * multiplierLevel / ScreenGame.bossAmount / 10) * 10;
         }
         enemy.moveSpeedMax = enemyStatsArray[3] * multiplierSpeed;
         enemy.accSpeed = enemyStatsArray[4] * multiplierSpeed;
         enemy.rotSpeedMax = enemyStatsArray[5] * multiplierRotation;
         enemy.particle = enemyStatsArray[6];
         enemy.shoot = enemyStatsArray[7];
         if(enemy.shoot)
         {
            enemy.shootType = enemyStatsArray[8];
            enemy.shootAngle = enemyStatsArray[9];
            enemy.reloadTimeMax = Math.round(enemyStatsArray[10] * multiplierReloadTime);
            enemy.bulletAmount = enemyStatsArray[11];
            enemy.reloadTime = Math.round(Math.random() * (enemy.reloadTimeMax - 10)) + 10;
         }
         this.enemyLayer.addChild(enemy);
         ++ScreenGame.currentEnemies;
         if(ScreenLevelSelect.levelMode != "Flag" && ScreenLevelSelect.levelMode != "Boss" || ScreenLevelSelect.levelMode == "Boss" && String(enemy).indexOf("Boss") != -1)
         {
            --ScreenGame.enemiesLeft;
         }
         enemy.x = instance.x;
         enemy.y = instance.y;
         if(instance.wall == 1)
         {
            enemy.y = instance.y - enemy.height / 2;
         }
         else if(instance.wall == 2)
         {
            enemy.x = instance.x - enemy.width / 2;
         }
         else if(instance.wall == 3)
         {
            enemy.y = instance.y + enemy.height / 2;
         }
         else if(instance.wall == 4)
         {
            enemy.x = instance.x + enemy.width / 2;
         }
         enemy.xVel = 0;
         enemy.yVel = 0;
         enemy.pushVelX = 0;
         enemy.pushVelY = 0;
         enemy.radius = enemy.width / 2;
         enemy.speedSubtracting = 0;
         if(enemy.enemyLevel != "B")
         {
            enemy.slowDown = false;
            enemy.timeSinceGoalSlow = 0;
            enemy.speedSubtractingMax = enemy.moveSpeedMax * 0.5;
            enemy.slowDownTriggerTime = Math.round(120 * (0.5 + Math.random() * 1));
         }
         else
         {
            enemy.timeSinceGoalLockDirection = 0;
            enemy.lockDirectionTriggerTime = Math.round(120 * (2 + Math.random() * 2));
            enemy.lockDirection = "None";
            enemy.lockDirType = "None";
            enemy.lockTurnSpeed = 0;
         }
         enemy.onFire = false;
         enemy.onLava = false;
         enemy.hitByCake = false;
         enemy.onPoison = false;
         enemy.frozen = false;
         enemy.gotBomb = false;
         enemy.outsideWindow = false;
         enemy.outsideWindowLeft = false;
         enemy.outsideWindowRight = false;
         enemy.outsideWindowTop = false;
         enemy.outsideWindowBottom = false;
         enemy.outsideWindowMarker = false;
         if(ScreenLevelSelect.levelMode != "Tower" && ScreenLevelSelect.levelMode != "Defense")
         {
            enemy.angleOffsetCurrent = 0;
            enemy.angleOffsetGoal = 0;
         }
         if(enemy.enemyLevel != "B")
         {
            enemy.safetyDistance = 40 + Math.random() * 60;
         }
         else
         {
            enemy.safetyDistance = 160 + Math.random() * 10;
         }
         enemy.damageIndicator = 0;
         enemy.gotIceIndicator = false;
         enemy.iceIndicatorObject = new MovieClip();
         enemy.gotBombIndicator = false;
         enemy.poisonTimer = 0;
         enemy.poisonDamage = 0;
         enemy.poisonParticleTimerMax = 3;
         enemy.poisonParticleTimer = 0;
         enemy.frozenTimer = 0;
         enemy.bombTimer = 0;
         enemy.bombTimerMax = 0;
         enemy.bombRadius = 0;
         enemy.bombDamage = 0;
         enemy.strongWeakTimerMax = 5;
         enemy.strongWeakTimer = 0;
         enemy.explosionDamageMultiplier = 1;
         enemy.fireLavaDamageMultiplier = 1;
         enemy.bulletDamageMultiplier = 1;
         enemy.poisonMultiplier = 1;
         enemy.laserDamageMultiplier = 1;
         enemy.iceMultiplier = 1;
         enemy.foodDamageMultiplier = 1;
         enemy.magicDamageMultiplier = 1;
         strengthsArray = ScreenGame[("enemy" + instance.enemy + "Strengths").replace(this.spaces,"")];
         for(e = 0; e < strengthsArray.length / 2; e++)
         {
            theStrength = strengthsArray[e * 2];
            if(theStrength == "Explosions")
            {
               enemy.explosionDamageMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "FireLava")
            {
               enemy.fireLavaDamageMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "Bullets")
            {
               enemy.bulletDamageMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "Poison")
            {
               enemy.poisonMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "Laser")
            {
               enemy.laserDamageMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "Ice")
            {
               enemy.iceMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "Food")
            {
               enemy.foodDamageMultiplier -= strengthsArray[e * 2 + 1];
            }
            else if(theStrength == "Magic")
            {
               enemy.magicDamageMultiplier -= strengthsArray[e * 2 + 1];
            }
         }
         weaknessesArray = ScreenGame[("enemy" + instance.enemy + "Weaknesses").replace(this.spaces,"")];
         for(ee = 0; ee < weaknessesArray.length / 2; ee++)
         {
            theWeakness = weaknessesArray[ee * 2];
            if(theWeakness == "Explosions")
            {
               enemy.explosionDamageMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "FireLava")
            {
               enemy.fireLavaDamageMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "Bullets")
            {
               enemy.bulletDamageMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "Poison")
            {
               enemy.poisonMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "Laser")
            {
               enemy.laserDamageMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "Ice")
            {
               enemy.iceMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "Food")
            {
               enemy.foodDamageMultiplier += weaknessesArray[ee * 2 + 1];
            }
            else if(theWeakness == "Magic")
            {
               enemy.magicDamageMultiplier += weaknessesArray[ee * 2 + 1];
            }
         }
         if(ScreenLevelSelect.levelMode == "Tower")
         {
            dist = this.distanceBetween(enemy.x,enemy.y,this.tank.x,this.tank.y);
            enemy.rotation = 180 - Math.atan2(this.tank.x - enemy.x,this.tank.y - enemy.y) * 180 / Math.PI - (35 + enemy.moveSpeedMax * 4) * (1 - Math.sqrt(Math.sqrt(Math.sqrt(dist / (roomWidth + 100))))) - enemy.moveSpeedMax * 1 - 5;
            enemy.xVel += Math.cos(enemy.rotation / 180 * Math.PI) * enemy.moveSpeedMax;
            enemy.yVel += Math.sin(enemy.rotation / 180 * Math.PI) * enemy.moveSpeedMax;
         }
         else if(enemy.y <= 0)
         {
            if(ScreenLevelSelect.levelMode != "Defense")
            {
               enemy.rotation = 90;
            }
            else
            {
               randRotSide = Math.random();
               randRot = Math.random();
               speedMultiplier = 1;
               if(instance.enemy == "Accelerating")
               {
                  speedMultiplier = enemyStatsArray[3] * 2.7;
               }
               else if(instance.enemy == "Temperamental")
               {
                  speedMultiplier = enemyStatsArray[3] * 2;
               }
               else
               {
                  speedMultiplier = enemyStatsArray[3];
               }
               enemyRotation = 0;
               if(randRotSide > 0.5)
               {
                  enemyRotation = 105 + randRot * 15 + speedMultiplier * 17;
                  if(enemyRotation > 165)
                  {
                     enemyRotation = 162.5 + randRot * 5;
                  }
               }
               else
               {
                  enemyRotation = 75 - randRot * 15 - speedMultiplier * 17;
                  if(enemyRotation < 15)
                  {
                     enemyRotation = 12.5 + randRot * 5;
                  }
               }
               enemy.rotation = enemyRotation;
            }
         }
         else if(enemy.x == 0)
         {
            enemy.rotation = 0;
         }
         else if(enemy.y == roomHeight)
         {
            enemy.rotation = -90;
         }
         else if(enemy.x == roomWidth)
         {
            enemy.rotation = 180;
         }
         else
         {
            enemy.rotation = 90 - Math.atan2(this.tank.x - enemy.x,this.tank.y - enemy.y) * 180 / Math.PI;
         }
         this.enemyArray.push(enemy);
      }
      
      private function addBackgroundObject(backgroundType:String, type:String, posX:Number, posY:Number, scale:Number, theRotation:Number, stopAt:Number) : void
      {
         var object:* = undefined;
         var maxFrames:* = 0;
         if(type == "Rock")
         {
            maxFrames = 3;
            if(backgroundType == "Desert")
            {
               object = new BGObjectRockDesert();
            }
            else if(backgroundType == "BlueDirt")
            {
               object = new BGObjectRockBlueDirt();
            }
            else if(backgroundType == "Beach")
            {
               object = new BGObjectRockBeach();
               maxFrames = 9;
            }
            else if(backgroundType == "Hell")
            {
               object = new BGObjectRockHell();
            }
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.6 + scale / 2;
            object.scaleY = 0.6 + scale / 2;
         }
         else if(type == "Crack")
         {
            maxFrames = 10;
            if(backgroundType == "Desert")
            {
               object = new BGObjectCrackDesert();
            }
            else if(backgroundType == "BlueDirt")
            {
               object = new BGObjectCrackBlueDirt();
            }
            else if(backgroundType == "Concrete")
            {
               object = new BGObjectCrackConcrete();
            }
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.8 + scale / 4;
            object.scaleY = 0.8 + scale / 4;
         }
         else if(type == "FlowerWhite" || type == "FlowerRed" || type == "FlowerPurple")
         {
            maxFrames = 1;
            if(type == "FlowerWhite")
            {
               object = new BGObjectFlowerWhite();
            }
            else if(type == "FlowerRed")
            {
               object = new BGObjectFlowerRed();
            }
            else if(type == "FlowerPurple")
            {
               object = new BGObjectFlowerPurple();
            }
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.7 + scale / 8;
            object.scaleY = 0.7 + scale / 8;
         }
         else if(type == "Seastuff")
         {
            maxFrames = 5;
            object = new BGObjectSeastuff();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.2 + scale / 8;
            object.scaleY = 0.2 + scale / 8;
         }
         else if(type == "Trash")
         {
            maxFrames = 15;
            object = new BGObjectTrash();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.8 + scale * 0.2;
            object.scaleY = 0.8 + scale * 0.2;
         }
         else if(type == "Diamond")
         {
            maxFrames = 3;
            object = new BGObjectDiamond();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.8 + scale / 5;
            object.scaleY = 0.8 + scale / 5;
         }
         else if(type == "Skeleton")
         {
            maxFrames = 16;
            object = new BGObjectSkeleton();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.9 + scale * 0.3;
            object.scaleY = 0.9 + scale * 0.3;
         }
         else if(type == "Dirt")
         {
            maxFrames = 5;
            object = new BGObjectDirtMagicStone();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 1.2 + scale * 0.2;
            object.scaleY = 1.2 + scale * 0.2;
         }
         else if(type == "RedBloodCell" || type == "WhiteBloodCell" || type == "Bacteria")
         {
            maxFrames = 3;
            if(type == "RedBloodCell")
            {
               object = new BGObjectRedBloodCell();
            }
            else if(type == "WhiteBloodCell")
            {
               object = new BGObjectWhiteBloodCell();
            }
            else if(type == "Bacteria")
            {
               maxFrames = 2;
               object = new BGObjectBacteria();
            }
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.5 + scale * 0.4;
            object.scaleY = 0.5 + scale * 0.4;
         }
         else if(type == "FuturisticLines")
         {
            maxFrames = 10;
            object = new BGObjectFuturisticLines();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 4 + scale * 0;
            object.scaleY = 4 + scale * 0;
         }
         else if(type == "FuturisticSquare")
         {
            maxFrames = 2;
            object = new BGObjectFuturisticSquare();
            this.bg.addChild(object);
            object.gotoAndStop(Math.floor(1 + stopAt * maxFrames));
            object.scaleX = 0.4 + scale * 0.5;
            object.scaleY = 0.4 + scale * 0.5;
         }
         if(object != null)
         {
            object.x = posX;
            object.y = posY;
            if(type != "FuturisticLines" && type != "FuturisticSquare")
            {
               object.rotation = theRotation;
            }
            else
            {
               object.rotation = (Math.floor(theRotation / 90) + 1) * 90;
            }
            this.backgroundObjectArray.push(object);
         }
      }
      
      private function tankAttack() : void
      {
         var bullet:* = undefined;
         var bulletCount:* = undefined;
         var i:* = undefined;
         var mine:* = undefined;
         var grenade:* = undefined;
         var targetX:* = undefined;
         var targetY:* = undefined;
         var shootDistance:* = undefined;
         var distFromGrenadeToBorder:* = undefined;
         var distFromGrenadeToMouse:* = undefined;
         var distanceRatio:* = undefined;
         var spikeCount:* = undefined;
         var c:* = undefined;
         var spike:* = undefined;
         var rocketCount:* = undefined;
         var closestEnemiesArray:* = undefined;
         var r:* = undefined;
         var enemy:* = undefined;
         var rrr:* = undefined;
         var distanceBetweenTheEnemy:* = undefined;
         var distanceBetweenTheOtherEnemy:* = undefined;
         var rr:* = undefined;
         var rocket:* = undefined;
         var ball:* = undefined;
         var cheeseCount:* = undefined;
         var cc:* = undefined;
         var cheese:* = undefined;
         var bunny:* = undefined;
         if(ScreenGame.reloadTime <= 0)
         {
            if(Main.mouse)
            {
               ScreenGame.reloadTime += ScreenGame.reloadTimeMax;
               if(ScreenGame.primaryWeapon == "Timed Bomb Cannon")
               {
                  tempTimedBombsFired = true;
               }
               else
               {
                  tempOtherThanTimedBombsFired = true;
               }
               tempOnlySpecialWeapons = false;
               tempNoWeaponsUsed = false;
               bulletCount = 1;
               if(ScreenGame.primaryWeapon == "Shotgun")
               {
                  bulletCount = ScreenUpgrades.upgradeArrayShotgun[4][ScreenUpgrades.levelsArray[4] - 1];
               }
               for(i = 0; i < bulletCount; i++)
               {
                  if(this.debugOn)
                  {
                     ++this.debugTotalBulletsFired;
                  }
                  if(ScreenGame.primaryWeapon == "Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponCannon");
                     bullet = new Bullet();
                     bullet.radius = 2;
                     bullet.speed = 18;
                     bullet.damage = ScreenUpgrades.upgradeArrayCannon[2][ScreenUpgrades.levelsArray[0] - 1];
                     bullet.spread = 0;
                     bullet.explosion = true;
                     bullet.explosionRadius = ScreenUpgrades.upgradeArrayCannon[3][ScreenUpgrades.levelsArray[0] - 1];
                     bullet.borderSound = "Medium";
                  }
                  else if(ScreenGame.primaryWeapon == "MiniGun")
                  {
                     SoundManager.sfxArray.push("WeaponMinigun");
                     bullet = new BulletSmall();
                     bullet.radius = 2;
                     bullet.speed = 36;
                     bullet.damage = ScreenUpgrades.upgradeArrayMiniGun[2][ScreenUpgrades.levelsArray[1] - 1];
                     bullet.spread = 5;
                     bullet.explosion = false;
                     bullet.borderSound = "Tiny";
                  }
                  else if(ScreenGame.primaryWeapon == "Big Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponBigCannon");
                     bullet = new BulletBig();
                     bullet.radius = 3;
                     bullet.speed = 18;
                     bullet.damage = ScreenUpgrades.upgradeArrayBigCannon[2][ScreenUpgrades.levelsArray[2] - 1];
                     bullet.spread = 0;
                     bullet.explosion = true;
                     bullet.explosionRadius = ScreenUpgrades.upgradeArrayBigCannon[3][ScreenUpgrades.levelsArray[2] - 1];
                     bullet.borderSound = "Big";
                  }
                  else if(ScreenGame.primaryWeapon == "Flamethrower")
                  {
                     SoundManager.flameThrowerPlay = true;
                     bullet = new BulletFire();
                     bullet.radius = 10;
                     bullet.speed = 10;
                     bullet.damage = ScreenUpgrades.upgradeArrayFlamethrower[2][ScreenUpgrades.levelsArray[3] - 1];
                     bullet.spread = 20;
                     bullet.explosion = false;
                     bullet.lifetimeMax = Math.round(ScreenUpgrades.upgradeArrayFlamethrower[3][ScreenUpgrades.levelsArray[3] - 1] / bullet.speed);
                     bullet.lifetime = bullet.lifetimeMax;
                     bullet.deadFlame = false;
                     bullet.gotoAndStop(Math.round(Math.random() * 2 + 1));
                  }
                  else if(ScreenGame.primaryWeapon == "Shotgun")
                  {
                     SoundManager.sfxArray.push("WeaponShotgun");
                     bullet = new BulletShotgun();
                     bullet.radius = 2;
                     bullet.speed = 36;
                     bullet.damage = ScreenUpgrades.upgradeArrayShotgun[2][ScreenUpgrades.levelsArray[4] - 1];
                     bullet.spread = 0;
                     bullet.explosion = false;
                     bullet.borderSound = "Tiny";
                  }
                  else if(ScreenGame.primaryWeapon == "Timed Bomb Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponCannon");
                     bullet = new BulletBomb();
                     bullet.radius = 6;
                     bullet.speed = 28;
                     bullet.damage = ScreenUpgrades.upgradeArrayTimedBombCannon[2][ScreenUpgrades.levelsArray[5] - 1];
                     bullet.spread = 0;
                     bullet.explosion = true;
                     bullet.explosionRadius = ScreenUpgrades.upgradeArrayTimedBombCannon[3][ScreenUpgrades.levelsArray[5] - 1];
                     bullet.bombTimer = ScreenUpgrades.upgradeArrayTimedBombCannon[4][ScreenUpgrades.levelsArray[5] - 1];
                     bullet.borderSound = "Big";
                  }
                  else if(ScreenGame.primaryWeapon == "Gummy Bear Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponGummyBearCannon");
                     bullet = new BulletGummyBear();
                     bullet.gotoAndStop(1);
                     bullet.radius = 6;
                     bullet.speed = 20;
                     bullet.damage = ScreenUpgrades.upgradeArrayGummyBearCannon[2][ScreenUpgrades.levelsArray[6] - 1];
                     bullet.spread = 5;
                     bullet.explosion = false;
                     bullet.borderSound = "Medium";
                  }
                  else if(ScreenGame.primaryWeapon == "Poison Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponPoisonCannon");
                     bullet = new BulletPoison();
                     bullet.radius = 4;
                     bullet.speed = 36;
                     bullet.damage = ScreenUpgrades.upgradeArrayPoisonCannon[2][ScreenUpgrades.levelsArray[7] - 1];
                     bullet.spread = 5;
                     bullet.explosion = false;
                     bullet.poisonTime = ScreenUpgrades.upgradeArrayPoisonCannon[3][ScreenUpgrades.levelsArray[7] - 1];
                     bullet.poisonDamage = ScreenUpgrades.upgradeArrayPoisonCannon[4][ScreenUpgrades.levelsArray[7] - 1];
                     bullet.borderSound = "Tiny";
                  }
                  else if(ScreenGame.primaryWeapon == "Laser Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponLaser");
                     bullet = new BulletLaser();
                     bullet.radius = 12;
                     bullet.speed = 0;
                     bullet.damage = ScreenUpgrades.upgradeArrayLaserCannon[2][ScreenUpgrades.levelsArray[8] - 1];
                     bullet.spread = 0;
                     bullet.explosion = false;
                     bullet.startX = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * 16;
                     bullet.startY = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * 16;
                     bullet.endX = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * (16 + 1000);
                     bullet.endY = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * (16 + 1000);
                     bullet.canDamage = true;
                  }
                  else if(ScreenGame.primaryWeapon == "Cake Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponCakeCannon");
                     bullet = new BulletCake();
                     bullet.radius = 10;
                     bullet.speed = 24;
                     bullet.damage = ScreenUpgrades.upgradeArrayCakeCannon[2][ScreenUpgrades.levelsArray[9] - 1];
                     bullet.spread = 0;
                     bullet.explosion = false;
                     bullet.pieces = ScreenUpgrades.upgradeArrayCakeCannon[3][ScreenUpgrades.levelsArray[9] - 1];
                     bullet.borderSound = "Medium";
                  }
                  else if(ScreenGame.primaryWeapon == "Penetration Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponCannon");
                     bullet = new BulletPenetrate();
                     bullet.radius = 3;
                     bullet.speed = 18;
                     bullet.damage = ScreenUpgrades.upgradeArrayPenetrationCannon[2][ScreenUpgrades.levelsArray[10] - 1];
                     bullet.spread = 0;
                     bullet.explosion = true;
                     bullet.explosionRadius = ScreenUpgrades.upgradeArrayPenetrationCannon[3][ScreenUpgrades.levelsArray[10] - 1];
                     bullet.enemiesArray = [];
                     bullet.borderSound = "Big";
                  }
                  else if(ScreenGame.primaryWeapon == "Magic Cannon")
                  {
                     SoundManager.sfxArray.push("WeaponMagicCannon");
                     bullet = new BulletMagic();
                     bullet.radius = 8;
                     bullet.speed = 14;
                     bullet.damage = ScreenUpgrades.upgradeArrayMagicCannon[2][ScreenUpgrades.levelsArray[11] - 1];
                     bullet.spread = 0;
                     bullet.explosion = false;
                     bullet.enemiesArray = [];
                     bullet.targetEnemy;
                     bullet.targetsLeft = ScreenUpgrades.upgradeArrayMagicCannon[3][ScreenUpgrades.levelsArray[11] - 1];
                     bullet.neverHitTarget = true;
                     bullet.borderSound = "Medium";
                  }
                  this.bulletLayer.addChild(bullet);
                  if(ScreenGame.primaryWeapon != "Shotgun" && ScreenGame.primaryWeapon != "Laser Cannon")
                  {
                     bullet.rotation = this.tank.tower.rotation - bullet.spread / 2 + Math.random() * bullet.spread;
                  }
                  else if(ScreenGame.primaryWeapon == "Shotgun")
                  {
                     bullet.rotation = this.tank.tower.rotation - ScreenUpgrades.upgradeArrayShotgun[3][ScreenUpgrades.levelsArray[4] - 1] / 2 + ScreenUpgrades.upgradeArrayShotgun[3][ScreenUpgrades.levelsArray[4] - 1] / (bulletCount - 1) * i;
                  }
                  if(ScreenGame.primaryWeapon != "Shotgun" && ScreenGame.primaryWeapon != "Flamethrower" && ScreenGame.primaryWeapon != "Laser Cannon" && ScreenGame.primaryWeapon != "Magic Cannon")
                  {
                     bullet.x = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * (16 + bullet.width / 2);
                     bullet.y = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * (16 + bullet.width / 2);
                  }
                  else if(ScreenGame.primaryWeapon == "Shotgun")
                  {
                     bullet.x = this.tank.x + Math.cos(bullet.rotation / 180 * Math.PI) * 16;
                     bullet.y = this.tank.y + Math.sin(bullet.rotation / 180 * Math.PI) * 16;
                  }
                  else if(ScreenGame.primaryWeapon == "Flamethrower")
                  {
                     bullet.x = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * 16;
                     bullet.y = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * 16;
                  }
                  else if(ScreenGame.primaryWeapon == "Laser Cannon")
                  {
                     bullet.x = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * (8 + bullet.width / 2);
                     bullet.y = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * (8 + bullet.width / 2);
                  }
                  else if(ScreenGame.primaryWeapon == "Magic Cannon")
                  {
                     bullet.x = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * (12 + bullet.width / 2);
                     bullet.y = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * (12 + bullet.width / 2);
                  }
                  if(ScreenGame.primaryWeapon == "Laser Cannon")
                  {
                     bullet.rotation = this.tank.tower.rotation - bullet.spread / 2 + Math.random() * bullet.spread;
                  }
                  bullet.angle = bullet.rotation / 180 * Math.PI;
                  bullet.xVel = Math.cos(bullet.angle) * bullet.speed;
                  bullet.yVel = Math.sin(bullet.angle) * bullet.speed;
                  if(ScreenGame.primaryWeapon == "Flamethrower")
                  {
                     bullet.xVel += this.tank.xVel;
                     bullet.yVel += this.tank.yVel;
                     bullet.rotation = Math.random() * 360;
                  }
                  bullet.dead = false;
                  if(ScreenGame.primaryWeapon != "Flamethrower")
                  {
                     this.bulletArray.push(bullet);
                  }
                  else
                  {
                     this.bulletArray.splice(0,0,bullet);
                  }
                  if(ScreenGame.primaryWeapon == "MiniGun" || ScreenGame.primaryWeapon == "Gummy Bear Cannon" || ScreenGame.primaryWeapon == "Poison Cannon")
                  {
                     this.spawnParticle("MuzzleFlareSmall",1,this.tank.x + Math.cos(bullet.angle) * 10,this.tank.y + Math.sin(bullet.angle) * 10,0,bullet.rotation,0);
                  }
                  else if(ScreenGame.primaryWeapon == "Cannon" || ScreenGame.primaryWeapon == "Shotgun" && bullet.rotation == this.tank.tower.rotation || ScreenGame.primaryWeapon == "Timed Bomb Cannon" || ScreenGame.primaryWeapon == "Cake Cannon")
                  {
                     this.spawnParticle("MuzzleFlareMedium",1,this.tank.x + Math.cos(bullet.angle) * 10,this.tank.y + Math.sin(bullet.angle) * 10,0,bullet.rotation,0);
                  }
                  else if(ScreenGame.primaryWeapon == "Big Cannon" || ScreenGame.primaryWeapon == "Penetration Cannon")
                  {
                     this.spawnParticle("MuzzleFlareBig",1,this.tank.x + Math.cos(bullet.angle) * 10,this.tank.y + Math.sin(bullet.angle) * 10,0,bullet.rotation,0);
                  }
               }
            }
         }
         else
         {
            --ScreenGame.reloadTime;
         }
         if(ScreenGame.reloadTimeSecondary <= 0)
         {
            if(Main.space)
            {
               ScreenGame.reloadTimeSecondary += ScreenGame.reloadTimeMaxSecondary;
               tempOtherThanTimedBombsFired = true;
               tempNoWeaponsUsed = false;
               if(ScreenGame.secondaryWeapon == "Mine")
               {
                  SoundManager.sfxArray.push("PlaceMine");
                  if(ScreenGame.secondaryWeapon == "Mine")
                  {
                     mine = new ObjectMine();
                     mine.radius = 12;
                     mine.damage = ScreenUpgrades.upgradeArrayMine[2][ScreenUpgrades.levelsArraySecondary[0] - 1];
                     mine.explosionRadius = ScreenUpgrades.upgradeArrayMine[3][ScreenUpgrades.levelsArraySecondary[0] - 1];
                  }
                  this.groundLayer.addChild(mine);
                  mine.x = this.tank.x;
                  mine.y = this.tank.y;
                  this.mineArray.push(mine);
               }
               else if(ScreenGame.secondaryWeapon == "Grenade" || ScreenGame.secondaryWeapon == "Ice Grenade" || ScreenGame.secondaryWeapon == "Poison Grenade")
               {
                  if(ScreenGame.secondaryWeapon == "Grenade")
                  {
                     SoundManager.sfxArray.push("GrenadeThrow");
                     grenade = new ObjectGrenade();
                     grenade.damage = ScreenUpgrades.upgradeArrayGrenade[2][ScreenUpgrades.levelsArraySecondary[1] - 1];
                     grenade.explosionRadius = ScreenUpgrades.upgradeArrayGrenade[3][ScreenUpgrades.levelsArraySecondary[1] - 1];
                  }
                  else if(ScreenGame.secondaryWeapon == "Ice Grenade")
                  {
                     SoundManager.sfxArray.push("GrenadeThrow");
                     grenade = new ObjectIceGrenade();
                     grenade.damage = ScreenUpgrades.upgradeArrayIceGrenade[2][ScreenUpgrades.levelsArraySecondary[2] - 1];
                     grenade.explosionRadius = ScreenUpgrades.upgradeArrayIceGrenade[3][ScreenUpgrades.levelsArraySecondary[2] - 1];
                     grenade.frozenTime = ScreenUpgrades.upgradeArrayIceGrenade[4][ScreenUpgrades.levelsArraySecondary[2] - 1];
                  }
                  else if(ScreenGame.secondaryWeapon == "Poison Grenade")
                  {
                     SoundManager.sfxArray.push("GrenadeThrow");
                     grenade = new ObjectPoisonGrenade();
                     grenade.damage = ScreenUpgrades.upgradeArrayPoisonGrenade[2][ScreenUpgrades.levelsArraySecondary[3] - 1];
                     grenade.explosionRadius = ScreenUpgrades.upgradeArrayPoisonGrenade[3][ScreenUpgrades.levelsArraySecondary[3] - 1];
                     grenade.poisonTime = ScreenUpgrades.upgradeArrayPoisonGrenade[4][ScreenUpgrades.levelsArraySecondary[3] - 1];
                     grenade.poisonDamage = ScreenUpgrades.upgradeArrayPoisonGrenade[5][ScreenUpgrades.levelsArraySecondary[3] - 1];
                  }
                  this.groundLayer.addChild(grenade);
                  grenade.x = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * (16 + grenade.width / 2);
                  grenade.y = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * (16 + grenade.width / 2);
                  grenade.timeLeft = 50;
                  targetX = mouseX;
                  targetY = mouseY;
                  shootDistance = this.distanceBetween(grenade.x,grenade.y,targetX,targetY);
                  if(mouseY > 400 - cameraPosY)
                  {
                     distFromGrenadeToBorder = Math.abs(400 - cameraPosY - grenade.y);
                     distFromGrenadeToMouse = Math.abs(mouseY - grenade.y);
                     distanceRatio = distFromGrenadeToBorder / distFromGrenadeToMouse;
                     shootDistance *= distanceRatio;
                  }
                  grenade.radius = 3;
                  grenade.speed = shootDistance / 9.35;
                  if(grenade.speed < 2.1)
                  {
                     grenade.speed = 2.1;
                  }
                  grenade.friction = 0.101 + 0.0014 * (shootDistance / 200);
                  grenade.spread = 0;
                  grenade.explosion = true;
                  grenade.rotation = this.tank.tower.rotation - grenade.spread / 2 + Math.random() * grenade.spread;
                  grenade.angle = grenade.rotation / 180 * Math.PI;
                  grenade.xVel = Math.cos(grenade.angle) * grenade.speed;
                  grenade.yVel = Math.sin(grenade.angle) * grenade.speed;
                  grenade.rotation = Math.random() * 360;
                  grenade.dead = false;
                  this.bulletArray.push(grenade);
               }
               else if(ScreenGame.secondaryWeapon == "Icicles" || ScreenGame.secondaryWeapon == "Poison Spikes")
               {
                  SoundManager.sfxArray.push("FireSpikes");
                  if(ScreenGame.secondaryWeapon == "Icicles")
                  {
                     spikeCount = ScreenUpgrades.upgradeArrayIcicles[4][ScreenUpgrades.levelsArraySecondary[4] - 1];
                  }
                  else if(ScreenGame.secondaryWeapon == "Poison Spikes")
                  {
                     spikeCount = ScreenUpgrades.upgradeArrayPoisonSpikes[5][ScreenUpgrades.levelsArraySecondary[5] - 1];
                  }
                  for(c = 0; c < spikeCount; c++)
                  {
                     if(ScreenGame.secondaryWeapon == "Icicles")
                     {
                        spike = new BulletIcicle();
                        spike.damage = ScreenUpgrades.upgradeArrayIcicles[2][ScreenUpgrades.levelsArraySecondary[4] - 1];
                        spike.frozenTime = ScreenUpgrades.upgradeArrayIcicles[3][ScreenUpgrades.levelsArraySecondary[4] - 1];
                        spike.radius = 6;
                        spike.speed = 20;
                        spike.explosion = false;
                     }
                     else if(ScreenGame.secondaryWeapon == "Poison Spikes")
                     {
                        spike = new BulletPoisonSpike();
                        spike.damage = ScreenUpgrades.upgradeArrayPoisonSpikes[2][ScreenUpgrades.levelsArraySecondary[5] - 1];
                        spike.poisonTime = ScreenUpgrades.upgradeArrayPoisonSpikes[3][ScreenUpgrades.levelsArraySecondary[5] - 1];
                        spike.poisonDamage = ScreenUpgrades.upgradeArrayPoisonSpikes[4][ScreenUpgrades.levelsArraySecondary[5] - 1];
                        spike.radius = 6;
                        spike.speed = 20;
                        spike.explosion = false;
                     }
                     this.bulletLayer.addChild(spike);
                     spike.rotation = 360 / (spikeCount - 1) * c;
                     spike.x = this.tank.x + Math.cos(spike.rotation / 180 * Math.PI) * (16 + spike.width / 2);
                     spike.y = this.tank.y + Math.sin(spike.rotation / 180 * Math.PI) * (16 + spike.width / 2);
                     spike.angle = spike.rotation / 180 * Math.PI;
                     spike.xVel = Math.cos(spike.angle) * spike.speed;
                     spike.yVel = Math.sin(spike.angle) * spike.speed;
                     spike.dead = false;
                     spike.borderSound = "Tiny";
                     this.bulletArray.push(spike);
                  }
               }
               else if(ScreenGame.secondaryWeapon == "Shield")
               {
                  SoundManager.sfxArray.push("Shield");
                  this.shieldOn = true;
                  this.shieldTimer = ScreenUpgrades.upgradeArrayShield[2][ScreenUpgrades.levelsArraySecondary[6] - 1];
               }
               else if(ScreenGame.secondaryWeapon == "Rockets")
               {
                  rocketCount = ScreenUpgrades.upgradeArrayRockets[4][ScreenUpgrades.levelsArraySecondary[7] - 1];
                  closestEnemiesArray = [];
                  for(r = 0; r < this.enemyArray.length; r++)
                  {
                     enemy = this.enemyArray[r];
                     if(!(enemy.x < 0 - enemy.width / 2 - cameraPosX || enemy.x > roomWidth + enemy.width / 2 - cameraPosX - (roomWidth - cameraWidth) || enemy.y < 0 - enemy.height / 2 - cameraPosY || enemy.y > roomHeight + enemy.height / 2 - cameraPosY - (roomHeight - cameraHeight)) && (enemy.invisible == null || !enemy.invisible) && (enemy.teleporting == null || !enemy.teleporting))
                     {
                        if(closestEnemiesArray.length == 0)
                        {
                           closestEnemiesArray[0] = enemy;
                        }
                        else
                        {
                           for(rrr = 0; rrr < closestEnemiesArray.length; rrr++)
                           {
                              distanceBetweenTheEnemy = this.distanceBetween(this.tank.x,this.tank.y,enemy.x,enemy.y) - enemy.radius;
                              distanceBetweenTheOtherEnemy = this.distanceBetween(this.tank.x,this.tank.y,closestEnemiesArray[rrr].x,closestEnemiesArray[rrr].y) - closestEnemiesArray[rrr].radius;
                              if(distanceBetweenTheEnemy < distanceBetweenTheOtherEnemy)
                              {
                                 closestEnemiesArray.splice(rrr,0,enemy);
                                 break;
                              }
                              if(rrr == closestEnemiesArray.length - 1)
                              {
                                 closestEnemiesArray.splice(rrr + 1,0,enemy);
                                 break;
                              }
                           }
                        }
                     }
                  }
                  if(rocketCount > closestEnemiesArray.length)
                  {
                     rocketCount = closestEnemiesArray.length;
                  }
                  if(rocketCount > 0)
                  {
                     SoundManager.sfxArray.push("Rockets");
                     for(rr = 0; rr < rocketCount; rr++)
                     {
                        rocket = new BulletRocket();
                        rocket.damage = ScreenUpgrades.upgradeArrayRockets[2][ScreenUpgrades.levelsArraySecondary[7] - 1];
                        rocket.radius = 3;
                        rocket.speed = 16;
                        rocket.explosion = true;
                        rocket.explosionRadius = ScreenUpgrades.upgradeArrayRockets[3][ScreenUpgrades.levelsArraySecondary[7] - 1];
                        this.bulletLayer.addChild(rocket);
                        rocket.targetEnemy = closestEnemiesArray[rr];
                        rocket.rotation = this.angleBetween(this.tank.x,this.tank.y,rocket.targetEnemy.x,rocket.targetEnemy.y) * 180 / Math.PI;
                        rocket.x = this.tank.x + Math.cos(rocket.rotation / 180 * Math.PI) * (16 + rocket.width / 2);
                        rocket.y = this.tank.y + Math.sin(rocket.rotation / 180 * Math.PI) * (16 + rocket.width / 2);
                        rocket.angle = rocket.rotation / 180 * Math.PI;
                        rocket.xVel = Math.cos(rocket.angle) * rocket.speed;
                        rocket.yVel = Math.sin(rocket.angle) * rocket.speed;
                        rocket.dead = false;
                        rocket.borderSound = "Medium";
                        this.bulletArray.push(rocket);
                     }
                  }
                  else
                  {
                     ScreenGame.reloadTimeSecondary = 0;
                  }
               }
               else if(ScreenGame.secondaryWeapon == "Ice Ball" || ScreenGame.secondaryWeapon == "Lava Ball")
               {
                  SoundManager.sfxArray.push("Ball");
                  if(ScreenGame.secondaryWeapon == "Ice Ball")
                  {
                     ++this.iceTrailID;
                     ball = new BulletIceball();
                     ball.damage = ScreenUpgrades.upgradeArrayIceball[2][ScreenUpgrades.levelsArraySecondary[8] - 1];
                     ball.explosionRadius = ScreenUpgrades.upgradeArrayIceball[3][ScreenUpgrades.levelsArraySecondary[8] - 1];
                     ball.frozenTime = ScreenUpgrades.upgradeArrayIceball[4][ScreenUpgrades.levelsArraySecondary[8] - 1];
                     ball.radius = 20;
                     ball.speed = 12;
                     ball.explosion = false;
                  }
                  else if(ScreenGame.secondaryWeapon == "Lava Ball")
                  {
                     ball = new BulletLavaball();
                     ball.damage = ScreenUpgrades.upgradeArrayLavaball[2][ScreenUpgrades.levelsArraySecondary[9] - 1];
                     ball.explosionRadius = ScreenUpgrades.upgradeArrayLavaball[3][ScreenUpgrades.levelsArraySecondary[9] - 1];
                     ball.radius = 20;
                     ball.speed = 12;
                     ball.explosion = true;
                  }
                  this.bulletLayer.addChild(ball);
                  ball.rotation = this.tank.tower.rotation;
                  ball.x = this.tank.x + Math.cos(ball.rotation / 180 * Math.PI) * (16 + ball.width / 2);
                  ball.y = this.tank.y + Math.sin(ball.rotation / 180 * Math.PI) * (16 + ball.width / 2);
                  ball.angle = ball.rotation / 180 * Math.PI;
                  ball.xVel = Math.cos(ball.angle) * ball.speed;
                  ball.yVel = Math.sin(ball.angle) * ball.speed;
                  ball.dead = false;
                  ball.borderSound = "Big";
                  this.bulletArray.push(ball);
               }
               else if(ScreenGame.secondaryWeapon == "Crazy Cheese")
               {
                  SoundManager.sfxArray.push("CrazyCheese");
                  cheeseCount = ScreenUpgrades.upgradeArrayCrazyCheese[4][ScreenUpgrades.levelsArraySecondary[10] - 1];
                  for(cc = 0; cc < cheeseCount; cc++)
                  {
                     cheese = new BulletCrazyCheese();
                     cheese.radius = 7;
                     cheese.bounces = 3;
                     cheese.speed = 20;
                     cheese.damage = ScreenUpgrades.upgradeArrayCrazyCheese[2][ScreenUpgrades.levelsArraySecondary[10] - 1];
                     cheese.explosion = false;
                     cheese.enemiesArray = [];
                     this.bulletLayer.addChild(cheese);
                     cheese.rotation = this.tank.tower.rotation - ScreenUpgrades.upgradeArrayCrazyCheese[3][ScreenUpgrades.levelsArraySecondary[10] - 1] / 2 + ScreenUpgrades.upgradeArrayCrazyCheese[3][ScreenUpgrades.levelsArraySecondary[10] - 1] / (cheeseCount - 1) * cc;
                     cheese.x = this.tank.x + Math.cos(cheese.rotation / 180 * Math.PI) * (16 + cheese.width / 2);
                     cheese.y = this.tank.y + Math.sin(cheese.rotation / 180 * Math.PI) * (16 + cheese.width / 2);
                     cheese.angle = cheese.rotation / 180 * Math.PI;
                     cheese.xVel = Math.cos(cheese.angle) * cheese.speed;
                     cheese.yVel = Math.sin(cheese.angle) * cheese.speed;
                     cheese.dead = false;
                     cheese.borderSound = "Medium";
                     this.bulletArray.push(cheese);
                  }
               }
               else if(ScreenGame.secondaryWeapon == "Magic Bunny")
               {
                  SoundManager.sfxArray.push("MagicBunny");
                  bunny = new BulletMagicBunny();
                  bunny.radius = 8;
                  bunny.speed = 10;
                  bunny.damage = ScreenUpgrades.upgradeArrayMagicBunny[2][ScreenUpgrades.levelsArraySecondary[11] - 1];
                  bunny.spread = 0;
                  bunny.explosion = false;
                  bunny.enemiesArray = [];
                  bunny.targetEnemy;
                  bunny.targetsLeft = ScreenUpgrades.upgradeArrayMagicBunny[3][ScreenUpgrades.levelsArraySecondary[11] - 1];
                  bunny.neverHitTarget = true;
                  bunny.borderSound = "Medium";
                  this.bulletLayer.addChild(bunny);
                  bunny.rotation = this.tank.tower.rotation - bunny.spread / 2 + Math.random() * bunny.spread;
                  bunny.x = this.tank.x + Math.cos(this.tank.tower.rotation / 180 * Math.PI) * (16 + bunny.width / 2);
                  bunny.y = this.tank.y + Math.sin(this.tank.tower.rotation / 180 * Math.PI) * (16 + bunny.width / 2);
                  bunny.angle = bunny.rotation / 180 * Math.PI;
                  bunny.xVel = Math.cos(bunny.angle) * bunny.speed;
                  bunny.yVel = Math.sin(bunny.angle) * bunny.speed;
                  bunny.dead = false;
                  this.bulletArray.push(bunny);
               }
            }
         }
         else if(!PartTutorial.tutorialOn || PartTutorial.tutorialCompleted || Boolean(PartTutorial.checkIfTutorialDone("AimShoot")))
         {
            --ScreenGame.reloadTimeSecondary;
            if(ScreenGame.reloadTimeSecondary == 0)
            {
               SoundManager.sfxArray.push("SpecialReloaded");
            }
         }
      }
      
      private function hitDamageAddict(enemy:Object, damage:Number, particleAndSound:Boolean = true) : void
      {
         var totalHealth:* = undefined;
         var ranAngle:* = undefined;
         var ranDistance:* = undefined;
         var spawnX:* = undefined;
         var spawnY:* = undefined;
         if(ScreenLevelSelect.levelDifficulty == "Easy")
         {
            damage *= 0.64;
         }
         else if(ScreenLevelSelect.levelDifficulty == "Medium")
         {
            damage *= 0.8;
         }
         else if(ScreenLevelSelect.levelDifficulty == "Hard")
         {
            damage *= 1;
         }
         if(damage > 0)
         {
            totalHealth = this.getTotalHealth(enemy);
            if(enemy.hp < totalHealth)
            {
               if(enemy.hp + damage < totalHealth)
               {
                  if(this.debugOn)
                  {
                     this.debugTotalDamage -= damage;
                  }
                  enemy.hp += damage;
               }
               else
               {
                  if(this.debugOn)
                  {
                     this.debugTotalDamage -= totalHealth - enemy.hp;
                  }
                  enemy.hp = totalHealth;
               }
               if(particleAndSound)
               {
                  ranAngle = Math.random() * 2 * Math.PI;
                  ranDistance = Math.random() * enemy.radius * 0.75;
                  spawnX = Math.cos(ranAngle) * ranDistance;
                  spawnY = Math.sin(ranAngle) * ranDistance;
                  if(enemy.enemyLevel != "B")
                  {
                     this.spawnParticle("Heal",1,enemy.x + spawnX,enemy.y + spawnY,0,270,0);
                  }
                  else
                  {
                     this.spawnParticle("HealBoss",1,enemy.x + spawnX,enemy.y + spawnY,0,270,0);
                  }
                  SoundManager.sfxArray.push("EnemyHeal");
               }
            }
         }
      }
      
      private function checkWithinScreen(xPos:Number, yPos:Number, theWidth:Number = 0, theHeight:Number = 0, distanceAdd:Number = 0) : Boolean
      {
         if(!(xPos < 0 - theWidth / 2 - cameraPosX - distanceAdd || xPos > roomWidth + theWidth / 2 - cameraPosX - (roomWidth - cameraWidth) + distanceAdd || yPos < 0 - theHeight / 2 - cameraPosY - distanceAdd || yPos > roomHeight + theHeight / 2 - cameraPosY - (roomHeight - cameraHeight) + distanceAdd))
         {
            return true;
         }
         return false;
      }
      
      private function spawnExplosion(xPos:Number, yPos:Number, radius:Number, damage:Number, explosionType:String, effectTime:Number = 0, effectDamage:Number = 0, smallSound:Boolean = true, explosionParent:* = null) : void
      {
         var explosion:* = undefined;
         if(smallSound)
         {
            SoundManager.sfxArray.push("ExplosionSmall");
         }
         else
         {
            SoundManager.sfxArray.push("ExplosionBig");
         }
         if(explosionType == "Normal")
         {
            explosion = new Explosion();
         }
         else if(explosionType == "Ice")
         {
            explosion = new ExplosionIce();
            explosion.frozenTime = effectTime;
         }
         else if(explosionType == "Poison")
         {
            explosion = new ExplosionPoison();
            explosion.poisonTime = effectTime;
            explosion.poisonDamage = effectDamage;
         }
         explosion.damage = damage;
         explosion.radius = radius;
         explosion.canDamage = true;
         if(explosionParent != null)
         {
            explosion.explosionParent = explosionParent;
         }
         this.particleLayer.addChild(explosion);
         explosion.x = xPos;
         explosion.y = yPos;
         explosion.scaleX = radius / 250;
         explosion.scaleY = radius / 250;
         this.explosionArray.push(explosion);
         this.spawnParticle("BulletDestroy",Math.round(radius / 10),xPos,yPos,radius);
      }
      
      private function handleEnemies() : void
      {
         var i:* = undefined;
         var theEnemy:* = undefined;
         var dead:* = undefined;
         var speed:* = undefined;
         var pushSpeed:* = undefined;
         var indicatorIce:* = undefined;
         var noMoney:* = undefined;
         var bottomCollision:* = undefined;
         var tankEnemyDistance:* = undefined;
         var beforeHP:* = undefined;
         var collidingWithLaser:Boolean = false;
         var tankNoOffSetDistance:* = undefined;
         var strongWeakAddSize:* = undefined;
         var tankEnemyAngle:* = undefined;
         var rotateTowardsTank:* = undefined;
         var rotationGoal:* = undefined;
         var angleTankToEnemy:* = undefined;
         var angleForwardToTank:* = undefined;
         var borderDistance:* = undefined;
         var rotDifference:* = undefined;
         var rotDifferenceNoOffset:* = undefined;
         var goalX:* = undefined;
         var goalY:* = undefined;
         var dist:* = undefined;
         var velAngle:* = undefined;
         var distTankToGoal:* = undefined;
         var distTankToEnemy:* = undefined;
         var radiusLength:* = undefined;
         var angleDifference:* = undefined;
         var enemyIsAtMapBorder:* = undefined;
         var borderSize:* = undefined;
         var angleToCenterOfMap:* = undefined;
         var angleDifferenceToCenter:* = undefined;
         var incValue:* = undefined;
         var hpDifficultyMultiplier:* = undefined;
         var hpLevelMultiplier:* = undefined;
         var hpAmount:* = undefined;
         var hpPercentage:* = undefined;
         var distEnemyTank:* = undefined;
         var distEnemyBottom:* = undefined;
         var teleX:* = undefined;
         var teleY:* = undefined;
         var subtractMultiplier:* = undefined;
         var angleToTank:* = undefined;
         var speedDirection:* = undefined;
         var changeCurrentOffsetVal:Number = NaN;
         var changeGoalOffsetVal:Number = NaN;
         var iii:* = undefined;
         var theEnemy2:* = undefined;
         var enemyEnemyDistance:* = undefined;
         var angleTowards:* = undefined;
         var collisionX:* = undefined;
         var collisionY:* = undefined;
         var distanceAdd:* = undefined;
         var enemy1Mass:* = undefined;
         var enemy2Mass:* = undefined;
         var totalPushForce:* = undefined;
         var safetyFactor:* = undefined;
         var maxAngle:* = undefined;
         var rotSpeed:* = undefined;
         var useAngle:* = undefined;
         var useRot:* = undefined;
         var angleTowardsDegree:* = undefined;
         var damageMultiplier:* = undefined;
         var damage:* = undefined;
         var ii:* = undefined;
         var theBullet:* = undefined;
         var laserCollision:* = undefined;
         var directLaserCollision:* = undefined;
         var angleToLaserCollision:* = undefined;
         var intersectionX:* = undefined;
         var intersectionY:* = undefined;
         var angleToBullet:* = undefined;
         var impactX:* = undefined;
         var impactY:* = undefined;
         var enemyAlreadyHit:* = undefined;
         var u:* = undefined;
         var bossDamageMultiplier:* = undefined;
         var q:* = undefined;
         var cakeBullet:* = undefined;
         var theAngle:* = undefined;
         var ig:* = undefined;
         var theGround:* = undefined;
         var angleToItem:* = undefined;
         var normalSize:* = undefined;
         var iiii:* = undefined;
         var theExplosion:* = undefined;
         var distToExplosion:* = undefined;
         var angleToExplosion:* = undefined;
         var collisionPointX:* = undefined;
         var collisionPointY:* = undefined;
         var factor:* = undefined;
         var enemyToHeal:* = undefined;
         var distanceToEnemy:* = undefined;
         var totalHealth:* = undefined;
         var ranAngle:* = undefined;
         var ranDistance:* = undefined;
         var spawnX:* = undefined;
         var spawnY:* = undefined;
         var shrinkEnemyHealth:* = undefined;
         var size:* = undefined;
         var scaleSize:* = undefined;
         var angleFromEnemy:* = undefined;
         var distanceToTank:* = undefined;
         var enemyPosX:* = undefined;
         var enemyPosY:* = undefined;
         var tankPosX:* = undefined;
         var tankPosY:* = undefined;
         var pullForceX:* = undefined;
         var pullForceY:* = undefined;
         var angleCos:* = undefined;
         var angleSin:* = undefined;
         var soundType:* = undefined;
         var bulletSpeedMultiplier:* = undefined;
         var b:* = undefined;
         var eBullet:* = undefined;
         var randomRotation:* = undefined;
         for(i = 0; i < this.enemyArray.length; i++)
         {
            theEnemy = this.enemyArray[i];
            dead = false;
            noMoney = false;
            bottomCollision = false;
            tankEnemyDistance = this.distanceBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
            beforeHP = theEnemy.hp;
            collidingWithLaser = false;
            tankNoOffSetDistance = 80;
            if(theEnemy.damageIndicator == 0 || Boolean(theEnemy.teleporting != null) && Boolean(theEnemy.teleporting))
            {
               this.uncolorClip(theEnemy);
               theEnemy.damageIndicator = 0;
            }
            else
            {
               this.colorClip(theEnemy,16711680,theEnemy.damageIndicator / 20 * 0.8);
               --theEnemy.damageIndicator;
            }
            if(theEnemy.strongWeakTimer > 0)
            {
               --theEnemy.strongWeakTimer;
            }
            strongWeakAddSize = 0;
            if(theEnemy.enemyLevel == "B")
            {
               strongWeakAddSize = 0.3;
            }
            if(!theEnemy.frozen && (theEnemy.teleporting == null || !theEnemy.teleporting) && ScreenLevelSelect.levelMode != "Defense")
            {
               angleTankToEnemy = this.angleBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
               angleForwardToTank = this.differenceBetweenAngles(angleTankToEnemy * (180 / Math.PI),theEnemy.rotation);
               if(ScreenLevelSelect.levelDifficulty != "Easy" && angleForwardToTank > -90 && angleForwardToTank < 90)
               {
                  if(ScreenLevelSelect.levelDifficulty == "Medium")
                  {
                     dist = 18;
                  }
                  else
                  {
                     dist = 50;
                  }
                  goalX = this.tank.x + this.tank.xVel * dist;
                  goalY = this.tank.y + this.tank.yVel * dist;
                  velAngle = this.angleBetween(0,0,this.tank.xVel,this.tank.yVel);
                  distTankToGoal = this.distanceBetween(this.tank.x,this.tank.y,goalX,goalY);
                  distTankToEnemy = this.distanceBetween(this.tank.x,this.tank.y,theEnemy.x,theEnemy.y);
                  radiusLength = this.tank.radius;
                  if(distTankToGoal > distTankToEnemy - radiusLength)
                  {
                     if(distTankToEnemy - radiusLength > 0)
                     {
                        goalX = this.tank.x + Math.cos(velAngle) * (distTankToEnemy - radiusLength);
                        goalY = this.tank.y + Math.sin(velAngle) * (distTankToEnemy - radiusLength);
                     }
                     else
                     {
                        goalX = this.tank.x;
                        goalY = this.tank.y;
                     }
                  }
               }
               else
               {
                  goalX = this.tank.x;
                  goalY = this.tank.y;
               }
               borderDistance = theEnemy.radius;
               if(goalX < 0 + borderDistance)
               {
                  goalX = borderDistance;
               }
               else if(goalX > roomWidth - borderDistance)
               {
                  goalX = roomWidth - borderDistance;
               }
               if(goalY < 0 + borderDistance)
               {
                  goalY = borderDistance;
               }
               else if(goalY > roomHeight - borderDistance)
               {
                  goalY = roomHeight - borderDistance;
               }
               if(ScreenLevelSelect.levelMode != "Tower")
               {
                  rotationGoal = 90 - Math.atan2(goalX - theEnemy.x,goalY - theEnemy.y) * 180 / Math.PI;
               }
               else
               {
                  rotationGoal = 180 - Math.atan2(goalX - theEnemy.x,goalY - theEnemy.y) * 180 / Math.PI - (35 + theEnemy.moveSpeedMax * 4) * (1 - Math.sqrt(Math.sqrt(Math.sqrt(tankEnemyDistance / (roomWidth + 100))))) - theEnemy.moveSpeedMax * 1 - 5;
               }
               if(rotationGoal >= 180)
               {
                  rotationGoal -= 360;
               }
               if(ScreenLevelSelect.levelMode != "Tower")
               {
                  rotationGoal += theEnemy.angleOffsetCurrent;
               }
               rotDifference = this.differenceBetweenAngles(theEnemy.rotation,rotationGoal);
               rotDifferenceNoOffset = this.differenceBetweenAngles(theEnemy.rotation,rotationGoal - theEnemy.angleOffsetCurrent);
               speed = Math.sqrt(theEnemy.xVel * theEnemy.xVel + theEnemy.yVel * theEnemy.yVel);
               if(ScreenLevelSelect.levelMode == "Tower")
               {
                  theEnemy.rotSpeedMax = theEnemy.accSpeed * 6 + 1;
               }
               if(ScreenLevelSelect.levelMode != "Tower")
               {
                  angleDifference = 5;
                  if(theEnemy.enemyType == "Temperamental" && Boolean(theEnemy.angry))
                  {
                     angleDifference = 2;
                  }
                  if(Math.abs(rotDifferenceNoOffset) < angleDifference && theEnemy.enemyLevel != "B")
                  {
                     theEnemy.timeSinceGoalSlow = 0;
                     if(theEnemy.slowDown)
                     {
                        theEnemy.slowDown = false;
                        theEnemy.slowDownTriggerTime = Math.round(120 * (0.5 + Math.random() * 1));
                        theEnemy.rotSpeedMax /= 2;
                     }
                  }
                  else
                  {
                     if(theEnemy.enemyLevel != "B" && theEnemy.timeSinceGoalSlow > theEnemy.slowDownTriggerTime)
                     {
                        theEnemy.timeSinceGoalSlow = 0;
                        if(!theEnemy.slowDown)
                        {
                           theEnemy.slowDown = true;
                           theEnemy.slowDownTriggerTime = Math.round(120 * (1 + Math.random() * 0.5));
                           theEnemy.rotSpeedMax *= 2;
                        }
                        else
                        {
                           theEnemy.slowDown = false;
                           theEnemy.slowDownTriggerTime = Math.round(120 * (0.5 + Math.random() * 1));
                           theEnemy.rotSpeedMax /= 2;
                        }
                     }
                     if(theEnemy.enemyLevel == "B" && theEnemy.timeSinceGoalLockDirection > theEnemy.lockDirectionTriggerTime)
                     {
                        theEnemy.timeSinceGoalLockDirection = 0;
                        enemyIsAtMapBorder = false;
                        borderSize = 200;
                        if(theEnemy.x < 0 + borderSize || theEnemy.x > roomWidth - borderSize || theEnemy.y < 0 + borderSize || theEnemy.y > roomHeight - borderSize)
                        {
                           enemyIsAtMapBorder = true;
                        }
                        if(enemyIsAtMapBorder)
                        {
                           theEnemy.lockDirType = "BorderMap";
                           theEnemy.lockDirectionTriggerTime = Math.round(120 * (0.5 + Math.random() * 0.5));
                           theEnemy.lockTurnSpeed = 0.5 + Math.random() * (theEnemy.rotSpeedMax - 0.5) / 2;
                           angleToCenterOfMap = this.angleBetween(theEnemy.x,theEnemy.y,roomWidth / 2,roomHeight / 2) * 180 / Math.PI;
                           angleDifferenceToCenter = this.differenceBetweenAngles(theEnemy.rotation,angleToCenterOfMap);
                           if(angleDifferenceToCenter > 0)
                           {
                              theEnemy.lockDirection = "Clockwise";
                           }
                           else
                           {
                              theEnemy.lockDirection = "CounterClockwise";
                           }
                        }
                        else
                        {
                           theEnemy.lockDirType = "CenterMap";
                           theEnemy.lockDirectionTriggerTime = Math.round(120 * (1 + Math.random() * 1));
                           theEnemy.lockTurnSpeed = 0.5 + Math.random() * (theEnemy.rotSpeedMax - 0.5);
                           if(rotDifference > 0)
                           {
                              theEnemy.lockDirection = "CounterClockwise";
                           }
                           else
                           {
                              theEnemy.lockDirection = "Clockwise";
                           }
                        }
                     }
                  }
               }
               if(theEnemy.enemyLevel == "B")
               {
                  ++theEnemy.timeSinceGoalLockDirection;
               }
               if(!(rotDifference < theEnemy.rotSpeedMax && rotDifference > -theEnemy.rotSpeedMax))
               {
                  if(theEnemy.enemyLevel != "B")
                  {
                     ++theEnemy.timeSinceGoalSlow;
                  }
               }
               if(theEnemy.enemyLevel != "B" || theEnemy.lockDirection == "None")
               {
                  if(rotDifference > 0)
                  {
                     if(theEnemy.rotSpeedMax < rotDifference)
                     {
                        theEnemy.rotation += theEnemy.rotSpeedMax;
                     }
                     else
                     {
                        theEnemy.rotation += rotDifference;
                     }
                  }
                  else if(theEnemy.rotSpeedMax < -rotDifference)
                  {
                     theEnemy.rotation -= theEnemy.rotSpeedMax;
                  }
                  else
                  {
                     theEnemy.rotation += rotDifference;
                  }
               }
               else if(theEnemy.enemyLevel == "B")
               {
                  if(theEnemy.lockDirection == "None")
                  {
                     incValue = 0.02;
                     if(theEnemy.lockTurnSpeed + incValue < theEnemy.rotSpeedMax)
                     {
                        theEnemy.lockTurnSpeed += incValue;
                     }
                     else
                     {
                        theEnemy.lockTurnSpeed = theEnemy.rotSpeedMax;
                     }
                  }
                  if(theEnemy.lockDirection == "Clockwise")
                  {
                     if(theEnemy.lockDirType == "CenterMap" && rotDifference > 0 && rotDifference < 90 || theEnemy.lockDirType == "BorderMap" && rotDifference > -180 && rotDifference < -135)
                     {
                        theEnemy.lockDirection = "None";
                        theEnemy.timeSinceGoalLockDirection = 0;
                        theEnemy.lockDirectionTriggerTime = Math.round(120 * (2 + Math.random() * 2));
                     }
                     else
                     {
                        theEnemy.rotation += theEnemy.lockTurnSpeed;
                     }
                  }
                  else if(theEnemy.lockDirection == "CounterClockwise")
                  {
                     if(theEnemy.lockDirType == "CenterMap" && rotDifference < 0 && rotDifference > -90 || theEnemy.lockDirType == "BorderMap" && rotDifference < 180 && rotDifference > 135)
                     {
                        theEnemy.lockDirection = "None";
                        theEnemy.timeSinceGoalLockDirection = 0;
                        theEnemy.lockDirectionTriggerTime = Math.round(120 * (2 + Math.random() * 2));
                     }
                     else
                     {
                        theEnemy.rotation -= theEnemy.lockTurnSpeed;
                     }
                  }
               }
            }
            if(theEnemy.teleporting == null || !theEnemy.teleporting)
            {
               if(theEnemy.x < 0 - theEnemy.width / 2 - cameraPosX || theEnemy.x > roomWidth + theEnemy.width / 2 - cameraPosX - (roomWidth - cameraWidth) || theEnemy.y < 0 - theEnemy.height / 2 - cameraPosY || theEnemy.y > roomHeight + theEnemy.height / 2 - cameraPosY - (roomHeight - cameraHeight))
               {
                  theEnemy.outsideWindow = true;
                  if(theEnemy.x < 0 - theEnemy.width / 2 - cameraPosX)
                  {
                     theEnemy.outsideWindowLeft = true;
                  }
                  else
                  {
                     theEnemy.outsideWindowLeft = false;
                  }
                  if(theEnemy.x > roomWidth + theEnemy.width / 2 - cameraPosX - (roomWidth - cameraWidth))
                  {
                     theEnemy.outsideWindowRight = true;
                  }
                  else
                  {
                     theEnemy.outsideWindowRight = false;
                  }
                  if(theEnemy.y < 0 - theEnemy.height / 2 - cameraPosY)
                  {
                     theEnemy.outsideWindowTop = true;
                  }
                  else
                  {
                     theEnemy.outsideWindowTop = false;
                  }
                  if(theEnemy.y > roomHeight + theEnemy.height / 2 - cameraPosY - (roomHeight - cameraHeight))
                  {
                     theEnemy.outsideWindowBottom = true;
                  }
                  else
                  {
                     theEnemy.outsideWindowBottom = false;
                  }
               }
               else
               {
                  theEnemy.outsideWindow = false;
                  theEnemy.outsideWindowLeft = false;
                  theEnemy.outsideWindowRight = false;
                  theEnemy.outsideWindowTop = false;
                  theEnemy.outsideWindowBottom = false;
               }
            }
            if(ScreenLevelSelect.levelMode == "Boss" && ScreenGame.hp > 0 && ScreenGame.bossAmount - ScreenGame.bossAmountKilled == 0)
            {
               dead = true;
            }
            if(!dead)
            {
               if((theEnemy == "[object EnemyGhost]" || theEnemy == "[object EnemyGhostBoss]") && !theEnemy.frozen)
               {
                  if(theEnemy.ghostTimer > 0)
                  {
                     --theEnemy.ghostTimer;
                  }
                  else
                  {
                     theEnemy.ghostTimer = theEnemy.ghostTimerMax;
                     theEnemy.invisible = !theEnemy.invisible;
                     if(theEnemy.invisible)
                     {
                        theEnemy.gotoAndStop(2);
                     }
                     else
                     {
                        theEnemy.gotoAndStop(1);
                     }
                  }
               }
               else if((theEnemy == "[object EnemyScaredGhost]" || theEnemy == "[object EnemyScaredGhostBoss]") && !theEnemy.frozen)
               {
                  if(theEnemy.damageIndicator >= 19)
                  {
                     theEnemy.ghostTimer = 0;
                  }
                  if(theEnemy.ghostTimer < theEnemy.ghostTimerMax)
                  {
                     ++theEnemy.ghostTimer;
                     if(!theEnemy.invisible)
                     {
                        theEnemy.invisible = true;
                        theEnemy.gotoAndStop(2);
                     }
                  }
                  else
                  {
                     theEnemy.ghostTimer = theEnemy.ghostTimerMax;
                     theEnemy.invisible = false;
                     theEnemy.gotoAndStop(1);
                  }
               }
               if(theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB")
               {
                  hpDifficultyMultiplier = 1;
                  hpLevelMultiplier = 1;
                  if(ScreenLevelSelect.levelDifficulty == "Medium")
                  {
                     hpDifficultyMultiplier = (DifficultyMultipliers.multiplierHealthMedium - 1) * 0.9 + 1;
                  }
                  else if(ScreenLevelSelect.levelDifficulty == "Hard")
                  {
                     hpDifficultyMultiplier = (DifficultyMultipliers.multiplierHealthHard - 1) * 0.9 + 1;
                  }
                  if(theEnemy.enemyLevel == "2")
                  {
                     hpLevelMultiplier = (DifficultyMultipliers.multiplierLevel2 - 1) * 0.5 + 1;
                  }
                  else if(theEnemy.enemyLevel == "3")
                  {
                     hpLevelMultiplier = (DifficultyMultipliers.multiplierLevel3 - 1) * 0.5 + 1;
                  }
                  hpAmount = 0.045 * hpDifficultyMultiplier * hpLevelMultiplier;
                  if(theEnemy.enemyLevel == "B")
                  {
                     hpAmount = 0.1;
                  }
                  if(theEnemy.hp > hpAmount)
                  {
                     theEnemy.hp -= hpAmount;
                  }
                  else
                  {
                     theEnemy.hp = 0;
                     dead = true;
                  }
                  if(theEnemy.enemyLevel != "B")
                  {
                     if(theEnemy.hp < 3)
                     {
                        hpPercentage = theEnemy.hp / 3;
                        theEnemy.moveSpeedMax = (ScreenGame.enemyDamageAddictStats[3] - 0.2) * hpPercentage + 0.2;
                        if(ScreenLevelSelect.levelMode != "Tower")
                        {
                           theEnemy.accSpeed = (ScreenGame.enemyDamageAddictStats[4] - 0.2) * hpPercentage + 0.2;
                        }
                     }
                     else
                     {
                        theEnemy.moveSpeedMax = ScreenGame.enemyDamageAddictStats[3];
                        if(ScreenLevelSelect.levelMode != "Tower")
                        {
                           theEnemy.accSpeed = ScreenGame.enemyDamageAddictStats[4];
                        }
                     }
                  }
                  else if(theEnemy.hp < 30)
                  {
                     hpPercentage = theEnemy.hp / 30;
                     theEnemy.moveSpeedMax = (ScreenGame.enemyDamageAddictBStats[3] - 0.2) * hpPercentage + 0.2;
                     theEnemy.accSpeed = (ScreenGame.enemyDamageAddictBStats[4] - 0.2) * hpPercentage + 0.2;
                  }
                  else
                  {
                     theEnemy.moveSpeedMax = ScreenGame.enemyDamageAddictBStats[3];
                     theEnemy.accSpeed = ScreenGame.enemyDamageAddictBStats[4];
                  }
               }
               if((theEnemy.enemyType == "Teleporting" || theEnemy.enemyType == "TeleportingB") && !theEnemy.frozen)
               {
                  if(!theEnemy.teleporting)
                  {
                     if(theEnemy.teleStartTimer > 0)
                     {
                        --theEnemy.teleStartTimer;
                     }
                     else
                     {
                        if(ScreenLevelSelect.levelMode == "Tower")
                        {
                           distEnemyTank = this.distanceBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                        }
                        if(ScreenLevelSelect.levelMode == "Defense")
                        {
                           distEnemyBottom = roomHeight - theEnemy.y;
                        }
                        if((ScreenLevelSelect.levelMode != "Tower" || distEnemyTank > 65) && (ScreenLevelSelect.levelMode != "Defense" || theEnemy.y > 160 && distEnemyBottom > 160))
                        {
                           theEnemy.teleporting = true;
                           theEnemy.teleportingAway = true;
                           theEnemy.gotoAndStop(2);
                           theEnemy.parent.removeChild(theEnemy);
                           this.particleLayer.addChild(theEnemy);
                           theEnemy.teleTimer = theEnemy.teleTimerMax;
                           if(this.checkWithinScreen(theEnemy.x,theEnemy.y,theEnemy.width,theEnemy.height,100))
                           {
                              SoundManager.sfxArray.push("TeleportOut");
                           }
                           if(ScreenLevelSelect.levelMode != "Defense")
                           {
                              theEnemy.distEnemyTank = this.distanceBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                              theEnemy.angleToTank = this.angleBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                              theEnemy.newDistance = theEnemy.distEnemyTank * 0.9;
                              theEnemy.randomAngle = Math.random() * 2 * Math.PI;
                              theEnemy.velocityAngle = this.angleBetween(0,0,theEnemy.xVel,theEnemy.yVel);
                              theEnemy.velocitySpeed = this.distanceBetween(0,0,theEnemy.xVel,theEnemy.yVel);
                           }
                        }
                     }
                  }
                  else if(theEnemy.teleportingAway)
                  {
                     theEnemy.alpha = theEnemy.teleTimer / theEnemy.teleTimerMax;
                     if(theEnemy.teleTimer > 0)
                     {
                        --theEnemy.teleTimer;
                     }
                     else
                     {
                        theEnemy.teleportingAway = false;
                        theEnemy.teleTimer = theEnemy.teleTimerMax;
                        if(this.checkWithinScreen(theEnemy.x,theEnemy.y,theEnemy.width,theEnemy.height,100))
                        {
                           SoundManager.sfxArray.push("TeleportIn");
                        }
                        teleX = theEnemy.x;
                        teleY = theEnemy.y;
                        if(ScreenLevelSelect.levelMode != "Defense")
                        {
                           teleX = this.tank.x + Math.cos(theEnemy.randomAngle) * theEnemy.newDistance;
                           teleY = this.tank.y + Math.sin(theEnemy.randomAngle) * theEnemy.newDistance;
                           while(teleX < 0 + theEnemy.radius || teleX > roomWidth - theEnemy.radius || teleY < 0 + theEnemy.radius || teleY > roomHeight - theEnemy.radius)
                           {
                              theEnemy.randomAngle = Math.random() * 2 * Math.PI;
                              teleX = this.tank.x + Math.cos(theEnemy.randomAngle) * theEnemy.newDistance;
                              teleY = this.tank.y + Math.sin(theEnemy.randomAngle) * theEnemy.newDistance;
                           }
                           angleDifference = this.differenceBetweenAngles(theEnemy.angleToTank * 180 / Math.PI,(theEnemy.randomAngle - Math.PI) * 180 / Math.PI);
                           theEnemy.rotation += angleDifference;
                           theEnemy.xVel = Math.cos(theEnemy.velocityAngle + angleDifference / 180 * Math.PI) * theEnemy.velocitySpeed;
                           theEnemy.yVel = Math.sin(theEnemy.velocityAngle + angleDifference / 180 * Math.PI) * theEnemy.velocitySpeed;
                        }
                        else
                        {
                           while(Math.abs(teleX - theEnemy.x) < 100)
                           {
                              teleX = theEnemy.radius + Math.random() * (roomWidth - theEnemy.radius * 2);
                           }
                           teleY = theEnemy.y + (-100 + Math.random() * 200);
                        }
                        theEnemy.x = teleX;
                        theEnemy.y = teleY;
                     }
                  }
                  else
                  {
                     theEnemy.alpha = 1 - theEnemy.teleTimer / theEnemy.teleTimerMax;
                     if(theEnemy.teleTimer > 0)
                     {
                        --theEnemy.teleTimer;
                     }
                     else
                     {
                        theEnemy.teleporting = false;
                        theEnemy.gotoAndStop(1);
                        theEnemy.parent.removeChild(theEnemy);
                        this.enemyLayer.addChild(theEnemy);
                        theEnemy.alpha = 1;
                        theEnemy.teleStartTimer = theEnemy.teleStartTimerMin + Math.random() * (theEnemy.teleStartTimerMax - theEnemy.teleStartTimerMin);
                     }
                  }
               }
            }
            if(theEnemy.teleporting == null || !theEnemy.teleporting)
            {
               if(!theEnemy.frozen)
               {
                  speed = Math.sqrt(theEnemy.xVel * theEnemy.xVel + theEnemy.yVel * theEnemy.yVel);
                  if(ScreenLevelSelect.levelMode == "Tower")
                  {
                     if(theEnemy.accSpeed + theEnemy.moveSpeedMax / 400 < 10)
                     {
                        theEnemy.accSpeed += theEnemy.moveSpeedMax / 400;
                     }
                     else
                     {
                        theEnemy.accSpeed = 10;
                     }
                  }
                  if(Boolean(theEnemy.enemyType == "GrapplingHook") && Boolean(theEnemy.isGrapping) && stage.contains(this.tank))
                  {
                     angleToTank = this.angleBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                     theEnemy.xVel = Math.cos(angleToTank) * (speed + 0.5);
                     theEnemy.yVel = Math.sin(angleToTank) * (speed + 0.5);
                     theEnemy.rotation = angleToTank * 180 / Math.PI;
                     theEnemy.moveSpeedMax = 5;
                     if(theEnemy.slowDown)
                     {
                        theEnemy.slowDown = false;
                        theEnemy.rotSpeedMax /= 2;
                     }
                     theEnemy.speedSubtracting = 0;
                  }
                  else
                  {
                     theEnemy.xVel += Math.cos(theEnemy.rotation / 180 * Math.PI) * theEnemy.accSpeed;
                     theEnemy.yVel += Math.sin(theEnemy.rotation / 180 * Math.PI) * theEnemy.accSpeed;
                     if(ScreenLevelSelect.levelMode != "Tower" && theEnemy.enemyLevel != "B")
                     {
                        if(theEnemy.slowDown)
                        {
                           if(theEnemy.speedSubtracting < theEnemy.speedSubtractingMax)
                           {
                              if(theEnemy.speedSubtracting + 0.02 < theEnemy.speedSubtractingMax)
                              {
                                 theEnemy.speedSubtracting += 0.02;
                              }
                              else
                              {
                                 theEnemy.speedSubtracting = theEnemy.speedSubtractingMax;
                              }
                           }
                        }
                        else if(theEnemy.speedSubtracting > 0)
                        {
                           if(theEnemy.speedSubtracting - 0.02 > 0)
                           {
                              theEnemy.speedSubtracting -= 0.02;
                           }
                           else
                           {
                              theEnemy.speedSubtracting = 0;
                           }
                        }
                     }
                  }
                  speed = Math.sqrt(theEnemy.xVel * theEnemy.xVel + theEnemy.yVel * theEnemy.yVel);
                  subtractMultiplier = 1;
                  if(theEnemy.enemyType == "Accelerating")
                  {
                     subtractMultiplier = (1 - theEnemy.speedTimer / theEnemy.speedTimerMax) * 3;
                  }
                  else if(theEnemy.enemyType == "Temperamental" && Boolean(theEnemy.angry))
                  {
                     subtractMultiplier = 4;
                  }
                  if(speed > theEnemy.moveSpeedMax - theEnemy.speedSubtracting * subtractMultiplier)
                  {
                     theEnemy.xVel *= (theEnemy.moveSpeedMax - theEnemy.speedSubtracting * subtractMultiplier) / speed;
                     theEnemy.yVel *= (theEnemy.moveSpeedMax - theEnemy.speedSubtracting * subtractMultiplier) / speed;
                  }
               }
               else
               {
                  speed = Math.sqrt(theEnemy.xVel * theEnemy.xVel + theEnemy.yVel * theEnemy.yVel);
                  speedDirection = this.angleBetween(0,0,theEnemy.xVel,theEnemy.yVel);
                  if(speed > 0.2)
                  {
                     theEnemy.xVel -= Math.cos(speedDirection) * 0.1;
                     theEnemy.yVel -= Math.sin(speedDirection) * 0.1;
                  }
                  else
                  {
                     theEnemy.xVel = 0;
                     theEnemy.yVel = 0;
                  }
               }
            }
            if(ScreenLevelSelect.levelMode != "Tower" && ScreenLevelSelect.levelMode != "Defense" && (theEnemy.teleporting == null || !theEnemy.teleporting))
            {
               changeCurrentOffsetVal = 0.5;
               changeGoalOffsetVal = 0.1;
               if(tankEnemyDistance < tankNoOffSetDistance)
               {
                  changeCurrentOffsetVal *= 3;
                  changeGoalOffsetVal *= 3;
               }
               if(theEnemy.angleOffsetGoal > 0)
               {
                  if(theEnemy.angleOffsetGoal - changeGoalOffsetVal > 0)
                  {
                     theEnemy.angleOffsetGoal -= changeGoalOffsetVal;
                  }
                  else
                  {
                     theEnemy.angleOffsetGoal = 0;
                  }
                  if(theEnemy.angleOffsetCurrent + changeCurrentOffsetVal < theEnemy.angleOffsetGoal)
                  {
                     theEnemy.angleOffsetCurrent += changeCurrentOffsetVal;
                  }
                  else
                  {
                     theEnemy.angleOffsetCurrent = theEnemy.angleOffsetGoal;
                  }
               }
               else if(theEnemy.angleOffsetGoal < 0)
               {
                  if(theEnemy.angleOffsetGoal + changeGoalOffsetVal < 0)
                  {
                     theEnemy.angleOffsetGoal += changeGoalOffsetVal;
                  }
                  else
                  {
                     theEnemy.angleOffsetGoal = 0;
                  }
                  if(theEnemy.angleOffsetCurrent - changeCurrentOffsetVal > theEnemy.angleOffsetGoal)
                  {
                     theEnemy.angleOffsetCurrent -= changeCurrentOffsetVal;
                  }
                  else
                  {
                     theEnemy.angleOffsetCurrent = theEnemy.angleOffsetGoal;
                  }
               }
               else
               {
                  theEnemy.angleOffsetCurrent = 0;
               }
            }
            if(theEnemy.teleporting == null || !theEnemy.teleporting)
            {
               for(iii = 0; iii < this.enemyArray.length; iii++)
               {
                  theEnemy2 = this.enemyArray[iii];
                  if(i != iii)
                  {
                     if(this.checkRectanglesOverlap(theEnemy.x,theEnemy.y,theEnemy.width + theEnemy.safetyDistance,theEnemy.height + theEnemy.safetyDistance,theEnemy2.x,theEnemy2.y,theEnemy2.width,theEnemy2.height) && (theEnemy2.teleporting == null || !theEnemy2.teleporting))
                     {
                        enemyEnemyDistance = this.distanceBetween(theEnemy.x,theEnemy.y,theEnemy2.x,theEnemy2.y);
                        if((theEnemy.enemyLevel != "B" || theEnemy2.enemyLevel == "B") && enemyEnemyDistance < theEnemy.radius + theEnemy2.radius)
                        {
                           angleTowards = this.angleBetween(theEnemy2.x,theEnemy2.y,theEnemy.x,theEnemy.y);
                           if(theEnemy2.enemyLevel != "B")
                           {
                              theEnemy.x += Math.cos(angleTowards) * 0.5;
                              theEnemy.y += Math.sin(angleTowards) * 0.5;
                           }
                           else if(theEnemy.enemyLevel == "B" && theEnemy2.enemyLevel == "B")
                           {
                              collisionX = theEnemy2.x + Math.cos(angleTowards) * theEnemy2.radius;
                              collisionY = theEnemy2.y + Math.sin(angleTowards) * theEnemy2.radius;
                              distanceAdd = 200;
                              if(!(collisionX < 0 - cameraPosX - distanceAdd || collisionX > roomWidth - cameraPosX - (roomWidth - cameraWidth) + distanceAdd || collisionY < 0 - cameraPosY - distanceAdd || collisionY > roomHeight - cameraPosY - (roomHeight - cameraHeight) + distanceAdd))
                              {
                                 SoundManager.sfxArray.push("BossCollision");
                              }
                              enemy1Mass = theEnemy.radius * theEnemy.radius * Math.PI;
                              enemy2Mass = theEnemy2.radius * theEnemy2.radius * Math.PI;
                              totalPushForce = 18;
                              pushSpeed = (1 - enemy1Mass / (enemy1Mass + enemy2Mass)) * totalPushForce;
                              theEnemy.pushVelX = Math.cos(angleTowards) * pushSpeed;
                              theEnemy.pushVelY = Math.sin(angleTowards) * pushSpeed;
                              pushSpeed = (1 - enemy2Mass / (enemy1Mass + enemy2Mass)) * totalPushForce;
                              theEnemy2.pushVelX = Math.cos(angleTowards + Math.PI) * pushSpeed;
                              theEnemy2.pushVelY = Math.sin(angleTowards + Math.PI) * pushSpeed;
                           }
                           else
                           {
                              pushSpeed = theEnemy.radius + theEnemy2.radius - enemyEnemyDistance;
                              if(pushSpeed < 0)
                              {
                                 pushSpeed = 0;
                              }
                              else
                              {
                                 theEnemy.xVel += Math.cos(angleTowards) * pushSpeed;
                                 theEnemy.yVel += Math.sin(angleTowards) * pushSpeed;
                              }
                           }
                        }
                        if(tankEnemyDistance > tankNoOffSetDistance && enemyEnemyDistance < theEnemy.radius + theEnemy2.radius + theEnemy.safetyDistance && ScreenLevelSelect.levelMode != "Tower" && ScreenLevelSelect.levelMode != "Defense" && (theEnemy.enemyLevel != "B" || theEnemy.enemyLevel == "B" && theEnemy2.enemyLevel == "B"))
                        {
                           safetyFactor = (enemyEnemyDistance - theEnemy.width - theEnemy2.width) / theEnemy.safetyDistance;
                           if(safetyFactor < 0)
                           {
                              safetyFactor = 0;
                           }
                           maxAngle = 75 - safetyFactor * 35;
                           rotSpeed = 7 - safetyFactor * 6;
                           if(Math.abs(theEnemy.angleOffsetGoal) < maxAngle)
                           {
                              useAngle = this.angleBetween(theEnemy.x,theEnemy.y,theEnemy2.x,theEnemy2.y) * 180 / Math.PI;
                              useRot = theEnemy.rotation;
                              angleTowardsDegree = this.differenceBetweenAngles(theEnemy.rotation,useAngle);
                              if(angleTowardsDegree < 0)
                              {
                                 if(theEnemy.angleOffsetGoal < maxAngle)
                                 {
                                    if(theEnemy.angleOffsetGoal + rotSpeed < maxAngle)
                                    {
                                       theEnemy.angleOffsetGoal += rotSpeed;
                                    }
                                    else
                                    {
                                       theEnemy.angleOffsetGoal = maxAngle;
                                    }
                                 }
                              }
                              else if(angleTowardsDegree > 0)
                              {
                                 if(theEnemy.angleOffsetGoal > -maxAngle)
                                 {
                                    if(theEnemy.angleOffsetGoal - rotSpeed > -maxAngle)
                                    {
                                       theEnemy.angleOffsetGoal -= rotSpeed;
                                    }
                                    else
                                    {
                                       theEnemy.angleOffsetGoal = -maxAngle;
                                    }
                                 }
                              }
                           }
                        }
                     }
                  }
               }
            }
            if(theEnemy.teleporting == null || !theEnemy.teleporting)
            {
               if(!this.shieldOn || theEnemy.enemyLevel == "B")
               {
                  if(tankEnemyDistance < theEnemy.radius + this.tank.radius || this.shieldOn && theEnemy.enemyLevel == "B" && tankEnemyDistance < theEnemy.radius + this.tank.radius * 2)
                  {
                     if(!this.shieldOn)
                     {
                        SoundManager.sfxArray.push("TankEnemyCollision");
                        damageMultiplier = 1;
                        if(this.tank.pushed)
                        {
                           damageMultiplier /= 4;
                        }
                        if(ScreenUpgrades.levelsArrayMisc[2] != 0)
                        {
                           damageMultiplier *= 1 - ScreenUpgrades.upgradeArrayEnemyAbsorb[1][ScreenUpgrades.levelsArrayMisc[2] - 1];
                        }
                        damage = Math.round(theEnemy.damage * damageMultiplier);
                        if(ScreenGame.hp - damage > 0)
                        {
                           ScreenGame.hp -= damage;
                           this.colorClip(this.tank,16711680,0.6);
                           this.tank.damageIndicator = 20;
                        }
                        else
                        {
                           ScreenGame.hp = 0;
                        }
                     }
                     if(theEnemy.enemyLevel != "B")
                     {
                        dead = true;
                        noMoney = true;
                     }
                     else
                     {
                        if(this.shieldOn)
                        {
                           SoundManager.sfxArray.push("TankShieldCollision");
                        }
                        tankEnemyAngle = this.angleBetween(this.tank.x,this.tank.y,theEnemy.x,theEnemy.y) - 180 / 180 * Math.PI;
                        this.tank.xVel = Math.cos(tankEnemyAngle) * 8;
                        this.tank.yVel = Math.sin(tankEnemyAngle) * 8;
                        this.tank.pushed = true;
                        this.tank.pushedTimer = this.tank.pushedTimerMax;
                        if(tankEnemyDistance < this.tank.radius + theEnemy.radius - 5)
                        {
                           this.tank.x = theEnemy.x + Math.cos(tankEnemyAngle) * (this.tank.radius + theEnemy.radius);
                           this.tank.y = theEnemy.y + Math.sin(tankEnemyAngle) * (this.tank.radius + theEnemy.radius);
                        }
                     }
                     if(theEnemy.enemyType == "GrapplingHookB" && Boolean(theEnemy.isGrapping))
                     {
                        theEnemy.isGrapping = false;
                        this.tank.grappingEnemy = null;
                        Tank.maxSpeed = ScreenUpgrades.upgradeArraySpeed[1][ScreenUpgrades.levelsArrayMisc[0]];
                        Tank.accSpeed = ScreenUpgrades.upgradeArraySpeed[2][ScreenUpgrades.levelsArrayMisc[0]];
                        Tank.friction = ScreenUpgrades.upgradeArraySpeed[3][ScreenUpgrades.levelsArrayMisc[0]];
                     }
                  }
               }
               else if(tankEnemyDistance < theEnemy.radius + this.tank.radius * 2)
               {
                  tankEnemyAngle = this.angleBetween(this.tank.x,this.tank.y,theEnemy.x,theEnemy.y);
                  pushSpeed = theEnemy.radius + this.tank.radius * 2 - tankEnemyDistance;
                  if(theEnemy.enemyLevel != "B")
                  {
                     theEnemy.xVel += Math.cos(tankEnemyAngle) * pushSpeed;
                     theEnemy.yVel += Math.sin(tankEnemyAngle) * pushSpeed;
                  }
                  if(theEnemy.enemyType == "GrapplingHook" && Boolean(theEnemy.isGrapping))
                  {
                     theEnemy.isGrapping = false;
                     theEnemy.moveSpeedMax = ScreenGame.enemyGrapplingHookStats[3];
                     if(theEnemy.rotation > 90 || theEnemy.rotation < -90)
                     {
                        theEnemy.rotation = 105 + Math.random() * 15 + theEnemy.moveSpeedMax * 17;
                        if(theEnemy.rotation > 165)
                        {
                           theEnemy.rotation = 165;
                        }
                     }
                     else
                     {
                        theEnemy.rotation = 75 - Math.random() * 15 - theEnemy.moveSpeedMax * 17;
                        if(theEnemy.rotation < 15)
                        {
                           theEnemy.rotation = 15;
                        }
                     }
                  }
               }
            }
            theEnemy.pushVelX = this.reduceValue(theEnemy.pushVelX,0.5);
            theEnemy.pushVelY = this.reduceValue(theEnemy.pushVelY,0.5);
            rotateTowardsTank = false;
            if(theEnemy.teleporting == null || !theEnemy.teleporting)
            {
               if(theEnemy.xVel + theEnemy.pushVelX > 0)
               {
                  if(theEnemy.x + theEnemy.xVel + theEnemy.pushVelX < PartGameArea.roomWidth - theEnemy.radius)
                  {
                     theEnemy.x += theEnemy.xVel;
                     theEnemy.x += theEnemy.pushVelX;
                  }
                  else
                  {
                     theEnemy.x = PartGameArea.roomWidth - theEnemy.radius;
                     theEnemy.pushVelX = 0;
                     theEnemy.angleOffsetGoal = 0;
                     if(theEnemy.enemyLevel != "B")
                     {
                        if(theEnemy.xVel > 0)
                        {
                           theEnemy.xVel = -theEnemy.xVel;
                        }
                        if(theEnemy.rotation < 90 && theEnemy.rotation > -90)
                        {
                           if(theEnemy.rotation < 0)
                           {
                              theEnemy.rotation = -180 - theEnemy.rotation;
                           }
                           else
                           {
                              theEnemy.rotation = 180 - theEnemy.rotation;
                           }
                        }
                     }
                     else
                     {
                        rotateTowardsTank = true;
                     }
                  }
               }
               else if(theEnemy.xVel + theEnemy.pushVelX < 0)
               {
                  if(theEnemy.x + theEnemy.xVel + theEnemy.pushVelX > 0 + theEnemy.radius)
                  {
                     theEnemy.x += theEnemy.xVel;
                     theEnemy.x += theEnemy.pushVelX;
                  }
                  else
                  {
                     theEnemy.x = theEnemy.radius;
                     theEnemy.pushVelX = 0;
                     theEnemy.angleOffsetGoal = 0;
                     if(theEnemy.enemyLevel != "B")
                     {
                        if(theEnemy.xVel < 0)
                        {
                           theEnemy.xVel = -theEnemy.xVel;
                        }
                        if(theEnemy.rotation > 90 || theEnemy.rotation < -90)
                        {
                           if(theEnemy.rotation < 0)
                           {
                              theEnemy.rotation = -180 - theEnemy.rotation;
                           }
                           else
                           {
                              theEnemy.rotation = 180 - theEnemy.rotation;
                           }
                        }
                     }
                     else
                     {
                        rotateTowardsTank = true;
                     }
                  }
               }
               if(theEnemy.yVel + theEnemy.pushVelY > 0)
               {
                  if(theEnemy.y + theEnemy.yVel + theEnemy.pushVelY < PartGameArea.roomHeight - theEnemy.radius)
                  {
                     theEnemy.y += theEnemy.yVel;
                     theEnemy.y += theEnemy.pushVelY;
                  }
                  else if(ScreenLevelSelect.levelMode != "Defense")
                  {
                     theEnemy.y = PartGameArea.roomHeight - theEnemy.radius;
                     theEnemy.pushVelY = 0;
                     theEnemy.angleOffsetGoal = 0;
                     if(theEnemy.enemyLevel != "B")
                     {
                        if(theEnemy.yVel > 0)
                        {
                           theEnemy.yVel = -theEnemy.yVel;
                        }
                        if(theEnemy.rotation > 0)
                        {
                           theEnemy.rotation = -theEnemy.rotation;
                        }
                     }
                     else
                     {
                        rotateTowardsTank = true;
                     }
                  }
                  else
                  {
                     MovieClip(parent).pInterface.defenseIndicatorTween.start();
                     bottomCollision = true;
                     if(ScreenGame.hp - theEnemy.damage > 0)
                     {
                        ScreenGame.hp -= theEnemy.damage;
                        this.colorClip(this.tank,16711680,0.6);
                        this.tank.damageIndicator = 20;
                     }
                     else
                     {
                        ScreenGame.hp = 0;
                     }
                     dead = true;
                     noMoney = true;
                  }
               }
               else if(theEnemy.yVel < 0)
               {
                  if(theEnemy.y + theEnemy.yVel > 0 + theEnemy.radius)
                  {
                     theEnemy.y += theEnemy.yVel;
                     theEnemy.y += theEnemy.pushVelY;
                  }
                  else
                  {
                     theEnemy.y = theEnemy.radius;
                     theEnemy.angleOffsetGoal = 0;
                     if(theEnemy.enemyLevel != "B")
                     {
                        if(theEnemy.yVel < 0)
                        {
                           theEnemy.yVel = -theEnemy.yVel;
                        }
                        if(theEnemy.rotation < 0)
                        {
                           theEnemy.rotation = -theEnemy.rotation;
                        }
                     }
                     else
                     {
                        rotateTowardsTank = true;
                     }
                  }
               }
               if(rotateTowardsTank)
               {
                  if(theEnemy.enemyLevel != "B" || theEnemy.lockDirection == "None")
                  {
                     if(rotDifference < 1 && rotDifference > -1)
                     {
                        theEnemy.rotation = rotationGoal;
                     }
                     else if(rotDifference > 0)
                     {
                        theEnemy.rotation += 1;
                     }
                     else
                     {
                        --theEnemy.rotation;
                     }
                  }
                  else if(theEnemy.enemyLevel == "B" && theEnemy.lockDirection != "None")
                  {
                     if(theEnemy.lockDirection == "Clockwise")
                     {
                        theEnemy.rotation += 1;
                     }
                     else if(theEnemy.lockDirection == "CounterClockwise")
                     {
                        --theEnemy.rotation;
                     }
                  }
                  if(theEnemy.enemyLevel == "B" && theEnemy.lockDirection != "None" && theEnemy.lockDirType != "BorderMap")
                  {
                     theEnemy.lockDirection = "None";
                     theEnemy.timeSinceGoalLockDirection = 0;
                     theEnemy.lockDirectionTriggerTime = Math.round(120 * (2 + Math.random() * 2));
                  }
               }
            }
            if(dead == false && (theEnemy.invisible == null || !theEnemy.invisible) && (theEnemy.teleporting == null || !theEnemy.teleporting))
            {
               theEnemy.onFire = false;
               theEnemy.onLava = false;
               theEnemy.hitByCake = false;
               for(ii = 0; ii < this.bulletArray.length; ii++)
               {
                  theBullet = this.bulletArray[ii];
                  if(Boolean(theBullet == "[object BulletLaser]") && Boolean(theBullet.canDamage) && theBullet.currentFrame == 1)
                  {
                     laserCollision = this.circleToLineCollision(new Point(theBullet.startX,theBullet.startY),new Point(theBullet.endX,theBullet.endY),new Point(theEnemy.x,theEnemy.y),theEnemy.radius + theBullet.radius);
                     if(laserCollision.collision)
                     {
                        if(!(theEnemy.x < 0 - theEnemy.width / 2 - cameraPosX || theEnemy.x > roomWidth + theEnemy.width / 2 - cameraPosX - (roomWidth - cameraWidth) || theEnemy.y < 0 - theEnemy.height / 2 - cameraPosY || theEnemy.y > roomHeight + theEnemy.height / 2 - cameraPosY - (roomHeight - cameraHeight)))
                        {
                           if(this.debugOn)
                           {
                              ++this.debugTotalBulletsHitting;
                           }
                           if(theEnemy.laserDamageMultiplier > 0)
                           {
                              SoundManager.sfxArray.push("ImpactLaser");
                              collidingWithLaser = true;
                              if(theEnemy.frozen)
                              {
                                 theEnemy.frozenTimer = 0;
                              }
                              if(theEnemy == "[object EnemyTemperamental]" || theEnemy == "[object EnemyTemperamentalBoss]")
                              {
                                 theEnemy.turnAngry = true;
                              }
                              if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                              {
                                 if(theEnemy.hp - theBullet.damage * theEnemy.laserDamageMultiplier > 0)
                                 {
                                    if(this.debugOn)
                                    {
                                       this.debugTotalDamage += theBullet.damage * theEnemy.laserDamageMultiplier;
                                    }
                                    theEnemy.hp -= theBullet.damage * theEnemy.laserDamageMultiplier;
                                    this.colorClip(theEnemy,16711680,0.8);
                                    theEnemy.damageIndicator = 20;
                                 }
                                 else
                                 {
                                    if(this.debugOn)
                                    {
                                       this.debugTotalDamage += theEnemy.hp;
                                    }
                                    dead = true;
                                 }
                              }
                              else
                              {
                                 this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.laserDamageMultiplier);
                              }
                           }
                           if(theEnemy.laserDamageMultiplier != 1)
                           {
                              directLaserCollision = this.circleToLineCollision(new Point(theBullet.startX,theBullet.startY),new Point(theBullet.endX,theBullet.endY),new Point(theEnemy.x,theEnemy.y),theEnemy.radius);
                              if(directLaserCollision.collision)
                              {
                                 laserCollision = directLaserCollision;
                                 if(laserCollision.enter == null)
                                 {
                                    laserCollision.enter = new Point(theBullet.startX,theBullet.startY);
                                 }
                                 angleToLaserCollision = this.angleBetween(theEnemy.x,theEnemy.y,laserCollision.enter.x,laserCollision.enter.y);
                              }
                              else
                              {
                                 if(laserCollision.enter == null)
                                 {
                                    laserCollision.enter = new Point(theBullet.startX,theBullet.startY);
                                 }
                                 angleToLaserCollision = this.angleBetween(theEnemy.x,theEnemy.y,(laserCollision.enter.x + laserCollision.exit.x) / 2,(laserCollision.enter.y + laserCollision.exit.y) / 2);
                              }
                              intersectionX = theEnemy.x + Math.cos(angleToLaserCollision) * theEnemy.radius;
                              intersectionY = theEnemy.y + Math.sin(angleToLaserCollision) * theEnemy.radius;
                              if(theEnemy.laserDamageMultiplier == 0)
                              {
                                 this.spawnParticle("Immune",1,intersectionX,intersectionY,0,0,0,0,2);
                              }
                              else if(theEnemy.laserDamageMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,intersectionX,intersectionY,8,0,360,0,strongWeakAddSize);
                              }
                              else if(theEnemy.laserDamageMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,intersectionX,intersectionY,8,0,360,0,strongWeakAddSize);
                              }
                           }
                        }
                     }
                  }
                  else if(!theBullet.dead && (theBullet != "[object BulletRocket]" || theBullet.targetEnemy == null || theEnemy == theBullet.targetEnemy) && Boolean(this.circleToLineCollision(new Point(theBullet.x,theBullet.y),new Point(theBullet.x + theBullet.xVel,theBullet.y + theBullet.yVel),new Point(theEnemy.x,theEnemy.y),theEnemy.radius + theBullet.radius).collision))
                  {
                     if(this.debugOn)
                     {
                        ++this.debugTotalBulletsHitting;
                     }
                     angleToBullet = this.angleBetween(theEnemy.x,theEnemy.y,theBullet.x,theBullet.y);
                     impactX = theEnemy.x + Math.cos(angleToBullet) * theEnemy.radius;
                     impactY = theEnemy.y + Math.sin(angleToBullet) * theEnemy.radius;
                     if(theBullet == "[object BulletSmall]" || theBullet == "[object BulletShotgun]")
                     {
                        if(theEnemy.bulletDamageMultiplier > 0)
                        {
                           SoundManager.sfxArray.push("ImpactBullet");
                        }
                     }
                     else if(theBullet == "[object BulletGummyBear]")
                     {
                        if(theEnemy.foodDamageMultiplier > 0)
                        {
                           SoundManager.sfxArray.push("ImpactGummyBear");
                        }
                     }
                     else if(theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]")
                     {
                        if(theEnemy.foodDamageMultiplier > 0)
                        {
                           SoundManager.sfxArray.push("ImpactCake");
                        }
                        if(theEnemy == "[object EnemyDamageAddict]" || theEnemy == "[object EnemyDamageAddictBoss]")
                        {
                           tempDamageAddictEnemyCake = true;
                        }
                     }
                     if(theEnemy == "[object EnemyTemperamental]" || theEnemy == "[object EnemyTemperamentalBoss]")
                     {
                        theEnemy.turnAngry = true;
                     }
                     if(theBullet == "[object BulletSmall]")
                     {
                        if(theEnemy.bulletDamageMultiplier > 0)
                        {
                           this.spawnParticle(theEnemy.particle,1,impactX,impactY,0,angleToBullet * 180 / Math.PI - 15,30,2,-0.75);
                           if(theEnemy.strongWeakTimer == 0)
                           {
                              if(theEnemy.bulletDamageMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize - 0.3);
                              }
                              else if(theEnemy.bulletDamageMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize - 0.3);
                              }
                              theEnemy.strongWeakTimer = theEnemy.strongWeakTimerMax;
                           }
                        }
                        else
                        {
                           this.spawnParticle("Immune",1,impactX,impactY,0,0,0,0,1);
                        }
                     }
                     else if(theBullet == "[object BulletShotgun]" || theBullet == "[object BulletGummyBear]" || theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]")
                     {
                        if(theBullet == "[object BulletShotgun]" && theEnemy.bulletDamageMultiplier > 0 || (theBullet == "[object BulletGummyBear]" || theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]") && theEnemy.foodDamageMultiplier > 0)
                        {
                           this.spawnParticle(theEnemy.particle,3,impactX,impactY,0,angleToBullet * 180 / Math.PI - 15,30,2,-0.25);
                           if(theBullet == "[object BulletShotgun]")
                           {
                              if(theEnemy.bulletDamageMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                              else if(theEnemy.bulletDamageMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                           }
                           else if(theBullet == "[object BulletGummyBear]" || theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]")
                           {
                              if(theEnemy.foodDamageMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                              else if(theEnemy.foodDamageMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                           }
                        }
                        else
                        {
                           this.spawnParticle("Immune",1,impactX,impactY,0,0,0,0,2);
                        }
                     }
                     else if(theBullet == "[object BulletIcicle]" || theBullet == "[object BulletPoisonSpike]")
                     {
                        if(theBullet == "[object BulletIcicle]" && theEnemy.iceMultiplier > 0 || theBullet == "[object BulletPoisonSpike]" && theEnemy.poisonMultiplier > 0)
                        {
                           this.spawnParticle(theEnemy.particle,1,impactX,impactY,0,angleToBullet * 180 / Math.PI - 15,30,2,-0.25);
                           if(theBullet == "[object BulletIcicle]")
                           {
                              if(theEnemy.iceMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                              else if(theEnemy.iceMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                           }
                           else if(theBullet == "[object BulletPoisonSpike]")
                           {
                              if(theEnemy.poisonMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                              else if(theEnemy.poisonMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                              }
                           }
                        }
                        else
                        {
                           this.spawnParticle("Immune",1,impactX,impactY,0,0,0,0,2);
                        }
                     }
                     else if(theBullet == "[object BulletPoison]")
                     {
                        if(theEnemy.poisonMultiplier > 0)
                        {
                           this.spawnParticle(theEnemy.particle,3,impactX,impactY,0,angleToBullet * 180 / Math.PI - 15,30,2,-0.25);
                           if(theEnemy.poisonMultiplier > 1)
                           {
                              this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                           }
                           else if(theEnemy.poisonMultiplier < 1)
                           {
                              this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                           }
                        }
                        else
                        {
                           this.spawnParticle("Immune",1,impactX,impactY,0,0,0,0,2);
                        }
                     }
                     if(theBullet != "[object ObjectGrenade]" && theBullet != "[object ObjectIceGrenade]" && theBullet != "[object ObjectPoisonGrenade]")
                     {
                        if(theBullet == "[object BulletPenetrate]" || theBullet == "[object BulletMagic]" || theBullet == "[object BulletCrazyCheese]" || theBullet == "[object BulletMagicBunny]")
                        {
                           enemyAlreadyHit = false;
                           for(u = 0; u < theBullet.enemiesArray.length; u++)
                           {
                              if(theEnemy == theBullet.enemiesArray[u])
                              {
                                 enemyAlreadyHit = true;
                                 break;
                              }
                           }
                        }
                        if((theBullet == "[object BulletMagic]" || theBullet == "[object BulletMagicBunny]") && enemyAlreadyHit == false)
                        {
                           if(theEnemy.magicDamageMultiplier <= 0)
                           {
                              this.spawnParticle("Immune",1,impactX,impactY,0,0,0,0,2);
                           }
                           else if(theEnemy.magicDamageMultiplier > 1)
                           {
                              this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                           }
                           else if(theEnemy.magicDamageMultiplier < 1)
                           {
                              this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                           }
                        }
                        if(theBullet != "[object BulletFire]" && theBullet != "[object BulletBomb]" && (theBullet != "[object BulletCakePiece]" || !theEnemy.hitByCake) && theBullet != "[object BulletPenetrate]" && theBullet != "[object BulletCrazyCheese]" && (theBullet != "[object BulletMagic]" && theBullet != "[object BulletMagicBunny]" || theBullet.targetsLeft == 1 && enemyAlreadyHit == false && (theBullet.targetEnemy == null || theEnemy == theBullet.targetEnemy)))
                        {
                           theBullet.dead = true;
                        }
                        if(theBullet == "[object BulletBomb]" && !theEnemy.gotBomb)
                        {
                           SoundManager.sfxArray.push("ImpactTimedBomb");
                           this.spawnParticle(theEnemy.particle,3,impactX,impactY,0,angleToBullet * 180 / Math.PI - 15,30,2,-0.25);
                           theEnemy.gotBomb = true;
                           theEnemy.bombTimerMax = theBullet.bombTimer;
                           theEnemy.bombTimer = theEnemy.bombTimerMax;
                           theEnemy.bombRadius = theBullet.explosionRadius;
                           theEnemy.bombDamage = theBullet.damage;
                           theBullet.dead = true;
                        }
                        if(theBullet == "[object BulletIcicle]")
                        {
                           if(theEnemy.iceMultiplier > 0)
                           {
                              SoundManager.sfxArray.push("ImpactBullet");
                              if(theEnemy.frozen)
                              {
                                 if(this.debugOn)
                                 {
                                    this.debugTotalFreezeTime -= theEnemy.frozenTimer;
                                 }
                              }
                              theEnemy.frozen = true;
                              if(theEnemy.enemyLevel != "B")
                              {
                                 theEnemy.frozenTimer = Math.round(theBullet.frozenTime * theEnemy.iceMultiplier);
                              }
                              else
                              {
                                 theEnemy.frozenTimer = Math.round(theBullet.frozenTime * theEnemy.iceMultiplier / 4);
                              }
                              if(this.debugOn)
                              {
                                 this.debugTotalFreezeTime += theEnemy.frozenTimer;
                              }
                              if(ScreenLevelSelect.levelMode == "Tower")
                              {
                                 theEnemy.accSpeed = 0;
                              }
                              if(!theEnemy.gotIceIndicator)
                              {
                                 SoundManager.sfxArray.push("Freeze");
                                 indicatorIce = new IndicatorIce();
                                 if(theEnemy.enemyLevel != "B")
                                 {
                                    indicatorIce.gotoAndStop(Math.round(Math.random() * 2 + 1));
                                 }
                                 else
                                 {
                                    indicatorIce.gotoAndStop(Math.round(Math.random() * 2 + 4));
                                 }
                                 indicatorIce.rotation = Math.random() * 360;
                                 indicatorIce.scaleX = theEnemy.radius / 50;
                                 indicatorIce.scaleY = theEnemy.radius / 50;
                                 indicatorIce.x = theEnemy.x;
                                 indicatorIce.y = theEnemy.y;
                                 this.iceIndicatorLayer.addChild(indicatorIce);
                                 theEnemy.gotIceIndicator = true;
                                 theEnemy.iceIndicatorObject = indicatorIce;
                              }
                              else
                              {
                                 theEnemy.iceIndicatorObject.alpha = 1;
                              }
                           }
                        }
                        if(theBullet == "[object BulletIceball]")
                        {
                           this.explosionQueueArray.push([theBullet.x,theBullet.y,theBullet.explosionRadius,theBullet.damage,"Ice",theBullet.frozenTime,0,false]);
                        }
                        if(theBullet == "[object BulletPoisonSpike]")
                        {
                           if(theEnemy.poisonMultiplier > 0)
                           {
                              SoundManager.sfxArray.push("ImpactBullet");
                              if(!theEnemy.onPoison)
                              {
                                 theEnemy.poisonTimer = Math.round(theBullet.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2));
                                 theEnemy.poisonDamage = theBullet.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2);
                                 theEnemy.onPoison = true;
                              }
                              else if(theBullet.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2) * theBullet.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2) > theEnemy.poisonTimer * theEnemy.poisonDamage)
                              {
                                 theEnemy.poisonTimer = Math.round(theBullet.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2));
                                 theEnemy.poisonDamage = theBullet.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2);
                              }
                           }
                        }
                        if(theBullet.explosion == false)
                        {
                           if((theBullet != "[object BulletFire]" || !theEnemy.onFire) && (theBullet != "[object BulletMagic]" && theBullet != "[object BulletMagicBunny]" || (theBullet.targetEnemy == null || theEnemy == theBullet.targetEnemy) && enemyAlreadyHit == false) && theBullet != "[object BulletIceball]")
                           {
                              if(theBullet == "[object BulletFire]")
                              {
                                 theEnemy.onFire = true;
                                 if(theEnemy.frozen)
                                 {
                                    theEnemy.frozenTimer -= 15;
                                 }
                              }
                              if(theBullet == "[object BulletPoison]")
                              {
                                 if(theEnemy.poisonMultiplier > 0)
                                 {
                                    SoundManager.sfxArray.push("ImpactBullet");
                                    if(!theEnemy.onPoison)
                                    {
                                       theEnemy.poisonTimer = Math.round(theBullet.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2));
                                       theEnemy.poisonDamage = theBullet.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2);
                                       theEnemy.onPoison = true;
                                    }
                                    else if(theBullet.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2) * theBullet.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2) > theEnemy.poisonTimer * theEnemy.poisonDamage)
                                    {
                                       theEnemy.poisonTimer = Math.round(theBullet.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2));
                                       theEnemy.poisonDamage = theBullet.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2);
                                    }
                                 }
                              }
                              if((theBullet == "[object BulletMagic]" || theBullet == "[object BulletMagicBunny]") && theBullet.targetsLeft > 0)
                              {
                                 if(theEnemy.magicDamageMultiplier > 0)
                                 {
                                    SoundManager.sfxArray.push("ImpactMagic");
                                 }
                                 theBullet.x += theBullet.xVel;
                                 theBullet.y += theBullet.yVel;
                                 theBullet.enemiesArray.push(theEnemy);
                                 --theBullet.targetsLeft;
                                 theBullet.neverHitTarget = false;
                                 theBullet.targetEnemy = null;
                              }
                              if(theBullet != "[object BulletCrazyCheese]" || enemyAlreadyHit == false)
                              {
                                 if(theBullet == "[object BulletCrazyCheese]")
                                 {
                                    theBullet.enemiesArray.push(theEnemy);
                                    if(theEnemy.foodDamageMultiplier > 0)
                                    {
                                       SoundManager.sfxArray.push("ImpactCake");
                                       this.spawnParticle(theEnemy.particle,1,impactX,impactY,0,angleToBullet * 180 / Math.PI - 15,30,2,-0.75);
                                       if(theEnemy.foodDamageMultiplier > 1)
                                       {
                                          this.spawnParticle("Weakness",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                                       }
                                       else if(theEnemy.foodDamageMultiplier < 1)
                                       {
                                          this.spawnParticle("Strength",1,impactX,impactY,8,0,360,0,strongWeakAddSize);
                                       }
                                    }
                                    else
                                    {
                                       this.spawnParticle("Immune",1,impactX,impactY,0,0,0,0,2);
                                    }
                                 }
                                 if((theEnemy.hp - theBullet.damage > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB") && theBullet != "[object BulletFire]" && theBullet != "[object BulletSmall]" && theBullet != "[object BulletShotgun]" && theBullet != "[object BulletGummyBear]" && theBullet != "[object BulletCrazyCheese]" && theBullet != "[object BulletCake]" && theBullet != "[object BulletCakePiece]" && theBullet != "[object BulletIcicle]" && theBullet != "[object BulletPoisonSpike]" && theBullet != "[object BulletPoison]" || theBullet == "[object BulletFire]" && (theEnemy.hp - theBullet.damage * theEnemy.fireLavaDamageMultiplier > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB") || (theBullet == "[object BulletSmall]" || theBullet == "[object BulletShotgun]") && (theEnemy.hp - theBullet.damage * theEnemy.bulletDamageMultiplier > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB") || (theBullet == "[object BulletGummyBear]" || theBullet == "[object BulletCrazyCheese]" || theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]") && (theEnemy
                                 .hp - theBullet.damage * theEnemy.foodDamageMultiplier > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB") || (theBullet == "[object BulletMagic]" || theBullet == "[object BulletMagicBunny]") && (theEnemy.hp - theBullet.damage * theEnemy.magicDamageMultiplier > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB") || theBullet == "[object BulletIcicle]" && (theEnemy.hp - theBullet.damage * theEnemy.iceMultiplier > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB") || (theBullet == "[object BulletPoison]" || theBullet == "[object BulletPoisonSpike]") && (theEnemy.hp - theBullet.damage * theEnemy.poisonMultiplier > 0 || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB"))
                                 {
                                    bossDamageMultiplier = 1;
                                    if(theBullet != "[object BulletFire]" && theBullet != "[object BulletSmall]" && theBullet != "[object BulletShotgun]" && theBullet != "[object BulletGummyBear]" && theBullet != "[object BulletCrazyCheese]" && theBullet != "[object BulletCake]" && theBullet != "[object BulletCakePiece]" && theBullet != "[object BulletMagic]" && theBullet != "[object BulletMagicBunny]" && theBullet != "[object BulletIcicle]" && theBullet != "[object BulletPoisonSpike]" && theBullet != "[object BulletPoison]")
                                    {
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage;
                                          }
                                          theEnemy.hp -= theBullet.damage;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage);
                                       }
                                    }
                                    else if(theBullet == "[object BulletFire]" && theEnemy.fireLavaDamageMultiplier > 0 && theEnemy.frozen == false)
                                    {
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          SoundManager.burningPlay = true;
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage * theEnemy.fireLavaDamageMultiplier;
                                          }
                                          theEnemy.hp -= theBullet.damage * theEnemy.fireLavaDamageMultiplier;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                          if(theEnemy.strongWeakTimer == 0)
                                          {
                                             if(theEnemy.fireLavaDamageMultiplier > 1)
                                             {
                                                this.spawnParticle("Weakness",1,theEnemy.x,theEnemy.y,theEnemy.radius * 0.7 + 2,0,360,0,strongWeakAddSize - 0.3);
                                             }
                                             else if(theEnemy.fireLavaDamageMultiplier < 1)
                                             {
                                                this.spawnParticle("Strength",1,theEnemy.x,theEnemy.y,theEnemy.radius * 0.7 + 2,0,360,0,strongWeakAddSize - 0.3);
                                             }
                                             theEnemy.strongWeakTimer = theEnemy.strongWeakTimerMax;
                                          }
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.fireLavaDamageMultiplier);
                                       }
                                    }
                                    else if((theBullet == "[object BulletSmall]" || theBullet == "[object BulletShotgun]") && theEnemy.bulletDamageMultiplier > 0)
                                    {
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage * theEnemy.bulletDamageMultiplier;
                                          }
                                          theEnemy.hp -= theBullet.damage * theEnemy.bulletDamageMultiplier;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.bulletDamageMultiplier);
                                       }
                                    }
                                    else if((theBullet == "[object BulletGummyBear]" || theBullet == "[object BulletCrazyCheese]" || theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]") && theEnemy.foodDamageMultiplier > 0)
                                    {
                                       if(theBullet == "[object BulletCrazyCheese]" && theEnemy.enemyLevel == "B")
                                       {
                                          bossDamageMultiplier = 0.2;
                                       }
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage * theEnemy.foodDamageMultiplier * bossDamageMultiplier;
                                          }
                                          theEnemy.hp -= theBullet.damage * theEnemy.foodDamageMultiplier * bossDamageMultiplier;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.foodDamageMultiplier * bossDamageMultiplier);
                                       }
                                    }
                                    else if((theBullet == "[object BulletMagic]" || theBullet == "[object BulletMagicBunny]") && theEnemy.magicDamageMultiplier > 0)
                                    {
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage * theEnemy.magicDamageMultiplier;
                                          }
                                          theEnemy.hp -= theBullet.damage * theEnemy.magicDamageMultiplier;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.magicDamageMultiplier);
                                       }
                                    }
                                    else if(theBullet == "[object BulletIcicle]" && theEnemy.iceMultiplier > 0)
                                    {
                                       if(theEnemy.enemyLevel == "B")
                                       {
                                          bossDamageMultiplier = 0.3;
                                       }
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage * theEnemy.iceMultiplier * bossDamageMultiplier;
                                          }
                                          theEnemy.hp -= theBullet.damage * theEnemy.iceMultiplier * bossDamageMultiplier;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.iceMultiplier * bossDamageMultiplier);
                                       }
                                    }
                                    else if((theBullet == "[object BulletPoison]" || theBullet == "[object BulletPoisonSpike]") && theEnemy.poisonMultiplier > 0)
                                    {
                                       if(theBullet == "[object BulletPoisonSpike]" && theEnemy.enemyLevel == "B")
                                       {
                                          bossDamageMultiplier = 0.25;
                                       }
                                       if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                                       {
                                          if(this.debugOn)
                                          {
                                             this.debugTotalDamage += theBullet.damage * theEnemy.poisonMultiplier * bossDamageMultiplier;
                                          }
                                          theEnemy.hp -= theBullet.damage * theEnemy.poisonMultiplier * bossDamageMultiplier;
                                          this.colorClip(theEnemy,16711680,0.8);
                                          theEnemy.damageIndicator = 20;
                                       }
                                       else
                                       {
                                          this.hitDamageAddict(theEnemy,theBullet.damage * theEnemy.poisonMultiplier * bossDamageMultiplier);
                                       }
                                    }
                                 }
                                 else
                                 {
                                    if(!theEnemy.hitByCake && (theBullet == "[object BulletCake]" || theBullet == "[object BulletCakePiece]"))
                                    {
                                       for(q = 0; q < theBullet.pieces; q++)
                                       {
                                          cakeBullet = new BulletCakePiece();
                                          theAngle = 360 / theBullet.pieces * q - 90;
                                          cakeBullet.radius = 5;
                                          cakeBullet.speed = 24;
                                          if(theBullet == "[object BulletCake]")
                                          {
                                             cakeBullet.damage = theBullet.damage / 2;
                                          }
                                          else
                                          {
                                             cakeBullet.damage = theBullet.damage;
                                          }
                                          cakeBullet.explosion = false;
                                          cakeBullet.pieces = theBullet.pieces;
                                          this.bulletLayer.addChild(cakeBullet);
                                          cakeBullet.x = theEnemy.x + Math.cos(theAngle / 180 * Math.PI) * (theEnemy.radius + 5);
                                          cakeBullet.y = theEnemy.y + Math.sin(theAngle / 180 * Math.PI) * (theEnemy.radius + 5);
                                          cakeBullet.rotation = theAngle;
                                          cakeBullet.angle = cakeBullet.rotation / 180 * Math.PI;
                                          cakeBullet.xVel = Math.cos(cakeBullet.angle) * cakeBullet.speed;
                                          cakeBullet.yVel = Math.sin(cakeBullet.angle) * cakeBullet.speed;
                                          cakeBullet.dead = false;
                                          this.bulletArray.push(cakeBullet);
                                       }
                                       theEnemy.hitByCake = true;
                                    }
                                    if(this.debugOn)
                                    {
                                       this.debugTotalDamage += theEnemy.hp;
                                    }
                                    dead = true;
                                 }
                              }
                           }
                        }
                        else if(theBullet != "[object BulletBomb]" && (theBullet != "[object BulletPenetrate]" || enemyAlreadyHit == false))
                        {
                           this.explosionQueueArray.push([impactX,impactY,theBullet.explosionRadius,theBullet.damage,"Normal",0,0,true]);
                           if(theBullet == "[object BulletPenetrate]")
                           {
                              theBullet.enemiesArray.push(theEnemy);
                           }
                        }
                     }
                     else if(theBullet.speed - 0.3 > 0)
                     {
                        theBullet.speed -= 0.3;
                     }
                     else
                     {
                        theBullet.speed = 0;
                     }
                  }
                  if(dead)
                  {
                     break;
                  }
               }
            }
            if(dead == false && (theEnemy.invisible == null || !theEnemy.invisible) && (theEnemy.teleporting == null || !theEnemy.teleporting))
            {
               for(ig = 0; ig < this.groundArray.length; ig++)
               {
                  theGround = this.groundArray[ig];
                  if(theGround.lifeTime > 15)
                  {
                     if(this.distanceBetween(theGround.x,theGround.y,theEnemy.x,theEnemy.y) < theEnemy.radius + theGround.radius)
                     {
                        if(theEnemy == "[object EnemyTemperamental]" || theEnemy == "[object EnemyTemperamentalBoss]")
                        {
                           theEnemy.turnAngry = true;
                        }
                        if(theGround == "[object ObjectGroundIce]" && theEnemy.trailID != this.iceTrailID && theEnemy.enemyLevel != "B" && !collidingWithLaser)
                        {
                           if(theEnemy.iceMultiplier > 0)
                           {
                              if(theEnemy.frozen)
                              {
                                 if(this.debugOn)
                                 {
                                    this.debugTotalFreezeTime -= theEnemy.frozenTimer;
                                 }
                              }
                              theEnemy.frozen = true;
                              theEnemy.trailID = this.iceTrailID;
                              theEnemy.frozenTimer = Math.round(theGround.frozenTime * theEnemy.iceMultiplier);
                              if(this.debugOn)
                              {
                                 this.debugTotalFreezeTime += theEnemy.frozenTimer;
                              }
                              if(ScreenLevelSelect.levelMode == "Tower")
                              {
                                 theEnemy.accSpeed = 0;
                              }
                              if(!theEnemy.gotIceIndicator)
                              {
                                 SoundManager.sfxArray.push("Freeze");
                                 indicatorIce = new IndicatorIce();
                                 indicatorIce.gotoAndStop(Math.round(Math.random() * 2 + 1));
                                 indicatorIce.rotation = Math.random() * 360;
                                 indicatorIce.scaleX = theEnemy.radius / 50;
                                 indicatorIce.scaleY = theEnemy.radius / 50;
                                 indicatorIce.x = theEnemy.x;
                                 indicatorIce.y = theEnemy.y;
                                 this.iceIndicatorLayer.addChild(indicatorIce);
                                 theEnemy.gotIceIndicator = true;
                                 theEnemy.iceIndicatorObject = indicatorIce;
                              }
                              else
                              {
                                 theEnemy.iceIndicatorObject.alpha = 1;
                              }
                           }
                        }
                        else if(theGround == "[object ObjectGroundLava]" && !theEnemy.onLava)
                        {
                           if(theEnemy.fireLavaDamageMultiplier > 0)
                           {
                              bossDamageMultiplier = 1;
                              if(theEnemy.enemyLevel == "B")
                              {
                                 bossDamageMultiplier = 0.2;
                              }
                              if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                              {
                                 SoundManager.burningPlay = true;
                                 theEnemy.onLava = true;
                                 if(theEnemy.hp - theGround.damage * theEnemy.fireLavaDamageMultiplier * bossDamageMultiplier / 30 > 0)
                                 {
                                    if(this.debugOn)
                                    {
                                       this.debugTotalDamage += theGround.damage * theEnemy.fireLavaDamageMultiplier * bossDamageMultiplier / 30;
                                    }
                                    theEnemy.hp -= theGround.damage * theEnemy.fireLavaDamageMultiplier * bossDamageMultiplier / 30;
                                    if(theGround.damage * theEnemy.fireLavaDamageMultiplier * bossDamageMultiplier / 30 > 0)
                                    {
                                       this.colorClip(theEnemy,16711680,0.8);
                                       theEnemy.damageIndicator = 20;
                                    }
                                 }
                                 else
                                 {
                                    if(this.debugOn)
                                    {
                                       this.debugTotalDamage += theEnemy.hp;
                                    }
                                    dead = true;
                                 }
                                 angleToItem = this.angleBetween(theEnemy.x,theEnemy.y,theGround.x,theGround.y);
                                 impactX = theEnemy.x + Math.cos(angleToItem) * theEnemy.radius;
                                 impactY = theEnemy.y + Math.sin(angleToItem) * theEnemy.radius;
                                 if(theEnemy.strongWeakTimer == 0)
                                 {
                                    if(theEnemy.fireLavaDamageMultiplier > 1)
                                    {
                                       this.spawnParticle("Weakness",1,theEnemy.x,theEnemy.y,theEnemy.radius * 0.7 + 2,0,360,0,strongWeakAddSize - 0.3);
                                    }
                                    else if(theEnemy.fireLavaDamageMultiplier < 1)
                                    {
                                       this.spawnParticle("Strength",1,theEnemy.x,theEnemy.y,theEnemy.radius * 0.7 + 2,0,360,0,strongWeakAddSize - 0.3);
                                    }
                                    theEnemy.strongWeakTimer = theEnemy.strongWeakTimerMax;
                                 }
                              }
                              else
                              {
                                 this.hitDamageAddict(theEnemy,theGround.damage * theEnemy.fireLavaDamageMultiplier * bossDamageMultiplier / 30);
                              }
                           }
                        }
                     }
                  }
               }
            }
            if(theEnemy.gotBomb)
            {
               if(theEnemy.bombTimer > 0 && dead == false)
               {
                  --theEnemy.bombTimer;
               }
               else
               {
                  this.explosionQueueArray.push([theEnemy.x,theEnemy.y,theEnemy.bombRadius + theEnemy.radius,theEnemy.bombDamage,"Normal",0,0,true]);
                  theEnemy.gotBomb = false;
               }
            }
            if(Boolean(theEnemy.frozen) && (Boolean(theEnemy == "[object EnemyTemperamental]" || theEnemy == "[object EnemyTemperamental]")) && Boolean(theEnemy.angry))
            {
               tempTemperamentalFrozen = true;
            }
            if(theEnemy.frozen)
            {
               if(theEnemy.gotIceIndicator)
               {
                  theEnemy.iceIndicatorObject.x = theEnemy.x;
                  theEnemy.iceIndicatorObject.y = theEnemy.y;
               }
               if(theEnemy.frozenTimer > 0)
               {
                  --theEnemy.frozenTimer;
                  if(theEnemy.gotIceIndicator)
                  {
                     normalSize = theEnemy.radius / 50;
                     if(theEnemy.frozenTimer < 30)
                     {
                        theEnemy.iceIndicatorObject.alpha = 0.1 + 0.9 * (theEnemy.frozenTimer / 30);
                        theEnemy.iceIndicatorObject.scaleX = normalSize - 0.1 + 0.1 * (theEnemy.frozenTimer / 30);
                        theEnemy.iceIndicatorObject.scaleY = normalSize - 0.1 + 0.1 * (theEnemy.frozenTimer / 30);
                     }
                     else if(theEnemy.iceIndicatorObject.scaleX != normalSize)
                     {
                        theEnemy.iceIndicatorObject.scaleX = normalSize;
                        theEnemy.iceIndicatorObject.scaleY = normalSize;
                     }
                  }
               }
               else
               {
                  theEnemy.frozen = false;
                  if(theEnemy.gotIceIndicator)
                  {
                     theEnemy.gotIceIndicator = false;
                     this.iceIndicatorLayer.removeChild(theEnemy.iceIndicatorObject);
                  }
               }
            }
            if(Boolean(theEnemy.onPoison) && (theEnemy == "[object EnemyMedic]" || theEnemy == "[object EnemyMedicBoss]"))
            {
               tempDoctorPoisoned = true;
            }
            if(dead == false)
            {
               if(theEnemy.onPoison)
               {
                  if(theEnemy.poisonTimer > 0)
                  {
                     --theEnemy.poisonTimer;
                     if(theEnemy.poisonParticleTimer > 0)
                     {
                        --theEnemy.poisonParticleTimer;
                     }
                     else
                     {
                        if(theEnemy.enemyLevel != "B")
                        {
                           this.spawnParticle("Poison",1,theEnemy.x,theEnemy.y,0,0,360,1 + theEnemy.radius / 15,0.1 + theEnemy.radius / 15,theEnemy.radius / 40);
                        }
                        else
                        {
                           this.spawnParticle("PoisonBoss",1,theEnemy.x,theEnemy.y,0,0,360,1 + theEnemy.radius / 30,0.1 + theEnemy.radius / 15,theEnemy.radius / 40);
                        }
                        theEnemy.poisonParticleTimer = theEnemy.poisonParticleTimerMax;
                     }
                     if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                     {
                        if(theEnemy.hp - theEnemy.poisonDamage / 30 > 0)
                        {
                           if(this.debugOn)
                           {
                              this.debugTotalDamage += theEnemy.poisonDamage / 30;
                           }
                           theEnemy.hp -= theEnemy.poisonDamage / 30;
                        }
                        else
                        {
                           if(this.debugOn)
                           {
                              this.debugTotalDamage += theEnemy.hp;
                           }
                           dead = true;
                        }
                        if(theEnemy.strongWeakTimer == 0)
                        {
                           if(theEnemy.poisonMultiplier > 1)
                           {
                              this.spawnParticle("Weakness",1,theEnemy.x,theEnemy.y,theEnemy.radius * 0.7 + 2,0,360,0,strongWeakAddSize - 0.3);
                           }
                           else if(theEnemy.poisonMultiplier < 1)
                           {
                              this.spawnParticle("Strength",1,theEnemy.x,theEnemy.y,theEnemy.radius * 0.7 + 2,0,360,0,strongWeakAddSize - 0.3);
                           }
                           theEnemy.strongWeakTimer = theEnemy.strongWeakTimerMax;
                        }
                     }
                     else if(theEnemy.poisonTimer % 10 == 0)
                     {
                        this.hitDamageAddict(theEnemy,theEnemy.poisonDamage / 30);
                     }
                     else
                     {
                        this.hitDamageAddict(theEnemy,theEnemy.poisonDamage / 30,false);
                     }
                  }
                  else
                  {
                     theEnemy.poisonTimer = 0;
                     theEnemy.poisonDamage = 0;
                     theEnemy.poisonParticleTimer = 0;
                  }
               }
            }
            if(dead == false && (theEnemy.invisible == null || !theEnemy.invisible) && (theEnemy.teleporting == null || !theEnemy.teleporting))
            {
               for(iiii = 0; iiii < this.explosionArray.length; iiii++)
               {
                  theExplosion = this.explosionArray[iiii];
                  distToExplosion = this.distanceBetween(theEnemy.x,theEnemy.y,theExplosion.x,theExplosion.y);
                  if(Boolean(theExplosion.canDamage) && distToExplosion <= theEnemy.radius + theExplosion.radius)
                  {
                     if(theEnemy.hp - theExplosion.damage * theEnemy.explosionDamageMultiplier > 0 && theExplosion == "[object Explosion]" || theEnemy.hp - theExplosion.damage * theEnemy.iceMultiplier > 0 && theExplosion == "[object ExplosionIce]" || theEnemy.hp - theExplosion.damage * theEnemy.poisonMultiplier > 0 && theExplosion == "[object ExplosionPoison]" || theEnemy.enemyType == "DamageAddict" || theEnemy.enemyType == "DamageAddictB")
                     {
                        if(theEnemy == "[object EnemyTemperamental]" || theEnemy == "[object EnemyTemperamentalBoss]")
                        {
                           theEnemy.turnAngry = true;
                        }
                        if(theEnemy.enemyType != "DamageAddict" && theEnemy.enemyType != "DamageAddictB")
                        {
                           angleToExplosion = this.angleBetween(theEnemy.x,theEnemy.y,theExplosion.x,theExplosion.y);
                           collisionPointX = theEnemy.x + Math.cos(angleToExplosion) * theEnemy.radius;
                           collisionPointY = theEnemy.y + Math.sin(angleToExplosion) * theEnemy.radius;
                           if(theExplosion != "[object ExplosionIce]" && theExplosion != "[object ExplosionPoison]")
                           {
                              if(theEnemy.explosionDamageMultiplier > 0)
                              {
                                 if(this.debugOn)
                                 {
                                    this.debugTotalDamage += theExplosion.damage * theEnemy.explosionDamageMultiplier;
                                 }
                                 theEnemy.hp -= theExplosion.damage * theEnemy.explosionDamageMultiplier;
                                 if(theExplosion.damage * theEnemy.explosionDamageMultiplier > 0)
                                 {
                                    this.colorClip(theEnemy,16711680,0.8);
                                    theEnemy.damageIndicator = 20;
                                 }
                                 if(theEnemy.explosionDamageMultiplier > 1)
                                 {
                                    this.spawnParticle("Weakness",1,collisionPointX,collisionPointY,8,0,360,0,strongWeakAddSize);
                                 }
                                 else if(theEnemy.explosionDamageMultiplier < 1)
                                 {
                                    this.spawnParticle("Strength",1,collisionPointX,collisionPointY,8,0,360,0,strongWeakAddSize);
                                 }
                              }
                              else
                              {
                                 this.spawnParticle("Immune",1,collisionPointX,collisionPointY,0,0,0,0,2);
                              }
                           }
                           else if(theExplosion == "[object ExplosionIce]" && (theEnemy.trailID == null || theEnemy.trailID != this.iceTrailID))
                           {
                              if(theEnemy.iceMultiplier > 0)
                              {
                                 if(this.debugOn)
                                 {
                                    this.debugTotalDamage += theExplosion.damage * theEnemy.iceMultiplier;
                                 }
                                 theEnemy.hp -= theExplosion.damage * theEnemy.iceMultiplier;
                                 if(theExplosion.damage * theEnemy.iceMultiplier > 0)
                                 {
                                    this.colorClip(theEnemy,16711680,0.8);
                                    theEnemy.damageIndicator = 20;
                                 }
                                 if(theEnemy.iceMultiplier > 1)
                                 {
                                    this.spawnParticle("Weakness",1,collisionPointX,collisionPointY,8,0,360,0,strongWeakAddSize);
                                 }
                                 else if(theEnemy.iceMultiplier < 1)
                                 {
                                    this.spawnParticle("Strength",1,collisionPointX,collisionPointY,8,0,360,0,strongWeakAddSize);
                                 }
                              }
                              else
                              {
                                 this.spawnParticle("Immune",1,collisionPointX,collisionPointY,0,0,0,0,2);
                              }
                           }
                           else if(theEnemy.poisonMultiplier > 0)
                           {
                              if(this.debugOn)
                              {
                                 this.debugTotalDamage += theExplosion.damage * theEnemy.poisonMultiplier;
                              }
                              theEnemy.hp -= theExplosion.damage * theEnemy.poisonMultiplier;
                              if(theExplosion.damage * theEnemy.poisonMultiplier > 0)
                              {
                                 this.colorClip(theEnemy,16711680,0.8);
                                 theEnemy.damageIndicator = 20;
                              }
                              if(theEnemy.poisonMultiplier > 1)
                              {
                                 this.spawnParticle("Weakness",1,collisionPointX,collisionPointY,8,0,360,0,strongWeakAddSize);
                              }
                              else if(theEnemy.poisonMultiplier < 1)
                              {
                                 this.spawnParticle("Strength",1,collisionPointX,collisionPointY,8,0,360,0,strongWeakAddSize);
                              }
                           }
                           else
                           {
                              this.spawnParticle("Immune",1,collisionPointX,collisionPointY,0,0,0,0,2);
                           }
                        }
                        else
                        {
                           this.hitDamageAddict(theEnemy,theExplosion.damage * theEnemy.explosionDamageMultiplier * theEnemy.iceMultiplier);
                        }
                        if(theExplosion == "[object ExplosionIce]")
                        {
                           if(theEnemy.iceMultiplier > 0)
                           {
                              if(theEnemy.frozen)
                              {
                                 if(this.debugOn)
                                 {
                                    this.debugTotalFreezeTime -= theEnemy.frozenTimer;
                                 }
                              }
                              theEnemy.frozen = true;
                              if(ScreenGame.secondaryWeapon == "Ice Ball")
                              {
                                 theEnemy.trailID = this.iceTrailID;
                              }
                              if(theEnemy.enemyLevel != "B")
                              {
                                 theEnemy.frozenTimer = Math.round(theExplosion.frozenTime * theEnemy.iceMultiplier);
                              }
                              else
                              {
                                 theEnemy.frozenTimer = Math.round(theExplosion.frozenTime * theEnemy.iceMultiplier / 4);
                              }
                              if(this.debugOn)
                              {
                                 this.debugTotalFreezeTime += theEnemy.frozenTimer;
                              }
                              if(ScreenLevelSelect.levelMode == "Tower")
                              {
                                 theEnemy.accSpeed = 0;
                              }
                              if(!theEnemy.gotIceIndicator)
                              {
                                 SoundManager.sfxArray.push("Freeze");
                                 indicatorIce = new IndicatorIce();
                                 if(theEnemy.enemyLevel != "B")
                                 {
                                    indicatorIce.gotoAndStop(Math.round(Math.random() * 2 + 1));
                                 }
                                 else
                                 {
                                    indicatorIce.gotoAndStop(Math.round(Math.random() * 2 + 4));
                                 }
                                 indicatorIce.rotation = Math.random() * 360;
                                 indicatorIce.scaleX = theEnemy.radius / 50;
                                 indicatorIce.scaleY = theEnemy.radius / 50;
                                 indicatorIce.x = theEnemy.x;
                                 indicatorIce.y = theEnemy.y;
                                 this.iceIndicatorLayer.addChild(indicatorIce);
                                 theEnemy.gotIceIndicator = true;
                                 theEnemy.iceIndicatorObject = indicatorIce;
                              }
                              else
                              {
                                 theEnemy.iceIndicatorObject.alpha = 1;
                              }
                           }
                        }
                        else if(theExplosion == "[object ExplosionPoison]")
                        {
                           if(theEnemy.poisonMultiplier > 0)
                           {
                              if(!theEnemy.onPoison)
                              {
                                 theEnemy.poisonTimer = Math.round(theExplosion.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2));
                                 theEnemy.poisonDamage = theExplosion.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2);
                                 theEnemy.onPoison = true;
                              }
                              else if(theExplosion.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2) * theExplosion.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2) > theEnemy.poisonTimer * theEnemy.poisonDamage)
                              {
                                 theEnemy.poisonTimer = Math.round(theExplosion.poisonTime * (0.5 + theEnemy.poisonMultiplier / 2));
                                 theEnemy.poisonDamage = theExplosion.poisonDamage * (0.5 + theEnemy.poisonMultiplier / 2);
                              }
                           }
                        }
                     }
                     else
                     {
                        if(this.debugOn)
                        {
                           this.debugTotalDamage += theEnemy.hp;
                        }
                        dead = true;
                        if(theExplosion.explosionParent != null && theExplosion.explosionParent == "Mine" && (theEnemy.enemyType == "Trap" || theEnemy.enemyType == "TrapB"))
                        {
                           tempTrapEnemyMineKill = true;
                        }
                     }
                  }
               }
            }
            if(!dead)
            {
               if(theEnemy == "[object EnemyTemperamental]" || theEnemy == "[object EnemyTemperamentalBoss]")
               {
                  if(!theEnemy.frozen)
                  {
                     if(theEnemy.angryTimer > 0)
                     {
                        --theEnemy.angryTimer;
                     }
                     if(theEnemy.turnAngry)
                     {
                        theEnemy.turnAngry = false;
                        if(!theEnemy.angry)
                        {
                           theEnemy.angry = true;
                           theEnemy.gotoAndStop(2);
                           if(theEnemy.enemyLevel != "B")
                           {
                              theEnemy.moveSpeedMax = ScreenGame.enemyTemperamentalStats[3] * 4;
                              if(ScreenLevelSelect.levelMode != "Tower")
                              {
                                 theEnemy.accSpeed = ScreenGame.enemyTemperamentalStats[4] * 2;
                                 theEnemy.rotSpeedMax = ScreenGame.enemyTemperamentalStats[5] * 3;
                              }
                           }
                           else
                           {
                              theEnemy.moveSpeedMax = ScreenGame.enemyTemperamentalBStats[3] * 3;
                              theEnemy.accSpeed = ScreenGame.enemyTemperamentalBStats[4] * 2;
                              theEnemy.rotSpeedMax = ScreenGame.enemyTemperamentalBStats[5];
                           }
                        }
                        theEnemy.angryTimer = theEnemy.angryTimerMax;
                     }
                  }
                  if((Boolean(theEnemy.angryTimer == 0) || Boolean(theEnemy.turnPeaceful)) && Boolean(theEnemy.angry))
                  {
                     theEnemy.turnPeaceful = false;
                     theEnemy.angry = false;
                     theEnemy.gotoAndStop(1);
                     if(theEnemy.enemyLevel != "B")
                     {
                        theEnemy.moveSpeedMax = ScreenGame.enemyTemperamentalStats[3];
                        if(ScreenLevelSelect.levelMode != "Tower")
                        {
                           theEnemy.accSpeed = ScreenGame.enemyTemperamentalStats[4];
                           theEnemy.rotSpeedMax = ScreenGame.enemyTemperamentalStats[5];
                        }
                     }
                     else
                     {
                        theEnemy.moveSpeedMax = ScreenGame.enemyTemperamentalBStats[3];
                        theEnemy.accSpeed = ScreenGame.enemyTemperamentalBStats[4];
                        theEnemy.rotSpeedMax = ScreenGame.enemyTemperamentalBStats[5];
                     }
                     theEnemy.angryTimer = 0;
                  }
               }
               if(theEnemy == "[object EnemyAccelerating]" || theEnemy == "[object EnemyAcceleratingBoss]")
               {
                  if(theEnemy.hp != beforeHP)
                  {
                     theEnemy.speedTimer = theEnemy.speedTimerMax;
                  }
                  if(theEnemy.speedTimer > 0)
                  {
                     --theEnemy.speedTimer;
                  }
                  if(!theEnemy.frozen)
                  {
                     factor = 1 - theEnemy.speedTimer / theEnemy.speedTimerMax;
                     theEnemy.moveSpeedMax = ScreenGame.enemyTemperamentalStats[3] + factor * ScreenGame.enemyTemperamentalStats[3] * 3;
                     if(ScreenLevelSelect.levelMode != "Tower")
                     {
                        theEnemy.accSpeed = ScreenGame.enemyTemperamentalStats[4] + factor * ScreenGame.enemyTemperamentalStats[4] * 2;
                        theEnemy.rotSpeedMax = ScreenGame.enemyTemperamentalStats[5] + factor * ScreenGame.enemyTemperamentalStats[5];
                     }
                  }
                  else
                  {
                     theEnemy.speedTimer = theEnemy.speedTimerMax;
                  }
               }
               if(theEnemy == "[object EnemyMedic]" || theEnemy == "[object EnemyMedicBoss]")
               {
                  if(theEnemy.healTimer <= 0)
                  {
                     for(u = 0; u < this.enemyArray.length; u++)
                     {
                        enemyToHeal = this.enemyArray[u];
                        if(u != i)
                        {
                           distanceToEnemy = this.distanceBetween(theEnemy.x,theEnemy.y,enemyToHeal.x,enemyToHeal.y);
                           if(distanceToEnemy < theEnemy.healDistance + enemyToHeal.radius)
                           {
                              totalHealth = this.getTotalHealth(enemyToHeal);
                              if(enemyToHeal.hp < totalHealth)
                              {
                                 if(enemyToHeal.hp + 1 < totalHealth)
                                 {
                                    if(this.debugOn)
                                    {
                                       --this.debugTotalDamage;
                                    }
                                    enemyToHeal.hp += 1;
                                 }
                                 else
                                 {
                                    if(this.debugOn)
                                    {
                                       this.debugTotalDamage -= totalHealth - enemyToHeal.hp;
                                    }
                                    enemyToHeal.hp = totalHealth;
                                 }
                                 ranAngle = Math.random() * 2 * Math.PI;
                                 ranDistance = Math.random() * enemyToHeal.radius * 0.75;
                                 spawnX = Math.cos(ranAngle) * ranDistance;
                                 spawnY = Math.sin(ranAngle) * ranDistance;
                                 if(enemyToHeal.enemyLevel != "B")
                                 {
                                    this.spawnParticle("Heal",1,enemyToHeal.x + spawnX,enemyToHeal.y + spawnY,0,270,0);
                                 }
                                 else
                                 {
                                    this.spawnParticle("HealBoss",1,enemyToHeal.x + spawnX,enemyToHeal.y + spawnY,0,270,0);
                                 }
                              }
                           }
                        }
                     }
                     theEnemy.healTimer = theEnemy.healTimerMax;
                  }
                  else
                  {
                     --theEnemy.healTimer;
                  }
               }
               if(theEnemy.enemyType == "Shrinking" || theEnemy.enemyType == "ShrinkingB")
               {
                  shrinkEnemyHealth = this.getTotalHealth(theEnemy);
                  size = 1 / 3 + 2 / 3 * (theEnemy.hp / shrinkEnemyHealth);
                  theEnemy.radius = size * theEnemy.radiusStart;
                  theEnemy.scaleX = size;
                  theEnemy.scaleY = size;
                  if(theEnemy.gotIceIndicator)
                  {
                     scaleSize = theEnemy.radius / 50;
                     if(theEnemy.frozenTimer >= 30 && theEnemy.iceIndicatorObject.scaleX != scaleSize)
                     {
                        theEnemy.iceIndicatorObject.scaleX = scaleSize;
                        theEnemy.iceIndicatorObject.scaleY = scaleSize;
                     }
                  }
               }
               if(theEnemy.enemyType == "GrapplingHook" || theEnemy.enemyType == "GrapplingHookB")
               {
                  if(Boolean(theEnemy.isGrapping) && stage.contains(this.tank))
                  {
                     angleFromEnemy = this.angleBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                     if(theEnemy.enemyType == "GrapplingHook")
                     {
                        pullForceX = Math.abs(Math.cos(angleFromEnemy)) * this.tank.xVel;
                        pullForceY = Math.abs(Math.sin(angleFromEnemy)) * this.tank.yVel;
                        angleCos = Math.cos(angleFromEnemy);
                        angleSin = Math.sin(angleFromEnemy);
                        if(pullForceX > 0 && angleCos < 0 || pullForceX < 0 && angleCos > 0)
                        {
                           pullForceX = 0;
                        }
                        if(pullForceY > 0 && angleSin < 0 || pullForceY < 0 && angleSin > 0)
                        {
                           pullForceY = 0;
                        }
                        theEnemy.x += pullForceX / 1.5;
                        theEnemy.y += pullForceY / 1.5;
                     }
                     angleFromEnemy = this.angleBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                     distanceToTank = this.distanceBetween(theEnemy.x,theEnemy.y,this.tank.x,this.tank.y);
                     enemyPosX = theEnemy.x + Math.cos(angleFromEnemy) * theEnemy.radius;
                     enemyPosY = theEnemy.y + Math.sin(angleFromEnemy) * theEnemy.radius;
                     tankPosX = this.tank.x + Math.cos(angleFromEnemy - Math.PI) * this.tank.radius;
                     tankPosY = this.tank.y + Math.sin(angleFromEnemy - Math.PI) * this.tank.radius;
                     this.hookRopeLayer.graphics.lineStyle(1,0,1);
                     this.hookRopeLayer.graphics.beginFill(0);
                     this.hookRopeLayer.graphics.moveTo(enemyPosX,enemyPosY);
                     this.hookRopeLayer.graphics.lineTo(tankPosX,tankPosY);
                     this.hookRopeLayer.graphics.endFill();
                  }
               }
            }
            if(dead == true)
            {
               if(stage.contains(theEnemy))
               {
                  if(theEnemy.enemyType == "Exploding")
                  {
                     this.explosionQueueArray.push([theEnemy.x,theEnemy.y,100,5,"Normal",0,0,false]);
                  }
                  else if(theEnemy.enemyType == "ExplodingB")
                  {
                     this.explosionQueueArray.push([theEnemy.x,theEnemy.y,250,200,"Normal",0,0,false]);
                  }
                  this.spawnParticle(theEnemy.particle,Math.round(theEnemy.radius / 1.5),theEnemy.x,theEnemy.y,theEnemy.radius);
                  if(theEnemy.enemyLevel == "B")
                  {
                     ++ScreenGame.bossAmountKilled;
                  }
                  if(!noMoney && ScreenLevelSelect.levelMode != "Flag" && (ScreenLevelSelect.levelMode != "Boss" || theEnemy.enemyLevel == "B"))
                  {
                     this.spawnMoney(theEnemy.money,theEnemy.x,theEnemy.y,true,theEnemy.radius);
                  }
                  else if(!noMoney && ScreenLevelSelect.levelMode == "Boss")
                  {
                     this.spawnMoney(Math.round(theEnemy.money / 2),theEnemy.x,theEnemy.y,true,theEnemy.radius);
                  }
                  if(ScreenUpgrades.levelsArrayMisc[3] != 0)
                  {
                     if(ScreenGame.reloadTimeSecondary - ScreenUpgrades.upgradeArrayKillReload[1][ScreenUpgrades.levelsArrayMisc[3] - 1] > 0)
                     {
                        ScreenGame.reloadTimeSecondary -= ScreenUpgrades.upgradeArrayKillReload[1][ScreenUpgrades.levelsArrayMisc[3] - 1];
                     }
                     else
                     {
                        ScreenGame.reloadTimeSecondary = 0;
                     }
                  }
                  if(!bottomCollision)
                  {
                     SoundManager.sfxArray.push("EnemySquish");
                  }
                  else
                  {
                     SoundManager.sfxArray.push("BottomCollision");
                  }
                  if(theEnemy.frozen)
                  {
                     if(this.debugOn)
                     {
                        this.debugTotalFreezeTime -= theEnemy.frozenTimer;
                     }
                     if(theEnemy.gotIceIndicator)
                     {
                        theEnemy.gotIceIndicator = false;
                        this.iceIndicatorLayer.removeChild(theEnemy.iceIndicatorObject);
                     }
                  }
                  this.enemyArray.splice(i,1);
                  theEnemy.parent.removeChild(theEnemy);
                  i--;
                  theEnemy = null;
                  ++tempEnemyKills;
                  --ScreenGame.currentEnemies;
               }
            }
            else if(Boolean(theEnemy.shoot) && !theEnemy.frozen)
            {
               if(theEnemy.enemyType !== "GrapplingHook" && theEnemy.enemyType !== "GrapplingHookB" || theEnemy.bulletsShooting == 0 && !theEnemy.isGrapping)
               {
                  if(theEnemy.reloadTime == 0)
                  {
                     soundType = "EnemyShoot";
                     if(theEnemy.shootType == "Trap")
                     {
                        soundType = "TrapFart";
                     }
                     distanceAdd = 100;
                     if(!(theEnemy.x < 0 - theEnemy.width / 2 - cameraPosX - distanceAdd || theEnemy.x > roomWidth + theEnemy.width / 2 - cameraPosX - (roomWidth - cameraWidth) + distanceAdd || theEnemy.y < 0 - theEnemy.height / 2 - cameraPosY - distanceAdd || theEnemy.y > roomHeight + theEnemy.height / 2 - cameraPosY - (roomHeight - cameraHeight) + distanceAdd))
                     {
                        SoundManager.sfxArray.push(soundType);
                     }
                     bulletSpeedMultiplier = 1;
                     if(ScreenLevelSelect.levelDifficulty == "Medium")
                     {
                        bulletSpeedMultiplier = DifficultyMultipliers.multiplierBulletSpeedMedium;
                     }
                     else if(ScreenLevelSelect.levelDifficulty == "Hard")
                     {
                        bulletSpeedMultiplier = DifficultyMultipliers.multiplierBulletSpeedHard;
                     }
                     for(b = 0; b < theEnemy.bulletAmount; b++)
                     {
                        if(theEnemy.shootType == "Basic")
                        {
                           eBullet = new EnemyBulletBasic();
                           eBullet.radius = 4;
                           eBullet.speed = 4 * bulletSpeedMultiplier;
                           eBullet.damage = 1;
                           eBullet.lifeTimeMax = 900;
                           eBullet.lifeTime = eBullet.lifeTimeMax;
                        }
                        else if(theEnemy.shootType == "BasicBoss")
                        {
                           eBullet = new EnemyBulletBasicBoss();
                           eBullet.radius = 6;
                           eBullet.speed = 4 * bulletSpeedMultiplier;
                           eBullet.damage = 2;
                           eBullet.lifeTimeMax = 90;
                           eBullet.lifeTime = eBullet.lifeTimeMax;
                        }
                        else if(theEnemy.shootType == "Trap")
                        {
                           eBullet = new EnemyBulletTrap();
                           eBullet.radius = 6;
                           eBullet.speed = 0;
                           eBullet.damage = 2;
                           eBullet.lifeTimeMax = 300;
                           eBullet.lifeTime = eBullet.lifeTimeMax;
                        }
                        else if(theEnemy.shootType == "Hook")
                        {
                           eBullet = new EnemyBulletHook();
                           eBullet.radius = 5;
                           eBullet.speed = 5 * bulletSpeedMultiplier;
                           eBullet.damage = 1;
                           eBullet.lifeTimeMax = 100;
                           eBullet.lifeTime = eBullet.lifeTimeMax;
                           eBullet.enemy = theEnemy;
                        }
                        if(theEnemy.shootType == "Following")
                        {
                           eBullet = new EnemyBulletFollowing();
                           eBullet.radius = 4;
                           eBullet.speed = 4 * bulletSpeedMultiplier;
                           eBullet.damage = 1;
                           eBullet.lifeTimeMax = 90;
                           eBullet.lifeTime = eBullet.lifeTimeMax;
                        }
                        else if(theEnemy.shootType == "FollowingBoss")
                        {
                           eBullet = new EnemyBulletFollowingBoss();
                           eBullet.radius = 6;
                           eBullet.speed = 4 * bulletSpeedMultiplier;
                           eBullet.damage = 2;
                           eBullet.lifeTimeMax = 90;
                           eBullet.lifeTime = eBullet.lifeTimeMax;
                        }
                        eBullet.reflected = false;
                        if(theEnemy.shootType != "Trap")
                        {
                           this.enemyBulletLayer.addChild(eBullet);
                           eBullet.gotoAndStop(1);
                        }
                        else
                        {
                           this.enemyTrapLayer.addChild(eBullet);
                        }
                        if(theEnemy.shootAngle == "Front")
                        {
                           eBullet.x = theEnemy.x + Math.cos(theEnemy.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.y = theEnemy.y + Math.sin(theEnemy.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.rotation = theEnemy.rotation;
                           eBullet.angle = eBullet.rotation / 180 * Math.PI;
                        }
                        else if(theEnemy.shootAngle == "FrontAmount")
                        {
                           eBullet.rotation = theEnemy.rotation + (b * 20 - theEnemy.bulletAmount / 2 * 20 + 10);
                           eBullet.x = theEnemy.x + Math.cos(eBullet.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.y = theEnemy.y + Math.sin(eBullet.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.angle = eBullet.rotation / 180 * Math.PI;
                        }
                        else if(theEnemy.shootAngle == "FrontSides")
                        {
                           eBullet.rotation = theEnemy.rotation + (b * 90 - theEnemy.bulletAmount / 2 * 90 + 45);
                           eBullet.x = theEnemy.x + Math.cos(eBullet.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.y = theEnemy.y + Math.sin(eBullet.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.angle = eBullet.rotation / 180 * Math.PI;
                        }
                        else if(theEnemy.shootAngle == "BackTrap")
                        {
                           eBullet.rotation = theEnemy.rotation + 180 + (b * 20 - theEnemy.bulletAmount / 2 * 20 + 10);
                           eBullet.x = theEnemy.x + Math.cos(eBullet.rotation / 180 * Math.PI) * theEnemy.radius;
                           eBullet.y = theEnemy.y + Math.sin(eBullet.rotation / 180 * Math.PI) * theEnemy.radius;
                           eBullet.angle = 0;
                        }
                        else if(theEnemy.shootAngle == "Center")
                        {
                           eBullet.x = theEnemy.x;
                           eBullet.y = theEnemy.y;
                           eBullet.rotation = Math.random() * 360;
                           eBullet.angle = 0;
                        }
                        else if(theEnemy.shootAngle == "Circle")
                        {
                           randomRotation = Math.random() * 360;
                           eBullet.rotation = randomRotation + b * (360 / theEnemy.bulletAmount);
                           eBullet.x = theEnemy.x + Math.cos(eBullet.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.y = theEnemy.y + Math.sin(eBullet.rotation / 180 * Math.PI) * (theEnemy.radius + eBullet.radius);
                           eBullet.angle = eBullet.rotation / 180 * Math.PI;
                        }
                        eBullet.xVel = Math.cos(eBullet.angle) * eBullet.speed;
                        eBullet.yVel = Math.sin(eBullet.angle) * eBullet.speed;
                        this.enemyBulletArray.push(eBullet);
                        if(theEnemy.enemyType == "GrapplingHook" || theEnemy.enemyType == "GrapplingHookB")
                        {
                           ++theEnemy.bulletsShooting;
                        }
                     }
                     theEnemy.reloadTime = theEnemy.reloadTimeMax;
                  }
                  else if(!theEnemy.frozen)
                  {
                     --theEnemy.reloadTime;
                  }
               }
            }
         }
      }
      
      private function handleGround() : void
      {
         var i:* = undefined;
         var theGround:* = undefined;
         var scale:* = undefined;
         var ii:* = undefined;
         var theBullet:* = undefined;
         for(i = 0; i < this.groundArray.length; i++)
         {
            theGround = this.groundArray[i];
            if(theGround.lifeTime > 0)
            {
               --theGround.lifeTime;
               if(theGround.lifeTime < 30)
               {
                  theGround.alpha = theGround.lifeTime / 30 * 0.9 + 0.1;
               }
               if(theGround == "[object ObjectGroundLava]")
               {
                  scale = theGround.scaleMax - (theGround.scaleMax - theGround.scaleMin) * (theGround.lifeTime / ScreenUpgrades.upgradeArrayLavaball[5][ScreenUpgrades.levelsArraySecondary[9] - 1]);
                  theGround.scaleX = scale;
                  theGround.scaleY = scale;
                  theGround.radius = 20 * scale;
               }
               if(theGround == "[object ObjectGroundIce]")
               {
                  for(ii = 0; ii < this.bulletArray.length; ii++)
                  {
                     theBullet = this.bulletArray[ii];
                     if(theBullet == "[object BulletFire]" && this.distanceBetween(theGround.x,theGround.y,theBullet.x,theBullet.y) < theBullet.radius + theGround.radius)
                     {
                        if(theGround.lifeTime >= 3)
                        {
                           theGround.lifeTime -= 3;
                        }
                        else
                        {
                           theGround.lifeTime = 0;
                        }
                     }
                     else if(theBullet == "[object BulletLaser]" && theBullet.currentFrame == 1)
                     {
                        if(this.circleToLineCollision(new Point(theBullet.startX,theBullet.startY),new Point(theBullet.endX,theBullet.endY),new Point(theGround.x,theGround.y),theGround.radius + theBullet.radius).collision)
                        {
                           theGround.lifeTime = 0;
                        }
                     }
                  }
               }
            }
            if(theGround.lifeTime <= 0)
            {
               this.groundArray.splice(i,1);
               this.groundLayer.removeChild(theGround);
               i--;
            }
         }
      }
      
      public function uncolorClip(mc:*) : *
      {
         mc.transform.colorTransform = new ColorTransform();
      }
      
      private function differenceBetweenAngles(firstAngle:Number, secondAngle:Number) : *
      {
         var difference:* = undefined;
         difference = secondAngle - firstAngle;
         while(difference < -180)
         {
            difference += 360;
         }
         while(difference > 180)
         {
            difference -= 360;
         }
         return difference;
      }
      
      private function spawnWarnings() : void
      {
         var warning:* = undefined;
         var enemyTypesInMap:* = undefined;
         var randomNum:* = undefined;
         var partCounter:* = undefined;
         var foundPosition:* = undefined;
         var i:* = undefined;
         var normalOfTotal:* = undefined;
         var amountOfTheEnemy:* = undefined;
         var enemyTypeName:* = undefined;
         var u:* = undefined;
         var uu:* = undefined;
         var currentOfTotal:* = undefined;
         var v:* = undefined;
         var searchPlace:* = undefined;
         var xPos:* = undefined;
         var yPos:* = undefined;
         var randX:* = undefined;
         var randY:* = undefined;
         var camRoomDifX:* = undefined;
         var camRoomDifY:* = undefined;
         var ii:* = undefined;
         var amountIsTooLow:* = undefined;
         var leastAmount:* = undefined;
         var enemyModelCurrent:* = MovieClip(parent).enemyModelCurrent;
         var countDownTime:* = MovieClip(parent).pInterface.countDown;
         if(this.leastAmountTimer < this.leastAmountTimerMax)
         {
            ++this.leastAmountTimer;
         }
         if(PartTutorial.tutorialOn && !PartTutorial.tutorialCompleted && !PartTutorial.checkIfTutorialDone("AimShoot"))
         {
            ScreenGame.reloadTimeEnemy = 1;
         }
         if(ScreenGame.reloadTimeEnemy <= 0 && (ScreenGame.enemiesLeft - this.warningArray.length > 0 || ScreenLevelSelect.levelMode == "Boss" && ScreenGame.enemiesLeft - ScreenGame.bossAmountSpawned > 0 || ScreenLevelSelect.levelMode == "Flag") && this.warningArray.length + ScreenGame.currentEnemies != ScreenGame.maxEnemies && (ScreenLevelSelect.levelMode != "Boss" || ScreenGame.bossAmount > ScreenGame.bossAmountKilled))
         {
            if(ScreenLevelSelect.levelMode == "Defense")
            {
               ScreenGame.reloadTimeEnemy = Math.round((this.warningArray.length + ScreenGame.currentEnemies) / ScreenGame.maxEnemies * 5 * ScreenGame.reloadTimeEnemyMax);
            }
            else
            {
               ScreenGame.reloadTimeEnemy = Math.round(ScreenGame.reloadTimeEnemyMax + (this.warningArray.length + ScreenGame.currentEnemies) / ScreenGame.maxEnemies * 5 * ScreenGame.reloadTimeEnemyMax);
            }
            if(ScreenGame.enemiesLeft - this.warningArray.length <= 10)
            {
               ScreenGame.reloadTimeEnemy = Math.round(ScreenGame.reloadTimeEnemy / (1 + (10 - (ScreenGame.enemiesLeft - this.warningArray.length)) / 6));
            }
            warning = new WarningEnemy();
            this.particleLayer.addChild(warning);
            if(countDownDone)
            {
               warning.timeLeft = 100;
            }
            else
            {
               warning.timeLeft = countDownTime;
            }
            enemyTypesInMap = (enemyModelCurrent.length - 2) / 2;
            randomNum = Math.random();
            partCounter = 0;
            if(ScreenLevelSelect.levelMode != "Boss" || ScreenGame.bossAmountSpawned == ScreenGame.bossAmount)
            {
               for(i = 0; i < enemyTypesInMap; i++)
               {
                  normalOfTotal = enemyModelCurrent[3 + 2 * i] / enemyModelCurrent[0];
                  if(ScreenLevelSelect.levelMode == "Boss" || ScreenLevelSelect.levelMode == "Flag")
                  {
                     amountOfTheEnemy = 0;
                     enemyTypeName = String(enemyModelCurrent[2 + 2 * i]);
                     for(u = 0; u < this.enemyArray.length; u++)
                     {
                        if(this.enemyArray[u].enemyLevel != "B" && String(this.enemyArray[u]).indexOf(enemyTypeName.slice(0,enemyTypeName.length - 1)) != -1)
                        {
                           amountOfTheEnemy++;
                        }
                     }
                     for(uu = 0; uu < this.warningArray.length; uu++)
                     {
                        if(this.warningArray[uu].enemyLevel != "B" && String(this.warningArray[uu].enemy).indexOf(enemyTypeName.slice(0,enemyTypeName.length - 1)) != -1)
                        {
                           amountOfTheEnemy++;
                        }
                     }
                     currentOfTotal = amountOfTheEnemy / (ScreenGame.maxEnemies - ScreenGame.bossAmount + ScreenGame.bossAmountKilled);
                  }
                  if((ScreenLevelSelect.levelMode != "Boss" && ScreenLevelSelect.levelMode != "Flag" && randomNum <= partCounter + normalOfTotal || (ScreenLevelSelect.levelMode == "Boss" || ScreenLevelSelect.levelMode == "Flag") && (currentOfTotal < normalOfTotal && randomNum <= partCounter + normalOfTotal || i == enemyTypesInMap - 1)) && enemyModelCurrent[2 + 2 * i].slice(enemyModelCurrent[2 + 2 * i].length - 1,enemyModelCurrent[2 + 2 * i].length) != "B")
                  {
                     warning.enemy = enemyModelCurrent[2 + 2 * i];
                     warning.enemyLevel = warning.enemy.slice(warning.enemy.length - 1,warning.enemy.length);
                     warning.enemy = warning.enemy.slice(0,-1);
                     if(ScreenLevelSelect.levelMode != "Flag" && ScreenLevelSelect.levelMode != "Boss")
                     {
                        --enemyModelCurrent[3 + 2 * i];
                        --enemyModelCurrent[0];
                     }
                     break;
                  }
                  if(enemyModelCurrent[2 + 2 * i].slice(enemyModelCurrent[2 + 2 * i].length - 1,enemyModelCurrent[2 + 2 * i].length) != "B")
                  {
                     partCounter += normalOfTotal;
                  }
               }
            }
            else
            {
               for(v = 0; v < (this.selectedEnemyModel[ScreenGame.level - 1].length - 2) / 2; v++)
               {
                  searchPlace = this.selectedEnemyModel[ScreenGame.level - 1][2 + v * 2];
                  if(enemyModelCurrent[3 + 2 * v] != 0 && searchPlace.slice(searchPlace.length - 1,searchPlace.length) == "B")
                  {
                     warning.enemy = enemyModelCurrent[2 + 2 * v];
                     warning.enemyLevel = warning.enemy.slice(warning.enemy.length - 1,warning.enemy.length);
                     warning.enemy = warning.enemy.slice(0,-1);
                     --enemyModelCurrent[3 + 2 * v];
                     --enemyModelCurrent[0];
                     ++ScreenGame.bossAmountSpawned;
                     break;
                  }
               }
            }
            foundPosition = false;
            if(!(countDownDone || ScreenLevelSelect.levelMode == "Defense" || roomWidth == cameraWidth || roomHeight == cameraHeight || ScreenLevelSelect.levelMode == "Boss" && warning.enemyLevel == "B"))
            {
               xPos = 0;
               yPos = 0;
               randX = Math.random();
               randY = Math.random();
               camRoomDifX = roomWidth - cameraWidth;
               camRoomDifY = roomHeight - cameraHeight;
               for(ii = 0; ii < 25; ii++)
               {
                  xPos = randX * roomWidth;
                  yPos = randY * roomHeight;
                  if(!(xPos > camRoomDifX / 2 && xPos < roomWidth - camRoomDifX / 2 && (yPos > camRoomDifY / 2 && yPos < roomHeight - camRoomDifY / 2)))
                  {
                     foundPosition = true;
                     break;
                  }
                  randX = Math.random();
                  randY = Math.random();
               }
               warning.x = xPos;
               warning.y = yPos;
            }
            if(countDownDone || foundPosition == false || ScreenLevelSelect.levelMode == "Defense" || roomWidth == cameraWidth || roomHeight == cameraHeight || ScreenLevelSelect.levelMode == "Boss" && warning.enemyLevel == "B")
            {
               if(ScreenLevelSelect.levelMode == "Defense")
               {
                  warning.wall = 1;
               }
               else
               {
                  warning.wall = Math.floor(Math.random() * 4) + 1;
               }
               if(warning.wall == 1)
               {
                  if(ScreenLevelSelect.levelMode == "Tower")
                  {
                     warning.x = Math.random() * roomWidth / 4 + roomWidth / 4;
                  }
                  else
                  {
                     warning.x = Math.random() * roomWidth;
                  }
                  warning.y = 0;
               }
               else if(warning.wall == 2)
               {
                  warning.x = 0;
                  if(ScreenLevelSelect.levelMode == "Tower")
                  {
                     warning.y = Math.random() * roomHeight / 4 + roomHeight / 2;
                  }
                  else
                  {
                     warning.y = Math.random() * roomHeight;
                  }
               }
               else if(warning.wall == 3)
               {
                  if(ScreenLevelSelect.levelMode == "Tower")
                  {
                     warning.x = Math.random() * roomWidth / 4 + roomWidth / 2;
                  }
                  else
                  {
                     warning.x = Math.random() * roomWidth;
                  }
                  warning.y = roomHeight;
               }
               else if(warning.wall == 4 || warning.wall == 5)
               {
                  warning.x = roomWidth;
                  if(ScreenLevelSelect.levelMode == "Tower")
                  {
                     warning.y = Math.random() * roomHeight / 4 + roomHeight / 4;
                  }
                  else
                  {
                     warning.y = Math.random() * roomHeight;
                  }
               }
            }
            this.warningArray.push(warning);
         }
         else if(ScreenGame.reloadTimeEnemy > 0)
         {
            --ScreenGame.reloadTimeEnemy;
            amountIsTooLow = false;
            leastAmount = 5;
            if(ScreenGame.level == 1)
            {
               leastAmount = 0;
            }
            else
            {
               leastAmount = Math.round(2 - 2 * (this.leastAmountTimer / this.leastAmountTimerMax) + leastAmount * (this.leastAmountTimer / this.leastAmountTimerMax));
            }
            if(this.warningArray.length + ScreenGame.currentEnemies < leastAmount)
            {
               amountIsTooLow = true;
            }
            if(Boolean(amountIsTooLow) && ScreenGame.reloadTimeEnemy > 10)
            {
               ScreenGame.reloadTimeEnemy = 10;
            }
         }
      }
      
      internal function circleToLineCollision(A:Point, B:Point, C:Point, r:Number = 1) : Object
      {
         var result:Object = null;
         var a:Number = NaN;
         var b:Number = NaN;
         var cc:Number = NaN;
         var deter:Number = NaN;
         var e:Number = NaN;
         var u1:Number = NaN;
         var u2:Number = NaN;
         result = new Object();
         result.inside = false;
         result.tangent = false;
         result.intersects = false;
         result.collision = false;
         result.enter = null;
         result.exit = null;
         a = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
         b = 2 * ((B.x - A.x) * (A.x - C.x) + (B.y - A.y) * (A.y - C.y));
         cc = C.x * C.x + C.y * C.y + A.x * A.x + A.y * A.y - 2 * (C.x * A.x + C.y * A.y) - r * r;
         deter = b * b - 4 * a * cc;
         if(deter <= 0)
         {
            result.inside = false;
         }
         else
         {
            e = Math.sqrt(deter);
            u1 = (-b + e) / (2 * a);
            u2 = (-b - e) / (2 * a);
            if((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1))
            {
               if(u1 < 0 && u2 < 0 || u1 > 1 && u2 > 1)
               {
                  result.inside = false;
               }
               else
               {
                  result.inside = true;
               }
            }
            else
            {
               if(0 <= u2 && u2 <= 1)
               {
                  result.enter = Point.interpolate(A,B,1 - u2);
               }
               if(0 <= u1 && u1 <= 1)
               {
                  result.exit = Point.interpolate(A,B,1 - u1);
               }
               result.intersects = true;
               if(result.exit != null && result.enter != null && Boolean(result.exit.equals(result.enter)))
               {
                  result.tangent = true;
               }
            }
         }
         if(Boolean(result.intersects) || Boolean(result.inside))
         {
            result.collision = true;
         }
         return result;
      }
   }
}

