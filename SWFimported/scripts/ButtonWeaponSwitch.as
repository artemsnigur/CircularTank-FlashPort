package
{
   import flash.display.MovieClip;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol816")]
   public class ButtonWeaponSwitch extends MovieClip
   {
      
      public var cursorOver:Boolean = false;
      
      public function ButtonWeaponSwitch()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         this.gotoAndStop(1);
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(2);
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         this.gotoAndStop(3);
         var equipTemporary:* = ScreenGame.equippedWeapons[0];
         ScreenGame.equippedWeapons[0] = ScreenGame.equippedWeapons[1];
         ScreenGame.equippedWeapons[1] = equipTemporary;
         equipTemporary = null;
         SaveManager.saveEquips();
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
         this.cursorOver = false;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 2)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.gotoAndStop(2);
         this.cursorOver = true;
      }
   }
}

