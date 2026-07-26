package
{
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.text.TextField;
   import flash.utils.getTimer;
   
   public class FPS extends Sprite
   {
      
      private var startTime:Number;
      
      private var fps:TextField = new TextField();
      
      private var isAdded:Boolean = false;
      
      private var framesNumber:Number = 0;
      
      public function FPS()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.startTime = getTimer();
         this.fps.textColor = 16777215;
         addChild(this.fps);
         addEventListener(Event.ENTER_FRAME,this.update);
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      internal function update(e:Event) : void
      {
         var currentTime:Number = (getTimer() - this.startTime) / 1000;
         ++this.framesNumber;
         if(currentTime > 1)
         {
            this.fps.text = "FPS: " + Math.floor(this.framesNumber / currentTime * 10) / 10;
            this.startTime = getTimer();
            this.framesNumber = 0;
         }
      }
   }
}

