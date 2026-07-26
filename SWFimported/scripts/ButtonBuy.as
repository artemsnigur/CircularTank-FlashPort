package
{
   import FGL.GameTracker.GameTracker;
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol402")]
   public class ButtonBuy extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var cursorOver:Boolean = false;
      
      private var buttonReloadTimeMax:* = 2;
      
      private var canAfford:Boolean = false;
      
      private var buttonReloadTime:* = 0;
      
      public function ButtonBuy()
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
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.buttonReloadTime == 0)
         {
            if(this.canAfford)
            {
               this.gotoAndStop(3);
               this.pressed = true;
            }
         }
      }
      
      private function added(event:Event) : void
      {
         this.setImage();
      }
      
      public function update(event:Event) : void
      {
         this.canAfford = false;
         if(ScreenUpgrades.upgradeType == 1)
         {
            if(ScreenUpgrades.selectedMisc != 0 && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray1[ScreenUpgrades.selectedMisc - 1][0][0])
            {
               this.canAfford = true;
            }
         }
         else if(ScreenUpgrades.upgradeType == 2)
         {
            if(ScreenUpgrades.selectedWeapon != 0 && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray2[ScreenUpgrades.selectedWeapon - 1][0][0])
            {
               this.canAfford = true;
            }
         }
         else if(ScreenUpgrades.upgradeType == 3)
         {
            if(ScreenUpgrades.selectedSecondary != 0 && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray3[ScreenUpgrades.selectedSecondary - 1][0][0])
            {
               this.canAfford = true;
            }
         }
         if(this.canAfford)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
         }
         if(this.buttonReloadTime == 0)
         {
            this.setImage();
         }
         else
         {
            --this.buttonReloadTime;
         }
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         var upgradeName:String = null;
         var upgradeType:String = null;
         if(this.buttonReloadTime == 0 && this.pressed)
         {
            if(this.canAfford)
            {
               SoundManager.sfxArray.push("InterfaceButtonMoney");
               this.gotoAndStop(2);
               if(ScreenUpgrades.upgradeType == 1)
               {
                  if(ScreenUpgrades.selectedMisc != 0)
                  {
                     ScreenUpgrades.money -= ScreenUpgrades.upgradeArraysArray1[ScreenUpgrades.selectedMisc - 1][0][ScreenUpgrades.levelsArrayMisc[ScreenUpgrades.selectedMisc - 1]];
                  }
                  ++ScreenUpgrades.levelsArrayMisc[ScreenUpgrades.selectedMisc - 1];
               }
               else if(ScreenUpgrades.upgradeType == 2)
               {
                  if(ScreenUpgrades.selectedWeapon != 0)
                  {
                     ScreenUpgrades.money -= ScreenUpgrades.upgradeArraysArray2[ScreenUpgrades.selectedWeapon - 1][0][ScreenUpgrades.levelsArray[ScreenUpgrades.selectedWeapon - 1]];
                  }
                  ++ScreenUpgrades.levelsArray[ScreenUpgrades.selectedWeapon - 1];
               }
               else if(ScreenUpgrades.upgradeType == 3)
               {
                  if(ScreenUpgrades.selectedSecondary != 0)
                  {
                     ScreenUpgrades.money -= ScreenUpgrades.upgradeArraysArray3[ScreenUpgrades.selectedSecondary - 1][0][ScreenUpgrades.levelsArraySecondary[ScreenUpgrades.selectedSecondary - 1]];
                  }
                  ++ScreenUpgrades.levelsArraySecondary[ScreenUpgrades.selectedSecondary - 1];
               }
               upgradeName = "";
               upgradeType = "";
               if(ScreenUpgrades.upgradeType == 1)
               {
                  upgradeType = "Misc";
                  switch(ScreenUpgrades.selectedMisc)
                  {
                     case 1:
                        upgradeName = "Tank Speed";
                        break;
                     case 2:
                        upgradeName = "Bullet Reflection";
                        break;
                     case 3:
                        upgradeName = "Enemy Absorption";
                        break;
                     case 4:
                        upgradeName = "Kill Reload";
                  }
               }
               else if(ScreenUpgrades.upgradeType == 2)
               {
                  upgradeType = "Primary";
                  switch(ScreenUpgrades.selectedWeapon)
                  {
                     case 1:
                        upgradeName = "Cannon";
                        break;
                     case 2:
                        upgradeName = "Minigun";
                        break;
                     case 3:
                        upgradeName = "Big Cannon";
                        break;
                     case 4:
                        upgradeName = "Flamethrower";
                        break;
                     case 5:
                        upgradeName = "Shotgun";
                        break;
                     case 6:
                        upgradeName = "Timed Bomb Cannon";
                        break;
                     case 7:
                        upgradeName = "Gummy Bear Cannon";
                        break;
                     case 8:
                        upgradeName = "Poison Cannon";
                        break;
                     case 9:
                        upgradeName = "Laser Cannon";
                        break;
                     case 10:
                        upgradeName = "Cake Cannon";
                        break;
                     case 11:
                        upgradeName = "Penetration Cannon";
                        break;
                     case 12:
                        upgradeName = "Magic Cannon";
                  }
               }
               else if(ScreenUpgrades.upgradeType == 3)
               {
                  upgradeType = "Secondary";
                  switch(ScreenUpgrades.selectedSecondary)
                  {
                     case 1:
                        upgradeName = "Mine";
                        break;
                     case 2:
                        upgradeName = "Grenade";
                        break;
                     case 3:
                        upgradeName = "Ice Grenade";
                        break;
                     case 4:
                        upgradeName = "Poison Grenade";
                        break;
                     case 5:
                        upgradeName = "Icicles";
                        break;
                     case 6:
                        upgradeName = "Poison Spikes";
                        break;
                     case 7:
                        upgradeName = "Shield";
                        break;
                     case 8:
                        upgradeName = "Rockets";
                        break;
                     case 9:
                        upgradeName = "Ice Ball";
                        break;
                     case 10:
                        upgradeName = "Lava Ball";
                        break;
                     case 11:
                        upgradeName = "Crazy Cheese";
                        break;
                     case 12:
                        upgradeName = "Magic Bunny";
                  }
               }
               GameTracker.api.alert(upgradeName + " bought!");
               Main.googleTracker.trackEvent(upgradeType + " Bought",upgradeName);
               SaveManager.saveUpgrades();
               this.buttonReloadTime = this.buttonReloadTimeMax;
            }
         }
      }
      
      private function setImage() : void
      {
         if(this.canAfford)
         {
            if(this.cursorOver)
            {
               if(this.pressed)
               {
                  if(this.currentFrame != 3)
                  {
                     SoundManager.sfxArray.push("InterfaceButtonOver1");
                  }
                  this.gotoAndStop(3);
               }
               else
               {
                  if(this.currentFrame != 2)
                  {
                     SoundManager.sfxArray.push("InterfaceButtonOver1");
                  }
                  this.gotoAndStop(2);
               }
            }
            else
            {
               this.gotoAndStop(1);
            }
         }
         else
         {
            this.gotoAndStop(4);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
      }
   }
}

