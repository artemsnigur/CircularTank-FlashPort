package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.net.URLRequest;
   import flash.net.navigateToURL;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol1629")]
   public class ButtonMoreGames extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public function ButtonMoreGames()
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
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
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
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2);
            navigateToURL(new URLRequest(Main.linkMoreGames),"_blank");
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
         this.cursorOver = false;
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
         if(!this.cursorOver)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.cursorOver = true;
      }
   }
}

