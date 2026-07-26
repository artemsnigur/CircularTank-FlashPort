package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol196")]
   public class ButtonLevelGuideArrow extends MovieClip
   {
      
      private var holdDownTimerMax:Number = 12;
      
      public var type:* = "World";
      
      private var holdDownTimer:Number = this.holdDownTimerMax;
      
      private var isPressing:Boolean = false;
      
      private var clickSpeedBegin:Number = 7;
      
      private var possibleToPress:* = false;
      
      private var clickTimer:Number = 0;
      
      private var clickSpeed:Number = this.clickSpeedBegin;
      
      private var valueToAdd:* = 0;
      
      private var isAdded:Boolean = false;
      
      private var clickSpeedEnd:Number = 2;
      
      public var direction:* = "Right";
      
      public function ButtonLevelGuideArrow()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         this.tabEnabled = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.possibleToPress)
         {
            this.isPressing = false;
            this.gotoAndStop(3 + this.valueToAdd);
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         var instance:* = undefined;
         if(this.possibleToPress)
         {
            this.isPressing = true;
            if(this.currentFrame != 4 + this.valueToAdd)
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
            }
            this.gotoAndStop(4 + this.valueToAdd);
            this.changeValue();
            instance = parent;
            instance.updateAllButtons();
         }
      }
      
      public function updateState() : void
      {
         var instance:* = parent;
         this.possibleToPress = false;
         if(this.type == "World")
         {
            if(this.direction == "Right")
            {
               if(LevelGuide.selectedWorld < LevelGuide.maxWorld)
               {
                  this.possibleToPress = true;
               }
            }
            else if(this.direction == "Left")
            {
               if(LevelGuide.selectedWorld > 1)
               {
                  this.possibleToPress = true;
               }
            }
         }
         else if(this.type == "Level")
         {
            if(this.direction == "Right")
            {
               if(LevelGuide.selectedLevel < LevelGuide.maxLevel)
               {
                  this.possibleToPress = true;
               }
            }
            else if(this.direction == "Left")
            {
               if(LevelGuide.selectedLevel > 1)
               {
                  this.possibleToPress = true;
               }
            }
         }
         if(this.possibleToPress)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
            this.isPressing = false;
         }
         this.setIdleImage();
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            if(this.direction == "Left")
            {
               this.valueToAdd = 4;
            }
            this.updateState();
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.isPressing)
         {
            if(this.holdDownTimer > 0)
            {
               --this.holdDownTimer;
            }
            else if(this.clickTimer > 0)
            {
               --this.clickTimer;
            }
            else
            {
               SoundManager.sfxArray.push("InterfaceButtonClick");
               this.changeValue();
               Object(parent).updateAllButtons();
               this.clickTimer = this.clickSpeed;
               if(this.clickSpeed > this.clickSpeedEnd)
               {
                  --this.clickSpeed;
               }
            }
         }
         else
         {
            this.holdDownTimer = this.holdDownTimerMax;
            this.clickSpeed = this.clickSpeedBegin;
            this.clickTimer = 0;
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.setIdleImage();
         this.isPressing = false;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.possibleToPress)
         {
            if(this.currentFrame != 3 + this.valueToAdd)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            this.gotoAndStop(3 + this.valueToAdd);
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function changeValue() : void
      {
         if(this.type == "World")
         {
            if(this.direction == "Right")
            {
               if(LevelGuide.selectedWorld < LevelGuide.maxWorld)
               {
                  ++LevelGuide.selectedWorld;
                  LevelGuide.selectedLevel = 1;
                  LevelGuide.setMaxLevel(LevelGuide.selectedWorld);
               }
            }
            else if(this.direction == "Left")
            {
               if(LevelGuide.selectedWorld > 1)
               {
                  --LevelGuide.selectedWorld;
                  LevelGuide.selectedLevel = 1;
                  LevelGuide.setMaxLevel(LevelGuide.selectedWorld);
               }
            }
         }
         else if(this.type == "Level")
         {
            if(this.direction == "Right")
            {
               if(LevelGuide.selectedLevel < LevelGuide.maxLevel)
               {
                  ++LevelGuide.selectedLevel;
               }
            }
            else if(this.direction == "Left")
            {
               if(LevelGuide.selectedLevel > 1)
               {
                  --LevelGuide.selectedLevel;
               }
            }
         }
         Object(parent).updateTextfields();
      }
      
      private function setIdleImage() : void
      {
         if(this.possibleToPress)
         {
            this.gotoAndStop(2 + this.valueToAdd);
         }
         else
         {
            this.gotoAndStop(1 + this.valueToAdd);
         }
      }
   }
}

