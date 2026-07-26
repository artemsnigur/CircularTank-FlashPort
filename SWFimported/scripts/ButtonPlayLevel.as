package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol444")]
   public class ButtonPlayLevel extends MovieClip
   {
      
      private var myGlowHelp:* = new DropShadowFilter(0,0,16711680,1,5,5,5,2);
      
      private var uihActivated:Boolean = false;
      
      private var glowHelpArray:Array = filters;
      
      public var sLevelSelect:Object;
      
      private var isAdded:Boolean = false;
      
      public function ButtonPlayLevel()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.glowHelpArray.push(this.myGlowHelp);
         this.gotoAndStop(1);
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(2);
         if(ScreenLevelSelect.selectedLevel != 0)
         {
            this.sLevelSelect.playLevel();
            if(this.uihActivated)
            {
               this.uihActivated = false;
               this.filters = [];
               Main.uihButtonPlayLevel = true;
               SaveManager.saveUIHelpers();
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         this.gotoAndStop(3);
      }
      
      public function update(event:Event) : void
      {
         if(PartTutorial.tutorialOn && Main.uihButtonPlayLevel == false && !this.uihActivated)
         {
            this.uihActivated = true;
            this.filters = this.glowHelpArray;
            if(Main.uihButtonLevel == false)
            {
               Main.uihButtonLevel = true;
               SaveManager.saveUIHelpers();
            }
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 2)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.gotoAndStop(2);
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
      }
   }
}

