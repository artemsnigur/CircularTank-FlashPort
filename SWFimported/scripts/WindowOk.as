package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   
   public class WindowOk extends MovieClip
   {
      
      public static var textFormat:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      private var bg:BackgroundWindowOk = new BackgroundWindowOk();
      
      private var bDifficultyHard:ButtonDifficultyHard = new ButtonDifficultyHard();
      
      public var moreWindowsArray:Array = [];
      
      private var bWindowCancel:ButtonWindowCancel = new ButtonWindowCancel();
      
      public var theText:String = "";
      
      private var bDifficultyMedium:ButtonDifficultyMedium = new ButtonDifficultyMedium();
      
      private var shadowArray:Array = filters;
      
      private var bOptionCheckBoxWindowUL:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var theTextField:TextField = new TextField();
      
      private var bDifficultyEasy:ButtonDifficultyEasy = new ButtonDifficultyEasy();
      
      private var bWindowOk:ButtonWindowOk = new ButtonWindowOk();
      
      private var checkBoxText:TextField = new TextField();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var isAdded:Boolean = false;
      
      public var type:String = "";
      
      public function WindowOk()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
         this.bDifficultyEasy.myDifficulty = "Easy";
         this.bDifficultyMedium.myDifficulty = "Medium";
         this.bDifficultyHard.myDifficulty = "Hard";
      }
      
      public function added(event:Event) : void
      {
         addEventListener(Event.ENTER_FRAME,this.update);
         if(!this.isAdded)
         {
            this.isAdded = true;
            this.createWindow();
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.type == "Upgrade Limit")
         {
            ScreenOptions.optionWindowULOn = !this.bOptionCheckBoxWindowUL.marked;
            if(this.bWindowCancel.clicked || this.bWindowOk.clicked)
            {
               if(this.bOptionCheckBoxWindowUL.marked)
               {
                  SaveManager.saveOptionWindowUL();
               }
            }
            if(this.bWindowCancel.clicked)
            {
               parent.removeChild(this);
               this.isAdded = false;
               this.bWindowCancel.clicked = false;
               if(Main.changeScreen == "Status")
               {
                  ScreenStatus.windowOkDisplayed = false;
               }
            }
         }
         if(this.type == "Choose Difficulty")
         {
            this.theText = "You can change the difficulty anytime, by clicking the difficulty buttons\n\nYou are currently playing on " + ScreenLevelSelect.levelDifficulty.toUpperCase() + "\n\nEASY = Bronze medals\nMEDIUM = Silver medals\nHARD = Gold medals";
            this.theTextField.text = this.theText;
         }
         if(this.bWindowOk.clicked && !this.bWindowCancel.clicked)
         {
            if(this.moreWindowsArray.length == 0)
            {
               if(Main.changeScreen == "LevelSelect")
               {
                  ScreenGame.level = ScreenLevelSelect.selectedLevel;
                  ScreenGame.world = ScreenLevelSelect.selectedWorld;
                  Main.changeScreen = "Game";
               }
               else if(Main.changeScreen == "Status")
               {
                  ScreenStatus.windowOkDisplayed = false;
                  ButtonNextLevel.startNextLevel();
               }
               parent.removeChild(this);
               this.isAdded = false;
            }
            else
            {
               this.type = this.moreWindowsArray[0];
               this.moreWindowsArray.splice(0,1);
               this.removeAllChildren();
               this.createWindow();
            }
            this.bWindowOk.clicked = false;
         }
      }
      
      private function createWindow() : void
      {
         addChild(this.bg);
         if(this.type == "Upgrade Limit")
         {
            if(Main.currentScreen == "LevelSelect")
            {
               this.bg.gotoAndStop(2);
            }
            else
            {
               this.bg.gotoAndStop(1);
            }
            this.addText(this.theTextField,textFormat,16777215,"",244,392,124,92,false);
            this.theText = "You have at least one upgrade with a higher upgrade level than the level\'s upgrade limit.\n\nThe upgrade(s) will be temporarily downgraded to fit the level\'s upgrade limit.";
            this.theTextField.text = this.theText;
            this.bOptionCheckBoxWindowUL.marked = !ScreenOptions.optionWindowULOn;
            addChild(this.bOptionCheckBoxWindowUL);
            this.bOptionCheckBoxWindowUL.x = 128;
            this.bOptionCheckBoxWindowUL.y = 192;
            this.addText(this.checkBoxText,textFormat,16777215,"Don\'t show this message again",20,284,152,192,false);
            addChild(this.bWindowOk);
            this.bWindowOk.x = 124;
            this.bWindowOk.y = 360 - 44;
            addChild(this.bWindowCancel);
            this.bWindowCancel.x = 200 + 122;
            this.bWindowCancel.y = 360 - 44;
         }
         else if(this.type == "Choose Difficulty")
         {
            if(Main.currentScreen == "LevelSelect")
            {
               this.bg.gotoAndStop(3);
               this.addText(this.theTextField,textFormat,16777215,"",240,194,124,92,false);
               addChild(this.bWindowOk);
               this.bWindowOk.x = 124;
               this.bWindowOk.y = 360 - 44;
            }
            else
            {
               this.bg.gotoAndStop(4);
               this.addText(this.theTextField,textFormat,16777215,"",244,232,204,92,false);
               this.bWindowOk.extraImages = 3;
               addChild(this.bWindowOk);
               this.bWindowOk.x = 320 - this.bWindowOk.width / 2;
               this.bWindowOk.y = 360 - 44;
               addChild(this.bDifficultyMedium);
               this.bDifficultyMedium.x = 320 - this.bDifficultyMedium.width / 2;
               this.bDifficultyMedium.y = 220;
               addChild(this.bDifficultyEasy);
               this.bDifficultyEasy.x = this.bDifficultyMedium.x - 75;
               this.bDifficultyEasy.y = 220;
               addChild(this.bDifficultyHard);
               this.bDifficultyHard.x = this.bDifficultyMedium.x + 75;
               this.bDifficultyHard.y = 220;
            }
         }
      }
      
      public function removed(event:Event) : void
      {
         this.removeAllChildren();
      }
      
      private function removeAllChildren() : void
      {
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = true) : void
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
         if(shadowText)
         {
            textName.filters = this.shadowArray;
         }
         addChild(textName);
         textName.defaultTextFormat = textFormat;
         textName.antiAliasType = AntiAliasType.ADVANCED;
         textName.embedFonts = true;
         textName.wordWrap = true;
         textName.selectable = false;
         textName.mouseEnabled = false;
         textName.text = theText;
         textName.width = w;
         textName.height = h;
         textName.x = xPos;
         textName.y = yPos;
      }
   }
}

