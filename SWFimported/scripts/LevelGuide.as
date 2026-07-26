package
{
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   
   public class LevelGuide extends Sprite
   {
      
      public static var selectedWorld:Number = 1;
      
      public static var selectedLevel:Number = 1;
      
      public static var maxWorld:Number = 1;
      
      public static var maxLevel:Number = 1;
      
      public static var autoSelect:Boolean = true;
      
      public static var type:String = "Upcoming";
      
      private var bWorldArrowLeft:* = new ButtonLevelGuideArrow();
      
      private var bWorldArrowRight:* = new ButtonLevelGuideArrow();
      
      private var textFormat:TextFormat = new TextFormat("Arial",11,16777215,true,false,false);
      
      private var bLevelGuideAutoSelect:* = new ButtonLevelGuideAutoSelect();
      
      public var pText:Object;
      
      private var bLevelArrowLeft:* = new ButtonLevelGuideArrow();
      
      private var levelText:TextField = new TextField();
      
      private var bLevelGuideUpcoming:* = new ButtonLevelGuideUpcoming();
      
      private var bLevelGuideLast:* = new ButtonLevelGuideLast();
      
      private var shadowArray:Array = filters;
      
      private var worldText:TextField = new TextField();
      
      private var bLevelGuideInfo:* = new ButtonLevelGuideInfo();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var bLevelGuidePrevious:* = new ButtonLevelGuidePrevious();
      
      private var bLevelArrowRight:* = new ButtonLevelGuideArrow();
      
      private var isAdded:Boolean = false;
      
      private var bgLevelGuide:BackgroundLevelGuide = new BackgroundLevelGuide();
      
      public function LevelGuide()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
      }
      
      public static function getUpcomingWorldAndLevel() : *
      {
         var levelsInCurrentWorld:* = undefined;
         var upcomingWorld:* = ScreenLevelSelect.previousWorld;
         var upcomingLevel:* = ScreenLevelSelect.previousLevel;
         if((upcomingWorld < LevelGuide.maxWorld || upcomingLevel < LevelGuide.maxLevel) && ScreenLevelSelect.previousLevelWon)
         {
            levelsInCurrentWorld = ScreenGame.worldModels[3 * upcomingWorld - 3].length;
            if(upcomingLevel < levelsInCurrentWorld)
            {
               upcomingLevel++;
            }
            else if(upcomingWorld < ScreenLevelSelect.totalWorlds)
            {
               upcomingLevel = 1;
               upcomingWorld++;
            }
         }
         return [upcomingWorld,upcomingLevel];
      }
      
      public static function setMaxWorld() : void
      {
         var valueBundle:* = undefined;
         LevelGuide.maxWorld = 1;
         var totalLevelsArray:* = [];
         for(var u:* = 0; u < ScreenLevelSelect.totalWorlds; u++)
         {
            totalLevelsArray[u] = ScreenGame.worldModels[u * 3].length;
         }
         for(var i:* = 0; i < ScreenLevelSelect.totalWorlds - 1; i++)
         {
            valueBundle = ScreenLevelSelect.worldsValuesArrays[i][totalLevelsArray[i] - 1];
            if(valueBundle[0] + valueBundle[1] + valueBundle[2] != 0)
            {
               ++LevelGuide.maxWorld;
            }
         }
      }
      
      public static function setMaxLevel(ofWorld:*) : void
      {
         var valueBundle:* = undefined;
         LevelGuide.maxLevel = 1;
         for(var i:* = 0; i < ScreenLevelSelect.worldsValuesArrays[ofWorld - 1].length - 1; i++)
         {
            valueBundle = ScreenLevelSelect.worldsValuesArrays[ofWorld - 1][i];
            if(valueBundle[0] + valueBundle[1] + valueBundle[2] != 0)
            {
               ++LevelGuide.maxLevel;
            }
         }
      }
      
      public static function updateVariables() : void
      {
         var upcomingArray:* = undefined;
         setMaxWorld();
         setMaxLevel(LevelGuide.maxWorld);
         if(type == "Previous")
         {
            selectedWorld = ScreenLevelSelect.previousWorld;
            selectedLevel = ScreenLevelSelect.previousLevel;
         }
         else if(type == "Upcoming")
         {
            upcomingArray = getUpcomingWorldAndLevel();
            selectedWorld = upcomingArray[0];
            selectedLevel = upcomingArray[1];
         }
         else if(type == "Last")
         {
            selectedWorld = LevelGuide.maxWorld;
            selectedLevel = LevelGuide.maxLevel;
         }
      }
      
      public function update(event:Event) : void
      {
         this.updateTextfields();
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            addChild(this.bgLevelGuide);
            this.addText(this.worldText,this.textFormat,16777215,"",12,50,21,25,true,true);
            this.addText(this.levelText,this.textFormat,16777215,"",12,50,21,41,true,true);
            this.bWorldArrowRight.type = "World";
            this.bWorldArrowRight.direction = "Right";
            addChild(this.bWorldArrowRight);
            this.bWorldArrowRight.x = 70 + 8;
            this.bWorldArrowRight.y = 25 + 8;
            this.bWorldArrowLeft.type = "World";
            this.bWorldArrowLeft.direction = "Left";
            addChild(this.bWorldArrowLeft);
            this.bWorldArrowLeft.x = 20 - 6;
            this.bWorldArrowLeft.y = 25 + 8;
            this.bLevelArrowRight.type = "Level";
            this.bLevelArrowRight.direction = "Right";
            addChild(this.bLevelArrowRight);
            this.bLevelArrowRight.x = 70 + 8;
            this.bLevelArrowRight.y = 25 + 24;
            this.bLevelArrowLeft.type = "Level";
            this.bLevelArrowLeft.direction = "Left";
            addChild(this.bLevelArrowLeft);
            this.bLevelArrowLeft.x = 20 - 6;
            this.bLevelArrowLeft.y = 25 + 24;
            this.bLevelGuideInfo.pText = this.pText;
            addChild(this.bLevelGuideInfo);
            this.bLevelGuideInfo.x = 116;
            this.bLevelGuideInfo.y = 32;
            this.bLevelGuidePrevious.type = "Previous";
            this.bLevelGuidePrevious.pText = this.pText;
            addChild(this.bLevelGuidePrevious);
            this.bLevelGuidePrevious.x = 6;
            this.bLevelGuidePrevious.y = 66;
            this.bLevelGuideUpcoming.type = "Upcoming";
            this.bLevelGuideUpcoming.pText = this.pText;
            addChild(this.bLevelGuideUpcoming);
            this.bLevelGuideUpcoming.x = 34;
            this.bLevelGuideUpcoming.y = 66;
            this.bLevelGuideLast.type = "Last";
            this.bLevelGuideLast.pText = this.pText;
            addChild(this.bLevelGuideLast);
            this.bLevelGuideLast.x = 60;
            this.bLevelGuideLast.y = 66;
            this.bLevelGuideAutoSelect.pText = this.pText;
            addChild(this.bLevelGuideAutoSelect);
            this.bLevelGuideAutoSelect.x = 90;
            this.bLevelGuideAutoSelect.y = 66;
            if(autoSelect)
            {
               LevelGuide.type = "Upcoming";
               LevelGuide.updateVariables();
            }
            else
            {
               setMaxWorld();
               setMaxLevel(LevelGuide.maxWorld);
            }
            this.updateAllButtons();
         }
      }
      
      public function updateTextfields() : void
      {
         this.worldText.text = "World " + selectedWorld;
         this.levelText.text = "Level " + selectedLevel;
      }
      
      public function updateAllButtons() : void
      {
         this.bWorldArrowRight.updateState();
         this.bWorldArrowLeft.updateState();
         this.bLevelArrowRight.updateState();
         this.bLevelArrowLeft.updateState();
         this.bLevelGuidePrevious.updateState();
         this.bLevelGuideUpcoming.updateState();
         this.bLevelGuideLast.updateState();
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
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
         textName.gridFitType = "none";
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
   }
}

