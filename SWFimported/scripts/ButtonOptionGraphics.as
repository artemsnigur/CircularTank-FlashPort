package
{
   import flash.display.MovieClip;
   import flash.display.StageQuality;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   
   public class ButtonOptionGraphics extends MovieClip
   {
      
      public var myOption:String = "";
      
      private var cursorOver:Boolean = false;
      
      private var thisOption:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      private var shadowArray:Array = filters;
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      public function ButtonOptionGraphics()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.shadowArray.push(this.myShadow);
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
            addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
            addEventListener(Event.ENTER_FRAME,this.update);
         }
      }
      
      private function setImage() : void
      {
         if(stage.quality == this.myOption)
         {
            this.thisOption = true;
         }
         else
         {
            this.thisOption = false;
         }
         if(this.thisOption)
         {
            this.gotoAndStop(3);
            this.filters = this.shadowArray;
         }
         else if(this.cursorOver)
         {
            if(this.currentFrame != 2)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.gotoAndStop(2);
            this.filters = [];
         }
         else
         {
            this.gotoAndStop(1);
            this.filters = [];
         }
      }
      
      public function update(event:Event) : void
      {
         if(stage != null)
         {
            this.setImage();
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         this.gotoAndStop(3);
         if(this.myOption == "LOW")
         {
            stage.quality = StageQuality.LOW;
         }
         else if(this.myOption == "MEDIUM")
         {
            stage.quality = StageQuality.MEDIUM;
         }
         else if(this.myOption == "HIGH")
         {
            stage.quality = StageQuality.HIGH;
         }
         buttonMode = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(2);
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
         if(this.currentFrame != 3)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
   }
}

