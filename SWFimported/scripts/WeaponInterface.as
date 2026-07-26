package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol1198")]
   public class WeaponInterface extends MovieClip
   {
      
      public var special:Boolean = false;
      
      public var unused:Boolean = false;
      
      private var showWeapon:String;
      
      public function WeaponInterface()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function added(event:Event) : void
      {
         addEventListener(Event.ENTER_FRAME,this.update);
         if(this.unused)
         {
            scaleX = 0.75;
            scaleY = 0.75;
         }
         else
         {
            scaleX = 1.25;
            scaleY = 1.25;
         }
      }
      
      public function update(event:Event) : void
      {
         if(!this.special)
         {
            if(this.unused)
            {
               if(ScreenGame.currentWeapon == 2)
               {
                  this.showWeapon = ScreenGame.equippedWeapons[0];
               }
               else
               {
                  this.showWeapon = ScreenGame.equippedWeapons[1];
               }
            }
            else
            {
               this.showWeapon = ScreenGame.equippedWeapons[ScreenGame.currentWeapon - 1];
            }
            if(this.showWeapon == "None")
            {
               gotoAndStop(1);
            }
            else if(this.showWeapon == "Cannon")
            {
               gotoAndStop(2);
            }
            else if(this.showWeapon == "MiniGun")
            {
               gotoAndStop(3);
            }
            else if(this.showWeapon == "Big Cannon")
            {
               gotoAndStop(4);
            }
            else if(this.showWeapon == "Flamethrower")
            {
               gotoAndStop(5);
            }
            else if(this.showWeapon == "Shotgun")
            {
               gotoAndStop(6);
            }
            else if(this.showWeapon == "Timed Bomb Cannon")
            {
               gotoAndStop(7);
            }
            else if(this.showWeapon == "Gummy Bear Cannon")
            {
               gotoAndStop(8);
            }
            else if(this.showWeapon == "Poison Cannon")
            {
               gotoAndStop(9);
            }
            else if(this.showWeapon == "Laser Cannon")
            {
               gotoAndStop(10);
            }
            else if(this.showWeapon == "Cake Cannon")
            {
               gotoAndStop(11);
            }
            else if(this.showWeapon == "Penetration Cannon")
            {
               gotoAndStop(12);
            }
            else if(this.showWeapon == "Magic Cannon")
            {
               gotoAndStop(13);
            }
         }
         else if(ScreenGame.secondaryWeapon == "Mine")
         {
            gotoAndStop(14);
         }
         else if(ScreenGame.secondaryWeapon == "Grenade")
         {
            gotoAndStop(15);
         }
         else if(ScreenGame.secondaryWeapon == "Ice Grenade")
         {
            gotoAndStop(16);
         }
         else if(ScreenGame.secondaryWeapon == "Poison Grenade")
         {
            gotoAndStop(17);
         }
         else if(ScreenGame.secondaryWeapon == "Icicles")
         {
            gotoAndStop(18);
         }
         else if(ScreenGame.secondaryWeapon == "Poison Spikes")
         {
            gotoAndStop(19);
         }
         else if(ScreenGame.secondaryWeapon == "Shield")
         {
            gotoAndStop(20);
         }
         else if(ScreenGame.secondaryWeapon == "Rockets")
         {
            gotoAndStop(21);
         }
         else if(ScreenGame.secondaryWeapon == "Ice Ball")
         {
            gotoAndStop(22);
         }
         else if(ScreenGame.secondaryWeapon == "Lava Ball")
         {
            gotoAndStop(23);
         }
         else if(ScreenGame.secondaryWeapon == "Crazy Cheese")
         {
            gotoAndStop(24);
         }
         else if(ScreenGame.secondaryWeapon == "Magic Bunny")
         {
            gotoAndStop(25);
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
   }
}

