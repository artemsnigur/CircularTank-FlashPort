package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol1437")]
   public class ButtonLevelGuideInfo extends MovieClip
   {
      
      private var cursorOver:Boolean = false;
      
      public var pText:Object;
      
      private var theText:String = "";
      
      public function ButtonLevelGuideInfo()
      {
         super();
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         this.gotoAndStop(1);
         this.tabEnabled = false;
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver)
         {
            this.pText.showText = true;
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
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
         this.cursorOver = false;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 2)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.gotoAndStop(2);
         this.setTheText();
         this.pText.changeText(this.theText,false,false,"AllEnemiesInLevel",LevelGuide.selectedWorld,LevelGuide.selectedLevel);
         this.cursorOver = true;
      }
      
      private function setTheText() : *
      {
         var levelObjective:* = undefined;
         var bosses:* = undefined;
         var theWorld:* = LevelGuide.selectedWorld;
         var theLevel:* = LevelGuide.selectedLevel;
         var levelMode:* = ScreenGame.worldModels[theWorld * 3 - 2][theLevel - 1][6];
         var levelDifficulty:* = ScreenLevelSelect.levelDifficulty;
         var levelUpgradeLimit:* = ScreenGame.worldModels[theWorld * 3 - 2][theLevel - 1][7];
         if(levelMode == "Normal" || levelMode == "Tower" || levelMode == "Defense")
         {
            if(levelDifficulty == "Easy")
            {
               levelObjective = "Kill " + ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][0] + " Enemies";
            }
            else if(levelDifficulty == "Medium")
            {
               levelObjective = "Kill " + Math.round(ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][0] * DifficultyMultipliers.multiplierAmountMedium) + " Enemies";
            }
            else if(levelDifficulty == "Hard")
            {
               levelObjective = "Kill " + Math.round(ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][0] * DifficultyMultipliers.multiplierAmountHard) + " Enemies";
            }
         }
         else if(levelMode == "Flag")
         {
            levelObjective = "Collect " + ScreenGame.worldModels[theWorld * 3 - 1][theLevel - 1][0] + " Flags";
         }
         else if(levelMode == "Boss")
         {
            bosses = this.getBossCount(theWorld,theLevel);
            if(bosses <= 1)
            {
               levelObjective = "Kill " + bosses + " Boss";
            }
            else
            {
               levelObjective = "Kill " + bosses + " Bosses";
            }
         }
         this.theText = "World: " + theWorld + "\nLevel: " + theLevel + "\nMode: " + levelMode + "\nDifficulty: " + levelDifficulty + "\nUpgrade Limit: " + levelUpgradeLimit + "\nObjective: " + levelObjective;
      }
   }
}

