package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.*;
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   import flash.utils.ByteArray;
   
   public class ScreenLevelSelect extends MovieClip
   {
      
      public static var dataChanged:Boolean;
      
      public static var valuesArrayW1:Array = [];
      
      public static var valuesArrayW2:Array = [];
      
      public static var valuesArrayW3:Array = [];
      
      public static var valuesArrayW4:Array = [];
      
      public static var valuesArrayW5:Array = [];
      
      public static var valuesArrayW6:Array = [];
      
      public static var valuesArrayW7:Array = [];
      
      public static var valuesArrayW8:Array = [];
      
      public static var valuesArrayW9:Array = [];
      
      public static var worldsValuesArrays:Array = [valuesArrayW1,valuesArrayW2,valuesArrayW3,valuesArrayW4,valuesArrayW5,valuesArrayW6,valuesArrayW7,valuesArrayW8,valuesArrayW9];
      
      public static var worldsValuesVisibleArrays:Array = clone(worldsValuesArrays);
      
      public static var selectedLevel:Number = 0;
      
      public static var selectedWorld:Number = 1;
      
      public static var worldNumberChangeTo:Number = 0;
      
      public static var totalWorlds:Number = 0;
      
      public static var progressWorld:Number = 0;
      
      public static var previousWorld:Number = 1;
      
      public static var previousLevel:Number = 1;
      
      public static var previousLevelWon:Boolean = false;
      
      public static var changeToLevels:Boolean = false;
      
      public static var changeToWorlds:Boolean = false;
      
      public static var levelMode:String = "Normal";
      
      public static var levelDifficulty:String = "Easy";
      
      public static var contentMoving:Boolean = true;
      
      public static var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      public static var textFormat2:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      public static var textFormat3:TextFormat = new TextFormat("JG",12,16777215,true,false,false);
      
      public static var progressTimerOn:Boolean = false;
      
      public static var canSelectFromLevelGuide:Boolean = true;
      
      private var theButton:Object;
      
      private var objectiveText:TextField = new TextField();
      
      private var buttonLevelArray:Array = new Array();
      
      private var bgWindowBarEnemies:BackgroundWindowBarEnemies = new BackgroundWindowBarEnemies();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var iconTower:IconTower;
      
      private var progressTimer:Number = 0;
      
      private var shadowArray:Array = filters;
      
      private var bgLevelSelect:BackgroundLevelSelect = new BackgroundLevelSelect();
      
      private var iconsToRemove:Number;
      
      private var valuesToAdd:* = [0,0,0];
      
      private var progressTimerMax:Number = 0;
      
      private var bgFadeText:BackgroundFadeText = new BackgroundFadeText();
      
      private var iconsToAdd:Number;
      
      private var selectedUpgradeLimit:Number = 0;
      
      private var bgWindowBar:BackgroundWindowBar = new BackgroundWindowBar();
      
      private var buttonLayer:MovieClip = new MovieClip();
      
      private var iconShield:IconShield;
      
      private var bgMenu:BackgroundMenu = new BackgroundMenu();
      
      private var noteText:TextField = new TextField();
      
      private var bDifficultyHard:ButtonDifficultyHard = new ButtonDifficultyHard();
      
      private var bLevel:ButtonLevel;
      
      private var iconType:String;
      
      private var contentOutTween:Tween;
      
      private var bDifficultyEasy:ButtonDifficultyEasy = new ButtonDifficultyEasy();
      
      private var ulText:TextField = new TextField();
      
      private var enemyImageArray:Array = new Array();
      
      private var theTitle:TitleLevelSelect = new TitleLevelSelect();
      
      private var iconStar:IconStar;
      
      private var objectiveTitleText:TextField = new TextField();
      
      private var bPlayLevel:ButtonPlayLevel = new ButtonPlayLevel();
      
      private var modeText:TextField = new TextField();
      
      private var enemiesText:TextField = new TextField();
      
      private var particleArray:Array = new Array();
      
      private var bWorldSelect:ButtonWorldSelect = new ButtonWorldSelect();
      
      private var contentHolder:MovieClip = new MovieClip();
      
      private var iconBoss:IconBoss;
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var iconFlag:IconFlag;
      
      private var contentInTween:Tween;
      
      private var difficultyText:TextField = new TextField();
      
      private var bDifficultyMedium:ButtonDifficultyMedium = new ButtonDifficultyMedium();
      
      private var bgWindow:BackgroundWindow = new BackgroundWindow();
      
      private var levelToChange:* = 0;
      
      private var bgWindowBar2:BackgroundWindowBar2 = new BackgroundWindowBar2();
      
      private var tweenArray:Array = new Array();
      
      private var buttonWorldArray:Array = new Array();
      
      private var tweenVar:Object = new Object();
      
      private var placePos:* = 0;
      
      private var bMore:ButtonMoreWorlds = new ButtonMoreWorlds();
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var removeCount:Number;
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var worldText:TextField = new TextField();
      
      private var windowOk:WindowOk = new WindowOk();
      
      private var addCount:Number;
      
      private var isAdded:Boolean = false;
      
      private var levelNameText:TextField = new TextField();
      
      public function ScreenLevelSelect()
      {
         this.contentInTween = new Tween(this.tweenVar,"x",Strong.easeOut,-410,0,20,false);
         this.contentOutTween = new Tween(this.tweenVar,"x",Strong.easeIn,0,-410,10,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
         this.bDifficultyEasy.myDifficulty = "Easy";
         this.bDifficultyMedium.myDifficulty = "Medium";
         this.bDifficultyHard.myDifficulty = "Hard";
         this.contentInTween.stop();
         this.contentOutTween.stop();
         if(worldsValuesArrays[0].length == 0)
         {
            initWorldValues();
         }
      }
      
      public static function getLevelValues(world:Number, level:Number, difficultyVar:*) : Number
      {
         var difficulty:Number = NaN;
         switch(difficultyVar)
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
         var values:* = 0;
         values = worldsValuesArrays[world - 1][level - 1][0];
         if(difficulty <= 2)
         {
            if(worldsValuesArrays[world - 1][level - 1][1] > values)
            {
               values = worldsValuesArrays[world - 1][level - 1][1];
            }
         }
         if(difficulty == 1)
         {
            if(worldsValuesArrays[world - 1][level - 1][2] > values)
            {
               values = worldsValuesArrays[world - 1][level - 1][2];
            }
         }
         return values;
      }
      
      public static function getCurrentWorldAndLevel() : Array
      {
         var ii:* = undefined;
         var progressSet:Boolean = false;
         var theWorld:Number = 0;
         var theLevel:Number = 0;
         for(var i:* = 0; i < ScreenLevelSelect.totalWorlds; i++)
         {
            for(ii = 0; ii < ScreenLevelSelect.worldsValuesArrays[i].length; ii++)
            {
               if(ScreenLevelSelect.worldsValuesArrays[i][ii][0] == 0 && ScreenLevelSelect.worldsValuesArrays[i][ii][1] == 0 && ScreenLevelSelect.worldsValuesArrays[i][ii][2] == 0)
               {
                  theWorld = i + 1;
                  theLevel = ii + 1;
                  progressSet = true;
                  break;
               }
            }
            if(progressSet)
            {
               break;
            }
         }
         return [theWorld,theLevel];
      }
      
      public static function initWorldValues() : void
      {
         var totalLevelsInWorld:* = undefined;
         var ii:* = undefined;
         for(var i:* = 0; i < worldsValuesArrays.length; i++)
         {
            totalLevelsInWorld = ScreenGame.worldModels[i * 3].length;
            for(ii = 0; ii < totalLevelsInWorld; ii++)
            {
               if(ii == 0)
               {
                  worldsValuesArrays[i].length = 0;
               }
               if(i + 1 <= 6)
               {
                  worldsValuesArrays[i].push([0,0,0]);
               }
               else
               {
                  worldsValuesArrays[i].push([0,0,0]);
               }
            }
         }
         worldsValuesVisibleArrays = clone(worldsValuesArrays);
      }
      
      public static function clone(source:Object) : *
      {
         var myBA:ByteArray = new ByteArray();
         myBA.writeObject(source);
         myBA.position = 0;
         return myBA.readObject();
      }
      
      public static function getTotalValues(type:String, difficulty:Number) : Number
      {
         var levelMode:String = null;
         var ii:* = undefined;
         var valuesToAdd:* = undefined;
         var values:Number = 0;
         switch(type)
         {
            case "Stars":
               levelMode = "Normal";
               break;
            case "Flags":
               levelMode = "Flag";
               break;
            case "Towers":
               levelMode = "Tower";
               break;
            case "Shields":
               levelMode = "Defense";
               break;
            case "Bosses":
               levelMode = "Boss";
         }
         for(var i:* = 0; i < worldsValuesArrays.length; i++)
         {
            for(ii = 0; ii < worldsValuesArrays[i].length; ii++)
            {
               if(ScreenGame.worldModels[i * 3 + 1][ii][6] == levelMode)
               {
                  valuesToAdd = 0;
                  valuesToAdd = worldsValuesArrays[i][ii][0];
                  if(difficulty <= 2)
                  {
                     if(worldsValuesArrays[i][ii][1] > valuesToAdd)
                     {
                        valuesToAdd = worldsValuesArrays[i][ii][1];
                     }
                  }
                  if(difficulty == 1)
                  {
                     if(worldsValuesArrays[i][ii][2] > valuesToAdd)
                     {
                        valuesToAdd = worldsValuesArrays[i][ii][2];
                     }
                  }
                  values += valuesToAdd;
               }
            }
         }
         return values;
      }
      
      public function added(event:Event) : void
      {
         var valuesArray:* = undefined;
         var valuesArrayVisible:* = undefined;
         if(!this.isAdded)
         {
            this.isAdded = true;
            canSelectFromLevelGuide = true;
            progressTimerOn = false;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.contentInTween.addEventListener(TweenEvent.MOTION_FINISH,this.contentInTweenFinish);
            this.contentOutTween.addEventListener(TweenEvent.MOTION_FINISH,this.contentOutTweenFinish);
            contentMoving = true;
            changeToLevels = false;
            changeToWorlds = false;
            dataChanged = true;
            selectedLevel = 0;
            valuesArray = worldsValuesArrays[selectedWorld - 1];
            valuesArrayVisible = worldsValuesVisibleArrays[selectedWorld - 1];
            if(ScreenGame.level != 0 && selectedWorld != 0 && selectedWorld != Math.round(totalWorlds) && ScreenGame.level == ScreenGame.worldModels[selectedWorld * 3 - 2].length && (valuesArray[ScreenGame.level - 1][0] != 0 || valuesArray[ScreenGame.level - 1][1] != 0 || valuesArray[ScreenGame.level - 1][2] != 0) && valuesArrayVisible[ScreenGame.level - 1][0] == 0 && valuesArrayVisible[ScreenGame.level - 1][1] == 0 && valuesArrayVisible[ScreenGame.level - 1][2] == 0)
            {
               progressWorld = selectedWorld + 1;
            }
            else
            {
               progressWorld = 0;
               selectedWorld = LevelGuide.selectedWorld;
            }
            addChild(this.bgTitle);
            addChild(this.bgMenu);
            this.bgMenu.y = this.bgTitle.height;
            this.contentHolder.addChild(this.bgFadeText);
            this.bgFadeText.y = 88;
            addChild(this.bgWindow);
            this.bgWindow.x = 640 - this.bgWindow.width;
            this.bgWindow.y = this.bgTitle.height;
            addChild(this.bgWindowBar);
            this.bgWindowBar.x = this.bgWindow.x;
            this.bgWindowBar.y = this.bgWindow.y;
            this.bgWindowBar.alpha = 0;
            addChild(this.bgWindowBar2);
            this.bgWindowBar2.x = this.bgWindow.x;
            this.bgWindowBar2.y = this.bgWindow.y + this.bgWindowBar.height;
            this.bgWindowBar2.alpha = 0;
            addChild(this.bgWindowBarEnemies);
            this.bgWindowBarEnemies.x = this.bgWindow.x;
            this.bgWindowBarEnemies.y = 349;
            this.bgWindowBarEnemies.alpha = 0;
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            addChild(this.sponsorLogo);
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 480 - this.bottomBar.height;
            addChild(this.contentHolder);
            this.contentHolder.x = -410;
            this.contentInTween.start();
            this.contentHolder.addChild(this.bgLevelSelect);
            this.bgLevelSelect.x = 0;
            this.bgLevelSelect.y = this.bgTitle.height + 32;
            this.addText(this.worldText,textFormat,16777215,"",32,410,0,93,true,true,true);
            this.addText(this.levelNameText,textFormat,16711680,"",32,208,this.bgWindow.x,this.bgWindow.y + 6,true,true);
            this.addText(this.difficultyText,textFormat3,16777215,"",32,208,this.bgWindow.x + 4,this.bgWindow.y + 116,false,true);
            this.addText(this.modeText,textFormat,16777215,"",32,208,this.bgWindow.x + 4,this.bgWindow.y + 37,true,true);
            this.addText(this.objectiveTitleText,textFormat3,16777215,"",32,208,this.bgWindow.x + 4,this.bgWindow.y + 170,false,true);
            this.addText(this.objectiveText,textFormat,16711680,"",32,208,this.bgWindow.x + 4,this.bgWindow.y + 186,false,true);
            this.addText(this.noteText,textFormat2,13369344,"",32,208,this.bgWindow.x + 4,this.bgWindow.y + 206,false,true);
            this.addText(this.ulText,textFormat3,16711680,"",34,64,this.bgWindow.x + 172,this.bgWindow.y,false,true);
            this.addText(this.enemiesText,textFormat3,16777215,"",32,208,this.bgWindow.x + 4,349,false,true);
            worldNumberChangeTo = selectedWorld;
            if(selectedWorld != 0)
            {
               this.changeToLevelsFunction();
            }
            else
            {
               this.changeToWorldsFunction();
            }
            addChild(this.buttonLayer);
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
         }
      }
      
      private function removeLevelButtons() : void
      {
         var button:* = undefined;
         for(var i:* = 0; i < this.buttonLevelArray.length; i++)
         {
            button = this.buttonLevelArray[i];
            this.contentHolder.removeChild(button);
            this.buttonLevelArray.splice(i,1);
            i--;
         }
      }
      
      private function spawnLockParticle(xPos:Number, yPos:Number) : void
      {
         var particleLock:* = new ParticleLock();
         addChild(particleLock);
         particleLock.mouseEnabled = false;
         particleLock.x = xPos;
         particleLock.y = yPos;
         particleLock.friction = 0.1;
         particleLock.velGravity = 1.5;
         particleLock.rotVel = 2 + Math.random() * 2;
         if(Math.random() > 0.5)
         {
            particleLock.rotClock = true;
         }
         else
         {
            particleLock.rotClock = false;
         }
         particleLock.vel = Math.random() * 2 + 4;
         particleLock.gravity = 0;
         particleLock.flyAngle = Math.random() * 90 - 45;
         if(Math.random() > 0.5)
         {
            particleLock.flyAngle += 180;
         }
         particleLock.xVel = Math.cos(particleLock.flyAngle / 180 * Math.PI) * particleLock.vel;
         particleLock.yVel = Math.sin(particleLock.flyAngle / 180 * Math.PI) * particleLock.vel;
         this.particleArray.push(particleLock);
      }
      
      private function removeEnemyImages() : void
      {
         var image:* = undefined;
         for(var i:* = 0; i < this.enemyImageArray.length; i++)
         {
            image = this.enemyImageArray[i];
            if(stage.contains(image))
            {
               this.buttonLayer.removeChild(image);
            }
            this.enemyImageArray.splice(i,1);
            i--;
         }
      }
      
      private function getBossCount(specificWorld:Number, specificLevel:Number) : *
      {
         var searchPlace:* = undefined;
         var bossCount:* = 0;
         var selectedEnemyModel:* = ScreenGame.worldModels[specificWorld * 3 - 3];
         for(var i:* = 0; i < (selectedEnemyModel[specificLevel - 1].length - 2) / 2; i++)
         {
            searchPlace = selectedEnemyModel[specificLevel - 1][2 + i * 2];
            if(searchPlace.slice(searchPlace.length - 1,searchPlace.length) == "B")
            {
               bossCount += selectedEnemyModel[specificLevel - 1][3 + i * 2];
            }
         }
         return bossCount;
      }
      
      private function progressLevelButtons() : void
      {
         var visibleVal:* = undefined;
         var knownVal:* = undefined;
         var ii:* = undefined;
         for(var i:* = 0; i < worldsValuesVisibleArrays[selectedWorld - 1].length; i++)
         {
            visibleVal = worldsValuesVisibleArrays[selectedWorld - 1][i];
            knownVal = worldsValuesArrays[selectedWorld - 1][i];
            for(ii = 0; ii < 3; ii++)
            {
               if(visibleVal[ii] != knownVal[ii])
               {
                  this.levelToChange = i + 1;
                  progressTimerOn = true;
                  if(knownVal[0] > visibleVal[0])
                  {
                     this.valuesToAdd[0] = knownVal[0] - visibleVal[0];
                     this.placePos = visibleVal[0];
                  }
                  else if(knownVal[1] > visibleVal[1] && knownVal[1] > visibleVal[0])
                  {
                     if(knownVal[1] > visibleVal[0])
                     {
                        this.valuesToAdd[1] = knownVal[1] - visibleVal[0];
                        this.placePos = visibleVal[0];
                     }
                     if(knownVal[1] > visibleVal[1])
                     {
                        if(knownVal[1] - visibleVal[1] < knownVal[1] - visibleVal[0])
                        {
                           this.valuesToAdd[1] = knownVal[1] - visibleVal[1];
                           this.placePos = visibleVal[1];
                        }
                     }
                  }
                  else if(knownVal[2] > visibleVal[2] && knownVal[2] > visibleVal[1] && knownVal[2] > visibleVal[0])
                  {
                     if(knownVal[2] > visibleVal[0])
                     {
                        this.valuesToAdd[2] = knownVal[2] - visibleVal[0];
                        this.placePos = visibleVal[0];
                     }
                     if(knownVal[2] > visibleVal[1])
                     {
                        if(knownVal[2] - visibleVal[1] < knownVal[2] - visibleVal[0])
                        {
                           this.valuesToAdd[2] = knownVal[2] - visibleVal[1];
                           this.placePos = visibleVal[1];
                        }
                     }
                     if(knownVal[2] > visibleVal[2])
                     {
                        if(knownVal[2] - visibleVal[2] < knownVal[2] - visibleVal[1] && knownVal[2] - visibleVal[2] < knownVal[2] - visibleVal[0])
                        {
                           this.valuesToAdd[2] = knownVal[2] - visibleVal[2];
                           this.placePos = visibleVal[2];
                        }
                     }
                  }
               }
            }
         }
         worldsValuesVisibleArrays = clone(worldsValuesArrays);
      }
      
      private function selectFromLevelGuide() : void
      {
         if(canSelectFromLevelGuide && Main.uihButtonLevel == true)
         {
            if(selectedWorld == LevelGuide.selectedWorld && !this.buttonLevelArray[LevelGuide.selectedLevel - 1].isLocked)
            {
               selectedLevel = LevelGuide.selectedLevel;
               levelMode = ScreenGame.worldModels[selectedWorld * 3 - 2][selectedLevel - 1][6];
               canSelectFromLevelGuide = false;
               dataChanged = true;
            }
         }
      }
      
      internal function splitCamelCase(str:String, capitaliseFirst:Boolean) : String
      {
         var r:RegExp = /(^[a-z]|[A-Z0-9])[a-z]*/g;
         var result:Array = str.match(r);
         if(result.length > 0)
         {
            if(capitaliseFirst)
            {
               result[0] = String(result[0]).charAt(0).toUpperCase() + String(result[0]).substring(1);
            }
            return result.join(" ");
         }
         return str;
      }
      
      private function removeWorldButtons() : void
      {
         var button:* = undefined;
         for(var i:* = 0; i < this.buttonWorldArray.length; i++)
         {
            button = this.buttonWorldArray[i];
            this.contentHolder.removeChild(button);
            this.buttonWorldArray.splice(i,1);
            i--;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         this.contentInTween.removeEventListener(TweenEvent.MOTION_FINISH,this.contentInTweenFinish);
         this.contentOutTween.removeEventListener(TweenEvent.MOTION_FINISH,this.contentOutTweenFinish);
         if(progressWorld != 0)
         {
            selectedWorld = 0;
         }
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function handleParticles() : void
      {
         var particle:* = undefined;
         for(var i:* = 0; i < this.particleArray.length; i++)
         {
            particle = this.particleArray[i];
            particle.gravity += particle.velGravity;
            particle.x += particle.xVel;
            particle.y += particle.yVel + particle.gravity;
            if(particle.vel - particle.friction > 0)
            {
               particle.vel -= particle.friction;
               particle.xVel = Math.cos(particle.flyAngle / 180 * Math.PI) * particle.vel;
               particle.yVel = Math.sin(particle.flyAngle / 180 * Math.PI) * particle.vel;
            }
            else
            {
               particle.vel = 0;
               particle.xVel = 0;
               particle.yVel = 0;
            }
            if(particle.rotClock)
            {
               particle.rotation += particle.rotVel;
            }
            else
            {
               particle.rotation -= particle.rotVel;
            }
            if(particle.y > 480 + particle.height / 2)
            {
               removeChild(particle);
               i--;
               this.particleArray.splice(i,1);
            }
         }
      }
      
      private function changeToWorldsFunction() : void
      {
         changeToWorlds = false;
         selectedLevel = 0;
         selectedWorld = 0;
         dataChanged = true;
         this.bgFadeText.gotoAndStop(1);
         if(Main.extraStuff)
         {
            this.bgLevelSelect.gotoAndStop(3);
         }
         else
         {
            this.bgLevelSelect.gotoAndStop(2);
         }
         this.removeLevelButtons();
         this.addWorldButtons();
         this.handleWorldButtons();
         if(stage.contains(this.bWorldSelect))
         {
            this.contentHolder.removeChild(this.bWorldSelect);
         }
         if(!stage.contains(this.bMore) && !Main.extraStuff)
         {
            this.contentHolder.addChild(this.bMore);
            this.bMore.x = 205;
            this.bMore.y = 400;
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = false, inContentHolder:Boolean = false) : void
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
         if(!inContentHolder)
         {
            addChild(textName);
         }
         else
         {
            this.contentHolder.addChild(textName);
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
      
      private function contentInTweenFinish(event:TweenEvent) : void
      {
         var unlockButton:* = undefined;
         var totalLevelsInWorld:* = undefined;
         contentMoving = false;
         if(selectedWorld != 0)
         {
            this.progressLevelButtons();
         }
         else if(progressWorld != 0)
         {
            unlockButton = this.buttonWorldArray[progressWorld - 1];
            if(unlockButton.isLocked)
            {
               unlockButton.worldText.text = unlockButton.number;
               unlockButton.isLocked = false;
               unlockButton.iconBronzeValue.alpha = 1;
               unlockButton.iconSilverValue.alpha = 1;
               unlockButton.iconGoldValue.alpha = 1;
               totalLevelsInWorld = ScreenGame.worldModels[progressWorld * 3 - 2].length;
               unlockButton.progressText.text = "Level 1/" + totalLevelsInWorld;
               unlockButton.valuesBronzeText.text = "0/" + totalLevelsInWorld * 3;
               unlockButton.valuesSilverText.text = "0/" + totalLevelsInWorld * 3;
               unlockButton.valuesGoldText.text = "0/" + totalLevelsInWorld * 3;
               SoundManager.sfxArray.push("Unlock");
               this.spawnLockParticle(unlockButton.x + 65,unlockButton.y + 43);
               progressWorld = 0;
            }
         }
      }
      
      private function contentOutTweenFinish(event:TweenEvent) : void
      {
         if(changeToLevels)
         {
            this.changeToLevelsFunction();
         }
         else if(changeToWorlds)
         {
            this.changeToWorldsFunction();
         }
         this.contentInTween.start();
      }
      
      private function changeToLevelsFunction() : void
      {
         changeToLevels = false;
         selectedLevel = 0;
         selectedWorld = worldNumberChangeTo;
         worldNumberChangeTo = 0;
         dataChanged = true;
         this.bgFadeText.gotoAndStop(1 + selectedWorld);
         this.bgLevelSelect.gotoAndStop(1);
         this.removeWorldButtons();
         this.addLevelButtons();
         this.handleLevelButtons();
         this.selectFromLevelGuide();
         if(!stage.contains(this.bWorldSelect))
         {
            this.contentHolder.addChild(this.bWorldSelect);
            this.bWorldSelect.x = 139;
            this.bWorldSelect.y = 370;
         }
         if(stage.contains(this.bMore))
         {
            this.contentHolder.removeChild(this.bMore);
         }
      }
      
      private function addLevelButtons() : void
      {
         var xPos:* = undefined;
         var yPos:* = undefined;
         var u:* = undefined;
         var valuesArray:* = undefined;
         var iii:* = undefined;
         var ii:* = undefined;
         var iconS:* = undefined;
         var addIcon:* = undefined;
         var spaceAdd:* = undefined;
         for(var i:* = 0; i < ScreenGame.worldModels[selectedWorld * 3 - 2].length; i++)
         {
            this.bLevel = new ButtonLevel();
            this.bLevel.number = i + 1;
            this.contentHolder.addChild(this.bLevel);
            this.bLevel.levelText.text = "" + this.bLevel.number;
            this.bLevel.levelMode = ScreenGame.worldModels[selectedWorld * 3 - 2][i][6];
            xPos = 4;
            yPos = 124;
            for(u = i; u >= 9; u -= 9)
            {
               xPos -= 405;
               yPos += 45;
            }
            xPos += 45 * i;
            this.bLevel.x = xPos;
            this.bLevel.y = yPos;
            valuesArray = worldsValuesVisibleArrays[selectedWorld - 1];
            if(i > 0 && valuesArray[i - 1][0] == 0 && valuesArray[i - 1][1] == 0 && valuesArray[i - 1][2] == 0)
            {
               this.bLevel.isLocked = true;
               this.bLevel.levelText.text = "";
            }
            if(!this.bLevel.isLocked)
            {
               for(iii = 0; iii < 6; iii++)
               {
                  for(ii = 0; ii < valuesArray[i][iii]; ii++)
                  {
                     addIcon = true;
                     spaceAdd = 0;
                     if(iii == 0 || iii == 1 || iii == 2)
                     {
                        if(iii == 0)
                        {
                           addIcon = true;
                        }
                        else if(iii == 1)
                        {
                           if(ii < valuesArray[i][iii - 1])
                           {
                              addIcon = false;
                           }
                        }
                        else if(iii == 2)
                        {
                           if(ii < valuesArray[i][iii - 1] || ii < valuesArray[i][iii - 2])
                           {
                              addIcon = false;
                           }
                        }
                        if(addIcon)
                        {
                           iconS = new IconStar();
                           if(this.bLevel.levelMode == "Normal")
                           {
                              iconS = new IconStar();
                           }
                           else if(this.bLevel.levelMode == "Flag")
                           {
                              iconS = new IconFlag();
                           }
                           else if(this.bLevel.levelMode == "Defense")
                           {
                              iconS = new IconShield();
                           }
                           else if(this.bLevel.levelMode == "Tower")
                           {
                              iconS = new IconTower();
                           }
                           else if(this.bLevel.levelMode == "Boss")
                           {
                              iconS = new IconBoss();
                           }
                           if(iii == 0)
                           {
                              iconS.gotoAndStop(3);
                           }
                           else if(iii == 1)
                           {
                              iconS.gotoAndStop(2);
                           }
                           else if(iii == 2)
                           {
                              iconS.gotoAndStop(1);
                           }
                        }
                     }
                     if(addIcon)
                     {
                        this.bLevel.addChild(iconS);
                        iconS.scaleX = 0.5;
                        iconS.scaleY = 0.5;
                        iconS.x = 10 + (ii + spaceAdd) * 11;
                        iconS.y = 32;
                        this.bLevel.iconArray.push(iconS);
                     }
                  }
               }
            }
            if(!this.bLevel.isLocked)
            {
               this.bLevel.iconMode = new IconMode();
               this.bLevel.addChild(this.bLevel.iconMode);
               this.bLevel.iconMode.x = 32;
               this.bLevel.iconMode.y = 11;
               if(this.bLevel.levelMode == "Normal")
               {
                  this.bLevel.iconFrame = 1;
               }
               else if(this.bLevel.levelMode == "Flag")
               {
                  this.bLevel.iconFrame = 2;
               }
               else if(this.bLevel.levelMode == "Defense")
               {
                  this.bLevel.iconFrame = 3;
               }
               else if(this.bLevel.levelMode == "Tower")
               {
                  this.bLevel.iconFrame = 4;
               }
               else if(this.bLevel.levelMode == "Boss")
               {
                  this.bLevel.iconFrame = 5;
               }
               this.bLevel.iconMode.gotoAndStop(this.bLevel.iconFrame * 3);
            }
            this.buttonLevelArray.push(this.bLevel);
         }
      }
      
      private function getTotalEnemyAmount(theWorld:Number, theLevel:Number) : *
      {
         var selectedEnemyModel:* = undefined;
         var amountMultiplier:* = undefined;
         if(levelMode != "Boss" && levelMode != "Flag")
         {
            selectedEnemyModel = ScreenGame.worldModels[theWorld * 3 - 3];
            amountMultiplier = 1;
            if(ScreenLevelSelect.levelDifficulty == "Medium")
            {
               amountMultiplier = DifficultyMultipliers.multiplierAmountMedium;
            }
            else if(ScreenLevelSelect.levelDifficulty == "Hard")
            {
               amountMultiplier = DifficultyMultipliers.multiplierAmountHard;
            }
            return Math.round(selectedEnemyModel[theLevel - 1][0] * amountMultiplier);
         }
         return 0;
      }
      
      private function handleLevelButtons() : void
      {
         var button:* = undefined;
         for(var i:* = 0; i < this.buttonLevelArray.length; i++)
         {
            button = this.buttonLevelArray[i];
            if(Boolean(button.clicked) && !button.isLocked)
            {
               selectedLevel = button.number;
               dataChanged = true;
               levelMode = button.levelMode;
               if(!LevelGuide.autoSelect)
               {
                  LevelGuide.selectedLevel = button.number;
               }
            }
         }
      }
      
      public function playLevel() : *
      {
         var i:* = undefined;
         var selectedSlot:* = undefined;
         var belowLevelLimit:* = true;
         if(ScreenOptions.optionWindowULOn)
         {
            for(i = 0; i < ScreenGame.equippedWeapons.length; i++)
            {
               selectedSlot = ScreenGame.equippedWeapons[i];
               if(ScreenUpgrades.levelsArray[0] > this.selectedUpgradeLimit && selectedSlot == "Cannon" || ScreenUpgrades.levelsArray[1] > this.selectedUpgradeLimit && selectedSlot == "MiniGun" || ScreenUpgrades.levelsArray[2] > this.selectedUpgradeLimit && selectedSlot == "Big Cannon" || ScreenUpgrades.levelsArray[3] > this.selectedUpgradeLimit && selectedSlot == "Flamethrower" || ScreenUpgrades.levelsArray[4] > this.selectedUpgradeLimit && selectedSlot == "Shotgun" || ScreenUpgrades.levelsArray[5] > this.selectedUpgradeLimit && selectedSlot == "Timed Bomb Cannon" || ScreenUpgrades.levelsArray[6] > this.selectedUpgradeLimit && selectedSlot == "Gummy Bear Cannon" || ScreenUpgrades.levelsArray[7] > this.selectedUpgradeLimit && selectedSlot == "Poison Cannon" || ScreenUpgrades.levelsArray[8] > this.selectedUpgradeLimit && selectedSlot == "Laser Cannon" || ScreenUpgrades.levelsArray[9] > this.selectedUpgradeLimit && selectedSlot == "Cake Cannon" || ScreenUpgrades.levelsArray[10] > this.selectedUpgradeLimit && selectedSlot == "Penetration Cannon" || ScreenUpgrades
               .levelsArray[11] > this.selectedUpgradeLimit && selectedSlot == "Magic Cannon")
               {
                  belowLevelLimit = false;
               }
               else if(ScreenUpgrades.levelsArraySecondary[0] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Mine" || ScreenUpgrades.levelsArraySecondary[1] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Grenade" || ScreenUpgrades.levelsArraySecondary[2] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Ice Grenade" || ScreenUpgrades.levelsArraySecondary[3] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Poison Grenade" || ScreenUpgrades.levelsArraySecondary[4] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Icicles" || ScreenUpgrades.levelsArraySecondary[5] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Poison Spikes" || ScreenUpgrades.levelsArraySecondary[6] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Shield" || ScreenUpgrades.levelsArraySecondary[7] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Rockets" || ScreenUpgrades.levelsArraySecondary[8] > this.selectedUpgradeLimit && ScreenGame
               .secondaryWeapon == "Ice Ball" || ScreenUpgrades.levelsArraySecondary[9] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Lava Ball" || ScreenUpgrades.levelsArraySecondary[10] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Crazy Cheese" || ScreenUpgrades.levelsArraySecondary[11] > this.selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Magic Bunny")
               {
                  belowLevelLimit = false;
               }
               else if(ScreenUpgrades.levelsArrayMisc[0] > this.selectedUpgradeLimit || ScreenUpgrades.levelsArrayMisc[1] > this.selectedUpgradeLimit || ScreenUpgrades.levelsArrayMisc[2] > this.selectedUpgradeLimit || ScreenUpgrades.levelsArrayMisc[3] > this.selectedUpgradeLimit)
               {
                  belowLevelLimit = false;
               }
            }
         }
         var showUpgradeLimitWindow:Boolean = false;
         var showChooseDifficultyWindow:Boolean = false;
         if(ScreenOptions.optionWindowULOn && !belowLevelLimit)
         {
            showUpgradeLimitWindow = true;
         }
         var theWorldAndLevel:* = ScreenLevelSelect.getCurrentWorldAndLevel();
         if(PartTutorial.tutorialOn && Main.hDifficultyChosen == false && (theWorldAndLevel[0] > 1 || theWorldAndLevel[1] >= 4))
         {
            showChooseDifficultyWindow = true;
            Main.hDifficultyChosen = true;
            SaveManager.saveOtherHelpers();
         }
         if(!showUpgradeLimitWindow && !showChooseDifficultyWindow)
         {
            ScreenGame.level = selectedLevel;
            ScreenGame.world = selectedWorld;
            Main.changeScreen = "Game";
         }
         else if(showChooseDifficultyWindow)
         {
            this.windowOk.type = "Choose Difficulty";
            addChild(this.windowOk);
            if(showUpgradeLimitWindow)
            {
               this.windowOk.moreWindowsArray.push("Upgrade Limit");
            }
         }
         else if(showUpgradeLimitWindow)
         {
            this.windowOk.type = "Upgrade Limit";
            addChild(this.windowOk);
         }
      }
      
      private function getEnemyAmountArray(theWorld:Number, theLevel:Number) : *
      {
         var enemyAmountArray:* = undefined;
         var enemyModelCurrent:* = undefined;
         var normalEnemyAmount:* = undefined;
         var enemyTypesInMap:* = undefined;
         var ratioArray:* = undefined;
         var ii:* = undefined;
         var u:* = undefined;
         var uu:* = undefined;
         var enemyNormalRatio:* = undefined;
         var currentEnemyRatio:* = undefined;
         if(levelMode != "Boss" && levelMode != "Flag")
         {
            enemyAmountArray = [];
            enemyModelCurrent = clone(ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1]);
            normalEnemyAmount = enemyModelCurrent[0];
            enemyModelCurrent[0] = this.getTotalEnemyAmount(theWorld,theLevel);
            enemyTypesInMap = (enemyModelCurrent.length - 2) / 2;
            ratioArray = [];
            for(ii = 0; ii < enemyTypesInMap; ii++)
            {
               ratioArray.push(enemyModelCurrent[3 + 2 * ii]);
            }
            u = 0;
            if(ScreenLevelSelect.levelDifficulty == "Medium" || ScreenLevelSelect.levelDifficulty == "Hard")
            {
               for(uu = 0; uu < enemyModelCurrent[0] - normalEnemyAmount; uu++)
               {
                  enemyNormalRatio = ratioArray[u] / normalEnemyAmount;
                  currentEnemyRatio = enemyModelCurrent[3 + 2 * u] / enemyModelCurrent[0];
                  if(currentEnemyRatio < enemyNormalRatio)
                  {
                     ++enemyModelCurrent[3 + 2 * u];
                  }
                  else if(u + 1 < enemyTypesInMap)
                  {
                     enemyAmountArray.push(enemyModelCurrent[3 + 2 * u]);
                     u++;
                     ++enemyModelCurrent[3 + 2 * u];
                  }
               }
               enemyAmountArray.push(enemyModelCurrent[3 + 2 * u]);
               while(u < enemyTypesInMap)
               {
                  u++;
                  enemyAmountArray.push(enemyModelCurrent[3 + 2 * u]);
               }
               return enemyAmountArray;
            }
            return ratioArray;
         }
         return false;
      }
      
      private function addEnemyImages() : void
      {
         var searchPlace:* = undefined;
         var level:* = undefined;
         var enemyType:* = undefined;
         var enemyImage:* = undefined;
         var enemyCount:* = undefined;
         var enemyAmountArray:* = undefined;
         var bossCount:* = undefined;
         var additionalX:* = 0;
         for(var i:* = 0; i < (ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1].length - 2) / 2; i++)
         {
            searchPlace = ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1][i * 2 + 2];
            level = searchPlace.slice(searchPlace.length - 1,searchPlace.length);
            enemyType = searchPlace.slice(0,searchPlace.length - 1);
            enemyType = this.splitCamelCase(enemyType,false);
            enemyImage = new ImageEnemy();
            enemyImage.enemyName = enemyType;
            enemyImage.enemyLevel = level;
            enemyCount = ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1][i * 2 + 3];
            enemyAmountArray = this.getEnemyAmountArray(selectedWorld,selectedLevel);
            if(levelMode == "Normal" || levelMode == "Tower" || levelMode == "Defense")
            {
               enemyImage.enemyAmount = enemyAmountArray[i] + " X";
            }
            else if(levelMode == "Flag")
            {
               enemyImage.enemyAmount = Math.round(enemyCount / ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1][0] * 1000) / 10 + "%";
            }
            else if(enemyImage.enemyLevel != "B")
            {
               bossCount = this.getBossCount(selectedWorld,selectedLevel);
               enemyImage.enemyAmount = Math.round(enemyCount / (ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1][0] - bossCount) * 1000) / 10 + "%";
            }
            else
            {
               enemyImage.enemyAmount = enemyCount + " X";
            }
            if(enemyImage != null)
            {
               enemyImage.pText = this.pInfoText;
               this.buttonLayer.addChild(enemyImage);
               enemyImage.x = this.bgWindow.x + 18 + additionalX;
               enemyImage.y = 368;
               additionalX += 36;
               this.enemyImageArray.push(enemyImage);
            }
         }
      }
      
      public function update(event:Event) : void
      {
         var screenGameEnemyModel:* = undefined;
         var screenGameFlagModel:* = undefined;
         var amountMultiplier:* = undefined;
         var bosses:* = undefined;
         this.contentHolder.x = this.tweenVar.x;
         if((changeToLevels || changeToWorlds) && !contentMoving)
         {
            this.contentInTween.rewind();
            this.contentOutTween.start();
            contentMoving = true;
            if(changeToWorlds)
            {
               selectedLevel = 0;
               dataChanged = true;
            }
         }
         this.handleProgressTimer();
         this.handleParticles();
         if(selectedWorld != 0)
         {
            this.worldText.text = "World " + selectedWorld;
         }
         else
         {
            this.worldText.text = "Select World";
         }
         if(selectedLevel != 0 && dataChanged)
         {
            dataChanged = false;
            this.bgWindowBar.alpha = 1;
            this.bgWindowBar2.alpha = 1;
            this.bgWindowBarEnemies.alpha = 1;
            this.levelNameText.text = "Level " + selectedLevel;
            if(!this.buttonLevelArray[selectedLevel - 1].isLocked)
            {
               this.difficultyText.text = "Difficulty";
               this.modeText.text = "" + levelMode + " Mode";
               this.objectiveTitleText.text = "Objective";
               this.enemiesText.text = "Enemies";
               this.selectedUpgradeLimit = ScreenGame.worldModels[selectedWorld * 3 - 2][selectedLevel - 1][7];
               this.ulText.text = "Upgrade\nLimit: " + this.selectedUpgradeLimit;
               screenGameEnemyModel = ScreenGame.worldModels[selectedWorld * 3 - 3];
               screenGameFlagModel = ScreenGame.worldModels[selectedWorld * 3 - 1];
               if(levelMode == "Normal" || levelMode == "Tower" || levelMode == "Defense")
               {
                  amountMultiplier = 1;
                  if(ScreenLevelSelect.levelDifficulty == "Medium")
                  {
                     amountMultiplier = DifficultyMultipliers.multiplierAmountMedium;
                  }
                  else if(ScreenLevelSelect.levelDifficulty == "Hard")
                  {
                     amountMultiplier = DifficultyMultipliers.multiplierAmountHard;
                  }
                  this.objectiveText.text = "Kill " + Math.round(screenGameEnemyModel[selectedLevel - 1][0] * amountMultiplier) + " Enemies";
               }
               else if(levelMode == "Flag")
               {
                  this.objectiveText.text = "Collect " + screenGameFlagModel[selectedLevel - 1][0] + " Flags";
               }
               else if(levelMode == "Boss")
               {
                  bosses = this.getBossCount(selectedWorld,selectedLevel);
                  if(bosses <= 1)
                  {
                     this.objectiveText.text = "Kill " + bosses + " Boss";
                  }
                  else
                  {
                     this.objectiveText.text = "Kill " + bosses + " Bosses";
                  }
               }
               if(levelMode == "Defense")
               {
                  this.noteText.text = "(Defend the bottom.)";
               }
               else if(levelMode == "Tower")
               {
                  this.noteText.text = "(You can\'t move.)";
               }
               else
               {
                  this.noteText.text = "";
               }
               if(!stage.contains(this.bPlayLevel))
               {
                  this.bPlayLevel.sLevelSelect = this;
                  this.buttonLayer.addChild(this.bPlayLevel);
                  this.bPlayLevel.x = 414;
                  this.bPlayLevel.y = 156;
               }
               if(!stage.contains(this.bDifficultyEasy))
               {
                  this.bDifficultyEasy.pText = this.pInfoText;
                  this.buttonLayer.addChild(this.bDifficultyEasy);
                  this.bDifficultyEasy.x = 414;
                  this.bDifficultyEasy.y = 224;
               }
               if(!stage.contains(this.bDifficultyMedium))
               {
                  this.bDifficultyMedium.pText = this.pInfoText;
                  this.buttonLayer.addChild(this.bDifficultyMedium);
                  this.bDifficultyMedium.x = 489;
                  this.bDifficultyMedium.y = 224;
               }
               if(!stage.contains(this.bDifficultyHard))
               {
                  this.bDifficultyHard.pText = this.pInfoText;
                  this.buttonLayer.addChild(this.bDifficultyHard);
                  this.bDifficultyHard.x = 564;
                  this.bDifficultyHard.y = 224;
               }
            }
            this.removeEnemyImages();
            this.addEnemyImages();
         }
         else if(dataChanged)
         {
            dataChanged = false;
            this.bgWindowBar.alpha = 0;
            this.bgWindowBar2.alpha = 0;
            this.bgWindowBarEnemies.alpha = 0;
            this.levelNameText.text = "";
            this.difficultyText.text = "";
            this.modeText.text = "";
            this.objectiveTitleText.text = "";
            this.objectiveText.text = "";
            this.noteText.text = "";
            this.enemiesText.text = "";
            this.ulText.text = "";
            if(stage.contains(this.bPlayLevel))
            {
               this.buttonLayer.removeChild(this.bPlayLevel);
            }
            if(stage.contains(this.bDifficultyEasy))
            {
               this.buttonLayer.removeChild(this.bDifficultyEasy);
            }
            if(stage.contains(this.bDifficultyMedium))
            {
               this.buttonLayer.removeChild(this.bDifficultyMedium);
            }
            if(stage.contains(this.bDifficultyHard))
            {
               this.buttonLayer.removeChild(this.bDifficultyHard);
            }
            this.removeEnemyImages();
         }
         this.handleWorldButtons();
         this.handleLevelButtons();
      }
      
      private function handleWorldButtons() : void
      {
         var button:* = undefined;
         for(var i:* = 0; i < this.buttonWorldArray.length; i++)
         {
            button = this.buttonWorldArray[i];
            if(Boolean(button.clicked) && !button.isLocked)
            {
               changeToLevels = true;
               worldNumberChangeTo = button.number;
               if(!LevelGuide.autoSelect)
               {
                  LevelGuide.selectedWorld = button.number;
                  LevelGuide.selectedLevel = 1;
               }
            }
         }
      }
      
      private function handleProgressTimer() : void
      {
         var removeIcon:* = undefined;
         var iconS:* = undefined;
         var iconTweenScaleX:* = undefined;
         var iconTweenScaleY:* = undefined;
         var iconTweenY:* = undefined;
         var levelsInCurrentWorld:* = undefined;
         var unlockButton:* = undefined;
         if(progressTimerOn)
         {
            if(this.progressTimer == 0)
            {
               this.iconsToAdd = 0;
               this.iconType = "None";
               if(this.valuesToAdd[0] > 0)
               {
                  this.iconsToAdd = this.valuesToAdd[0];
                  this.iconType = "Gold";
               }
               else if(this.valuesToAdd[1] > 0)
               {
                  this.iconsToAdd = this.valuesToAdd[1];
                  this.iconType = "Silver";
               }
               else if(this.valuesToAdd[2] > 0)
               {
                  this.iconsToAdd = this.valuesToAdd[2];
                  this.iconType = "Bronze";
               }
               this.iconsToRemove = this.iconsToAdd;
               this.theButton = this.buttonLevelArray[this.levelToChange - 1];
               if(this.iconsToRemove > this.theButton.iconArray.length)
               {
                  this.iconsToRemove = this.theButton.iconArray.length;
               }
               this.progressTimerMax = this.iconsToAdd * 7 - 7;
               this.removeCount = 0;
               this.addCount = 0;
            }
            if(this.progressTimer <= this.progressTimerMax)
            {
               ++this.progressTimer;
               if(this.progressTimer == 1 || this.progressTimer == 8 || this.progressTimer == 15)
               {
                  if(this.removeCount < this.iconsToRemove)
                  {
                     removeIcon = this.theButton.iconArray[this.removeCount + this.placePos];
                     if(removeIcon != null)
                     {
                        removeIcon.parent.removeChild(removeIcon);
                     }
                     ++this.removeCount;
                  }
                  if(this.addCount < this.iconsToAdd)
                  {
                     if(this.theButton.levelMode == "Normal")
                     {
                        iconS = new IconStar();
                     }
                     else if(this.theButton.levelMode == "Flag")
                     {
                        iconS = new IconFlag();
                     }
                     else if(this.theButton.levelMode == "Defense")
                     {
                        iconS = new IconShield();
                     }
                     else if(this.theButton.levelMode == "Tower")
                     {
                        iconS = new IconTower();
                     }
                     else if(this.theButton.levelMode == "Boss")
                     {
                        iconS = new IconBoss();
                     }
                     if(this.iconType == "Gold")
                     {
                        iconS.gotoAndStop(3);
                     }
                     else if(this.iconType == "Silver")
                     {
                        iconS.gotoAndStop(2);
                     }
                     else if(this.iconType == "Bronze")
                     {
                        iconS.gotoAndStop(1);
                     }
                     this.theButton.addChild(iconS);
                     iconS.scaleX = 0.5;
                     iconS.scaleY = 0.5;
                     iconS.x = 10 + (this.addCount + this.placePos) * 11;
                     iconS.y = 32;
                     iconTweenScaleX = new Tween(iconS,"scaleX",Regular.easeOut,1,0.5,7,false);
                     iconTweenScaleY = new Tween(iconS,"scaleY",Regular.easeOut,0,0.5,7,false);
                     iconTweenY = new Tween(iconS,"y",Regular.easeOut,36,32,7,false);
                     this.tweenArray.push(iconTweenScaleX);
                     this.tweenArray.push(iconTweenScaleY);
                     this.tweenArray.push(iconTweenY);
                     this.theButton.iconArray.push(iconS);
                     ++this.addCount;
                  }
               }
            }
            else
            {
               progressTimerOn = false;
               levelsInCurrentWorld = ScreenGame.worldModels[3 * ScreenGame.world - 3].length;
               if(this.levelToChange + 1 <= levelsInCurrentWorld && this.buttonLevelArray.length > 0)
               {
                  unlockButton = this.buttonLevelArray[this.levelToChange];
                  if(unlockButton.isLocked)
                  {
                     unlockButton.levelText.text = unlockButton.number;
                     unlockButton.isLocked = false;
                     unlockButton.iconMode = new IconMode();
                     unlockButton.addChild(unlockButton.iconMode);
                     unlockButton.iconMode.x = 32;
                     unlockButton.iconMode.y = 11;
                     if(unlockButton.levelMode == "Normal")
                     {
                        unlockButton.iconFrame = 1;
                     }
                     else if(unlockButton.levelMode == "Flag")
                     {
                        unlockButton.iconFrame = 2;
                     }
                     else if(unlockButton.levelMode == "Defense")
                     {
                        unlockButton.iconFrame = 3;
                     }
                     else if(unlockButton.levelMode == "Tower")
                     {
                        unlockButton.iconFrame = 4;
                     }
                     else if(unlockButton.levelMode == "Boss")
                     {
                        unlockButton.iconFrame = 5;
                     }
                     unlockButton.iconMode.gotoAndStop(unlockButton.iconFrame * 3);
                     SoundManager.sfxArray.push("Unlock");
                     this.spawnLockParticle(unlockButton.x + 20,unlockButton.y + 20);
                     this.selectFromLevelGuide();
                  }
               }
               else if(progressWorld != 0)
               {
                  changeToWorlds = true;
               }
            }
         }
      }
      
      private function addWorldButtons() : void
      {
         var bWorld:* = undefined;
         var xPos:* = undefined;
         var yPos:* = undefined;
         var u:* = undefined;
         var valuesArray:* = undefined;
         var totalLevelsInWorld:* = undefined;
         var levelsCompleted:* = undefined;
         var valuesBronze:* = undefined;
         var valuesSilver:* = undefined;
         var valuesGold:* = undefined;
         var levelsUnlocked:* = undefined;
         var ii:* = undefined;
         for(var i:* = 0; i < totalWorlds; i++)
         {
            bWorld = new ButtonWorld();
            bWorld.number = i + 1;
            this.contentHolder.addChild(bWorld);
            xPos = 4;
            yPos = 124;
            for(u = i; u >= 3; u -= 3)
            {
               xPos -= 405;
               yPos += 102;
            }
            xPos += 135 * i;
            bWorld.x = xPos;
            bWorld.y = yPos;
            valuesArray = worldsValuesVisibleArrays[i - 1];
            if(i + 1 == progressWorld || valuesArray != null && valuesArray[valuesArray.length - 1][0] == 0 && valuesArray[valuesArray.length - 1][1] == 0 && valuesArray[valuesArray.length - 1][2] == 0)
            {
               bWorld.isLocked = true;
               bWorld.worldText.text = "";
               bWorld.iconBronzeValue.alpha = 0;
               bWorld.iconSilverValue.alpha = 0;
               bWorld.iconGoldValue.alpha = 0;
            }
            if(!bWorld.isLocked)
            {
               bWorld.worldText.text = "" + bWorld.number;
               totalLevelsInWorld = ScreenGame.worldModels[bWorld.number * 3 - 2].length;
               levelsCompleted = 0;
               valuesArray = worldsValuesVisibleArrays[i];
               valuesBronze = 0;
               valuesSilver = 0;
               valuesGold = 0;
               if(valuesArray != null)
               {
                  for(ii = 0; ii < totalLevelsInWorld; ii++)
                  {
                     if(valuesArray[ii][0] != 0 || valuesArray[ii][1] != 0 || valuesArray[ii][2] != 0)
                     {
                        levelsCompleted++;
                        valuesGold += valuesArray[ii][0];
                        if(valuesArray[ii][0] > valuesArray[ii][1])
                        {
                           valuesSilver += valuesArray[ii][0];
                        }
                        else
                        {
                           valuesSilver += valuesArray[ii][1];
                        }
                        if(valuesArray[ii][0] > valuesArray[ii][1] && valuesArray[ii][0] > valuesArray[ii][2])
                        {
                           valuesBronze += valuesArray[ii][0];
                        }
                        else if(valuesArray[ii][1] > valuesArray[ii][0])
                        {
                           valuesBronze += valuesArray[ii][1];
                        }
                        else
                        {
                           valuesBronze += valuesArray[ii][2];
                        }
                     }
                  }
               }
               levelsUnlocked = levelsCompleted + 1;
               if(levelsUnlocked > totalLevelsInWorld)
               {
                  levelsUnlocked = totalLevelsInWorld;
               }
               bWorld.progressText.text = "Level " + levelsUnlocked + "/" + totalLevelsInWorld;
               bWorld.valuesBronzeText.text = valuesBronze + "/" + totalLevelsInWorld * 3;
               bWorld.valuesSilverText.text = valuesSilver + "/" + totalLevelsInWorld * 3;
               bWorld.valuesGoldText.text = valuesGold + "/" + totalLevelsInWorld * 3;
            }
            this.buttonWorldArray.push(bWorld);
         }
      }
   }
}

