package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonPause extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      public var refInterface:MovieClip;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public var type:String = "None";
      
      public function ButtonPause()
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
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      public function update(event:Event) : void
      {
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         this.pressed = true;
         this.gotoAndStop(3);
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2);
            SoundManager.musicPaused = false;
            if(this.type == "Resume")
            {
               if(PartGameArea.canPause)
               {
                  this.refInterface.unPauseGame();
                  PartGameArea.gamePaused = !PartGameArea.gamePaused;
                  PartGameArea.canPause = false;
               }
            }
            else if(PartGameArea.gamePaused && !Main.screenChanging && !(Main.keyP || Main.keyEsc) && !PartGameArea.quitting)
            {
               if(this.type == "Reset")
               {
                  Main.changeScreen = "Reset";
                  PartGameArea.resetTempVariables("Quit");
                  PartGameArea.quitting = true;
               }
               else if(this.type == "Quit")
               {
                  Main.changeScreen = "LevelSelect";
                  PartGameArea.resetTempVariables("Quit");
                  PartGameArea.quitting = true;
                  SoundManager.currentMusic = "None";
                  SoundManager.changeMusic = "None";
               }
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
         this.cursorOver = false;
      }
   }
}

