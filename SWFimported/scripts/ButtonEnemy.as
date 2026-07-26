package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonEnemy extends MovieClip
   {
      
      public var enemyType:String;
      
      public var clicked:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      private var thisEnemy:Boolean = false;
      
      public var notDiscovered:Boolean = true;
      
      public function ButtonEnemy()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.gotoAndStop(1);
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
         this.setImage();
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(!this.notDiscovered)
         {
            if(this.currentFrame != 3)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
            }
            this.gotoAndStop(3);
            if(ScreenEnemies.selectedEnemy != this.enemyType)
            {
               ScreenEnemies.selectedEnemy = this.enemyType;
               ScreenEnemies.changeLayout = true;
            }
         }
         this.clicked = true;
         buttonMode = false;
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.thisEnemy)
         {
            if(!this.notDiscovered)
            {
               this.gotoAndStop(2);
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      private function setImage() : void
      {
         if(ScreenEnemies.selectedEnemy == this.enemyType)
         {
            this.thisEnemy = true;
         }
         else
         {
            this.thisEnemy = false;
         }
         this.clicked = false;
         if(this.thisEnemy)
         {
            if(!this.notDiscovered)
            {
               this.gotoAndStop(3);
            }
         }
         else if(this.cursorOver)
         {
            if(!this.notDiscovered)
            {
               if(this.currentFrame != 2)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
               }
               this.gotoAndStop(2);
            }
         }
         else if(!this.notDiscovered)
         {
            this.gotoAndStop(1);
         }
         else
         {
            this.gotoAndStop(4);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
         if(this.currentFrame != 4)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
         }
      }
   }
}

