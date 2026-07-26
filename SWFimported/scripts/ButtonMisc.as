package
{
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class ButtonMisc extends MovieClip
   {
      
      public var clicked:Boolean = false;
      
      private var iconEnough:IconEnough = new IconEnough();
      
      private var cursorOver:Boolean = false;
      
      private var canAfford:Boolean = false;
      
      private var thisMisc:Boolean = false;
      
      public var number:Number;
      
      private var iconOn:Boolean = false;
      
      public function ButtonMisc()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.gotoAndStop(1);
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      public function update(event:Event) : void
      {
         if(!ScreenUpgrades.contentMoving)
         {
            this.setImage();
         }
         this.canAfford = false;
         if(ScreenUpgrades.levelsArrayMisc[this.number - 1] < ScreenUpgrades.levelsMaxArrayMisc[this.number - 1] && ScreenUpgrades.money >= ScreenUpgrades.upgradeArraysArray1[this.number - 1][0][ScreenUpgrades.levelsArrayMisc[this.number - 1]])
         {
            this.canAfford = true;
         }
         if(this.iconOn)
         {
            if(!this.canAfford)
            {
               removeChild(this.iconEnough);
               this.iconOn = false;
            }
            else
            {
               setChildIndex(this.iconEnough,numChildren - 1);
            }
         }
         else if(this.canAfford)
         {
            addChild(this.iconEnough);
            this.iconEnough.x = 14;
            this.iconEnough.y = 0;
            this.iconEnough.scaleX = 1.2;
            this.iconEnough.scaleY = 1.2;
            this.iconOn = true;
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(!ScreenUpgrades.contentMoving)
         {
            if(this.thisMisc)
            {
               this.gotoAndStop(2);
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(!ScreenUpgrades.contentMoving)
         {
            if(ScreenUpgrades.levelsArrayMisc[this.number - 1] != 0)
            {
               if(this.currentFrame != 3)
               {
                  SoundManager.sfxArray.push("InterfaceButtonClick");
               }
               this.gotoAndStop(3);
            }
            else
            {
               if(this.currentFrame != 6)
               {
                  SoundManager.sfxArray.push("InterfaceButtonClick");
               }
               this.gotoAndStop(6);
            }
            this.clicked = true;
         }
      }
      
      private function setImage() : void
      {
         if(this.clicked)
         {
            ScreenUpgrades.selectedMisc = this.number;
            ScreenUpgrades.upgradeType = 1;
         }
         if(ScreenUpgrades.selectedMisc == this.number)
         {
            this.thisMisc = true;
         }
         else
         {
            this.thisMisc = false;
         }
         this.clicked = false;
         if(ScreenUpgrades.levelsArrayMisc[this.number - 1] != 0)
         {
            if(this.thisMisc && ScreenUpgrades.upgradeType == 1)
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
         else if(this.thisMisc && ScreenUpgrades.upgradeType == 1)
         {
            this.gotoAndStop(6);
         }
         else if(this.cursorOver)
         {
            if(this.currentFrame != 5)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.gotoAndStop(5);
         }
         else
         {
            this.gotoAndStop(4);
         }
      }
      
      private function added(event:Event) : void
      {
         this.setImage();
         this.mouseChildren = false;
         var hitCircle:Sprite = new Sprite();
         hitCircle.graphics.beginFill(0,0);
         hitCircle.graphics.drawCircle(0,0,this.width / 2);
         hitCircle.graphics.endFill();
         addChild(hitCircle);
         this.hitArea = hitCircle;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
      }
   }
}

