package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol595")]
   public class ButtonLevelSelect extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      private var isActive:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public function ButtonLevelSelect()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         if(Main.changeScreen != "LevelSelect" && (Main.changeScreen != "Premium" || !ScreenPremium.triggeredFromMenu))
         {
            this.isActive = true;
         }
         else
         {
            this.isActive = false;
         }
         if(this.isActive)
         {
            this.gotoAndStop(1);
            buttonMode = true;
         }
         else
         {
            this.gotoAndStop(4);
         }
         this.tabEnabled = false;
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            this.pressed = true;
            this.gotoAndStop(3);
         }
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
         }
      }
      
      public function update(event:Event) : void
      {
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive && this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2);
            Main.changeScreen = "LevelSelect";
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            this.gotoAndStop(1);
            this.cursorOver = false;
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
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
         }
      }
   }
}

