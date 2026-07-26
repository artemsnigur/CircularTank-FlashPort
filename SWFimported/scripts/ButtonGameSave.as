package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.DropShadowFilter;
   import flash.net.SharedObject;
   import flash.text.*;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol890")]
   public class ButtonGameSave extends MovieClip
   {
      
      public var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      private var bConfirm:ButtonConfirm = new ButtonConfirm();
      
      private var bSaveDelete:ButtonSaveDelete = new ButtonSaveDelete();
      
      private var page:Number = 1;
      
      private var gameSave:SharedObject;
      
      private var gameLoaded:Boolean = false;
      
      private var shadowArray:Array = filters;
      
      private var pressed:Boolean = false;
      
      public var onlineType:Boolean = false;
      
      public var textFormat3:TextFormat = new TextFormat("JG",14,16777215,true,false,false);
      
      public var textFormat2:TextFormat = new TextFormat("Arial",11,16777215,true,false,false);
      
      private var crown:Crown = new Crown();
      
      public var requireText:TextField = new TextField();
      
      private var cursorOver:Boolean = false;
      
      private var glowArray:Array = filters;
      
      private var myGlow:* = new DropShadowFilter(0,0,16777215,1,8,8,5,2);
      
      public var worldText:TextField = new TextField();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      public var upperText:TextField = new TextField();
      
      public var sMenu:Object;
      
      public var canBeClicked:Boolean = true;
      
      private var isAdded:Boolean = false;
      
      public var dateText:TextField = new TextField();
      
      private var bCancel:ButtonCancel = new ButtonCancel();
      
      public var slot:Number = 0;
      
      public function ButtonGameSave()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         this.shadowArray.push(this.myShadow);
         this.glowArray.push(this.myGlow);
         this.gotoAndStop(1);
         this.tabEnabled = false;
      }
      
      private function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            if(!this.onlineType)
            {
               if(this.slot == 1)
               {
                  this.gameSave = SharedObject.getLocal("CircularTankSave1");
               }
               else if(this.slot == 2)
               {
                  this.gameSave = SharedObject.getLocal("CircularTankSave2");
               }
               else if(this.slot == 3)
               {
                  this.gameSave = SharedObject.getLocal("CircularTankSave3");
               }
            }
            this.makePage1();
         }
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.canBeClicked)
         {
            if(!this.bSaveDelete.cursorOver && this.pressed)
            {
               if(this.page == 1)
               {
                  SoundManager.sfxArray.push("InterfaceButtonClick");
                  if(!ScreenMenu.convertingSaves)
                  {
                     Main.currentSaveIsOnline = this.onlineType;
                     SaveManager.setGameSave(this.slot);
                     SaveManager.resetPublicStatics();
                     if(!this.onlineType && this.gameSave.data.gameStarted == true || this.onlineType && SaveManager.checkIfSlotHasData(this.slot))
                     {
                        SaveManager.loadGame();
                        Main.changeScreen = "LevelSelect";
                     }
                     else
                     {
                        if(!this.onlineType)
                        {
                           this.gameSave.data.gameStarted = true;
                        }
                        SaveManager.initGame();
                        ScreenGame.world = 1;
                        ScreenGame.level = 1;
                        ScreenLevelSelect.selectedLevel = 1;
                        ScreenLevelSelect.selectedWorld = 1;
                        ScreenLevelSelect.levelMode = "Normal";
                        Main.changeScreen = "Game";
                     }
                  }
                  else if(!SaveManager.checkIfSlotHasData(this.slot))
                  {
                     SaveManager.convertSaveToSaveString(ScreenMenu.slotConverting,this.slot);
                     this.sMenu.endConvertSaves();
                  }
                  else
                  {
                     this.makePage2("Overwrite?");
                  }
               }
            }
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.canBeClicked)
         {
            if(this.page == 1)
            {
               this.pressed = true;
            }
         }
      }
      
      private function addCrown() : void
      {
         addChild(this.crown);
         this.crown.x = 138;
         this.crown.y = 72;
         this.crown.scaleX = 0.075;
         this.crown.scaleY = 0.075;
         this.crown.rotation = 45;
      }
      
      private function setImage() : void
      {
         if(this.page == 1)
         {
            if(this.cursorOver && !this.bSaveDelete.cursorOver)
            {
               if(this.pressed)
               {
                  gotoAndStop(3);
               }
               else
               {
                  gotoAndStop(2);
               }
            }
            else
            {
               gotoAndStop(1);
            }
         }
         else
         {
            gotoAndStop(1);
         }
      }
      
      public function endConvertMode() : void
      {
         this.clearAllChildren();
         this.makePage1();
         if(this.filters != [])
         {
            this.filters = [];
         }
         if(this.alpha != 1)
         {
            this.alpha = 1;
         }
      }
      
      private function makePage1(addDeleteButton:Boolean = true) : void
      {
         var dateAndWorldLevelText:Array = null;
         this.page = 1;
         this.canBeClicked = true;
         buttonMode = true;
         if(SaveManager.saveStringLoaded)
         {
            this.gameLoaded = true;
            this.canBeClicked = true;
         }
         if(this.onlineType && !SaveManager.saveStringLoaded)
         {
            this.canBeClicked = false;
            buttonMode = false;
            this.addText(this.upperText,this.textFormat,16777215,"Loading",18,142,8,11,"left",true);
         }
         else
         {
            if(this.gameSave == null)
            {
               trace("GameSave is null");
            }
            if(!this.onlineType && this.gameSave.data.gameStarted == undefined || this.onlineType && !SaveManager.checkIfSlotHasData(this.slot))
            {
               this.addText(this.upperText,this.textFormat,16777215,"New Game",18,142,8,11,"left",true);
            }
            else
            {
               this.addText(this.upperText,this.textFormat,16777215,"Slot " + this.slot,18,142,8,11,"left",true);
               if(!this.onlineType)
               {
                  if(this.gameSave.data.gameProgress != null && this.gameSave.data.gameDateTime != null)
                  {
                     this.addText(this.worldText,this.textFormat2,16777215,this.gameSave.data.gameProgress,12,142,8,54 - 8,"left",true);
                     this.addText(this.dateText,this.textFormat2,16777215,this.gameSave.data.gameDateTime,12,142,8,54 + 8,"left",true);
                     if(this.gameSave.data.extraMoneyGiven)
                     {
                        this.addCrown();
                        if(!Main.extraStuff)
                        {
                           this.canBeClicked = false;
                           buttonMode = false;
                           this.addText(this.requireText,this.textFormat3,16711680,"Premium  Required",14,142,10,22,"left",true);
                           this.requireText.rotation = 6;
                        }
                        else
                        {
                           buttonMode = true;
                        }
                     }
                     else
                     {
                        buttonMode = true;
                     }
                  }
               }
               else
               {
                  if(SaveManager.loadVarsFromSaveString(this.slot,false,true))
                  {
                     this.addCrown();
                     if(!Main.extraStuff)
                     {
                        this.canBeClicked = false;
                        buttonMode = false;
                        this.addText(this.requireText,this.textFormat3,16711680,"Premium  Required",14,142,10,22,"left",true);
                        this.requireText.rotation = 6;
                     }
                     else
                     {
                        buttonMode = true;
                     }
                  }
                  else
                  {
                     buttonMode = true;
                  }
                  dateAndWorldLevelText = SaveManager.loadVarsFromSaveString(this.slot,true);
                  this.addText(this.worldText,this.textFormat2,16777215,dateAndWorldLevelText[1],12,142,8,54 - 8,"left",true);
                  this.addText(this.dateText,this.textFormat2,16777215,dateAndWorldLevelText[0],12,142,8,54 + 8,"left",true);
               }
               if(addDeleteButton)
               {
                  addChild(this.bSaveDelete);
                  this.bSaveDelete.y = 13;
                  this.bSaveDelete.x = 150 - 12;
               }
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(this.page == 1)
         {
            this.cursorOver = false;
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.canBeClicked)
         {
            if(this.page == 1)
            {
               buttonMode = true;
               if(!this.cursorOver)
               {
                  SoundManager.sfxArray.push("InterfaceButtonOver1");
               }
            }
            else
            {
               buttonMode = false;
            }
         }
         if(this.page == 1)
         {
            this.cursorOver = true;
         }
      }
      
      public function startConvertMode() : void
      {
         if(this.page == 2)
         {
            this.endPage2();
            this.makePage1();
         }
         if(this.contains(this.bSaveDelete))
         {
            removeChild(this.bSaveDelete);
         }
         if(!this.onlineType)
         {
            this.canBeClicked = false;
            buttonMode = false;
            gotoAndStop(1);
            if(ScreenMenu.slotConverting == this.slot)
            {
               this.filters = this.glowArray;
            }
            else
            {
               this.alpha = 0.5;
            }
         }
         if(this.onlineType)
         {
            this.canBeClicked = true;
            buttonMode = true;
            removeChild(this.upperText);
            this.addText(this.upperText,this.textFormat3,39167,"Click to convert",16,142,8,11,"left",true);
         }
         if(stage.contains(this.requireText))
         {
            removeChild(this.requireText);
         }
      }
      
      private function makePage2(theText:String) : void
      {
         this.bSaveDelete.clicked = false;
         buttonMode = false;
         this.page = 2;
         this.clearAllChildren();
         this.addText(this.upperText,this.textFormat,16777215,theText,18,150,0,11,"center",true);
         addChild(this.bConfirm);
         this.bConfirm.x = 75 - 25;
         this.bConfirm.y = 62;
         addChild(this.bCancel);
         this.bCancel.x = 75 + 25;
         this.bCancel.y = 62;
      }
      
      private function clearAllChildren() : void
      {
         if(this.contains(this.worldText))
         {
            removeChild(this.worldText);
         }
         if(this.contains(this.dateText))
         {
            removeChild(this.dateText);
         }
         if(this.contains(this.bConfirm))
         {
            removeChild(this.bConfirm);
         }
         if(this.contains(this.bCancel))
         {
            removeChild(this.bCancel);
         }
         if(this.contains(this.bSaveDelete))
         {
            removeChild(this.bSaveDelete);
         }
         if(this.contains(this.requireText))
         {
            removeChild(this.requireText);
         }
         if(this.contains(this.crown))
         {
            removeChild(this.crown);
         }
      }
      
      public function update(event:Event) : void
      {
         if(!this.gameLoaded && SaveManager.saveStringLoaded)
         {
            this.clearAllChildren();
            this.makePage1();
         }
         if(this.canBeClicked)
         {
            this.setImage();
         }
         if(this.page == 1)
         {
            if(this.bSaveDelete.clicked)
            {
               this.makePage2("Delete slot?");
            }
         }
         else if(this.page == 2)
         {
            if(ScreenMenu.convertingSaves && this.bCancel.clicked)
            {
               this.endPage2();
               this.makePage1(false);
               this.canBeClicked = true;
               buttonMode = true;
               if(stage.contains(this.requireText))
               {
                  removeChild(this.requireText);
               }
               removeChild(this.upperText);
               this.addText(this.upperText,this.textFormat3,39167,"Click to convert",16,142,8,11,"left",true);
            }
            if(this.bConfirm.clicked)
            {
               if(!ScreenMenu.convertingSaves)
               {
                  if(!this.onlineType)
                  {
                     this.gameSave.clear();
                     this.sMenu.updateConvertButtons();
                  }
                  else
                  {
                     SaveManager.deleteFromSaveString(this.slot);
                  }
               }
               else
               {
                  SaveManager.convertSaveToSaveString(ScreenMenu.slotConverting,this.slot);
                  this.sMenu.endConvertSaves();
               }
            }
            if(!ScreenMenu.convertingSaves)
            {
               if(this.bConfirm.clicked || this.bCancel.clicked)
               {
                  this.endPage2();
                  this.makePage1();
               }
            }
         }
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:*, shadowText:Boolean = false) : void
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
         if(shadowText)
         {
            textName.filters = this.shadowArray;
         }
      }
      
      private function endPage2() : void
      {
         this.bConfirm.clicked = false;
         this.bCancel.clicked = false;
         if(this.contains(this.upperText))
         {
            removeChild(this.upperText);
         }
         if(this.contains(this.bConfirm))
         {
            removeChild(this.bConfirm);
         }
         if(this.contains(this.bCancel))
         {
            removeChild(this.bCancel);
         }
         buttonMode = true;
      }
      
      public function rePaint() : void
      {
         this.clearAllChildren();
         this.makePage1();
      }
   }
}

