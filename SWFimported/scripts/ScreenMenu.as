package
{
   import fl.transitions.Tween;
   import fl.transitions.easing.*;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.net.SharedObject;
   
   public class ScreenMenu extends Sprite
   {
      
      public static var onlineStuffAdded:Boolean = false;
      
      public static var onlineStuffShouldBeAdded:Boolean = false;
      
      public static var nothingAdded:Boolean = true;
      
      public static var convertingSaves:Boolean = false;
      
      public static var slotConverting:Number = 0;
      
      private var bSaveInfoOnline:ButtonSaveInfo = new ButtonSaveInfo();
      
      private var bgOnlineSavesLogin:BackgroundOnlineSavesLogin = new BackgroundOnlineSavesLogin();
      
      private var contentHolder:MovieClip = new MovieClip();
      
      private var crownOn:Boolean = false;
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var isAdded:Boolean = false;
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var bSaveInfoLocal:ButtonSaveInfo = new ButtonSaveInfo();
      
      private var bSocial1:ButtonSocial = new ButtonSocial();
      
      private var bSocial2:ButtonSocial = new ButtonSocial();
      
      private var bSocial3:ButtonSocial = new ButtonSocial();
      
      private var bSocial4:ButtonSocial = new ButtonSocial();
      
      public var bGetNow:ButtonGetNowMenu = new ButtonGetNowMenu();
      
      private var bMoreGames:ButtonMoreGames = new ButtonMoreGames();
      
      private var crownOut:Tween;
      
      private var crown:Crown = new Crown();
      
      private var myTempFilters:Array = filters;
      
      private var bGameSave1:ButtonGameSave = new ButtonGameSave();
      
      private var bGameSave2:ButtonGameSave = new ButtonGameSave();
      
      private var premiumExplanation:PremiumExplanation = new PremiumExplanation();
      
      private var crownIn:Tween = new Tween(this.crown,"alpha",Strong.easeIn,0,1,20,false);
      
      private var bgMenu:BackgroundMainMenu = new BackgroundMainMenu();
      
      private var bGameSave3:ButtonGameSave = new ButtonGameSave();
      
      private var bgBottom:BackgroundBottomMenu = new BackgroundBottomMenu();
      
      private var convertButtonsAdded:Boolean = false;
      
      private var logoWTFCake:LogoWTFCakeMenu = new LogoWTFCakeMenu();
      
      private var bToggleSound:ButtonToggleSound = new ButtonToggleSound();
      
      private var bConvertSave1:ButtonConvertSave = new ButtonConvertSave();
      
      private var bConvertSave2:ButtonConvertSave = new ButtonConvertSave();
      
      private var theTitle:Title = new Title();
      
      private var bConvertSave3:ButtonConvertSave = new ButtonConvertSave();
      
      private var bGameSaveOnline1:ButtonGameSave = new ButtonGameSave();
      
      private var bGameSaveOnline2:ButtonGameSave = new ButtonGameSave();
      
      private var bGameSaveOnline3:ButtonGameSave = new ButtonGameSave();
      
      private var contentTween:Tween = new Tween(this.contentHolder,"x",Strong.easeOut,320,0,20,false);
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,10,10,0.5,3);
      
      private var bAddToYourSite:ButtonAddToYourSite = new ButtonAddToYourSite();
      
      private var bToggleMusic:ButtonToggleMusic = new ButtonToggleMusic();
      
      private var bgSquareMenu:BackgroundSquareMenu = new BackgroundSquareMenu();
      
      private var bCredit:ButtonCredit = new ButtonCredit();
      
      private var logoSponsor:LogoSponsorMenu = new LogoSponsorMenu();
      
      public function ScreenMenu()
      {
         this.crownOut = new Tween(this.crown,"alpha",Strong.easeIn,1,0,20,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function addOnlineSaveStuff() : void
      {
         if(stage.contains(this.bgOnlineSavesLogin))
         {
            this.contentHolder.removeChild(this.bgOnlineSavesLogin);
         }
         if(!stage.contains(this.bGameSaveOnline1))
         {
            this.bGameSaveOnline1.sMenu = this;
            this.bGameSaveOnline1.slot = 1;
            this.bGameSaveOnline1.onlineType = true;
            this.contentHolder.addChild(this.bGameSaveOnline1);
            this.bGameSaveOnline1.x = 332;
            this.bGameSaveOnline1.y = 128;
         }
         if(!stage.contains(this.bGameSaveOnline2))
         {
            this.bGameSaveOnline2.sMenu = this;
            this.bGameSaveOnline2.slot = 2;
            this.bGameSaveOnline2.onlineType = true;
            this.contentHolder.addChild(this.bGameSaveOnline2);
            this.bGameSaveOnline2.x = 332;
            this.bGameSaveOnline2.y = 216;
         }
         if(!stage.contains(this.bGameSaveOnline3))
         {
            this.bGameSaveOnline3.sMenu = this;
            this.bGameSaveOnline3.slot = 3;
            this.bGameSaveOnline3.onlineType = true;
            this.contentHolder.addChild(this.bGameSaveOnline3);
            this.bGameSaveOnline3.x = 332;
            this.bGameSaveOnline3.y = 304;
         }
         if(SaveManager.saveStringLoaded && !this.convertButtonsAdded)
         {
            this.addConvertButtons();
         }
      }
      
      private function handleCrown() : void
      {
         if(Main.extraStuff && !this.crownOn)
         {
            this.addCrown();
            this.crownOut.stop();
            this.crownIn.start();
         }
         else if(!Main.extraStuff && this.crownOn)
         {
            this.removeCrown();
            this.crownIn.stop();
            this.crownOut.start();
         }
      }
      
      public function added(event:Event) : void
      {
         var createButton:Boolean = false;
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.crownIn.stop();
            this.crownOut.stop();
            convertingSaves = false;
            slotConverting = 0;
            if(Main.onlineSavesShow)
            {
               onlineStuffAdded = false;
               if(Main.armorGamesOn && !Main.agi.user.isGuest())
               {
                  onlineStuffShouldBeAdded = true;
               }
               else
               {
                  onlineStuffShouldBeAdded = false;
               }
               nothingAdded = true;
            }
            addChild(this.bgTitle);
            addChild(this.bgMenu);
            addChild(this.contentHolder);
            this.contentHolder.x = 320;
            this.contentTween.start();
            this.contentHolder.addChild(this.bgSquareMenu);
            this.bgSquareMenu.gotoAndStop(1);
            this.bgSquareMenu.x = 640 - this.bgSquareMenu.width - 4;
            this.bgSquareMenu.y = this.bgTitle.height;
            if(Main.kongregateOn)
            {
               if(Main.kongregate.services.isGuest())
               {
                  this.contentHolder.addChild(this.premiumExplanation);
                  this.premiumExplanation.x = this.bgSquareMenu.x - this.premiumExplanation.width - 4;
                  this.premiumExplanation.y = this.bgTitle.height;
               }
            }
            addChild(this.bgBottom);
            this.bgBottom.x = 0;
            this.bgBottom.y = 480 - this.bgBottom.height;
            addChild(this.logoWTFCake);
            this.logoWTFCake.x = this.logoWTFCake.width / 2;
            this.logoWTFCake.y = this.bgBottom.y + this.bgBottom.height / 2;
            if(Main.sponsored)
            {
               addChild(this.logoSponsor);
               this.logoSponsor.x = this.logoWTFCake.x + this.logoSponsor.width;
               this.logoSponsor.y = this.bgBottom.y + this.bgBottom.height / 2;
            }
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            this.bGameSave1.sMenu = this;
            this.bGameSave1.slot = 1;
            this.bGameSave1.onlineType = false;
            this.contentHolder.addChild(this.bGameSave1);
            this.bGameSave1.x = 486;
            this.bGameSave1.y = 128;
            this.bGameSave2.sMenu = this;
            this.bGameSave2.slot = 2;
            this.bGameSave2.onlineType = false;
            this.contentHolder.addChild(this.bGameSave2);
            this.bGameSave2.x = 486;
            this.bGameSave2.y = 216;
            this.bGameSave3.sMenu = this;
            this.bGameSave3.slot = 3;
            this.bGameSave3.onlineType = false;
            this.contentHolder.addChild(this.bGameSave3);
            this.bGameSave3.x = 486;
            this.bGameSave3.y = 304;
            addChild(this.bToggleSound);
            this.bToggleSound.x = 20;
            this.bToggleSound.y = 88 + 20;
            addChild(this.bToggleMusic);
            this.bToggleMusic.x = 58;
            this.bToggleMusic.y = 88 + 20;
            addChild(this.bMoreGames);
            if(!Main.armorGamesOn)
            {
               addChild(this.bAddToYourSite);
               this.bAddToYourSite.x = 564;
               this.bAddToYourSite.y = 454;
               this.bMoreGames.x = 564;
               this.bMoreGames.y = 418;
            }
            else
            {
               this.bMoreGames.x = 564;
               this.bMoreGames.y = 434;
            }
            if(!Main.siteLockVersion)
            {
               this.bCredit.pText = this.pInfoText;
               addChild(this.bCredit);
               this.bCredit.x = 20;
               this.bCredit.y = 480 - 88 - 20;
            }
            if(Main.armorGamesOn || Main.kongregateOn)
            {
               createButton = true;
               if(Main.armorGamesOn)
               {
                  createButton = !Main.agi.user.isGuest();
               }
               if(Main.kongregateOn)
               {
                  createButton = !Main.kongregate.services.isGuest();
               }
               if(createButton && !Main.extraStuff)
               {
                  addChild(this.bGetNow);
                  this.bGetNow.x = 292;
                  this.bGetNow.y = 436;
               }
            }
            this.bSocial2.type = "TwitterSponsor";
            this.bSocial1.type = "FacebookSponsor";
            this.bSocial4.type = "TwitterWTFCake";
            this.bSocial3.type = "FacebookWTFCake";
            addChild(this.bSocial1);
            this.bSocial1.x = 378;
            this.bSocial1.y = 418;
            addChild(this.bSocial2);
            this.bSocial2.x = 438;
            this.bSocial2.y = 418;
            addChild(this.bSocial3);
            this.bSocial3.x = 378;
            this.bSocial3.y = 454;
            addChild(this.bSocial4);
            this.bSocial4.x = 438;
            this.bSocial4.y = 454;
            if(Main.extraStuff && !this.crownOn)
            {
               this.addCrown();
               this.crownOn = true;
            }
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
         }
      }
      
      public function premiumBought() : void
      {
         if(stage.contains(this.bGetNow))
         {
            removeChild(this.bGetNow);
         }
         convertingSaves = false;
         slotConverting = 0;
         this.convertButtonsAdded = false;
         if(stage.contains(this.bConvertSave1))
         {
            this.contentHolder.removeChild(this.bConvertSave1);
         }
         if(stage.contains(this.bConvertSave2))
         {
            this.contentHolder.removeChild(this.bConvertSave2);
         }
         if(stage.contains(this.bConvertSave3))
         {
            this.contentHolder.removeChild(this.bConvertSave3);
         }
         this.updateSaveButtons();
      }
      
      public function startConvertSaves(slot:Number) : void
      {
         convertingSaves = true;
         slotConverting = slot;
         this.bGameSave1.startConvertMode();
         this.bGameSave2.startConvertMode();
         this.bGameSave3.startConvertMode();
         this.bGameSaveOnline1.startConvertMode();
         this.bGameSaveOnline2.startConvertMode();
         this.bGameSaveOnline3.startConvertMode();
         if(stage.contains(this.bConvertSave1))
         {
            if(slotConverting != 1)
            {
               this.contentHolder.removeChild(this.bConvertSave1);
            }
            else
            {
               this.bConvertSave1.convertingThisSlot = true;
            }
         }
         if(stage.contains(this.bConvertSave2))
         {
            if(slotConverting != 2)
            {
               this.contentHolder.removeChild(this.bConvertSave2);
            }
            else
            {
               this.bConvertSave2.convertingThisSlot = true;
            }
         }
         if(stage.contains(this.bConvertSave3))
         {
            if(slotConverting != 3)
            {
               this.contentHolder.removeChild(this.bConvertSave3);
            }
            else
            {
               this.bConvertSave3.convertingThisSlot = true;
            }
         }
      }
      
      private function removeCrown() : void
      {
         this.crownOn = false;
         if(stage.contains(this.crown))
         {
            removeChild(this.crown);
         }
      }
      
      public function endConvertSaves() : void
      {
         this.bConvertSave1.convertingThisSlot = false;
         this.bConvertSave2.convertingThisSlot = false;
         this.bConvertSave3.convertingThisSlot = false;
         convertingSaves = false;
         slotConverting = 0;
         this.bGameSave1.endConvertMode();
         this.bGameSave2.endConvertMode();
         this.bGameSave3.endConvertMode();
         this.bGameSaveOnline1.endConvertMode();
         this.bGameSaveOnline2.endConvertMode();
         this.bGameSaveOnline3.endConvertMode();
         this.addConvertButtons();
      }
      
      private function addCrown() : void
      {
         this.crownOn = true;
         if(!stage.contains(this.crown))
         {
            addChild(this.crown);
            this.crown.rotation = -5;
            this.crown.x = 39;
            this.crown.y = 261;
            this.crown.scaleX = 0.3;
            this.crown.scaleY = 0.3;
         }
      }
      
      private function updateSaveButtons() : void
      {
         if(stage.contains(this.bGameSave1))
         {
            this.bGameSave1.rePaint();
            this.bGameSave2.rePaint();
            this.bGameSave3.rePaint();
         }
         if(stage.contains(this.bGameSaveOnline1))
         {
            this.bGameSaveOnline1.rePaint();
            this.bGameSaveOnline2.rePaint();
            this.bGameSaveOnline3.rePaint();
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
         this.handleCrown();
         if(Main.onlineSavesShow && (Boolean(Main.armorGamesOn && Main.agi.isConnected()) || Boolean(Main.viralVersion)))
         {
            if(this.bgSquareMenu.currentFrame != 2)
            {
               this.bgSquareMenu.gotoAndStop(2);
               this.bgSquareMenu.x = 640 - this.bgSquareMenu.width - 4;
               this.bgSquareMenu.y = this.bgTitle.height;
               this.bSaveInfoLocal.pText = this.pInfoText;
               this.bSaveInfoLocal.type = "Local";
               this.contentHolder.addChild(this.bSaveInfoLocal);
               this.bSaveInfoLocal.x = 611;
               this.bSaveInfoLocal.y = 106;
               this.bSaveInfoOnline.pText = this.pInfoText;
               this.bSaveInfoOnline.type = "Online";
               this.contentHolder.addChild(this.bSaveInfoOnline);
               this.bSaveInfoOnline.x = 620 - 154;
               this.bSaveInfoOnline.y = 106;
            }
         }
         if(Main.onlineSavesShow && (Boolean(Main.armorGamesOn && Main.agi.isConnected()) || Boolean(Main.viralVersion)))
         {
            if(onlineStuffShouldBeAdded && (!onlineStuffAdded || nothingAdded))
            {
               this.addOnlineSaveStuff();
               onlineStuffAdded = true;
               nothingAdded = false;
            }
            else if(!onlineStuffShouldBeAdded && (onlineStuffAdded || nothingAdded))
            {
               this.addOnlineExplanationStuff();
               onlineStuffAdded = false;
               nothingAdded = false;
            }
         }
         if(Main.onlineSavesShow && (Boolean(Main.armorGamesOn && Main.agi.isConnected()) || Boolean(Main.viralVersion)))
         {
            if(SaveManager.saveStringLoaded && !this.convertButtonsAdded)
            {
               this.addConvertButtons();
            }
         }
      }
      
      public function addOnlineExplanationStuff() : void
      {
         if(stage.contains(this.bGameSaveOnline1))
         {
            this.contentHolder.removeChild(this.bGameSaveOnline1);
         }
         if(stage.contains(this.bGameSaveOnline2))
         {
            this.contentHolder.removeChild(this.bGameSaveOnline2);
         }
         if(stage.contains(this.bGameSaveOnline3))
         {
            this.contentHolder.removeChild(this.bGameSaveOnline3);
         }
         if(stage.contains(this.bConvertSave1))
         {
            this.contentHolder.removeChild(this.bConvertSave1);
         }
         if(stage.contains(this.bConvertSave2))
         {
            this.contentHolder.removeChild(this.bConvertSave2);
         }
         if(stage.contains(this.bConvertSave3))
         {
            this.contentHolder.removeChild(this.bConvertSave3);
         }
         if(!stage.contains(this.bgOnlineSavesLogin))
         {
            this.contentHolder.addChild(this.bgOnlineSavesLogin);
            this.bgOnlineSavesLogin.x = 332;
            this.bgOnlineSavesLogin.y = 128;
            if(Main.armorGamesOn)
            {
               this.bgOnlineSavesLogin.gotoAndStop(1);
            }
            else if(Main.viralVersion)
            {
               this.bgOnlineSavesLogin.gotoAndStop(2);
            }
         }
      }
      
      public function updateConvertButtons() : void
      {
         if(stage.contains(this.bConvertSave1) && SharedObject.getLocal("CircularTankSave1").data.gameStarted == undefined)
         {
            this.contentHolder.removeChild(this.bConvertSave1);
         }
         if(stage.contains(this.bConvertSave2) && SharedObject.getLocal("CircularTankSave2").data.gameStarted == undefined)
         {
            this.contentHolder.removeChild(this.bConvertSave2);
         }
         if(stage.contains(this.bConvertSave3) && SharedObject.getLocal("CircularTankSave3").data.gameStarted == undefined)
         {
            this.contentHolder.removeChild(this.bConvertSave3);
         }
      }
      
      private function addConvertButtons() : void
      {
         this.convertButtonsAdded = true;
         if(!stage.contains(this.bConvertSave1) && SharedObject.getLocal("CircularTankSave1").data.gameStarted != undefined)
         {
            this.bConvertSave1.pText = this.pInfoText;
            this.bConvertSave1.sMenu = this;
            this.bConvertSave1.slot = 1;
            this.contentHolder.addChild(this.bConvertSave1);
            this.bConvertSave1.x = this.bGameSave1.x - 2;
            this.bConvertSave1.y = this.bGameSave1.y + this.bGameSave1.height / 2;
         }
         if(!stage.contains(this.bConvertSave2) && SharedObject.getLocal("CircularTankSave2").data.gameStarted != undefined)
         {
            this.bConvertSave2.pText = this.pInfoText;
            this.bConvertSave2.sMenu = this;
            this.bConvertSave2.slot = 2;
            this.contentHolder.addChild(this.bConvertSave2);
            this.bConvertSave2.x = this.bGameSave2.x - 2;
            this.bConvertSave2.y = this.bGameSave2.y + this.bGameSave1.height / 2;
         }
         if(!stage.contains(this.bConvertSave3) && SharedObject.getLocal("CircularTankSave3").data.gameStarted != undefined)
         {
            this.bConvertSave3.pText = this.pInfoText;
            this.bConvertSave3.sMenu = this;
            this.bConvertSave3.slot = 3;
            this.contentHolder.addChild(this.bConvertSave3);
            this.bConvertSave3.x = this.bGameSave3.x - 2;
            this.bConvertSave3.y = this.bGameSave3.y + this.bGameSave1.height / 2;
         }
      }
   }
}

