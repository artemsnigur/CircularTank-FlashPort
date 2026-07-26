package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonMore extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      public var cursorOver:Boolean = false;
      
      private var isActive:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public function ButtonMore()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.gotoAndStop(1);
         buttonMode = true;
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
            if(!Main.siteLockVersion)
            {
               this.isActive = true;
               alpha = 1;
            }
            else
            {
               this.isActive = false;
               alpha = 0;
            }
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
         if(this.isActive)
         {
            if(this.pressed)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
               this.gotoAndStop(2);
               if(Main.changeScreen != "Premium")
               {
                  Main.changeScreen = "Premium";
                  Main.googleTracker.trackEvent("Button Clicked","Button More","From " + Main.currentScreen);
               }
            }
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
         }
         this.cursorOver = true;
      }
   }
}

