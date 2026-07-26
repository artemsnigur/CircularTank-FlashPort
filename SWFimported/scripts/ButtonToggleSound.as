package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol44")]
   public class ButtonToggleSound extends MovieClip
   {
      
      private var cursorOver:Boolean = false;
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var shadowArray:Array = filters;
      
      public function ButtonToggleSound()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         this.shadowArray.push(this.myShadow);
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         SoundManager.sfxArray.push("InterfaceButtonClick");
         SoundManager.soundOn = !SoundManager.soundOn;
         if(SoundManager.soundOn)
         {
            SoundManager.soundVol = 1;
         }
         else
         {
            SoundManager.soundVol = 0;
         }
         SoundManager.setVolumesBoolean = true;
      }
      
      private function setImage() : void
      {
         if(SoundManager.soundOn)
         {
            if(this.cursorOver)
            {
               if(this.currentFrame == 1 || this.currentFrame == 3)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
               }
               this.gotoAndStop(2);
            }
            else
            {
               this.gotoAndStop(1);
            }
         }
         else if(this.cursorOver)
         {
            if(this.currentFrame == 1 || this.currentFrame == 3)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.gotoAndStop(4);
         }
         else
         {
            this.gotoAndStop(3);
         }
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
   }
}

