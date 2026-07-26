package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Strong;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   import flash.utils.getDefinitionByName;
   
   public class PartAchievements extends Sprite
   {
      
      public static var achievementArrayUnseen:Array = ["Kills1","Kills2","Kills3","Money1","Money2","Money3","MaxedPrimary1","MaxedPrimary2","MaxedPrimary3","MaxedSecondary1","MaxedSecondary2","MaxedSecondary3","PoisonDoctor","FreezeTemperamental","TrapMine","AddictedCake","Racing","Idle","Stars1","Stars2","Stars3","Flags1","Flags2","Flags3","Towers1","Towers2","Towers3","Shields1","Shields2","Shields3","Bosses1","Bosses2","Bosses3","FlagNoWeapons","DefensiveBombs","BossOnlySpecial"];
      
      public static var achievementArrayQueue:Array = [];
      
      public static var achievementArrayDone:Array = [];
      
      public static var achievementPopUp:Boolean = true;
      
      private var textFormat:TextFormat = new TextFormat("JG",12,16777215,true,false,false);
      
      private var difficultyText:TextField = new TextField();
      
      private var achievementShowing:Boolean = false;
      
      private var inTweenRunning:Boolean = false;
      
      private var achievementBox:AchievementBox = new AchievementBox();
      
      private var achievementRemoving:Boolean = false;
      
      private var shadowArray:Array = filters;
      
      private var textFormat2:TextFormat = new TextFormat("Arial",9,16777215,true,false,false);
      
      private var outTween:Tween;
      
      private var outTweenRunning:Boolean = false;
      
      private var theYPos:Number = 0;
      
      private var inTween:Tween;
      
      private var showTimer:Number;
      
      private var achievementCurrent:String = "";
      
      private var theXPos:Number = 0;
      
      private var achievementSpawning:Boolean = false;
      
      private var nameText:TextField = new TextField();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var isAdded:Boolean = false;
      
      private var achievementImage:MovieClip = new MovieClip();
      
      private var showTimerMax:Number;
      
      private var valueHolder:Object = new Object();
      
      public function PartAchievements()
      {
         this.showTimer = this.showTimerMax;
         this.inTween = new Tween(this.valueHolder,"basicValue",Strong.easeOut,0,1,30,false);
         this.outTween = new Tween(this.valueHolder,"basicValue",Strong.easeIn,1,0,30,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
         this.inTween.stop();
         this.outTween.stop();
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(Main.changeScreen == "Upgrades")
            {
               this.showTimerMax = 90;
            }
            else
            {
               this.showTimerMax = 60;
            }
            this.inTween.addEventListener(TweenEvent.MOTION_FINISH,this.inTweenFinish);
            this.outTween.addEventListener(TweenEvent.MOTION_FINISH,this.outTweenFinish);
            addChild(this.achievementImage);
            this.achievementImage.alpha = 0;
            this.moveCompletedUnseenToDone();
            this.moveUncompletedDoneToUnseen();
         }
      }
      
      private function removeAllChildren(theParent:Object) : void
      {
         for(var i:* = int(theParent.numChildren - 1); i >= 0; i--)
         {
            theParent.removeChildAt(i);
         }
      }
      
      private function showAchievementFromQueue() : void
      {
         var difficultyString:String = null;
         var sizeDifference:* = undefined;
         this.achievementCurrent = achievementArrayQueue[0];
         achievementArrayQueue.splice(0,1);
         this.achievementImage.addChild(this.achievementBox);
         this.achievementBox.scaleX = 1;
         SoundManager.sfxArray.push("Achievement");
         var achievement:* = new (getDefinitionByName("Achievement" + this.achievementCurrent) as Class)();
         this.achievementImage.addChild(achievement);
         achievement.x = 32;
         achievement.y = 32;
         this.theXPos = 640 - this.achievementImage.width - 16;
         this.theYPos = 16;
         if(Main.currentScreen == "Upgrades")
         {
            this.theXPos += 4;
            this.theYPos -= 4;
         }
         var dataArray:* = ScreenAchievements["achievement" + this.achievementCurrent + "Data"];
         switch(dataArray[2])
         {
            case false:
               difficultyString = "(ANY DIFFICULTY.)";
               achievement.gotoAndStop(2);
               break;
            case true:
               switch(ScreenLevelSelect.levelDifficulty)
               {
                  case "Easy":
                     difficultyString = "(EASY.)";
                     achievement.gotoAndStop(2);
                     break;
                  case "Medium":
                     difficultyString = "(MEDIUM.)";
                     achievement.gotoAndStop(3);
                     break;
                  case "Hard":
                     difficultyString = "(HARD.)";
                     achievement.gotoAndStop(4);
               }
         }
         var textBoxesWidth:* = this.achievementImage.width - 64 - 16;
         this.addText(this.achievementImage,this.nameText,this.textFormat,16777215,dataArray[0],18,textBoxesWidth,64,16,true);
         if(this.nameText.textWidth > this.nameText.width - 8)
         {
            this.nameText.width = this.nameText.textWidth + 8;
         }
         if(this.nameText.width > textBoxesWidth)
         {
            sizeDifference = this.nameText.width - textBoxesWidth;
            this.achievementBox.scaleX = 1 / this.achievementBox.width * (this.nameText.width + 64 + 16);
            this.theXPos -= sizeDifference;
            textBoxesWidth = this.nameText.width;
         }
         this.addText(this.achievementImage,this.difficultyText,this.textFormat2,0,difficultyString,16,textBoxesWidth,64,38,true,false);
         this.achievementImage.x = this.theXPos;
         this.achievementImage.y = this.theYPos;
      }
      
      private function outTweenFinish(event:TweenEvent) : void
      {
         this.outTweenRunning = false;
         this.achievementRemoving = false;
         achievementArrayDone.push(this.achievementCurrent);
         this.achievementCurrent = "";
         for(var i:* = int(this.achievementImage.numChildren - 1); i >= 0; i--)
         {
            this.achievementImage.removeChildAt(i);
         }
      }
      
      private function moveQueueAndCurrentToDone() : void
      {
         var achievement:* = undefined;
         if(this.achievementCurrent != "")
         {
            achievementArrayDone.push(this.achievementCurrent);
            this.achievementCurrent = "";
         }
         for(var i:* = 0; i < achievementArrayQueue.length; i++)
         {
            achievement = achievementArrayQueue[i];
            achievementArrayDone.push(achievement);
            achievementArrayQueue.splice(i,1);
            i--;
         }
      }
      
      public function update(event:Event) : void
      {
         if(!PartGameArea.gamePaused || Main.currentScreen == "Upgrades")
         {
            if(this.achievementSpawning && !this.inTweenRunning)
            {
               this.inTweenRunning = true;
               this.inTween.resume();
            }
            if(this.achievementRemoving && !this.outTweenRunning)
            {
               this.outTweenRunning = true;
               this.outTween.resume();
            }
            this.moveUnseenToQueue();
            this.handleAchievementQueue();
         }
         else
         {
            if(this.achievementSpawning && this.inTweenRunning)
            {
               this.inTweenRunning = false;
               this.inTween.stop();
            }
            if(this.achievementRemoving && this.outTweenRunning)
            {
               this.outTweenRunning = false;
               this.outTween.stop();
            }
         }
      }
      
      private function moveUnseenToQueue() : void
      {
         var achievement:* = undefined;
         for(var i:* = 0; i < achievementArrayUnseen.length; i++)
         {
            achievement = achievementArrayUnseen[i];
            if(ScreenAchievements.achievementCheck(achievement,true))
            {
               achievementArrayQueue.push(achievement);
               achievementArrayUnseen.splice(i,1);
               i--;
            }
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         if(achievementArrayQueue.length > 0 || this.achievementCurrent != "")
         {
            this.moveQueueAndCurrentToDone();
         }
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function handleAchievementQueue() : void
      {
         var randAngle:* = undefined;
         if(this.achievementCurrent == "")
         {
            if(achievementArrayQueue.length > 0)
            {
               this.showAchievementFromQueue();
               this.achievementSpawning = true;
               this.inTween.start();
               this.inTweenRunning = true;
            }
         }
         else if(this.achievementShowing)
         {
            if(this.showTimer > 0)
            {
               --this.showTimer;
            }
            else
            {
               this.achievementShowing = false;
               this.achievementRemoving = true;
               this.outTween.start();
               this.outTweenRunning = true;
            }
         }
         else
         {
            this.achievementImage.alpha = this.valueHolder.basicValue;
            randAngle = Math.random() * 360 / 180 * Math.PI;
            this.achievementImage.x = this.theXPos + Math.cos(randAngle) * ((1 - this.valueHolder.basicValue) * 10);
            this.achievementImage.y = this.theYPos + Math.sin(randAngle) * ((1 - this.valueHolder.basicValue) * 10);
         }
      }
      
      private function moveCompletedUnseenToDone() : void
      {
         var achievement:* = undefined;
         for(var i:* = 0; i < achievementArrayUnseen.length; i++)
         {
            achievement = achievementArrayUnseen[i];
            if(ScreenAchievements["achievement" + achievement + "State"] == 0 || ScreenAchievements["achievement" + achievement + "State"] == 3)
            {
               achievementArrayDone.push(achievement);
               achievementArrayUnseen.splice(i,1);
               i--;
            }
         }
      }
      
      public function addText(who:Object, textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = true) : void
      {
         textFormat.color = textCol;
         if(centerText)
         {
            textFormat.align = TextFormatAlign.CENTER;
         }
         else
         {
            textFormat.align = TextFormatAlign.LEFT;
         }
         who.addChild(textName);
         textName.defaultTextFormat = textFormat;
         textName.antiAliasType = AntiAliasType.ADVANCED;
         textName.embedFonts = true;
         textName.wordWrap = false;
         textName.selectable = false;
         textName.mouseEnabled = false;
         textName.text = theText;
         textName.width = w;
         textName.height = h;
         textName.x = xPos;
         textName.y = yPos;
         if(shadowText)
         {
            textName.filters = this.shadowArray;
         }
      }
      
      private function moveUncompletedDoneToUnseen() : void
      {
         var achievement:* = undefined;
         for(var i:* = 0; i < achievementArrayDone.length; i++)
         {
            achievement = achievementArrayDone[i];
            if(ScreenAchievements["achievement" + achievement + "State"] != 0 && ScreenAchievements["achievement" + achievement + "State"] != 3)
            {
               achievementArrayUnseen.push(achievement);
               achievementArrayDone.splice(i,1);
               i--;
            }
         }
      }
      
      private function inTweenFinish(event:TweenEvent) : void
      {
         this.inTweenRunning = false;
         this.achievementSpawning = false;
         this.achievementShowing = true;
         this.showTimer = this.showTimerMax;
      }
   }
}

