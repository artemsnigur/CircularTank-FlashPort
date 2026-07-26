package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   import flash.text.AntiAliasType;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import flash.text.TextFormatAlign;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol207")]
   public class ButtonSquarePage extends MovieClip
   {
      
      private static var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      private static var notificationText:TextField = new TextField();
      
      private var myGlowHelp:* = new DropShadowFilter(0,0,16711680,1,2,2,5,2);
      
      private var cursorOver:Boolean = false;
      
      private var glowHelpArray:Array = filters;
      
      private var glowArray:Array = filters;
      
      public var dir:String = "Right";
      
      private var uihRect:ButtonSquarePageUIHRect = new ButtonSquarePageUIHRect();
      
      private var myGlow:* = new DropShadowFilter(0,0,16777215,1,4,4,5,2);
      
      private var addMoreFrames:Number = 0;
      
      private var uihActivated:Boolean = false;
      
      private var pressed:Boolean = false;
      
      private var addFrames:Number = 0;
      
      private var notifications:Number = 0;
      
      private var isAdded:Boolean = false;
      
      private var notificationsShowing:Boolean = false;
      
      public function ButtonSquarePage()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         this.glowArray.push(this.myGlow);
         this.glowHelpArray.push(this.myGlowHelp);
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(this.dir == "Right")
            {
               this.addFrames = 0;
               if(ScreenStatus.pageNext >= 3)
               {
                  this.notificationsShowing = true;
                  this.notifications = ScreenStatus.pageNext - 2;
                  this.addMoreFrames = 6;
                  this.gotoAndStop(1 + this.addFrames + this.addMoreFrames);
                  this.addText(notificationText,textFormat,0,"" + this.notifications,20,22,0,this.height - this.height / 2 - 10,true,true);
               }
            }
            else
            {
               this.addFrames = 3;
            }
            this.gotoAndStop(1 + this.addFrames + this.addMoreFrames);
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            if(this.dir == "Right")
            {
               if(alpha > 0)
               {
                  if(this.uihActivated && ScreenStatus.pageCurrent == 2)
                  {
                     this.uihActivated = false;
                     this.uihRect.filters = [];
                     removeChild(this.uihRect);
                     Main.uihButtonSquarePage = true;
                     SaveManager.saveUIHelpers();
                  }
                  if(this.notifications > 0 && ScreenStatus.pageNext - 2 == this.notifications)
                  {
                     --this.notifications;
                     notificationText.text = "" + this.notifications;
                     if(this.notifications == 0)
                     {
                        this.addMoreFrames = 0;
                        if(stage.contains(notificationText))
                        {
                           removeChild(notificationText);
                        }
                     }
                  }
                  --ScreenStatus.pageNext;
               }
            }
            else if(alpha > 0)
            {
               ++ScreenStatus.pageNext;
            }
            this.gotoAndStop(2 + this.addFrames + this.addMoreFrames);
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(alpha > 0)
         {
            this.pressed = true;
            this.gotoAndStop(3 + this.addFrames + this.addMoreFrames);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(alpha > 0)
         {
            if(!this.cursorOver)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
            if(this.pressed)
            {
               this.gotoAndStop(3 + this.addFrames + this.addMoreFrames);
            }
            else
            {
               this.gotoAndStop(2 + this.addFrames + this.addMoreFrames);
            }
            this.cursorOver = true;
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
      
      public function update(event:Event) : void
      {
         if(this.dir == "Right")
         {
            if(PartTutorial.tutorialOn && Main.uihButtonSquarePage == false && !this.uihActivated)
            {
               this.uihActivated = true;
               addChild(this.uihRect);
               this.uihRect.filters = this.glowHelpArray;
            }
            if(ScreenStatus.pageNext == 1)
            {
               this.alpha = 0;
               buttonMode = false;
            }
            else
            {
               this.alpha = 1;
               buttonMode = true;
            }
         }
         else if(ScreenStatus.pageNext == ScreenStatus.pagesTotal)
         {
            this.alpha = 0;
            buttonMode = false;
         }
         else
         {
            this.alpha = 1;
            buttonMode = true;
         }
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, glowText:Boolean = false) : void
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
         if(glowText)
         {
            textName.filters = this.glowArray;
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(alpha > 0)
         {
            this.gotoAndStop(1 + this.addFrames + this.addMoreFrames);
            this.cursorOver = false;
         }
      }
   }
}

