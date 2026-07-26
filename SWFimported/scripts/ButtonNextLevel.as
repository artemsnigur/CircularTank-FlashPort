package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   import flash.utils.ByteArray;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol586")]
   public class ButtonNextLevel extends MovieClip
   {
      
      public static var levelTryPlay:Number;
      
      public static var worldTryPlay:Number;
      
      private var myGlowHelp:* = new DropShadowFilter(0,0,16711680,1,5,5,5,2);
      
      private var cursorOver:Boolean = false;
      
      private var glowHelpArray:Array = filters;
      
      private var uihActivated:Boolean = false;
      
      private var pressed:Boolean = false;
      
      private var windowOk:WindowOk = new WindowOk();
      
      private var isAdded:Boolean = false;
      
      public var pText:Object;
      
      private var theText:String = "";
      
      public function ButtonNextLevel()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.glowHelpArray.push(this.myGlowHelp);
         this.gotoAndStop(1);
         this.tabEnabled = false;
      }
      
      public static function startNextLevel() : void
      {
         ScreenLevelSelect.selectedWorld = worldTryPlay;
         ScreenGame.world = worldTryPlay;
         ScreenGame.level = levelTryPlay;
         ScreenLevelSelect.levelMode = ScreenGame.worldModels[3 * ScreenGame.world - 2][ScreenGame.level - 1][6];
         Main.changeScreen = "Game";
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
            addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
            addEventListener(Event.ENTER_FRAME,this.update);
            ScreenStatus.nextLevelButtonExposed = true;
            this.setTheText();
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if((ScreenStatus.pageCurrent == 1 || ScreenStatus.pageNext == 1) && this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2);
            this.pressed = false;
            this.tryToPlayNextLevel();
            if(this.uihActivated)
            {
               this.uihActivated = false;
               this.filters = [];
               Main.uihButtonNextLevel = true;
               SaveManager.saveUIHelpers();
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(ScreenStatus.pageCurrent == 1 || ScreenStatus.pageNext == 1)
         {
            this.gotoAndStop(3);
            this.pressed = true;
         }
      }
      
      public function tryToPlayNextLevel() : *
      {
         var belowLevelLimit:* = undefined;
         var showUpgradeLimitWindow:Boolean = false;
         var showChooseDifficultyWindow:Boolean = false;
         var theWorldAndLevel:* = undefined;
         var selectedUpgradeLimit:* = undefined;
         var i:* = undefined;
         var selectedSlot:* = undefined;
         var levelsInCurrentWorld:* = ScreenGame.worldModels[3 * ScreenGame.world - 3].length;
         var totalWorlds:* = ScreenGame.worldModels.length / 3;
         worldTryPlay = ScreenGame.world;
         levelTryPlay = ScreenGame.level;
         if(ScreenGame.level < levelsInCurrentWorld)
         {
            levelTryPlay = ScreenGame.level + 1;
         }
         else if(ScreenGame.world < totalWorlds)
         {
            levelTryPlay = 1;
            worldTryPlay = ScreenGame.world + 1;
         }
         else
         {
            levelTryPlay = 0;
         }
         if(levelTryPlay > 0)
         {
            belowLevelLimit = true;
            if(ScreenOptions.optionWindowULOn)
            {
               selectedUpgradeLimit = ScreenGame.worldModels[ScreenGame.world * 3 - 2][ScreenGame.level - 1][7];
               for(i = 0; i < ScreenGame.equippedWeapons.length; i++)
               {
                  selectedSlot = ScreenGame.equippedWeapons[i];
                  if(ScreenUpgrades.levelsArray[0] > selectedUpgradeLimit && selectedSlot == "Cannon" || ScreenUpgrades.levelsArray[1] > selectedUpgradeLimit && selectedSlot == "MiniGun" || ScreenUpgrades.levelsArray[2] > selectedUpgradeLimit && selectedSlot == "Big Cannon" || ScreenUpgrades.levelsArray[3] > selectedUpgradeLimit && selectedSlot == "Flamethrower" || ScreenUpgrades.levelsArray[4] > selectedUpgradeLimit && selectedSlot == "Shotgun" || ScreenUpgrades.levelsArray[5] > selectedUpgradeLimit && selectedSlot == "Timed Bomb Cannon" || ScreenUpgrades.levelsArray[6] > selectedUpgradeLimit && selectedSlot == "Gummy Bear Cannon" || ScreenUpgrades.levelsArray[7] > selectedUpgradeLimit && selectedSlot == "Poison Cannon" || ScreenUpgrades.levelsArray[8] > selectedUpgradeLimit && selectedSlot == "Laser Cannon" || ScreenUpgrades.levelsArray[9] > selectedUpgradeLimit && selectedSlot == "Cake Cannon" || ScreenUpgrades.levelsArray[10] > selectedUpgradeLimit && selectedSlot == "Penetration Cannon" || ScreenUpgrades
                  .levelsArray[11] > selectedUpgradeLimit && selectedSlot == "Magic Cannon")
                  {
                     belowLevelLimit = false;
                  }
                  else if(ScreenUpgrades.levelsArraySecondary[0] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Mine" || ScreenUpgrades.levelsArraySecondary[1] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Grenade" || ScreenUpgrades.levelsArraySecondary[2] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Ice Grenade" || ScreenUpgrades.levelsArraySecondary[3] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Poison Grenade" || ScreenUpgrades.levelsArraySecondary[4] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Icicles" || ScreenUpgrades.levelsArraySecondary[5] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Poison Spikes" || ScreenUpgrades.levelsArraySecondary[6] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Shield" || ScreenUpgrades.levelsArraySecondary[7] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Rockets" || ScreenUpgrades.levelsArraySecondary[8] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Ice Ball" || ScreenUpgrades
                  .levelsArraySecondary[9] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Lava Ball" || ScreenUpgrades.levelsArraySecondary[10] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Crazy Cheese" || ScreenUpgrades.levelsArraySecondary[11] > selectedUpgradeLimit && ScreenGame.secondaryWeapon == "Magic Bunny")
                  {
                     belowLevelLimit = false;
                  }
                  else if(ScreenUpgrades.levelsArrayMisc[0] > selectedUpgradeLimit || ScreenUpgrades.levelsArrayMisc[1] > selectedUpgradeLimit || ScreenUpgrades.levelsArrayMisc[2] > selectedUpgradeLimit || ScreenUpgrades.levelsArrayMisc[3] > selectedUpgradeLimit)
                  {
                     belowLevelLimit = false;
                  }
               }
            }
            showUpgradeLimitWindow = false;
            showChooseDifficultyWindow = false;
            if(ScreenOptions.optionWindowULOn && !belowLevelLimit)
            {
               showUpgradeLimitWindow = true;
            }
            theWorldAndLevel = ScreenLevelSelect.getCurrentWorldAndLevel();
            if(!showUpgradeLimitWindow && !showChooseDifficultyWindow)
            {
               ScreenLevelSelect.worldsValuesVisibleArrays = this.clone(ScreenLevelSelect.worldsValuesArrays);
               startNextLevel();
            }
            else if(showChooseDifficultyWindow)
            {
               this.windowOk.type = "Choose Difficulty";
               parent.parent.parent.addChild(this.windowOk);
               ScreenStatus.windowOkDisplayed = true;
               if(showUpgradeLimitWindow)
               {
                  this.windowOk.moreWindowsArray.push("Upgrade Limit");
               }
            }
            else if(showUpgradeLimitWindow)
            {
               this.windowOk.type = "Upgrade Limit";
               parent.parent.parent.addChild(this.windowOk);
               ScreenStatus.windowOkDisplayed = true;
            }
         }
      }
      
      public function update(event:Event) : void
      {
         var nextWorld:* = undefined;
         var nextLevel:* = undefined;
         var levelsInCurrentWorld:* = undefined;
         var totalWorlds:* = undefined;
         if(PartTutorial.tutorialOn && Main.uihButtonNextLevel == false && !this.uihActivated)
         {
            this.uihActivated = true;
            this.filters = this.glowHelpArray;
         }
         if(stage != null && stage.mouseX >= 380 && stage.mouseX <= 380 + width && stage.mouseY >= 355 && stage.mouseY <= 355 + height && !ScreenStatus.windowOkDisplayed)
         {
            if(this.pText != null && this.theText != "" && this.pText.infoText.text == "")
            {
               nextWorld = ScreenGame.world;
               nextLevel = ScreenGame.level;
               levelsInCurrentWorld = ScreenGame.worldModels[3 * nextWorld - 3].length;
               totalWorlds = ScreenGame.worldModels.length / 3;
               if(nextLevel < levelsInCurrentWorld)
               {
                  nextLevel++;
               }
               else if(nextWorld < totalWorlds)
               {
                  nextLevel = 1;
                  nextWorld++;
               }
               else
               {
                  nextLevel = 0;
               }
               this.pText.changeText(this.theText,false,false,"AllEnemiesInLevel",nextWorld,nextLevel);
            }
            this.pText.showText = true;
            if(ScreenStatus.pageCurrent == 1 || ScreenStatus.pageNext == 1)
            {
               if(this.pressed)
               {
                  this.gotoAndStop(3);
               }
               else
               {
                  this.gotoAndStop(2);
               }
               if(!this.cursorOver)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
               }
               this.cursorOver = true;
               buttonMode = true;
            }
         }
         else if(ScreenStatus.pageCurrent == 1 || ScreenStatus.pageNext == 1)
         {
            this.cursorOver = false;
            this.gotoAndStop(1);
            if(!Main.mouse)
            {
               buttonMode = false;
            }
         }
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      private function getBossCount(selectedWorld:Number, selectedLevel:Number) : *
      {
         var searchPlace:* = undefined;
         var bossCount:* = 0;
         for(var i:* = 0; i < (ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1].length - 2) / 2; i++)
         {
            searchPlace = ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1][2 + i * 2];
            if(searchPlace.slice(searchPlace.length - 1,searchPlace.length) == "B")
            {
               bossCount += ScreenGame.worldModels[selectedWorld * 3 - 3][selectedLevel - 1][3 + i * 2];
            }
         }
         return bossCount;
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         removeEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         removeEventListener(Event.ENTER_FRAME,this.update);
         this.isAdded = false;
      }
      
      internal function clone(source:Object) : *
      {
         var myBA:ByteArray = new ByteArray();
         myBA.writeObject(source);
         myBA.position = 0;
         return myBA.readObject();
      }
      
      private function setTheText() : *
      {
         var levelMode:* = undefined;
         var levelObjective:* = undefined;
         var levelDifficulty:* = undefined;
         var levelUpgradeLimit:* = undefined;
         var bosses:* = undefined;
         var nextWorld:* = ScreenGame.world;
         var nextLevel:* = ScreenGame.level;
         var levelsInCurrentWorld:* = ScreenGame.worldModels[3 * nextWorld - 3].length;
         var totalWorlds:* = ScreenGame.worldModels.length / 3;
         if(nextLevel < levelsInCurrentWorld)
         {
            nextLevel++;
         }
         else if(nextWorld < totalWorlds)
         {
            nextLevel = 1;
            nextWorld++;
         }
         else
         {
            nextLevel = 0;
         }
         if(nextLevel > 0)
         {
            levelMode = ScreenGame.worldModels[nextWorld * 3 - 2][nextLevel - 1][6];
            levelDifficulty = ScreenLevelSelect.levelDifficulty;
            levelUpgradeLimit = ScreenGame.worldModels[nextWorld * 3 - 2][nextLevel - 1][7];
            if(levelMode == "Normal" || levelMode == "Tower" || levelMode == "Defense")
            {
               if(levelDifficulty == "Easy")
               {
                  levelObjective = "Kill " + ScreenGame.worldModels[nextWorld * 3 - 3][nextLevel - 1][0] + " Enemies";
               }
               else if(levelDifficulty == "Medium")
               {
                  levelObjective = "Kill " + Math.round(ScreenGame.worldModels[nextWorld * 3 - 3][nextLevel - 1][0] * DifficultyMultipliers.multiplierAmountMedium) + " Enemies";
               }
               else if(levelDifficulty == "Hard")
               {
                  levelObjective = "Kill " + Math.round(ScreenGame.worldModels[nextWorld * 3 - 3][nextLevel - 1][0] * DifficultyMultipliers.multiplierAmountHard) + " Enemies";
               }
            }
            else if(levelMode == "Flag")
            {
               levelObjective = "Collect " + ScreenGame.worldModels[nextWorld * 3 - 1][nextLevel - 1][0] + " Flags";
            }
            else if(levelMode == "Boss")
            {
               bosses = this.getBossCount(nextWorld,nextLevel);
               if(bosses <= 1)
               {
                  levelObjective = "Kill " + bosses + " Boss";
               }
               else
               {
                  levelObjective = "Kill " + bosses + " Bosses";
               }
            }
            this.theText = "World: " + nextWorld + "\nLevel: " + nextLevel + "\nMode: " + levelMode + "\nDifficulty: " + levelDifficulty + "\nUpgrade Limit: " + levelUpgradeLimit + "\nObjective: " + levelObjective;
         }
         else
         {
            this.theText = "";
         }
      }
   }
}

