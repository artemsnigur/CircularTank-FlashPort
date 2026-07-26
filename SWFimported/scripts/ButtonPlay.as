package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol29")]
   public class ButtonPlay extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public var activeButton:Boolean = false;
      
      public function ButtonPlay()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            if(this.activeButton)
            {
               addEventListener(Event.ENTER_FRAME,this.update);
               addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
               addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
               addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
               addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
               addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
               this.gotoAndStop(1);
               buttonMode = true;
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         this.pressed = true;
         this.gotoAndStop(3);
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      public function update(event:Event) : void
      {
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            this.gotoAndStop(2);
            MovieClip(parent.parent).activateGame();
            Main.googleTracker.trackEvent("Button Clicked","Play");
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            this.gotoAndStop(3);
         }
         else
         {
            this.gotoAndStop(2);
         }
         this.cursorOver = true;
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
         this.cursorOver = false;
      }
   }
}

