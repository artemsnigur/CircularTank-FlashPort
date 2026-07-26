package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol504")]
   public class ButtonOptionCheckBox extends MovieClip
   {
      
      public var marked:Boolean;
      
      private var cursorOver:Boolean = false;
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var isAdded:Boolean = false;
      
      private var shadowArray:Array = filters;
      
      public function ButtonOptionCheckBox()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.shadowArray.push(this.myShadow);
         this.filters = this.shadowArray;
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
            addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
            addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
            addEventListener(Event.ENTER_FRAME,this.update);
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.marked)
         {
            if(this.currentFrame != 3)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
            }
            this.gotoAndStop(3);
         }
         else
         {
            if(this.currentFrame != 4)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
            }
            this.gotoAndStop(4);
         }
         this.marked = !this.marked;
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      private function setImage() : void
      {
         if(this.marked)
         {
            if(this.cursorOver)
            {
               if(this.currentFrame != 4)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
               }
               this.gotoAndStop(4);
            }
            else
            {
               this.gotoAndStop(2);
            }
         }
         else if(this.cursorOver)
         {
            if(this.currentFrame != 3)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.gotoAndStop(3);
         }
         else
         {
            this.gotoAndStop(1);
         }
      }
      
      public function update(event:Event) : void
      {
         if(stage != null)
         {
            this.setImage();
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
      }
   }
}

