package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonWindow extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      public var clicked:Boolean = false;
      
      public var extraImages:Number = 0;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public function ButtonWindow()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.gotoAndStop(1 + this.extraImages);
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         this.pressed = true;
         this.gotoAndStop(3 + this.extraImages);
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
         this.isAdded = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2 + this.extraImages);
            this.clicked = true;
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1 + this.extraImages);
         this.cursorOver = false;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            this.gotoAndStop(3 + this.extraImages);
         }
         else
         {
            this.gotoAndStop(2 + this.extraImages);
         }
         if(!this.cursorOver)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.cursorOver = true;
      }
   }
}

