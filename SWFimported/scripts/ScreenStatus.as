package
{
   import FGL.GameTracker.GameTracker;
   import fl.transitions.Tween;
   import fl.transitions.easing.Elastic;
   import fl.transitions.easing.Strong;
   import flash.display.Bitmap;
   import flash.display.BitmapData;
   import flash.display.GradientType;
   import flash.display.MovieClip;
   import flash.display.Shape;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.geom.Matrix;
   import flash.text.*;
   import flash.utils.ByteArray;
   import flash.utils.getDefinitionByName;
   
   public class ScreenStatus extends Sprite
   {
      
      public static var pagesTotal:Number;
      
      public static var pageNext:Number;
      
      public static var pagesChanging:Boolean;
      
      public static var pagesArray:Array;
      
      public static var pageCurrent:Number;
      
      public static var windowOkDisplayed:Boolean = false;
      
      public static var nextLevelButtonExposed:Boolean = false;
      
      private var defeatText:TextField = new TextField();
      
      private var currentPageType:String;
      
      private var enemyShooting:EnemyShooting = new EnemyShooting();
      
      private var bNextLevel:ButtonNextLevel = new ButtonNextLevel();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var newEnemyText:TextField = new TextField();
      
      private var shadowArray:Array = filters;
      
      private var newEnemyStrengthsTextRemove:TextField = new TextField();
      
      private var moneyEarnedText:TextField = new TextField();
      
      private var textFormat2:TextFormat = new TextFormat("JG",14,16777215,true,false,false);
      
      private var achievement:MovieClip;
      
      private var textFormat3:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      private var size3Tween:Tween;
      
      private var newAchievementText:TextField = new TextField();
      
      private var valueText:TextField = new TextField();
      
      private var newEnemyNameText:TextField = new TextField();
      
      private var bgMenu:BackgroundMenu = new BackgroundMenu();
      
      private var newEnemyDescriptionTextRemove:TextField = new TextField();
      
      private var countTimeMax:Number = 60;
      
      private var bPlayAgain:ButtonPlayAgain = new ButtonPlayAgain();
      
      private var newAchievementNameTextRemove:TextField = new TextField();
      
      private var valuesArray:Array;
      
      private var myGlow:* = new DropShadowFilter(0,0,16777215,0.75,15,15,1.5,2);
      
      private var spaces:RegExp = / /gi;
      
      private var worldLevelText:TextField = new TextField();
      
      private var newEnemyDescriptionText:TextField = new TextField();
      
      private var bSquarePageRight:ButtonSquarePage = new ButtonSquarePage();
      
      private var pageRemovingContent:MovieClip = new MovieClip();
      
      private var newEnemyWeaknessesText:TextField = new TextField();
      
      private var bSquarePageLeft:ButtonSquarePage = new ButtonSquarePage();
      
      private var countTime:Number = 0;
      
      private var valueParticleArray:Array = new Array();
      
      private var textFormat:TextFormat = new TextFormat("JG",28,16777215,true,false,false);
      
      private var enemyBasic:EnemyBasic = new EnemyBasic();
      
      private var pagesChangeCountMax:Number = 10;
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var valueHolder:Object = new Object();
      
      private var moneyEarnedText2:TextField = new TextField();
      
      private var moneyValue:Number = 0;
      
      private var achievementRemove:MovieClip;
      
      private var newEnemiesArray:Array;
      
      private var newEnemyWeaknessesTextRemove:TextField = new TextField();
      
      private var size2Tween:Tween = new Tween(this.valueHolder,"size2",Elastic.easeOut,0.05,3,15,false);
      
      private var starsExplainText:TextField = new TextField();
      
      private var nextPageType:String;
      
      private var square1:BackgroundSquare = new BackgroundSquare();
      
      private var square2:BackgroundSquare = new BackgroundSquare();
      
      private var square3:BackgroundSquare = new BackgroundSquare();
      
      private var square4:BackgroundSquare = new BackgroundSquare();
      
      private var pageContentStrengthsIconArray:Array = [];
      
      private var theTitleD:TitleDefeat = new TitleDefeat();
      
      private var newEnemyStrengthsText:TextField = new TextField();
      
      private var pageTweenRemove:Tween = new Tween(this.valueHolder,"pageRemoveValue",Strong.easeOut,0,1,10,false);
      
      private var glowArray:Array = filters;
      
      private var theTitleV:TitleVictory = new TitleVictory();
      
      private var pageRemoveDirection:String;
      
      private var enemyTrap:EnemyTrap = new EnemyTrap();
      
      private var pageContentWeaknessesIconArray:Array = [];
      
      private var pagesChangeCount:Number = 10;
      
      private var newAchievementTextRemove:TextField = new TextField();
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var newAchievementNameText:TextField = new TextField();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var newEnemyNameTextRemove:TextField = new TextField();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var newAchievementsArray:Array;
      
      private var valueIconArray:Array = new Array();
      
      private var winParticlesOn:Boolean = false;
      
      private var pageContent:MovieClip = new MovieClip();
      
      private var newEnemyTextRemove:TextField = new TextField();
      
      private var size1Tween:Tween = new Tween(this.valueHolder,"size1",Elastic.easeOut,0.05,3,15,false);
      
      private var hpLeftText:TextField = new TextField();
      
      private var isAdded:Boolean = false;
      
      public function ScreenStatus()
      {
         this.size3Tween = new Tween(this.valueHolder,"size3",Elastic.easeOut,0.05,3,15,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
         this.glowArray.push(this.myGlow);
         this.size1Tween.stop();
         this.size2Tween.stop();
         this.size3Tween.stop();
         this.pageTweenRemove.stop();
      }
      
      public function added(event:Event) : void
      {
         var victoryDefeat:String = null;
         var valuesCount:* = undefined;
         var values:* = undefined;
         var valueType:* = undefined;
         var valueSlot:* = undefined;
         var valueShapeText:* = undefined;
         var ii:* = undefined;
         var iconS:* = undefined;
         var distance:* = undefined;
         var levelsInCurrentWorld:* = undefined;
         if(!this.isAdded)
         {
            this.isAdded = true;
            GameTracker.api.customMsg("World " + ScreenGame.world + " - Level " + ScreenGame.level + " - " + ScreenLevelSelect.levelMode + " - " + ScreenLevelSelect.levelDifficulty + " - " + ScreenGame.hp + " HP - Equipped: " + ScreenGame.equippedWeapons[0] + " and " + ScreenGame.equippedWeapons[1] + " - Used: " + ScreenGame.primaryWeapon + " and " + ScreenGame.secondaryWeapon);
            victoryDefeat = "";
            if(ScreenGame.hp > 0)
            {
               victoryDefeat = "Victory";
            }
            else
            {
               victoryDefeat = "Defeat";
            }
            Main.googleTracker.trackEvent(victoryDefeat,"World " + ScreenGame.world + " - Level " + ScreenGame.level,ScreenLevelSelect.levelMode + " - " + ScreenLevelSelect.levelDifficulty + " - " + ScreenGame.hp + " HP - Equipped: " + ScreenGame.equippedWeapons[0] + " and " + ScreenGame.equippedWeapons[1] + " - Used: " + ScreenGame.primaryWeapon + " and " + ScreenGame.secondaryWeapon);
            nextLevelButtonExposed = false;
            addEventListener(Event.ENTER_FRAME,this.update);
            windowOkDisplayed = false;
            pagesArray = ["Standard"];
            addChild(this.bgTitle);
            addChild(this.bgMenu);
            this.bgMenu.y = this.bgTitle.height;
            addChild(this.square1);
            this.square1.x = 4;
            this.square1.y = 92;
            addChild(this.square2);
            this.square2.x = 322;
            this.square2.y = 92;
            addChild(this.square3);
            this.square3.x = 4;
            this.square3.y = 262;
            addChild(this.square4);
            this.square4.x = 322;
            this.square4.y = 262;
            valuesCount = 0;
            this.addText(this.valueText,this.textFormat,16777215,"",28,314,322,122,true);
            this.gradientText(this.valueText,6710886,16777215,28);
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
            valuesCount = values;
            valueType = "";
            valueSlot = 0;
            if(ScreenLevelSelect.levelDifficulty == "Easy")
            {
               valueType = " bronze";
               valueSlot = 2;
            }
            else if(ScreenLevelSelect.levelDifficulty == "Medium")
            {
               valueType = " silver";
               valueSlot = 1;
            }
            else if(ScreenLevelSelect.levelDifficulty == "Hard")
            {
               valueType = " gold";
               valueSlot = 0;
            }
            if(ScreenLevelSelect.levelMode == "Normal")
            {
               if(values == 1)
               {
                  valueShapeText = "star";
               }
               else
               {
                  valueShapeText = "stars";
               }
            }
            else if(ScreenLevelSelect.levelMode == "Flag")
            {
               if(values == 1)
               {
                  valueShapeText = "flag";
               }
               else
               {
                  valueShapeText = "flags";
               }
            }
            else if(ScreenLevelSelect.levelMode == "Defense")
            {
               if(values == 1)
               {
                  valueShapeText = "shield";
               }
               else
               {
                  valueShapeText = "shields";
               }
            }
            else if(ScreenLevelSelect.levelMode == "Tower")
            {
               if(values == 1)
               {
                  valueShapeText = "tower";
               }
               else
               {
                  valueShapeText = "towers";
               }
            }
            else if(ScreenLevelSelect.levelMode == "Boss")
            {
               if(values == 1)
               {
                  valueShapeText = "boss";
               }
               else
               {
                  valueShapeText = "bosses";
               }
            }
            valueShapeText = "medals";
            if(values != 0)
            {
               if(values == 1 && valueType == " bronze")
               {
                  this.valueText.text = values + valueType + " " + valueShapeText;
               }
               else
               {
                  this.valueText.text = values + valueType + " " + valueShapeText;
               }
            }
            else
            {
               this.valueText.text = "no" + valueType + " " + valueShapeText;
               this.addText(this.defeatText,this.textFormat2,16777215,"Sad :\'(",100,314,322,195,true,true);
            }
            if(ScreenGame.world == 9 && ScreenGame.level == 45 && ScreenLevelSelect.worldsValuesArrays[ScreenGame.world - 1][ScreenGame.level - 1][0] == 0 && ScreenLevelSelect.worldsValuesArrays[ScreenGame.world - 1][ScreenGame.level - 1][1] == 0 && ScreenLevelSelect.worldsValuesArrays[ScreenGame.world - 1][ScreenGame.level - 1][2] == 0 && ScreenGame.hp >= 1)
            {
               this.winParticlesOn = true;
            }
            ScreenLevelSelect.worldsValuesVisibleArrays = this.clone(ScreenLevelSelect.worldsValuesArrays);
            if(ScreenLevelSelect.worldsValuesArrays[ScreenGame.world - 1][ScreenGame.level - 1][valueSlot] < values)
            {
               ScreenLevelSelect.worldsValuesArrays[ScreenGame.world - 1][ScreenGame.level - 1][valueSlot] = values;
            }
            for(ii = 0; ii < valuesCount; ii++)
            {
               if(ScreenLevelSelect.levelMode == "Normal")
               {
                  iconS = new IconStar();
               }
               else if(ScreenLevelSelect.levelMode == "Flag")
               {
                  iconS = new IconFlag();
               }
               else if(ScreenLevelSelect.levelMode == "Defense")
               {
                  iconS = new IconShield();
               }
               else if(ScreenLevelSelect.levelMode == "Tower")
               {
                  iconS = new IconTower();
               }
               else if(ScreenLevelSelect.levelMode == "Boss")
               {
                  iconS = new IconBoss();
               }
               if(ScreenLevelSelect.levelDifficulty == "Easy")
               {
                  iconS.gotoAndStop(1);
               }
               else if(ScreenLevelSelect.levelDifficulty == "Medium")
               {
                  iconS.gotoAndStop(2);
               }
               else if(ScreenLevelSelect.levelDifficulty == "Hard")
               {
                  iconS.gotoAndStop(3);
               }
               addChild(iconS);
               distance = 70;
               iconS.x = 479 - distance / 2 * (valuesCount - 1) + ii * distance;
               iconS.y = 200;
               iconS.filters = this.shadowArray;
               iconS.alpha = 0;
               this.valueIconArray.push(iconS);
            }
            this.moneyValue = ScreenGame.money;
            ScreenGame.money = 0;
            this.newAchievementsArray = ScreenAchievements.updateAchievements();
            if(this.newAchievementsArray.length > 0)
            {
               pagesArray = this.pushAllFromArrayToArray(pagesArray,this.newAchievementsArray,"Achievement");
            }
            if(ScreenGame.hp > 0)
            {
               levelsInCurrentWorld = ScreenGame.worldModels[3 * ScreenGame.world - 3].length;
               if(ScreenGame.level < levelsInCurrentWorld)
               {
                  this.newEnemiesArray = ScreenEnemies.updateEnemies(ScreenGame.world,ScreenGame.level + 1);
               }
               else if(ScreenGame.world < ScreenLevelSelect.totalWorlds)
               {
                  this.newEnemiesArray = ScreenEnemies.updateEnemies(ScreenGame.world + 1,1);
               }
               else
               {
                  this.newEnemiesArray = [];
               }
               if(this.newEnemiesArray.length > 0)
               {
                  pagesArray = this.pushAllFromArrayToArray(pagesArray,this.newEnemiesArray,"Enemy");
               }
            }
            pagesTotal = (pagesArray.length - 1) / 2 + 1;
            pageCurrent = pagesTotal;
            pageNext = pagesTotal;
            pagesChanging = false;
            this.currentPageType = this.getPageType(pageCurrent);
            this.nextPageType = this.getPageType(pageNext);
            this.bSquarePageLeft.dir = "Left";
            addChild(this.bSquarePageLeft);
            this.bSquarePageLeft.x = this.square4.x;
            this.bSquarePageLeft.y = this.square4.y;
            this.bSquarePageRight.dir = "Right";
            addChild(this.bSquarePageRight);
            this.bSquarePageRight.x = this.square4.x + this.square4.width - this.bSquarePageRight.width;
            this.bSquarePageRight.y = this.square4.y;
            if(ScreenGame.hp == 0)
            {
               addChild(this.theTitleD);
               this.theTitleD.x = 320;
               this.theTitleD.y = 40;
               this.theTitleD.scaleX = 0.9;
               this.theTitleD.scaleY = 0.9;
               this.addText(this.worldLevelText,this.textFormat2,13369344,"World " + ScreenGame.world + " - Level " + ScreenGame.level,16,200,220,65,true);
            }
            else
            {
               addChild(this.theTitleV);
               this.theTitleV.x = 320;
               this.theTitleV.y = 40;
               this.theTitleV.scaleX = 0.9;
               this.theTitleV.scaleY = 0.9;
               this.addText(this.worldLevelText,this.textFormat2,52224,"World " + ScreenGame.world + " - Level " + ScreenGame.level,16,200,220,65,true);
            }
            addChild(this.sponsorLogo);
            this.addText(this.hpLeftText,this.textFormat,16711680,"Health left: " + ScreenGame.hp,64,314,4,122,true);
            this.gradientText(this.hpLeftText,6684672,16711680,28);
            this.addText(this.starsExplainText,this.textFormat2,16711680,"",100,314,4,178,true,true);
            if(ScreenLevelSelect.levelMode == "Normal")
            {
               this.starsExplainText.text = "(3 stars: 95-100)\n(2 stars: 75-94)\n(1 star: 1-74)";
            }
            else if(ScreenLevelSelect.levelMode == "Flag")
            {
               this.starsExplainText.text = "(3 flags: 95-100)\n(2 flags: 75-94)\n(1 flag: 1-74)";
            }
            else if(ScreenLevelSelect.levelMode == "Defense")
            {
               this.starsExplainText.text = "(3 shields: 95-100)\n(2 shields: 75-94)\n(1 shield: 1-74)";
            }
            else if(ScreenLevelSelect.levelMode == "Tower")
            {
               this.starsExplainText.text = "(3 towers: 95-100)\n(2 towers: 75-94)\n(1 tower: 1-74)";
            }
            else if(ScreenLevelSelect.levelMode == "Boss")
            {
               this.starsExplainText.text = "(3 bosses: 95-100)\n(2 bosses: 75-94)\n(1 boss: 1-74)";
            }
            this.addText(this.moneyEarnedText,this.textFormat,65280,"Money Earned",128,314,0,88 + 4 + 166 + 4 + 83 - 32,true);
            this.gradientText(this.moneyEarnedText,26112,65280,28);
            this.addText(this.moneyEarnedText2,this.textFormat,65280,"",64,314,0,88 + 4 + 166 + 4 + 83,true);
            this.gradientText(this.moneyEarnedText2,26112,65280,28);
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 480 - this.bottomBar.height;
            addChild(this.pageRemovingContent);
            this.pageRemovingContent.mouseEnabled = false;
            addChild(this.pageContent);
            this.pageContent.mouseEnabled = false;
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
            this.changePage(true);
            ScreenLevelSelect.previousWorld = ScreenGame.world;
            ScreenLevelSelect.previousLevel = ScreenGame.level;
            if(ScreenGame.hp > 0)
            {
               ScreenLevelSelect.previousLevelWon = true;
            }
            else
            {
               ScreenLevelSelect.previousLevelWon = false;
            }
            SaveManager.saveStatus();
            if(LevelGuide.autoSelect)
            {
               LevelGuide.type = "Upcoming";
               LevelGuide.updateVariables();
            }
            else
            {
               LevelGuide.setMaxWorld();
               LevelGuide.setMaxLevel(LevelGuide.maxWorld);
            }
         }
      }
      
      private function spawnParticle(xPos:Number, yPos:Number, winParticle:Boolean = false) : void
      {
         var particle:* = undefined;
         if(!winParticle)
         {
            particle = new IconMode();
            if(ScreenLevelSelect.levelMode == "Normal")
            {
               particle.gotoAndStop(1 * 3 - 2);
            }
            else if(ScreenLevelSelect.levelMode == "Flag")
            {
               particle.gotoAndStop(2 * 3 - 2);
            }
            else if(ScreenLevelSelect.levelMode == "Defense")
            {
               particle.gotoAndStop(3 * 3 - 2);
            }
            else if(ScreenLevelSelect.levelMode == "Tower")
            {
               particle.gotoAndStop(4 * 3 - 2);
            }
            else if(ScreenLevelSelect.levelMode == "Boss")
            {
               particle.gotoAndStop(5 * 3 - 2);
            }
         }
         else
         {
            particle = new WinParticle();
            particle.gotoAndStop(1 + Math.round(Math.random() * (particle.totalFrames - 1)));
         }
         if(!winParticle)
         {
            particle.x = xPos + Math.random() * 30 - 15;
            particle.y = yPos + Math.random() * 30 - 15;
            particle.vel = Math.random() * 12 + 7;
            particle.friction = 0.7;
            particle.deathVel = 1;
            particle.flyAngle = Math.random() * 360;
            particle.gravity = 0;
            particle.lifeTimeMax = 15 + Math.random() * 10;
            particle.lifeTime = particle.lifeTimeMax;
         }
         else
         {
            particle.x = xPos;
            particle.y = yPos;
            particle.vel = Math.random() * 0.2 + 1.5;
            particle.friction = -0.015;
            particle.deathVel = 0;
            particle.flyAngle = 80 + Math.random() * 20;
            particle.gravity = 0.02;
            particle.lifeTimeMax = 300 + Math.random() * 40;
            particle.lifeTime = particle.lifeTimeMax;
         }
         particle.xVel = particle.vel * Math.cos(particle.flyAngle / 180 * Math.PI);
         particle.yVel = particle.vel * Math.sin(particle.flyAngle / 180 * Math.PI);
         addChild(particle);
         particle.mouseEnabled = false;
         this.valueParticleArray.push(particle);
      }
      
      private function pushAllFromArrayToArray(arrayTo:Array, arrayFrom:Array, type:String) : *
      {
         var theArray:* = arrayTo;
         for(var i:* = 0; i < arrayFrom.length; i++)
         {
            theArray.push(arrayFrom[i]);
            theArray.push(type);
         }
         return theArray;
      }
      
      private function removeChildrensOf(object:Object) : void
      {
         for(var i:* = int(object.numChildren - 1); i >= 0; i--)
         {
            object.removeChildAt(i);
         }
      }
      
      internal function clone(source:Object) : *
      {
         var myBA:ByteArray = new ByteArray();
         myBA.writeObject(source);
         myBA.position = 0;
         return myBA.readObject();
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
         if(nextLevelButtonExposed)
         {
            Main.uihButtonNextLevel = true;
            SaveManager.saveUIHelpers();
         }
      }
      
      private function handleSquarePages() : void
      {
         var pageDifference:* = undefined;
         if(!pagesChanging)
         {
            if(pageCurrent != pageNext)
            {
               this.changePage();
            }
         }
         else
         {
            pageDifference = pageNext - pageCurrent;
            if(pageDifference != 1 && pageDifference != -1)
            {
               this.removeChildrensOf(this.pageRemovingContent);
               this.pagesChangeCount = this.pagesChangeCountMax;
               this.pageRemovingContent.alpha = 1;
               this.pageContent.x = 0;
               this.pageRemovingContent.x = 0;
               if(pageDifference == 0)
               {
                  if(this.pageRemoveDirection == "Left")
                  {
                     ++pageCurrent;
                  }
                  else if(this.pageRemoveDirection == "Right")
                  {
                     --pageCurrent;
                  }
               }
               if(pageDifference > 0)
               {
                  ++pageCurrent;
               }
               else if(pageDifference < 0)
               {
                  --pageCurrent;
               }
               this.changePage();
            }
            if(this.pagesChangeCount == 0)
            {
               pageCurrent = pageNext;
               this.pagesChangeCount = this.pagesChangeCountMax;
               pagesChanging = false;
               this.pageRemovingContent.x = 0;
               this.removeChildrensOf(this.pageRemovingContent);
               this.pageRemovingContent.alpha = 1;
               this.pageContent.x = 0;
               this.pageContent.alpha = 1;
            }
            else
            {
               --this.pagesChangeCount;
               if(this.pageRemoveDirection == "Left")
               {
                  this.pageRemovingContent.x = this.valueHolder.pageRemoveValue * 100;
                  this.pageContent.x = -100 + this.valueHolder.pageRemoveValue * 100;
               }
               else if(this.pageRemoveDirection == "Right")
               {
                  this.pageRemovingContent.x = -this.valueHolder.pageRemoveValue * 100;
                  this.pageContent.x = 100 - this.valueHolder.pageRemoveValue * 100;
               }
               this.pageRemovingContent.alpha = 1 - this.valueHolder.pageRemoveValue;
               this.pageContent.alpha = this.valueHolder.pageRemoveValue;
            }
         }
      }
      
      private function addStrengthsWeaknessesIcons(theParent:*, selectedEnemy:String, strengthsIconArray:Array, weaknessesIconArray:Array) : void
      {
         var iconS:* = undefined;
         var iconW:* = undefined;
         var theStrength:* = undefined;
         var iconSText:* = undefined;
         var theWeakness:* = undefined;
         var iconWText:* = undefined;
         for(var e:* = 0; e < strengthsIconArray.length; e++)
         {
            theParent.removeChild(strengthsIconArray[e]);
            strengthsIconArray.splice(e,1);
            e--;
         }
         for(var ee:* = 0; ee < weaknessesIconArray.length; ee++)
         {
            theParent.removeChild(weaknessesIconArray[ee]);
            weaknessesIconArray.splice(ee,1);
            ee--;
         }
         var enemyStrengthsArray:* = ScreenGame[("enemy" + selectedEnemy + "Strengths").replace(this.spaces,"")];
         var enemyWeaknessesArray:* = ScreenGame[("enemy" + selectedEnemy + "Weaknesses").replace(this.spaces,"")];
         for(var i:* = 0; i < enemyStrengthsArray.length / 2; i++)
         {
            theStrength = enemyStrengthsArray[i * 2];
            iconS = new IconStrongWeak();
            iconS.scaleX = 0.75;
            iconS.scaleY = 0.75;
            iconS.pText = this.pInfoText;
            if(theStrength == "Explosions")
            {
               iconS.gotoAndStop(2);
               iconS.theText = "Explosions";
            }
            else if(theStrength == "FireLava")
            {
               iconS.gotoAndStop(3);
               iconS.theText = "Fire & lava";
            }
            else if(theStrength == "Bullets")
            {
               iconS.gotoAndStop(4);
               iconS.theText = "Bullets";
            }
            else if(theStrength == "Poison")
            {
               iconS.gotoAndStop(5);
               iconS.theText = "Poison";
            }
            else if(theStrength == "Laser")
            {
               iconS.gotoAndStop(6);
               iconS.theText = "Laser";
            }
            else if(theStrength == "Ice")
            {
               iconS.gotoAndStop(7);
               iconS.theText = "Ice";
            }
            else if(theStrength == "Food")
            {
               iconS.gotoAndStop(8);
               iconS.theText = "Food";
            }
            else if(theStrength == "Magic")
            {
               iconS.gotoAndStop(9);
               iconS.theText = "Magic";
            }
            theParent.addChild(iconS);
            iconS.x = 516 + i * 30;
            iconS.y = 380;
            iconSText = new TextField();
            this.addText(iconSText,this.textFormat3,16777215,Number(enemyStrengthsArray[i * 2 + 1]) * 100 + "%",14,50,-25,2,true,true,iconS);
            strengthsIconArray.push(iconS);
         }
         if(enemyStrengthsArray.length == 0)
         {
            iconS = new IconStrongWeak();
            iconS.scaleX = 0.75;
            iconS.scaleY = 0.75;
            theParent.addChild(iconS);
            iconS.x = 516;
            iconS.y = 380;
            iconS.gotoAndStop(1);
            strengthsIconArray.push(iconS);
         }
         for(var ii:* = 0; ii < enemyWeaknessesArray.length / 2; ii++)
         {
            theWeakness = enemyWeaknessesArray[ii * 2];
            iconW = new IconStrongWeak();
            iconW.scaleX = 0.75;
            iconW.scaleY = 0.75;
            iconW.pText = this.pInfoText;
            if(theWeakness == "Explosions")
            {
               iconW.gotoAndStop(10);
               iconW.theText = "Explosions";
            }
            else if(theWeakness == "FireLava")
            {
               iconW.gotoAndStop(11);
               iconW.theText = "Fire & lava";
            }
            else if(theWeakness == "Bullets")
            {
               iconW.gotoAndStop(12);
               iconW.theText = "Bullets";
            }
            else if(theWeakness == "Poison")
            {
               iconW.gotoAndStop(13);
               iconW.theText = "Poison";
            }
            else if(theWeakness == "Laser")
            {
               iconW.gotoAndStop(14);
               iconW.theText = "Laser";
            }
            else if(theWeakness == "Ice")
            {
               iconW.gotoAndStop(15);
               iconW.theText = "Ice";
            }
            else if(theWeakness == "Food")
            {
               iconW.gotoAndStop(16);
               iconW.theText = "Food";
            }
            else if(theWeakness == "Magic")
            {
               iconW.gotoAndStop(17);
               iconW.theText = "Magic";
            }
            theParent.addChild(iconW);
            iconW.x = 531 + ii * 30;
            iconW.y = 406;
            iconWText = new TextField();
            this.addText(iconWText,this.textFormat3,16777215,Number(enemyWeaknessesArray[ii * 2 + 1]) * 100 + "%",14,50,-25,2,true,true,iconW);
            weaknessesIconArray.push(iconW);
         }
         if(enemyWeaknessesArray.length == 0)
         {
            iconW = new IconStrongWeak();
            iconW.scaleX = 0.75;
            iconW.scaleY = 0.75;
            theParent.addChild(iconW);
            iconW.x = 531;
            iconW.y = 406;
            iconW.gotoAndStop(1);
            weaknessesIconArray.push(iconW);
         }
      }
      
      private function handleParticles() : void
      {
         var theParticle:* = undefined;
         var theAngle:* = undefined;
         for(var i:* = 0; i < this.valueParticleArray.length; i++)
         {
            theParticle = this.valueParticleArray[i];
            if(theParticle.lifeTime > 0 && theParticle.vel > theParticle.deathVel && theParticle.y < 500)
            {
               --theParticle.lifeTime;
               theParticle.x += theParticle.xVel;
               theParticle.y += theParticle.yVel;
               theAngle = Math.atan2(theParticle.yVel,theParticle.xVel);
               theParticle.vel -= theParticle.friction;
               theParticle.xVel = theParticle.vel * Math.cos(theAngle);
               theParticle.yVel = theParticle.vel * Math.sin(theAngle);
               if(theParticle.gravity != 0)
               {
                  theParticle.yVel += theParticle.gravity;
                  theParticle.vel = Math.sqrt(Math.pow(theParticle.xVel,2) + Math.pow(theParticle.yVel,2));
               }
               theParticle.alpha = theParticle.lifeTime / theParticle.lifeTimeMax * (theParticle.lifeTime / theParticle.lifeTimeMax);
            }
            else
            {
               removeChild(theParticle);
               this.valueParticleArray.splice(i,1);
               i--;
            }
         }
      }
      
      private function changePage(firstPage:Boolean = false) : void
      {
         var pageNameCurrent:* = undefined;
         var pageNameNext:* = undefined;
         var removedObjectsBitmapData:* = undefined;
         var removedObjectsBitmap:* = undefined;
         var valuesForCurrentLevel:* = undefined;
         var achievementData:* = undefined;
         var description:* = undefined;
         var enemy:* = undefined;
         this.currentPageType = this.getPageType(pageCurrent);
         this.nextPageType = this.getPageType(pageNext);
         if(pageCurrent == 1)
         {
            pageNameCurrent = "Standard";
         }
         else
         {
            pageNameCurrent = pagesArray[pageCurrent * 2 - 3];
         }
         if(pageNext == 1)
         {
            pageNameNext = "Standard";
         }
         else
         {
            pageNameNext = pagesArray[pageNext * 2 - 3];
         }
         if(!firstPage)
         {
            this.pageTweenRemove.stop();
            this.pageTweenRemove.start();
            if(pageNext > pageCurrent)
            {
               this.pageRemoveDirection = "Left";
            }
            else if(pageNext < pageCurrent)
            {
               this.pageRemoveDirection = "Right";
            }
         }
         if(!firstPage)
         {
            removedObjectsBitmapData = new BitmapData(314,166,true,0);
            removedObjectsBitmapData.draw(this.pageContent,new Matrix(1,0,0,1,-322,-262));
            this.removeChildrensOf(this.pageContent);
            this.pageContentStrengthsIconArray = [];
            this.pageContentWeaknessesIconArray = [];
            removedObjectsBitmap = new Bitmap(removedObjectsBitmapData);
            this.pageRemovingContent.addChild(removedObjectsBitmap);
            removedObjectsBitmap.x = 322;
            removedObjectsBitmap.y = 262;
         }
         if(this.nextPageType == "Standard")
         {
            if(!this.pageContent.contains(this.bPlayAgain))
            {
               this.pageContent.addChild(this.bPlayAgain);
               this.bPlayAgain.x = 380;
               this.bPlayAgain.y = 295;
            }
            valuesForCurrentLevel = ScreenLevelSelect.worldsValuesVisibleArrays[ScreenGame.world - 1][ScreenGame.level - 1];
            if(ScreenLevelSelect.selectedWorld == Math.round(ScreenLevelSelect.totalWorlds) && ScreenGame.level == ScreenGame.worldModels[ScreenLevelSelect.selectedWorld * 3 - 2].length || ScreenGame.hp == 0 && valuesForCurrentLevel[0] + valuesForCurrentLevel[1] + valuesForCurrentLevel[2] == 0)
            {
               this.bPlayAgain.x = 380;
               this.bPlayAgain.y = 325;
               this.bPlayAgain.extraYPos = 30;
            }
            else if(!this.pageContent.contains(this.bNextLevel))
            {
               this.bNextLevel.pText = this.pInfoText;
               this.pageContent.addChild(this.bNextLevel);
               this.bNextLevel.x = 380;
               this.bNextLevel.y = 355;
            }
         }
         else if(this.nextPageType == "Achievement")
         {
            if(!this.pageContent.contains(this.newAchievementText))
            {
               this.addText(this.newAchievementText,this.textFormat,16776960,"New Achievement",128,314,322,88 + 4 + 166 + 4,true,false,this.pageContent);
               this.gradientText(this.newAchievementText,6710784,16776960,28,true,this.pageContent);
            }
            if(!this.pageContent.contains(this.newAchievementNameText))
            {
               this.addText(this.newAchievementNameText,this.textFormat2,16777215,"",100,314,322,320,true,true,this.pageContent);
            }
            achievementData = ScreenAchievements["achievement" + pageNameNext + "Data"];
            this.newAchievementNameText.text = achievementData[0];
            this.achievement = new (getDefinitionByName("Achievement" + pageNameNext) as Class)();
            if(!this.pageContent.contains(this.achievement))
            {
               this.achievement.pText = this.pInfoText;
               this.achievement.theTitle = achievementData[0];
               this.achievement.theDescription = achievementData[1];
               this.achievement.theDifficulty = achievementData[2];
               if(achievementData[2] == false)
               {
                  this.achievement.thisState = 0;
               }
               else
               {
                  switch(ScreenLevelSelect.levelDifficulty)
                  {
                     case "Easy":
                        this.achievement.thisState = 1;
                        break;
                     case "Medium":
                        this.achievement.thisState = 2;
                        break;
                     case "Hard":
                        this.achievement.thisState = 3;
                  }
               }
               this.pageContent.addChild(this.achievement);
               this.achievement.filters = this.glowArray;
               this.achievement.onStatusScreen = true;
               this.achievement.x = 480;
               this.achievement.y = 374;
            }
         }
         else if(this.nextPageType == "Enemy")
         {
            if(!this.pageContent.contains(this.newEnemyText))
            {
               this.addText(this.newEnemyText,this.textFormat,16776960,"New Enemy",128,314,322,88 + 4 + 166 + 4,true,false,this.pageContent);
               this.gradientText(this.newEnemyText,6710784,16776960,28,true,this.pageContent);
            }
            if(!this.pageContent.contains(this.newEnemyNameText))
            {
               this.addText(this.newEnemyNameText,this.textFormat2,16777215,"",100,314,322,310,true,true,this.pageContent);
            }
            this.newEnemyNameText.text = pageNameNext + " Enemy";
            if(!this.pageContent.contains(this.newEnemyDescriptionText))
            {
               this.addText(this.newEnemyDescriptionText,this.textFormat3,16777215,"",100,262,348,330,true,true,this.pageContent);
            }
            description = "descriptionText" + pageNameNext;
            description = description.replace(this.spaces,"");
            if(ScreenEnemies[description] != null)
            {
               this.newEnemyDescriptionText.text = ScreenEnemies[description];
            }
            else
            {
               this.newEnemyDescriptionText.text = "";
            }
            if(!this.pageContent.contains(this.newEnemyStrengthsText))
            {
               this.addText(this.newEnemyStrengthsText,this.textFormat2,16777215,"Strengths:",30,100,420,372,false,true,this.pageContent);
            }
            if(!this.pageContent.contains(this.newEnemyWeaknessesText))
            {
               this.addText(this.newEnemyWeaknessesText,this.textFormat2,16777215,"Weaknesses:",30,120,420,398,false,true,this.pageContent);
            }
            enemy = new (getDefinitionByName(("Enemy" + pageNameNext).replace(this.spaces,"")) as Class)();
            if(enemy != null && !this.pageContent.contains(enemy))
            {
               this.pageContent.addChild(enemy);
               enemy.filters = this.glowArray;
               enemy.x = 385;
               enemy.y = 394;
               enemy.rotation = 90;
               enemy.scaleX = 1.5;
               enemy.scaleY = 1.5;
               if(enemy.totalFrames != null && enemy.totalFrames > 1)
               {
                  enemy.gotoAndStop(1);
               }
            }
            this.addStrengthsWeaknessesIcons(this.pageContent,pageNameNext,this.pageContentStrengthsIconArray,this.pageContentWeaknessesIconArray);
         }
         if(!firstPage)
         {
            pagesChanging = true;
            this.pageContent.alpha = 0;
         }
      }
      
      public function gradientText(textName:TextField, colBottom:uint, colTop:uint, size:Number, shadowText:Boolean = true, parentObj:Object = null) : void
      {
         if(parentObj == null)
         {
            parentObj = this;
         }
         var textMc:MovieClip = new MovieClip();
         parentObj.addChild(textMc);
         textMc.mouseEnabled = false;
         var rectWidth:* = textName.width;
         var rectHeight:* = size + 4;
         var rect:Shape = new Shape();
         parentObj.addChild(rect);
         rect.x = textName.x;
         rect.y = textName.y + 2;
         var mat:* = new Matrix();
         var colors:* = [colBottom,colTop];
         var alphas:* = [1,1];
         var ratios:* = [0,175];
         mat.createGradientBox(rectWidth,rectHeight,-90 * Math.PI / 180);
         rect.graphics.lineStyle();
         rect.graphics.beginGradientFill(GradientType.LINEAR,colors,alphas,ratios,mat);
         rect.graphics.drawRect(0,0,rectWidth,rectHeight);
         rect.graphics.endFill();
         textMc.addChild(textName);
         rect.mask = textMc;
         textMc.cacheAsBitmap = true;
         if(shadowText)
         {
            rect.filters = this.shadowArray;
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = false, parentObj:Object = null) : void
      {
         if(parentObj == null)
         {
            parentObj = this;
         }
         textFormat.color = textCol;
         if(centerText)
         {
            textFormat.align = TextFormatAlign.CENTER;
         }
         else
         {
            textFormat.align = TextFormatAlign.LEFT;
         }
         textName.x = xPos;
         textName.y = yPos;
         parentObj.addChild(textName);
         textName.defaultTextFormat = textFormat;
         textName.antiAliasType = AntiAliasType.ADVANCED;
         textName.embedFonts = true;
         textName.wordWrap = true;
         textName.selectable = false;
         textName.mouseEnabled = false;
         textName.text = theText;
         textName.width = w;
         textName.height = h;
         if(shadowText)
         {
            textName.filters = this.shadowArray;
         }
      }
      
      public function update(event:Event) : void
      {
         var a:* = undefined;
         var aa:* = undefined;
         var aaa:* = undefined;
         if(this.countTime < this.countTimeMax)
         {
            ++this.countTime;
            if(this.countTime < 40)
            {
               this.moneyEarnedText2.text = "$" + Math.round(this.moneyValue - this.moneyValue * (1 - this.countTime / 40));
            }
            else
            {
               this.moneyEarnedText2.text = "$" + this.moneyValue;
            }
            if(this.countTime == 10 && this.valueIconArray[0] != null)
            {
               this.valueIconArray[0].alpha = 1;
               this.size1Tween.start();
               SoundManager.sfxArray.push("Award1");
            }
            else if(this.countTime == 20 && this.valueIconArray[1] != null)
            {
               this.valueIconArray[1].alpha = 1;
               this.size2Tween.start();
               SoundManager.sfxArray.push("Award2");
            }
            else if(this.countTime == 30 && this.valueIconArray[2] != null)
            {
               this.valueIconArray[2].alpha = 1;
               this.size3Tween.start();
               SoundManager.sfxArray.push("Award3");
            }
            if(this.countTime >= 10 && this.valueIconArray[0] != null)
            {
               this.valueIconArray[0].scaleX = this.valueHolder.size1;
               this.valueIconArray[0].scaleY = this.valueHolder.size1;
               if(this.countTime < 15)
               {
                  for(a = 0; a < 10; a++)
                  {
                     this.spawnParticle(this.valueIconArray[0].x,this.valueIconArray[0].y);
                  }
               }
            }
            if(this.countTime >= 20 && this.valueIconArray[1] != null)
            {
               this.valueIconArray[1].scaleX = this.valueHolder.size2;
               this.valueIconArray[1].scaleY = this.valueHolder.size2;
               if(this.countTime < 25)
               {
                  for(aa = 0; aa < 10; aa++)
                  {
                     this.spawnParticle(this.valueIconArray[1].x,this.valueIconArray[1].y);
                  }
               }
            }
            if(this.countTime >= 30 && this.valueIconArray[2] != null)
            {
               this.valueIconArray[2].scaleX = this.valueHolder.size3;
               this.valueIconArray[2].scaleY = this.valueHolder.size3;
               if(this.countTime < 35)
               {
                  for(aaa = 0; aaa < 10; aaa++)
                  {
                     this.spawnParticle(this.valueIconArray[2].x,this.valueIconArray[2].y);
                  }
               }
            }
         }
         if(this.winParticlesOn)
         {
            this.spawnParticle(Math.random() * 640,-16,true);
         }
         this.handleParticles();
         this.handleSquarePages();
      }
      
      private function getPageType(chosenPageNumber:Number) : *
      {
         return pagesArray[(chosenPageNumber - 1) * 2];
      }
      
      private function handleIcons() : void
      {
         var theIcon:* = undefined;
         for(var i:* = 0; i < this.valueIconArray.length; i++)
         {
            theIcon = this.valueIconArray[i];
         }
      }
   }
}

