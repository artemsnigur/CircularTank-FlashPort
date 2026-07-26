package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   
   public class ButtonGameDifficulty extends MovieClip
   {
      
      private var thisDifficulty:Boolean = false;
      
      public var myDifficulty:String = "";
      
      private var cursorOver:Boolean = false;
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var shadowArray:Array = filters;
      
      public function ButtonGameDifficulty()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         this.shadowArray.push(this.myShadow);
         this.tabEnabled = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(2);
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            Main.hDifficultyChosen = true;
            SaveManager.saveOtherHelpers();
         }
         this.gotoAndStop(3);
         if(Main.currentScreen == "LevelSelect" || Main.currentScreen == "Options" || Main.currentScreen == "Status")
         {
            ScreenLevelSelect.levelDifficulty = this.myDifficulty;
            ScreenLevelSelect.dataChanged = true;
         }
         else if(Main.currentScreen == "Enemies")
         {
            ScreenEnemies.enemyDifficulty = this.myDifficulty;
            ScreenEnemies.changeLayout = true;
         }
         buttonMode = false;
      }
      
      private function setImage() : void
      {
         if((Main.currentScreen == "LevelSelect" || Main.currentScreen == "Options" || Main.currentScreen == "Status") && ScreenLevelSelect.levelDifficulty == this.myDifficulty || Main.currentScreen == "Enemies" && ScreenEnemies.enemyDifficulty == this.myDifficulty)
         {
            this.thisDifficulty = true;
         }
         else
         {
            this.thisDifficulty = false;
         }
         if(this.thisDifficulty)
         {
            this.gotoAndStop(3);
            this.filters = this.shadowArray;
         }
         else if(this.cursorOver)
         {
            if(this.currentFrame != 2)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.gotoAndStop(2);
            this.filters = [];
         }
         else
         {
            this.gotoAndStop(1);
            this.filters = [];
         }
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
      
      private function added(event:Event) : void
      {
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
         if(this.currentFrame != 3)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
   }
}

