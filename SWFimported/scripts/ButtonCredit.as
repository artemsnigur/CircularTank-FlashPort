package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol1613")]
   public class ButtonCredit extends MovieClip
   {
      
      private var cursorOver:Boolean = false;
      
      public var pText:Object;
      
      public function ButtonCredit()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         this.tabEnabled = false;
      }
      
      private function setImage() : void
      {
         var right:* = undefined;
         var bottom:* = undefined;
         var theText:* = undefined;
         if(this.cursorOver)
         {
            if(this.currentFrame != 2)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
               right = true;
               bottom = false;
               theText = "Testing & Editing by Wesley Jue";
               this.pText.changeText(theText,right,bottom);
            }
            this.gotoAndStop(2);
            this.pText.showText = true;
         }
         else
         {
            this.gotoAndStop(1);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
   }
}

