package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Strong;
   import flash.display.Sprite;
   import flash.events.Event;
   
   public class PartTutorial extends Sprite
   {
      
      public static var tutorialOn:Boolean = false;
      
      public static var tutorialCompleted:Boolean = false;
      
      public static var tutorialArrayUnseen:Array = ["AimShoot","KillEnemies","Objective","CollectFlags","Pause","Special","NoMoveTowerMode","DefendBottom","ShiftWeapon","Strength","Weakness"];
      
      public static var tutorialArrayQueue:Array = ["Move"];
      
      public static var tutorialArrayDone:Array = [];
      
      private var tutorialShiftWeapon:TutorialShiftWeapon = new TutorialShiftWeapon();
      
      private var tutorialStartTimer:Number = 70;
      
      private var tutorialObjective:TutorialObjective = new TutorialObjective();
      
      private var tutorialSpecial:TutorialSpecial = new TutorialSpecial();
      
      private var isAdded:Boolean = false;
      
      private var inTweenRunning:Boolean = false;
      
      private var outTweenShouldRun:Boolean = false;
      
      private var tutorialImageCurrent:String = "";
      
      private var tutorialContinueTimer:Number;
      
      private var tutorialContinueTimerMax:Number = 50;
      
      private var tutorialKillEnemies:TutorialKillEnemies = new TutorialKillEnemies();
      
      private var theTutorialImage:Sprite;
      
      private var theYPos:Number = 0;
      
      private var inTweenShouldRun:Boolean = false;
      
      private var outTween:Tween;
      
      private var tutorialStrength:TutorialStrength = new TutorialStrength();
      
      private var outTweenRunning:Boolean = false;
      
      private var inTween:Tween;
      
      private var tutorialPause:TutorialPause = new TutorialPause();
      
      private var tutorialWeakness:TutorialWeakness = new TutorialWeakness();
      
      private var tutorialMove:TutorialMove = new TutorialMove();
      
      private var removeCurrentTutorial:Boolean = false;
      
      private var tutorialAimShoot:TutorialAimShoot = new TutorialAimShoot();
      
      private var continueAnywayTimer:Number = -1;
      
      private var theXPos:Number = 0;
      
      private var tutorialCollectFlags:TutorialCollectFlags = new TutorialCollectFlags();
      
      private var tutorialNoMoveTowerMode:TutorialNoMoveTowerMode = new TutorialNoMoveTowerMode();
      
      private var valueHolder:Object = new Object();
      
      private var tutorialDefendBottom:TutorialDefendBottom = new TutorialDefendBottom();
      
      public function PartTutorial()
      {
         this.tutorialContinueTimer = this.tutorialContinueTimerMax;
         this.inTween = new Tween(this.valueHolder,"basicValue",Strong.easeOut,0,1,30,false);
         this.outTween = new Tween(this.valueHolder,"basicValue",Strong.easeIn,1,0,30,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.inTween.stop();
         this.outTween.stop();
      }
      
      public static function checkIfTutorialDone(theTutorial:String) : *
      {
         var found:* = false;
         for(var i:* = 0; i < tutorialArrayDone.length; i++)
         {
            if(tutorialArrayDone[i] == theTutorial)
            {
               found = true;
            }
         }
         return found;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.inTween.addEventListener(TweenEvent.MOTION_FINISH,this.inTweenFinish);
            this.outTween.addEventListener(TweenEvent.MOTION_FINISH,this.outTweenFinish);
            if(tutorialArrayDone.length == 0)
            {
               this.tutorialStartTimer = 15;
            }
         }
      }
      
      private function addTutorialsToQueue() : void
      {
         var theTutorial:* = undefined;
         var moveToQueue:* = undefined;
         var worldLevelReached:* = undefined;
         for(var i:* = 0; i < tutorialArrayUnseen.length; i++)
         {
            theTutorial = tutorialArrayUnseen[i];
            moveToQueue = false;
            if(theTutorial == "Move")
            {
               if(!checkIfTutorialDone("Move"))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "AimShoot")
            {
               if(checkIfTutorialDone("Move"))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "KillEnemies")
            {
               if(checkIfTutorialDone("AimShoot"))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "Objective")
            {
               if(checkIfTutorialDone("KillEnemies"))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "CollectFlags")
            {
               if(ScreenLevelSelect.levelMode == "Flag" && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "Pause")
            {
               worldLevelReached = ScreenLevelSelect.getCurrentWorldAndLevel();
               if(Boolean(checkIfTutorialDone("Objective")) && (worldLevelReached[0] > 1 || worldLevelReached[1] >= 4))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "Special")
            {
               if(ScreenGame.reloadTimeSecondary == 0 && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "NoMoveTowerMode")
            {
               if(ScreenLevelSelect.levelMode == "Tower" && (Main.up || Main.down || Main.left || Main.right) && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "DefendBottom")
            {
               if(ScreenLevelSelect.levelMode == "Defense" && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "ShiftWeapon")
            {
               if(ScreenGame.equippedWeapons[0] != "None" && ScreenGame.equippedWeapons[1] != "None" && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "Strength")
            {
               if(PartGameArea.enemyStrengthTrigger && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            else if(theTutorial == "Weakness")
            {
               if(PartGameArea.enemyWeaknessTrigger && Boolean(checkIfTutorialDone("Objective")))
               {
                  moveToQueue = true;
               }
            }
            if(moveToQueue)
            {
               tutorialArrayQueue.push(theTutorial);
               tutorialArrayUnseen.splice(i,1);
               i--;
            }
         }
      }
      
      private function checkIfRemoveTutorial() : void
      {
         var removeNow:Boolean = false;
         if(!this.removeCurrentTutorial)
         {
            removeNow = false;
            if(this.tutorialImageCurrent == "Move")
            {
               if(Main.left || Main.right || Main.up || Main.down)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "AimShoot")
            {
               if(Main.mouse)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "KillEnemies")
            {
               if(ScreenGame.worldModels[ScreenGame.world * 3 - 3][ScreenGame.level - 1][0] - (ScreenGame.currentEnemies + ScreenGame.enemiesLeft) >= 1)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "Objective")
            {
               if(PartGameArea.levelDone)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "CollectFlags")
            {
               if(ScreenGame.worldModels[ScreenGame.world * 3 - 1][ScreenGame.level - 1][0] - ScreenGame.flagsLeft >= 1)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "Pause")
            {
               if(Main.keyP)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "Special")
            {
               if(Main.space)
               {
                  removeNow = true;
               }
            }
            else if(this.tutorialImageCurrent == "ShiftWeapon")
            {
               if(Main.keyShift || Main.keyQ)
               {
                  removeNow = true;
               }
            }
            if(this.continueAnywayTimer > 0)
            {
               --this.continueAnywayTimer;
               if(this.continueAnywayTimer == 0)
               {
                  removeNow = true;
               }
            }
            if(removeNow)
            {
               this.removeCurrentTutorial = true;
               if(this.tutorialImageCurrent != "Move" && this.tutorialImageCurrent != "AimShoot" && this.tutorialImageCurrent != "Special")
               {
                  this.tutorialContinueTimer = this.tutorialContinueTimerMax;
               }
               else
               {
                  this.tutorialContinueTimer = 1;
               }
            }
         }
      }
      
      private function addTutorialFromQueue() : void
      {
         var theTutorial:* = undefined;
         if(tutorialArrayQueue.length > 0)
         {
            this.continueAnywayTimer = -1;
            theTutorial = tutorialArrayQueue[0];
            tutorialArrayQueue.splice(0,1);
            this.tutorialImageCurrent = theTutorial;
            if(theTutorial == "Move")
            {
               this.theTutorialImage = this.tutorialMove;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
            }
            else if(theTutorial == "AimShoot")
            {
               this.theTutorialImage = this.tutorialAimShoot;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 120;
            }
            else if(theTutorial == "KillEnemies")
            {
               this.theTutorialImage = this.tutorialKillEnemies;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 240;
            }
            else if(theTutorial == "Objective")
            {
               this.theTutorialImage = this.tutorialObjective;
               this.theXPos = 194;
               this.theYPos = 480 - this.tutorialObjective.height - 8;
            }
            else if(theTutorial == "CollectFlags")
            {
               this.theTutorialImage = this.tutorialCollectFlags;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 240;
            }
            else if(theTutorial == "Pause")
            {
               this.theTutorialImage = this.tutorialPause;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 150;
            }
            else if(theTutorial == "Special")
            {
               this.theTutorialImage = this.tutorialSpecial;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 180;
            }
            else if(theTutorial == "NoMoveTowerMode")
            {
               this.theTutorialImage = this.tutorialNoMoveTowerMode;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 180;
            }
            else if(theTutorial == "DefendBottom")
            {
               this.theTutorialImage = this.tutorialDefendBottom;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 180;
            }
            else if(theTutorial == "ShiftWeapon")
            {
               this.theTutorialImage = this.tutorialShiftWeapon;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 210;
            }
            else if(theTutorial == "Strength")
            {
               this.theTutorialImage = this.tutorialStrength;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 210;
            }
            else if(theTutorial == "Weakness")
            {
               this.theTutorialImage = this.tutorialWeakness;
               this.theXPos = 0 + 16;
               this.theYPos = 0 + 16;
               this.continueAnywayTimer = 210;
            }
            SoundManager.sfxArray.push("Tutorial");
            addChild(this.theTutorialImage);
            this.theTutorialImage.alpha = 0;
            this.theTutorialImage.x = this.theXPos;
            this.theTutorialImage.y = this.theYPos;
            this.inTween.start();
            this.inTweenRunning = true;
            this.inTweenShouldRun = true;
         }
      }
      
      private function outTweenFinish(event:TweenEvent) : void
      {
         this.outTweenRunning = false;
         this.outTweenShouldRun = false;
         if(stage.contains(this.theTutorialImage))
         {
            removeChild(this.theTutorialImage);
            tutorialArrayDone.push(this.tutorialImageCurrent);
            this.tutorialImageCurrent = "";
            if(tutorialArrayUnseen.length == 0)
            {
               tutorialOn = false;
               tutorialCompleted = true;
            }
         }
         SaveManager.saveTutorial();
      }
      
      public function update(event:Event) : void
      {
         var randAngle:* = undefined;
         if(!PartGameArea.gamePaused)
         {
            if(this.inTweenShouldRun && !this.inTweenRunning)
            {
               this.inTweenRunning = true;
               this.inTween.resume();
            }
            if(this.outTweenShouldRun && !this.outTweenRunning)
            {
               this.outTweenRunning = true;
               this.outTween.resume();
            }
            this.addTutorialsToQueue();
            if(tutorialOn && !tutorialCompleted)
            {
               if(this.tutorialStartTimer == 0)
               {
                  if(this.tutorialImageCurrent == "")
                  {
                     this.addTutorialFromQueue();
                  }
                  else
                  {
                     if(this.inTweenRunning || this.outTweenRunning)
                     {
                        this.theTutorialImage.alpha = this.valueHolder.basicValue;
                        randAngle = Math.random() * 360 / 180 * Math.PI;
                        this.theTutorialImage.x = this.theXPos + Math.cos(randAngle) * ((1 - this.valueHolder.basicValue) * 10);
                        this.theTutorialImage.y = this.theYPos + Math.sin(randAngle) * ((1 - this.valueHolder.basicValue) * 10);
                     }
                     if(!this.outTweenRunning)
                     {
                        this.checkIfRemoveTutorial();
                        if(this.removeCurrentTutorial)
                        {
                           if(this.tutorialContinueTimer == 0)
                           {
                              this.removeCurrentTutorial = false;
                              this.outTween.start();
                              this.outTweenRunning = true;
                              this.outTweenShouldRun = true;
                           }
                           else
                           {
                              --this.tutorialContinueTimer;
                           }
                        }
                     }
                  }
               }
               else
               {
                  --this.tutorialStartTimer;
               }
            }
         }
         else
         {
            if(this.inTweenShouldRun && this.inTweenRunning)
            {
               this.inTweenRunning = false;
               this.inTween.stop();
            }
            if(this.outTweenShouldRun && this.outTweenRunning)
            {
               this.outTweenRunning = false;
               this.outTween.stop();
            }
         }
      }
      
      private function moveTriggerTutorialsFromQueueToUnseen() : void
      {
         var theTutorial:* = undefined;
         var moveIt:* = undefined;
         for(var i:* = 0; i < tutorialArrayQueue.length; i++)
         {
            theTutorial = tutorialArrayQueue[i];
            moveIt = false;
            if(theTutorial == "Special")
            {
               moveIt = true;
            }
            else if(theTutorial == "CollectFlags")
            {
               moveIt = true;
            }
            else if(theTutorial == "NoMoveTowerMode")
            {
               moveIt = true;
            }
            else if(theTutorial == "DefendBottom")
            {
               moveIt = true;
            }
            else if(theTutorial == "ShiftWeapon")
            {
               moveIt = true;
            }
            else if(theTutorial == "Strength")
            {
               moveIt = true;
            }
            else if(theTutorial == "Weakness")
            {
               moveIt = true;
            }
            if(moveIt)
            {
               tutorialArrayUnseen.unshift(theTutorial);
               tutorialArrayQueue.splice(i,1);
               i--;
            }
         }
      }
      
      public function removed(event:Event) : void
      {
         if(this.tutorialImageCurrent != "")
         {
            if(this.tutorialImageCurrent == "Objective" && PartGameArea.levelDone)
            {
               tutorialArrayDone.push("Objective");
            }
            else
            {
               tutorialArrayUnseen.unshift(this.tutorialImageCurrent);
            }
         }
         this.moveTriggerTutorialsFromQueueToUnseen();
         SaveManager.saveTutorial();
         removeEventListener(Event.ENTER_FRAME,this.update);
         this.inTween.removeEventListener(TweenEvent.MOTION_FINISH,this.inTweenFinish);
         this.outTween.removeEventListener(TweenEvent.MOTION_FINISH,this.outTweenFinish);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function inTweenFinish(event:TweenEvent) : void
      {
         this.inTweenRunning = false;
         this.inTweenShouldRun = false;
      }
   }
}

