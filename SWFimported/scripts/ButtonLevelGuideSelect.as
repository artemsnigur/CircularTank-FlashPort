package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonLevelGuideSelect extends MovieClip
   {
      
      private var isAdded:Boolean = false;
      
      private var worldToSelect:Number = 0;
      
      private var cursorOver:Boolean = false;
      
      private var correctLevelSelected:Boolean = false;
      
      public var type:String = "None";
      
      private var levelToSelect:Number = 0;
      
      public var pText:Object;
      
      private var theText:String = "";
      
      public function ButtonLevelGuideSelect()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         this.gotoAndStop(1);
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            if(this.type == "Previous")
            {
               this.theText = "Select Previous Level\n\nThe level you have just played.";
            }
            else if(this.type == "Upcoming")
            {
               this.theText = "Select Upcoming Level\n\nThe level after the level you played previously. If you didn\'t win the previous level, the level guide assumes you are going to play it again.";
            }
            if(this.type == "Last")
            {
               this.theText = "Select Last Level\n\nThe last selectable level in the last selectable world.";
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         this.correctLevelSelected = true;
         LevelGuide.type = this.type;
         LevelGuide.updateVariables();
         Object(parent).updateAllButtons();
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(!this.correctLevelSelected)
         {
            if(this.currentFrame != 2)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
         }
         this.cursorOver = true;
         this.pText.changeText(this.theText,false,false);
         this.setImage();
      }
      
      public function updateState() : void
      {
         var upcomingArray:* = undefined;
         if(this.type == "Previous")
         {
            if(LevelGuide.selectedWorld == ScreenLevelSelect.previousWorld && LevelGuide.selectedLevel == ScreenLevelSelect.previousLevel)
            {
               this.correctLevelSelected = true;
            }
            else
            {
               this.correctLevelSelected = false;
            }
         }
         else if(this.type == "Upcoming")
         {
            upcomingArray = LevelGuide.getUpcomingWorldAndLevel();
            if(LevelGuide.selectedWorld == upcomingArray[0] && LevelGuide.selectedLevel == upcomingArray[1])
            {
               this.correctLevelSelected = true;
            }
            else
            {
               this.correctLevelSelected = false;
            }
         }
         else if(this.type == "Last")
         {
            if(LevelGuide.selectedWorld == LevelGuide.maxWorld && LevelGuide.selectedLevel == LevelGuide.maxLevel)
            {
               this.correctLevelSelected = true;
            }
            else
            {
               this.correctLevelSelected = false;
            }
         }
         if(this.correctLevelSelected)
         {
            buttonMode = false;
         }
         else
         {
            buttonMode = true;
         }
         this.setImage();
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver)
         {
            this.pText.showText = true;
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
         this.setImage();
      }
      
      private function setImage() : void
      {
         if(this.correctLevelSelected)
         {
            this.gotoAndStop(3);
         }
         else if(this.cursorOver)
         {
            this.gotoAndStop(2);
         }
         else
         {
            this.gotoAndStop(1);
         }
      }
   }
}

