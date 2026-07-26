package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonEnemyLevel extends MovieClip
   {
      
      private var thisLevel:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      public var myLevel:String;
      
      public function ButtonEnemyLevel()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         this.tabEnabled = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(2);
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         this.gotoAndStop(3);
         ScreenEnemies.selectedEnemyLevel = this.myLevel;
         ScreenEnemies.changeLayout = true;
         buttonMode = false;
      }
      
      private function setImage() : void
      {
         if(ScreenEnemies.selectedEnemyLevel == this.myLevel)
         {
            this.thisLevel = true;
         }
         else
         {
            this.thisLevel = false;
         }
         if(this.thisLevel)
         {
            this.gotoAndStop(3);
         }
         else if(this.cursorOver)
         {
            if(this.currentFrame != 2)
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

