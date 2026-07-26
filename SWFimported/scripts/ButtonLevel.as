package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol845")]
   public class ButtonLevel extends MovieClip
   {
      
      private var myGlowHelp:* = new DropShadowFilter(0,0,16711680,1,5,5,5,2);
      
      private var thisLevel:Boolean = false;
      
      public var levelMode:String;
      
      public var number:Number;
      
      private var cursorOver:Boolean = false;
      
      private var glowHelpArray:Array = filters;
      
      public var interfaceFormat:TextFormat = new TextFormat("JG",13,16777215,true,false,false);
      
      public var levelText:TextField = new TextField();
      
      public var isLocked:Boolean = false;
      
      private var uihActivated:Boolean = false;
      
      private var worldAndLevel:Array = [];
      
      public var iconArray:Array = new Array();
      
      public var clicked:Boolean = false;
      
      public var iconFrame:Number = 1;
      
      private var isAdded:Boolean = false;
      
      public var iconMode:MovieClip;
      
      public function ButtonLevel()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.glowHelpArray.push(this.myGlowHelp);
         this.gotoAndStop(1);
         this.addText(this.levelText,this.interfaceFormat,13421772,"" + this.number,18,width,2,1);
         this.tabEnabled = false;
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToWorlds)
         {
            if(this.thisLevel)
            {
               if(!this.isLocked)
               {
                  this.gotoAndStop(2);
               }
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToWorlds)
         {
            if(!this.isLocked)
            {
               if(this.currentFrame != 3)
               {
                  SoundManager.sfxArray.push("InterfaceButtonClick");
               }
               this.gotoAndStop(3);
            }
            this.clicked = true;
            if(this.uihActivated)
            {
               this.uihActivated = false;
               this.filters = [];
               Main.uihButtonLevel = true;
               SaveManager.saveUIHelpers();
            }
            ScreenLevelSelect.canSelectFromLevelGuide = false;
         }
      }
      
      private function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(Main.uihButtonLevel == false)
            {
               this.worldAndLevel = ScreenLevelSelect.getCurrentWorldAndLevel();
            }
            this.setImage();
         }
      }
      
      public function update(event:Event) : void
      {
         if(PartTutorial.tutorialOn && Main.uihButtonLevel == false && !this.uihActivated && ScreenLevelSelect.selectedWorld == this.worldAndLevel[0] && this.number == this.worldAndLevel[1] && !this.isLocked)
         {
            this.uihActivated = true;
            this.filters = this.glowHelpArray;
         }
         if(Main.uihButtonLevel == true && this.uihActivated)
         {
            this.uihActivated = false;
            this.filters = [];
         }
         if(!this.isLocked && ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToWorlds)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
         }
         this.setImage();
      }
      
      private function setImage() : void
      {
         if(ScreenLevelSelect.selectedLevel == this.number)
         {
            this.thisLevel = true;
         }
         else
         {
            this.thisLevel = false;
         }
         this.clicked = false;
         if(this.thisLevel)
         {
            if(!this.isLocked)
            {
               this.gotoAndStop(3);
               this.levelText.textColor = 16777215;
               if(this.iconMode != null)
               {
                  this.iconMode.gotoAndStop(this.iconFrame * 3 - 2);
               }
            }
         }
         else if(this.cursorOver)
         {
            if(!this.isLocked)
            {
               if(this.currentFrame != 2)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
                  if(this.iconMode != null)
                  {
                     this.iconMode.gotoAndStop(this.iconFrame * 3 - 1);
                  }
               }
               this.gotoAndStop(2);
            }
         }
         else if(!this.isLocked)
         {
            this.gotoAndStop(1);
            this.levelText.textColor = 13421772;
            if(this.iconMode != null)
            {
               this.iconMode.gotoAndStop(this.iconFrame * 3);
            }
         }
         else
         {
            this.gotoAndStop(4);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToWorlds)
         {
            this.cursorOver = true;
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false) : void
      {
         textFormat.color = textCol;
         if(centerText)
         {
            textFormat.align = TextFormatAlign.CENTER;
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
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToWorlds)
         {
            this.cursorOver = false;
         }
      }
   }
}

