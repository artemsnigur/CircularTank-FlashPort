package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol811")]
   public class ButtonConvertSave extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      public var convertingThisSlot:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      private var addFrames:Number = 0;
      
      private var cursorOver:Boolean = false;
      
      public var sMenu:Object;
      
      public var pText:Object;
      
      public var slot:Number = 0;
      
      public function ButtonConvertSave()
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
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            this.gotoAndStop(3 + this.addFrames);
         }
         else
         {
            this.gotoAndStop(2 + this.addFrames);
         }
         if(!this.cursorOver)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.cursorOver = true;
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         this.pressed = true;
         this.gotoAndStop(3 + this.addFrames);
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver && !ScreenMenu.convertingSaves)
         {
            this.pText.showText = true;
            this.pText.changeText("Convert local save\nto online save",true,true);
         }
         if(this.convertingThisSlot)
         {
            this.addFrames = 3;
         }
         else
         {
            if(!this.cursorOver && this.addFrames == 3)
            {
               gotoAndStop(1);
            }
            this.addFrames = 0;
         }
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      public function removed(event:Event) : void
      {
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2 + this.addFrames);
            if(!this.convertingThisSlot)
            {
               this.sMenu.startConvertSaves(this.slot);
               this.addFrames = 3;
            }
            else
            {
               this.sMenu.endConvertSaves();
               this.addFrames = 0;
            }
            this.gotoAndStop(2 + this.addFrames);
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1 + this.addFrames);
         this.cursorOver = false;
      }
   }
}

