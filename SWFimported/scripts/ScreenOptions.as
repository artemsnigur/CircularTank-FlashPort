package
{
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.AntiAliasType;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import flash.text.TextFormatAlign;
   
   public class ScreenOptions extends Sprite
   {
      
      public static var optionCrosshairOn:Boolean = true;
      
      public static var optionWindowULOn:Boolean = true;
      
      public static var optionAutoPauseOn:Boolean = true;
      
      public static var forceReset:Boolean = false;
      
      private var textFormat:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      private var isAdded:Boolean = false;
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var bDifficultyMedium:ButtonDifficultyMedium = new ButtonDifficultyMedium();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var bgOptions:BackgroundOptions = new BackgroundOptions();
      
      private var shadowArray:Array = filters;
      
      private var bButtonResetOptions:ButtonResetOptions = new ButtonResetOptions();
      
      private var sliderSound:SliderObject = new SliderObject();
      
      private var bOptionCheckBoxCursor:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var bOptionGraphicsMedium:ButtonOptionGraphicsMedium = new ButtonOptionGraphicsMedium();
      
      private var bOptionCheckBoxTutorial:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var checkBox1Text:TextField = new TextField();
      
      private var checkBox2Text:TextField = new TextField();
      
      private var checkBox3Text:TextField = new TextField();
      
      private var checkBox5Text:TextField = new TextField();
      
      private var checkBox6Text:TextField = new TextField();
      
      private var bgMenu:BackgroundMenu = new BackgroundMenu();
      
      private var checkBox4Text:TextField = new TextField();
      
      private var bDifficultyHard:ButtonDifficultyHard = new ButtonDifficultyHard();
      
      private var sliderMusic:SliderObject = new SliderObject();
      
      private var bOptionGraphicsLow:ButtonOptionGraphicsLow = new ButtonOptionGraphicsLow();
      
      private var bToggleSound:ButtonToggleSound = new ButtonToggleSound();
      
      private var bDifficultyEasy:ButtonDifficultyEasy = new ButtonDifficultyEasy();
      
      private var bOptionCheckBoxWindowUL:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var bOptionGraphicsHigh:ButtonOptionGraphicsHigh = new ButtonOptionGraphicsHigh();
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var theTitle:TitleOptions = new TitleOptions();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var bOptionCheckBoxAutoSelect:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var bOptionCheckBoxAutoPause:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var bToggleMusic:ButtonToggleMusic = new ButtonToggleMusic();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var bOptionCheckBoxAchievementPopUp:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      public function ScreenOptions()
      {
         super();
         this.shadowArray.push(this.myShadow);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.bDifficultyEasy.myDifficulty = "Easy";
         this.bDifficultyMedium.myDifficulty = "Medium";
         this.bDifficultyHard.myDifficulty = "Hard";
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = false) : void
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
         if(shadowText)
         {
            textName.filters = this.shadowArray;
         }
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            addChild(this.bgTitle);
            addChild(this.bgMenu);
            this.bgMenu.y = this.bgTitle.height;
            addChild(this.bgOptions);
            this.bgOptions.y = this.bgTitle.height;
            this.sliderSound.sliderValue = SoundManager.soundVol;
            this.sliderMusic.sliderValue = SoundManager.musicVol;
            addChild(this.sliderSound);
            this.sliderSound.x = 46;
            this.sliderSound.y = this.bgTitle.height + 50;
            addChild(this.bToggleSound);
            this.bToggleSound.x = 23;
            this.bToggleSound.y = this.bgTitle.height + 50;
            addChild(this.sliderMusic);
            this.sliderMusic.x = 46;
            this.sliderMusic.y = this.bgTitle.height + 138;
            addChild(this.bToggleMusic);
            this.bToggleMusic.x = 23;
            this.bToggleMusic.y = this.bgTitle.height + 138;
            this.bOptionGraphicsLow.myOption = "LOW";
            addChild(this.bOptionGraphicsLow);
            this.bOptionGraphicsLow.x = 4;
            this.bOptionGraphicsLow.y = this.bgTitle.height + 214;
            this.bOptionGraphicsMedium.myOption = "MEDIUM";
            addChild(this.bOptionGraphicsMedium);
            this.bOptionGraphicsMedium.x = this.bOptionGraphicsLow.x + this.bOptionGraphicsLow.width + 4;
            this.bOptionGraphicsMedium.y = this.bOptionGraphicsLow.y;
            this.bOptionGraphicsHigh.myOption = "HIGH";
            addChild(this.bOptionGraphicsHigh);
            this.bOptionGraphicsHigh.x = this.bOptionGraphicsMedium.x + this.bOptionGraphicsMedium.width + 4;
            this.bOptionGraphicsHigh.y = this.bOptionGraphicsLow.y;
            addChild(this.bDifficultyEasy);
            this.bDifficultyEasy.x = 4;
            this.bDifficultyEasy.y = this.bgTitle.height + 302;
            addChild(this.bDifficultyMedium);
            this.bDifficultyMedium.x = this.bDifficultyEasy.x + this.bDifficultyEasy.width + 4;
            this.bDifficultyMedium.y = this.bDifficultyEasy.y;
            addChild(this.bDifficultyHard);
            this.bDifficultyHard.x = this.bDifficultyMedium.x + this.bDifficultyMedium.width + 4;
            this.bDifficultyHard.y = this.bDifficultyEasy.y;
            addChild(this.bButtonResetOptions);
            this.bButtonResetOptions.x = 640 - this.bButtonResetOptions.width - 18.5;
            this.bButtonResetOptions.y = this.bgTitle.height + 281;
            this.bOptionCheckBoxTutorial.marked = PartTutorial.tutorialOn;
            addChild(this.bOptionCheckBoxTutorial);
            this.bOptionCheckBoxTutorial.x = 332;
            this.bOptionCheckBoxTutorial.y = 44 + this.bgTitle.height;
            this.addText(this.checkBox1Text,this.textFormat,16777215,"Tutorial",20,284,356,this.bgTitle.height + 44,false,true);
            this.bOptionCheckBoxAchievementPopUp.marked = PartAchievements.achievementPopUp;
            addChild(this.bOptionCheckBoxAchievementPopUp);
            this.bOptionCheckBoxAchievementPopUp.x = 332;
            this.bOptionCheckBoxAchievementPopUp.y = 80 + this.bgTitle.height;
            this.addText(this.checkBox2Text,this.textFormat,16777215,"Achievement pop-ups",20,284,356,this.bgTitle.height + 80,false,true);
            this.bOptionCheckBoxCursor.marked = optionCrosshairOn;
            addChild(this.bOptionCheckBoxCursor);
            this.bOptionCheckBoxCursor.x = 332;
            this.bOptionCheckBoxCursor.y = 116 + this.bgTitle.height;
            this.addText(this.checkBox3Text,this.textFormat,16777215,"Crosshair",20,284,356,this.bgTitle.height + 116,false,true);
            this.bOptionCheckBoxAutoPause.marked = optionAutoPauseOn;
            addChild(this.bOptionCheckBoxAutoPause);
            this.bOptionCheckBoxAutoPause.x = 332;
            this.bOptionCheckBoxAutoPause.y = 152 + this.bgTitle.height;
            this.addText(this.checkBox4Text,this.textFormat,16777215,"Auto pause",20,284,356,this.bgTitle.height + 152,false,true);
            this.bOptionCheckBoxWindowUL.marked = optionWindowULOn;
            addChild(this.bOptionCheckBoxWindowUL);
            this.bOptionCheckBoxWindowUL.x = 332;
            this.bOptionCheckBoxWindowUL.y = 188 + this.bgTitle.height;
            this.addText(this.checkBox5Text,this.textFormat,16777215,"Upgrade-limit warning",20,284,356,this.bgTitle.height + 188,false,true);
            this.bOptionCheckBoxAutoSelect.marked = LevelGuide.autoSelect;
            addChild(this.bOptionCheckBoxAutoSelect);
            this.bOptionCheckBoxAutoSelect.x = 332;
            this.bOptionCheckBoxAutoSelect.y = 224 + this.bgTitle.height;
            this.addText(this.checkBox6Text,this.textFormat,16777215,"Auto select on level guide",20,284,356,this.bgTitle.height + 224,false,true);
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            addChild(this.sponsorLogo);
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 432;
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.sliderSound.isPressed)
         {
            if(this.sliderSound.sliderValue == 0)
            {
               SoundManager.soundOn = false;
            }
            else
            {
               SoundManager.soundOn = true;
            }
         }
         else if(this.sliderSound.sliderValue == 0 && SoundManager.soundOn)
         {
            this.sliderSound.sliderValue = 1;
            this.sliderSound.sliderButton.x = this.sliderSound.sliderBar.width;
         }
         else if(this.sliderSound.sliderValue > 0 && !SoundManager.soundOn)
         {
            this.sliderSound.sliderValue = 0;
            this.sliderSound.sliderButton.x = 0;
         }
         SoundManager.soundVol = this.sliderSound.sliderValue;
         if(this.sliderMusic.isPressed)
         {
            if(this.sliderMusic.sliderValue == 0)
            {
               SoundManager.musicOn = false;
            }
            else
            {
               SoundManager.musicOn = true;
            }
         }
         else if(this.sliderMusic.sliderValue == 0 && SoundManager.musicOn)
         {
            this.sliderMusic.sliderValue = 1;
            this.sliderMusic.sliderButton.x = this.sliderMusic.sliderBar.width;
         }
         else if(this.sliderMusic.sliderValue > 0 && !SoundManager.musicOn)
         {
            this.sliderMusic.sliderValue = 0;
            this.sliderMusic.sliderButton.x = 0;
         }
         SoundManager.musicVol = this.sliderMusic.sliderValue;
         if(this.sliderSound.isPressed || this.sliderMusic.isPressed)
         {
            SoundManager.setVolumesBoolean = true;
            SoundManager.volumeSliderInUse = true;
         }
         if(!forceReset)
         {
            PartTutorial.tutorialOn = this.bOptionCheckBoxTutorial.marked;
            PartAchievements.achievementPopUp = this.bOptionCheckBoxAchievementPopUp.marked;
            optionCrosshairOn = this.bOptionCheckBoxCursor.marked;
            optionAutoPauseOn = this.bOptionCheckBoxAutoPause.marked;
            optionWindowULOn = this.bOptionCheckBoxWindowUL.marked;
            LevelGuide.autoSelect = this.bOptionCheckBoxAutoSelect.marked;
         }
         else
         {
            this.bOptionCheckBoxTutorial.marked = PartTutorial.tutorialOn;
            this.bOptionCheckBoxAchievementPopUp.marked = PartAchievements.achievementPopUp;
            this.bOptionCheckBoxCursor.marked = optionCrosshairOn;
            this.bOptionCheckBoxAutoPause.marked = optionAutoPauseOn;
            this.bOptionCheckBoxWindowUL.marked = optionWindowULOn;
            this.bOptionCheckBoxAutoSelect.marked = LevelGuide.autoSelect;
            forceReset = false;
         }
      }
   }
}

