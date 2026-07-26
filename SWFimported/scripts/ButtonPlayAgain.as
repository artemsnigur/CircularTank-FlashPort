package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol590")]
   public class ButtonPlayAgain extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      public var extraYPos:Number = 0;
      
      private var isAdded:Boolean = false;
      
      public function ButtonPlayAgain()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.gotoAndStop(1);
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
            addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
            addEventListener(Event.ENTER_FRAME,this.update);
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
      
      public function removed(event:Event) : void
      {
         removeEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         removeEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         removeEventListener(Event.ENTER_FRAME,this.update);
         this.isAdded = false;
      }
      
      public function update(event:Event) : void
      {
         if(stage != null && stage.mouseX >= 380 && stage.mouseX <= 380 + width && stage.mouseY >= 295 + this.extraYPos && stage.mouseY <= 295 + height + this.extraYPos && !ScreenStatus.windowOkDisplayed)
         {
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
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if((ScreenStatus.pageCurrent == 1 || ScreenStatus.pageNext == 1) && this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2);
            this.pressed = false;
            if(ScreenGame.level != 0)
            {
               Main.changeScreen = "Game";
            }
         }
      }
   }
}

