package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol456")]
   public class ButtonUpgrades extends MovieClip
   {
      
      private var myGlowHelp:* = new DropShadowFilter(0,0,16711680,1,5,5,5,2);
      
      private var makeIcon:Boolean = false;
      
      private var iconEnough:IconEnough = new IconEnough();
      
      private var cursorOver:Boolean = false;
      
      private var glowHelpArray:Array = filters;
      
      private var isActive:Boolean = false;
      
      private var extraFrames:Number = 0;
      
      private var pressed:Boolean = false;
      
      private var uihActivated:Boolean = false;
      
      private var checkNumber:Number;
      
      private var isAdded:Boolean = false;
      
      public function ButtonUpgrades()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.glowHelpArray.push(this.myGlowHelp);
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(Main.changeScreen != "Upgrades" && (Main.changeScreen != "Premium" || !ScreenPremium.triggeredFromMenu))
            {
               this.isActive = true;
            }
            else
            {
               this.isActive = false;
            }
            if(this.isActive)
            {
               buttonMode = true;
               if(Main.extraStuff)
               {
                  this.checkNumber = 12;
               }
               else
               {
                  this.checkNumber = 10;
               }
               this.checkWeapons();
               this.checkSecondaryWeapons();
               this.checkMisc();
               if(this.makeIcon)
               {
                  addChild(this.iconEnough);
                  this.iconEnough.x = 184;
                  this.iconEnough.y = 20;
                  this.iconEnough.scaleX = 2;
                  this.iconEnough.scaleY = 2;
                  this.extraFrames = 3;
               }
               this.gotoAndStop(1 + this.extraFrames);
            }
            else
            {
               gotoAndStop(7);
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            this.pressed = true;
            this.gotoAndStop(3 + this.extraFrames);
         }
      }
      
      public function update(event:Event) : void
      {
         if(PartTutorial.tutorialOn && Main.uihButtonUpgrades == false && !this.uihActivated && Main.uihButtonNextLevel == true && this.makeIcon && Main.changeScreen == "Status")
         {
            this.uihActivated = true;
            this.filters = this.glowHelpArray;
         }
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive && this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2 + this.extraFrames);
            Main.changeScreen = "Upgrades";
            if(this.uihActivated)
            {
               this.uihActivated = false;
               this.filters = [];
               Main.uihButtonUpgrades = true;
               SaveManager.saveUIHelpers();
            }
         }
      }
      
      internal function checkMisc() : void
      {
         var i:* = undefined;
         if(!this.makeIcon)
         {
            for(i = 0; i < 4; i++)
            {
               if(ScreenUpgrades.levelsArrayMisc[i] < ScreenUpgrades.levelsMaxArrayMisc[i] && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray1[i][0][ScreenUpgrades.levelsArrayMisc[i]])
               {
                  this.makeIcon = true;
                  break;
               }
            }
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            if(this.pressed)
            {
               this.gotoAndStop(3 + this.extraFrames);
            }
            else
            {
               this.gotoAndStop(2 + this.extraFrames);
            }
            if(!this.cursorOver)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.cursorOver = true;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      internal function checkSecondaryWeapons() : void
      {
         var i:* = undefined;
         if(!this.makeIcon)
         {
            for(i = 0; i < this.checkNumber; i++)
            {
               if(ScreenUpgrades.levelsArraySecondary[i] < ScreenUpgrades.levelsMaxArraySecondary[i] && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray3[i][0][ScreenUpgrades.levelsArraySecondary[i]])
               {
                  this.makeIcon = true;
                  break;
               }
            }
         }
      }
      
      internal function checkWeapons() : void
      {
         var i:* = undefined;
         if(!this.makeIcon)
         {
            for(i = 0; i < this.checkNumber; i++)
            {
               if(ScreenUpgrades.levelsArray[i] < ScreenUpgrades.levelsMaxArray[i] && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray2[i][0][ScreenUpgrades.levelsArray[i]])
               {
                  this.makeIcon = true;
                  break;
               }
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            this.gotoAndStop(1 + this.extraFrames);
            this.cursorOver = false;
         }
      }
   }
}

