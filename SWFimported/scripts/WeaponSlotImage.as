package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol626")]
   public class WeaponSlotImage extends MovieClip
   {
      
      public var slot:Number = 0;
      
      public function WeaponSlotImage()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function added(event:Event) : void
      {
         addEventListener(Event.ENTER_FRAME,this.update);
      }
      
      public function update(event:Event) : void
      {
         if(ScreenGame.equippedWeapons[this.slot - 1] == "None")
         {
            gotoAndStop(1);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Cannon")
         {
            gotoAndStop(2);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "MiniGun")
         {
            gotoAndStop(3);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Big Cannon")
         {
            gotoAndStop(4);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Flamethrower")
         {
            gotoAndStop(5);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Shotgun")
         {
            gotoAndStop(6);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Timed Bomb Cannon")
         {
            gotoAndStop(7);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Gummy Bear Cannon")
         {
            gotoAndStop(8);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Poison Cannon")
         {
            gotoAndStop(9);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Laser Cannon")
         {
            gotoAndStop(10);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Cake Cannon")
         {
            gotoAndStop(11);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Penetration Cannon")
         {
            gotoAndStop(12);
         }
         else if(ScreenGame.equippedWeapons[this.slot - 1] == "Magic Cannon")
         {
            gotoAndStop(13);
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
   }
}

