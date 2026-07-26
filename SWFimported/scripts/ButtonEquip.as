package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol437")]
   public class ButtonEquip extends MovieClip
   {
      
      private var cursorOver:Boolean = false;
      
      private var thisWeapon:Boolean = false;
      
      public function ButtonEquip()
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
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         this.gotoAndStop(3);
         if(ScreenUpgrades.upgradeType == 3)
         {
            ScreenGame.secondaryWeapon = ScreenUpgrades.secondaryNameArray[ScreenUpgrades.selectedSecondary - 1];
            SaveManager.saveEquips();
         }
         buttonMode = false;
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
      
      private function setImage() : void
      {
         if(ScreenUpgrades.upgradeType == 3)
         {
            if(ScreenGame.secondaryWeapon == ScreenUpgrades.secondaryNameArray[ScreenUpgrades.selectedSecondary - 1])
            {
               this.thisWeapon = true;
            }
            else
            {
               this.thisWeapon = false;
            }
         }
         if(this.thisWeapon)
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
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.thisWeapon)
         {
            this.gotoAndStop(2);
         }
      }
   }
}

