package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol560")]
   public class ButtonUpgradeInfo extends MovieClip
   {
      
      private var cursorOver:Boolean = false;
      
      public var pText:Object;
      
      public function ButtonUpgradeInfo()
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
               right = false;
               bottom = true;
               theText = "";
               if(Main.currentScreen == "Upgrades")
               {
                  right = false;
                  bottom = true;
                  if(ScreenUpgrades.upgradeType == 1)
                  {
                     if(ScreenUpgrades.selectedMisc == 1)
                     {
                        theText = "Increases the speed of the tank.";
                     }
                     else if(ScreenUpgrades.selectedMisc == 2)
                     {
                        theText = "The tank has a chance to reflect an enemy bullet.";
                     }
                     else if(ScreenUpgrades.selectedMisc == 3)
                     {
                        theText = "Reduce the amount of damage taken when colliding with an enemy.";
                     }
                     else if(ScreenUpgrades.selectedMisc == 4)
                     {
                        theText = "Every time an enemy is killed, the special weapon will be closer to being reloaded.";
                     }
                  }
                  else if(ScreenUpgrades.upgradeType == 2)
                  {
                     if(ScreenUpgrades.selectedWeapon == 1)
                     {
                        theText = "Shoots exploding bullets.\nThe bullets explode on impact.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 2)
                     {
                        theText = "Shoots bullets at a fast rate.\nThe bullets do damage on impact.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 3)
                     {
                        theText = "Shoots big exploding bullets.\nThe bullets explode on impact.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 4)
                     {
                        theText = "Shoots fire.\nThe fire does damage to every enemy it touches.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 5)
                     {
                        theText = "Shoots multiple bullets at once.\nThe bullets do damage on impact.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 6)
                     {
                        theText = "Shoots timed bombs.\nThe timed bombs stick to enemies and explode when the time is up.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 7)
                     {
                        theText = "Shoots gummy bears.\nThe gummy bears do damage on impact.\nEvery time a gummy bear collides with the outer walls, the gummy bear becomes more powerful.\nNo collision means 1X damage,\n1 collision means 3X damage,\n2 collisions means 4X damage,\n3 collisions will destroy the gummy bear.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 8)
                     {
                        theText = "Shoots poisoned arrows.\nThe poisoned arrows do damage on impact, and poison enemies.\nThe poison does damage over time, until the time is up.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 9)
                     {
                        theText = "Shoots laser beams.\nThe laser beams do damage to every enemy they touch.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 10)
                     {
                        theText = "Shoots cakes.\nThe cakes do damage on impact.\nIf an enemy is killed by a cake or a cake slice, the enemy will shoot cake slices.\nCake slices do half the damage of cakes.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 11)
                     {
                        theText = "Shoots penetrating bullets.\nThe penetrating bullets explode on impact.\nPenetrating bullets don\'t break on impact.";
                     }
                     else if(ScreenUpgrades.selectedWeapon == 12)
                     {
                        theText = "Shoots magic balls.\nThe magic balls do damage on impact.\nWhen a magic ball collides with an enemy, the magic ball will move towards a new enemy, until it has damaged its max amount of targets.\nMagic balls always move towards their closest enemy.";
                     }
                  }
                  else if(ScreenUpgrades.upgradeType == 3)
                  {
                     if(ScreenUpgrades.selectedSecondary == 1)
                     {
                        theText = "Places a mine on the ground.\nWhen an enemy touches it the mine explodes.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 2)
                     {
                        theText = "Throws a grenade towards the crosshair.\nThe grenade explodes after some time.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 3)
                     {
                        theText = "Throws an ice grenade towards the crosshair.\nThe ice grenade explodes after some time.\nEvery enemy touching the explosion freezes.\nBosses only freeze for 25% of the freeze time.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 4)
                     {
                        theText = "Throws a poison grenade towards the crosshair.\nThe poison grenade explodes after some time.\nEvery enemy touching the explosion gets poisoned.\nThe poison does damage over time, until the time is up.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 5)
                     {
                        theText = "Shoots a ring of icicles from the tank.\nThe icicles cause the enemy to freeze on impact.\nBosses only take 30% damage and freeze for 25% of the freeze time.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 6)
                     {
                        theText = "Shoots a ring of poison spikes from the tank.\nThe poison spikes do damage on impact, and poison enemies.\nThe poison does damage over time, until the time is up.\nBosses only take 25% impact damage.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 7)
                     {
                        theText = "Makes a shield around the tank.\nThe shield will push away enemies.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 8)
                     {
                        theText = "Fires rockets at the closest enemies.\nIf there are less enemies visible on the screen than the amount of rockets, the amount of rockets fired will be the same as the amount of visible enemies.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 9)
                     {
                        theText = "Fires an ice ball that leaves a trail of ice in its wake and explodes on impact.\nEnemies that touch the trail or are caught in the explosion freeze temporarily.\nBosses don\'t freeze when touching the ice trail, but are affected by the explosion for 25% of the freeze time.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 10)
                     {
                        theText = "Fires a lava ball that leaves a trail of lava in its wake and explodes on impact.\nEnemies that touch the trail take damage.\nBosses take 20% of the damage from touching the lava trail.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 11)
                     {
                        theText = "Shoots multiple pieces of crazy cheese, just like a shotgun.\nThe cheese does damage on impact, but doesn\'t break.\nA piece of cheese breaks after colliding 4 times with the outer walls.\nBosses only take 20% damage.";
                     }
                     else if(ScreenUpgrades.selectedSecondary == 12)
                     {
                        theText = "Shoots a magic bunny.\nThe magic bunny does damage on impact.\nWhen the magic bunny collides with an enemy, the magic bunny will move towards a new enemy, until it has damaged its max amount of targets.\nThe magic bunny always moves towards its closest enemy.";
                     }
                  }
               }
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

