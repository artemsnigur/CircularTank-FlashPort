package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.text.AntiAliasType;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import flash.text.TextFormatAlign;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol844")]
   public class ButtonWorld extends MovieClip
   {
      
      private var addToFrames:Number = 0;
      
      public var levelMode:String;
      
      public var number:Number;
      
      private var cursorOver:Boolean = false;
      
      public var interfaceFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      public var isLocked:Boolean = false;
      
      public var valuesSilverText:TextField = new TextField();
      
      public var worldText:TextField = new TextField();
      
      public var interfaceFormat2:TextFormat = new TextFormat("JG",14,16777215,true,false,false);
      
      private var thisWorld:Boolean = false;
      
      public var clicked:Boolean = false;
      
      public var valuesBronzeText:TextField = new TextField();
      
      public var iconSilverValue:IconValue = new IconValue();
      
      public var valuesGoldText:TextField = new TextField();
      
      public var iconGoldValue:IconValue = new IconValue();
      
      public var progressText:TextField = new TextField();
      
      public var iconBronzeValue:IconValue = new IconValue();
      
      public function ButtonWorld()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.gotoAndStop(1);
         this.addText(this.worldText,this.interfaceFormat,16777215,"" + this.number,18,width / 2,2,0);
         this.addText(this.progressText,this.interfaceFormat2,16777215,"",18,width,-2,0,"right");
         this.addText(this.valuesBronzeText,this.interfaceFormat2,6710886,"",18,width / 2,57,48);
         this.addText(this.valuesSilverText,this.interfaceFormat2,6710886,"",18,width / 2,57,62);
         this.addText(this.valuesGoldText,this.interfaceFormat2,6710886,"",18,width / 2,57,76);
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
         this.addToFrames = (this.number - 1) * 3;
         this.setImage();
         addChild(this.iconBronzeValue);
         this.iconBronzeValue.x = 8;
         this.iconBronzeValue.y = 40 + 18;
         this.iconBronzeValue.gotoAndStop(1);
         this.iconBronzeValue.scaleX = 1;
         this.iconBronzeValue.scaleY = 1;
         addChild(this.iconSilverValue);
         this.iconSilverValue.x = 8;
         this.iconSilverValue.y = 54 + 18;
         this.iconSilverValue.gotoAndStop(2);
         this.iconSilverValue.scaleX = 1;
         this.iconSilverValue.scaleY = 1;
         addChild(this.iconGoldValue);
         this.iconGoldValue.x = 8;
         this.iconGoldValue.y = 68 + 18;
         this.iconGoldValue.gotoAndStop(3);
         this.iconGoldValue.scaleX = 1;
         this.iconGoldValue.scaleY = 1;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToLevels)
         {
            this.cursorOver = true;
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToLevels)
         {
            if(!this.isLocked)
            {
               if(this.currentFrame != 3 + this.addToFrames)
               {
                  SoundManager.sfxArray.push("InterfaceButtonClick");
               }
               this.gotoAndStop(3 + this.addToFrames);
            }
            this.clicked = true;
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToLevels)
         {
            if(this.thisWorld)
            {
               if(!this.isLocked)
               {
                  this.gotoAndStop(2 + this.addToFrames);
               }
            }
         }
      }
      
      public function update(event:Event) : void
      {
         if(!this.isLocked && ScreenLevelSelect.progressWorld == 0 && !ScreenLevelSelect.changeToLevels)
         {
            buttonMode = true;
         }
         else
         {
            buttonMode = false;
         }
         this.setImage();
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:String = "left") : void
      {
         textFormat.color = textCol;
         if(centerText == "center")
         {
            textFormat.align = TextFormatAlign.CENTER;
         }
         else if(centerText == "left")
         {
            textFormat.align = TextFormatAlign.LEFT;
         }
         else if(centerText == "right")
         {
            textFormat.align = TextFormatAlign.RIGHT;
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
      
      private function setImage() : void
      {
         if(ScreenLevelSelect.worldNumberChangeTo == this.number)
         {
            this.thisWorld = true;
         }
         else
         {
            this.thisWorld = false;
         }
         this.clicked = false;
         if(this.thisWorld)
         {
            if(!this.isLocked)
            {
               this.gotoAndStop(3 + this.addToFrames);
               this.valuesBronzeText.textColor = 13421772;
               this.valuesSilverText.textColor = 13421772;
               this.valuesGoldText.textColor = 13421772;
            }
         }
         else if(this.cursorOver)
         {
            if(!this.isLocked)
            {
               if(this.currentFrame != 2 + this.addToFrames)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
               }
               this.gotoAndStop(2 + this.addToFrames);
               this.valuesBronzeText.textColor = 10066329;
               this.valuesSilverText.textColor = 10066329;
               this.valuesGoldText.textColor = 10066329;
            }
         }
         else if(!this.isLocked)
         {
            this.gotoAndStop(1 + this.addToFrames);
            this.valuesBronzeText.textColor = 6710886;
            this.valuesSilverText.textColor = 6710886;
            this.valuesGoldText.textColor = 6710886;
         }
         else
         {
            this.gotoAndStop(28);
         }
      }
   }
}

