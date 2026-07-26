package
{
   import FGL.GameTracker.GameTracker;
   import com.google.analytics.AnalyticsTracker;
   import com.google.analytics.GATracker;
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Regular;
   import flash.display.*;
   import flash.events.*;
   import flash.geom.ColorTransform;
   import flash.geom.Point;
   import flash.net.*;
   import flash.system.*;
   import flash.ui.ContextMenu;
   import flash.ui.ContextMenuItem;
   import flash.ui.Mouse;
   import flash.ui.MouseCursorData;
   
   public class Main extends MovieClip
   {
      
      private static var sLoad:*;
      
      public static var agi:*;
      
      private static var sSiteLocked:*;
      
      private static var sGame:*;
      
      private static var sLevelSelect:*;
      
      private static var sEnemies:*;
      
      private static var sAchievements:*;
      
      private static var sStatus:*;
      
      public static var debug:Debug;
      
      private static var sPremium:*;
      
      private static var sUpgrades:*;
      
      private static var sMenu:*;
      
      private static var sOptions:*;
      
      private static var sSplash:*;
      
      public static var googleTracker:AnalyticsTracker;
      
      public static var kongregate:*;
      
      public static var changeScreen:String = "SplashSponsorAnimation";
      
      public static var currentScreen:String = "None";
      
      public static var screenChanging:Boolean = false;
      
      public static var left:Boolean = false;
      
      public static var up:Boolean = false;
      
      public static var right:Boolean = false;
      
      public static var down:Boolean = false;
      
      public static var space:Boolean = false;
      
      public static var keyShift:Boolean = false;
      
      public static var keyEsc:Boolean = false;
      
      public static var keyP:Boolean = false;
      
      public static var keyR:Boolean = false;
      
      public static var keyQ:Boolean = false;
      
      public static var mouse:Boolean = false;
      
      public static var gameActive:Boolean = true;
      
      public static var uihButtonLevel:Boolean = false;
      
      public static var uihButtonPlayLevel:Boolean = false;
      
      public static var uihButtonNextLevel:Boolean = false;
      
      public static var uihButtonSquarePage:Boolean = false;
      
      public static var uihButtonUpgrades:Boolean = false;
      
      public static var hDifficultyChosen:Boolean = false;
      
      public static var extraStuff:Boolean = false;
      
      public static var extraMoneyGiven:Boolean = false;
      
      public static var connectedEvent:Boolean = false;
      
      public static var currentSaveIsOnline:Boolean = false;
      
      public static const sponsored:Boolean = true;
      
      public static const wtfcakeSplashAccepted:Boolean = true;
      
      public static var armorGamesOn:Boolean = false;
      
      public static var kongregateOn:Boolean = false;
      
      public static var viralVersion:Boolean = true;
      
      public static var siteLockVersion:Boolean = false;
      
      public static var absOn:Boolean = true;
      
      public static var onlineSavesShow:Boolean = true;
      
      public static const linkMoreGames:String = "http://armor.ag/MoreGames";
      
      public static const linkAddToYourSite:String = "http://flashgamedistribution.com/game/Circular-Tank/";
      
      public static const linkSponsor:String = "http://armor.ag/MoreGames";
      
      public static const linkWTFCake:String = "http://www.wtfcake.com";
      
      public static const linkPlayWithPremium:String = "http://armor.ag/MoreGames";
      
      public static const linkFacebookWTFCake:String = "https://www.facebook.com/WTFCake-490426637679726";
      
      public static const linkFacebookSponsor:String = "https://www.facebook.com/ArmorGames";
      
      public static const linkTwitterWTFCake:String = "https://twitter.com/wtfcakegames";
      
      public static const linkTwitterSponsor:String = "https://twitter.com/armorgames";
      
      public static const sponsorLogoForReplacingPremiumButton:Boolean = true;
      
      public static const selfRegulating:Boolean = true;
      
      public static var doScreenRefresh:Boolean = false;
      
      private var bytesAtStart:int = 0;
      
      private var statisticsManager:StatisticsManager;
      
      private var soundManager:SoundManager;
      
      private var fpsOn:Boolean = false;
      
      private var font2:Class;
      
      private var screenLayer:MovieClip;
      
      private var blackRemoveTween:Tween;
      
      private var font:Class;
      
      private var fpsCounter:FPS;
      
      private var invisibleBox:Sprite;
      
      public var gameTracker:GameTracker;
      
      private var blackAddTween:Tween;
      
      private var saveManager:SaveManager;
      
      private var valueHolder:Object;
      
      public function Main()
      {
         var go:*;
         var onKongregateSite:Boolean = false;
         var onArmorGamesSite:Boolean = false;
         var paramObj:Object = null;
         var apiPath:String = null;
         var request:URLRequest = null;
         var loader:Loader = null;
         var agiURL:String = null;
         var myMenu:ContextMenu = null;
         var myName:* = undefined;
         var sponsorName:* = undefined;
         var testerName:* = undefined;
         this.screenLayer = new MovieClip();
         this.valueHolder = new Object();
         this.blackAddTween = new Tween(this.valueHolder,"blackValue",Regular.easeOut,0,1,10,false);
         this.blackRemoveTween = new Tween(this.valueHolder,"blackValue",Regular.easeOut,1,0,10,false);
         this.invisibleBox = new Sprite();
         this.font = Main_font;
         this.font2 = Main_font2;
         this.fpsCounter = new FPS();
         this.gameTracker = new GameTracker();
         super();
         stop();
         this.removeAllChildren();
         Debug.stageRef = stage;
         debug = new Debug();
         if(selfRegulating)
         {
            onKongregateSite = this.checkIfOnFollowingSites(["kongregate.com"]);
            onArmorGamesSite = this.checkIfOnFollowingSites(["armorgames.com"]);
            if(onArmorGamesSite)
            {
               kongregateOn = false;
               armorGamesOn = true;
               viralVersion = false;
               siteLockVersion = false;
               onlineSavesShow = true;
               absOn = true;
            }
            else if(onKongregateSite)
            {
               kongregateOn = true;
               armorGamesOn = false;
               viralVersion = false;
               siteLockVersion = false;
               onlineSavesShow = false;
               absOn = false;
            }
            else
            {
               kongregateOn = false;
               armorGamesOn = false;
               viralVersion = true;
               siteLockVersion = false;
               onlineSavesShow = true;
               absOn = true;
            }
         }
         if(kongregateOn)
         {
            paramObj = LoaderInfo(root.loaderInfo).parameters;
            apiPath = paramObj.kongregate_api_path || "http://www.kongregate.com/flash/API_AS3_Local.swf";
            Security.allowDomain(apiPath);
            request = new URLRequest(apiPath);
            loader = new Loader();
            loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.loadComplete);
            loader.load(request);
            this.addChild(loader);
         }
         if(armorGamesOn)
         {
            agiURL = "http://agi.armorgames.com/assets/agi/AGI2.swf";
            Security.allowDomain("agi.armorgames.com");
            loader = new Loader();
            loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR,function(e:IOErrorEvent):void
            {
            });
            loader.contentLoaderInfo.addEventListener(Event.COMPLETE,function(e:Event):void
            {
               agi = e.currentTarget.content;
               agi.connect({
                  "stage":stage,
                  "apiKey":"AF1A932F-4AE1-47CF-A3CE-20FF3F650313",
                  "callback":function(data:Object):void
                  {
                     if(data.success)
                     {
                        if(ScreenAchievements != null)
                        {
                           ScreenAchievements.checkToGiveAchievementsToAPI();
                        }
                     }
                     else
                     {
                        trace(data.error);
                     }
                  }
               });
            });
            loader.load(new URLRequest(agiURL));
         }
         go = false;
         go = true;
         if(go)
         {
            this.saveManager = new SaveManager();
            addChild(this.saveManager);
            sLoad = new ScreenLoad();
            sLoad.totalBytes = loaderInfo.bytesTotal;
            sLoad.loadedBytes = loaderInfo.bytesLoaded;
            addChild(sLoad);
            googleTracker = new GATracker(this,"UA-48135903-2","AS3");
            myMenu = new ContextMenu();
            myName = new ContextMenuItem("Developed by WTFCake");
            myName.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT,this.contextMenuLink);
            sponsorName = new ContextMenuItem("Sponsored by Armor Games");
            sponsorName.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT,this.contextMenuLinkSponsor);
            testerName = new ContextMenuItem("Testing and Editing by Wesley Jue");
            myMenu.hideBuiltInItems();
            myMenu.builtInItems.quality = true;
            myMenu.customItems.push(myName);
            myMenu.customItems.push(sponsorName);
            myMenu.customItems.push(testerName);
            contextMenu = myMenu;
            loaderInfo.addEventListener(Event.COMPLETE,this.onComplete);
            loaderInfo.addEventListener(ProgressEvent.PROGRESS,this.onProgress);
            stage.addEventListener(MouseEvent.MOUSE_DOWN,this.MouseDown);
            stage.addEventListener(MouseEvent.MOUSE_UP,this.MouseUp);
         }
         else
         {
            sSiteLocked = new ScreenSiteLocked();
            addChild(sSiteLocked);
         }
      }
      
      public static function checkPremiumContent() : void
      {
         if(extraStuff)
         {
            ScreenLevelSelect.totalWorlds = 9;
         }
         else
         {
            ScreenLevelSelect.totalWorlds = 6;
         }
      }
      
      private static function setExtraStuffFromAPI() : void
      {
         if(armorGamesOn)
         {
            agHasItem("ct-tank_awesomizer","Tank Awesomizer");
         }
         else if(kongregateOn)
         {
            kongHasItem("tank_awesomizer");
         }
      }
      
      public static function premiumPurchase() : void
      {
         extraStuff = true;
         if(currentScreen == "Menu")
         {
            sMenu.premiumBought();
            changeScreen = "Premium";
            ScreenPremium.triggeredFromMenu = true;
         }
         if(currentScreen != "None" && currentScreen != "Menu" && !screenChanging)
         {
            checkPremiumContent();
            checkExtraMoney();
         }
         if(currentScreen == "Premium")
         {
            sPremium.premiumBought();
         }
      }
      
      public static function checkExtraMoney() : void
      {
         if(extraStuff && !extraMoneyGiven)
         {
            ScreenUpgrades.money += 10000;
            extraMoneyGiven = true;
         }
         SaveManager.savePremiumContent();
      }
      
      public static function agHasItem(skuName:String, itemName:String) : Boolean
      {
         var theResult:Boolean = false;
         agi.content.retrievePurchases({
            "sku":skuName,
            "callback":function(data:Object):void
            {
               var i:* = undefined;
               if(data.success)
               {
                  for(i = 0; i < data.purchases.length; i++)
                  {
                     if(data.purchases[i].name == itemName)
                     {
                        theResult = true;
                        extraStuff = true;
                        checkPremiumContent();
                        if(currentScreen != "None" && currentScreen != "Menu" || currentScreen == "Menu" && changeScreen != "Menu")
                        {
                           checkExtraMoney();
                        }
                        break;
                     }
                  }
               }
               else
               {
                  trace(data.error);
               }
            }
         });
         return theResult;
      }
      
      public static function kongHasItem(itemName:String) : Boolean
      {
         var onUserItems:Function = null;
         onUserItems = function(result:Object):void
         {
            var i:int = 0;
            var item:Object = null;
            if(result.success)
            {
               for(i = 0; i < result.data.length; i++)
               {
                  item = result.data[i];
                  if(item.identifier == itemName)
                  {
                     hasTheItem = true;
                     extraStuff = true;
                     checkPremiumContent();
                     if(currentScreen != "None" && currentScreen != "Menu" || currentScreen == "Menu" && changeScreen != "Menu")
                     {
                        checkExtraMoney();
                     }
                     doScreenRefresh = true;
                     break;
                  }
               }
            }
         };
         var hasTheItem:Boolean = false;
         kongregate.mtx.requestUserItemList(null,onUserItems);
         return hasTheItem;
      }
      
      private function MouseUp(event:MouseEvent) : void
      {
         mouse = false;
      }
      
      public function activateGame() : void
      {
         removeChild(sLoad);
         loaderInfo.removeEventListener(Event.COMPLETE,this.onComplete);
         loaderInfo.removeEventListener(ProgressEvent.PROGRESS,this.onProgress);
         gotoAndStop(2);
         addEventListener(Event.ENTER_FRAME,this.update);
         stage.addEventListener(KeyboardEvent.KEY_DOWN,this.KeysDown);
         stage.addEventListener(KeyboardEvent.KEY_UP,this.KeysUp);
         stage.addEventListener(Event.ACTIVATE,this.active);
         stage.addEventListener(Event.DEACTIVATE,this.deactive);
         this.blackAddTween.addEventListener(TweenEvent.MOTION_FINISH,this.onAddTweenFinish);
         this.blackRemoveTween.addEventListener(TweenEvent.MOTION_FINISH,this.onRemoveTweenFinish);
         addChild(this.screenLayer);
         var bitmapDatas:Vector.<BitmapData> = new Vector.<BitmapData>(1,true);
         var bitmapData:BitmapData = new CustomCursor(32,32);
         bitmapDatas[0] = bitmapData;
         var cursorData:MouseCursorData = new MouseCursorData();
         cursorData.hotSpot = new Point(10,10);
         cursorData.data = bitmapDatas;
         Mouse.registerCursor("MyCursor",cursorData);
         this.blackAddTween.stop();
         this.blackRemoveTween.stop();
         this.changeTheScreen();
         this.soundManager = new SoundManager();
         addChild(this.soundManager);
         this.statisticsManager = new StatisticsManager();
         addChild(this.statisticsManager);
         this.invisibleBox.graphics.beginFill(0);
         this.invisibleBox.graphics.drawRect(0,0,640,480);
         this.invisibleBox.graphics.endFill();
         this.invisibleBox.alpha = 0.5;
         if(this.fpsOn)
         {
            addChild(this.fpsCounter);
         }
      }
      
      private function active(event:Event) : void
      {
         gameActive = true;
      }
      
      private function onRemoveTweenFinish(event:TweenEvent) : void
      {
         screenChanging = false;
         this.uncolorClip(this);
      }
      
      private function removeAllChildren() : void
      {
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      private function checkIfOnFollowingSites(siteArray:Array) : Boolean
      {
         var allowed_site:* = undefined;
         var domain:String = null;
         var domain_idx:int = 0;
         var onSites:Boolean = false;
         for(var i:* = 0; i < siteArray.length; i++)
         {
            allowed_site = siteArray[i];
            domain = this.root.loaderInfo.url.split("/")[2];
            domain_idx = domain.indexOf(allowed_site);
            if(domain_idx != -1 && domain_idx == domain.length - allowed_site.length)
            {
               onSites = true;
               break;
            }
         }
         return onSites;
      }
      
      internal function onProgress(event:ProgressEvent) : void
      {
         sLoad.percent = Math.floor(event.bytesLoaded / event.bytesTotal * 100);
         sLoad.totalBytes = event.bytesTotal;
         sLoad.loadedBytes = event.bytesLoaded;
         sLoad.progressText.text = sLoad.percent + " %";
         sLoad.bytesText.text = Math.floor(event.bytesLoaded / 1000) + "/" + Math.floor(event.bytesTotal / 1000) + "Kb";
      }
      
      private function contextMenuLinkSponsor(event:ContextMenuEvent) : *
      {
         navigateToURL(new URLRequest(linkSponsor),"_blank");
      }
      
      internal function onComplete(event:Event) : void
      {
      }
      
      private function handleAGI() : *
      {
         if(!connectedEvent && Boolean(agi.isConnected()))
         {
            connectedEvent = true;
            if(ScreenAchievements != null)
            {
               ScreenAchievements.checkToGiveAchievementsToAPI();
            }
            if(!agi.user.isGuest())
            {
               setExtraStuffFromAPI();
               SaveManager.getServerSaveString();
               ScreenMenu.onlineStuffShouldBeAdded = true;
            }
            else
            {
               ScreenMenu.onlineStuffShouldBeAdded = false;
            }
         }
      }
      
      private function onAddTweenFinish(event:TweenEvent) : void
      {
         if(stage.contains(this.invisibleBox))
         {
            removeChild(this.invisibleBox);
         }
         this.changeTheScreen();
         this.soundManager.removeEventListener(Event.ENTER_FRAME,this.soundManager.update);
         this.soundManager.addEventListener(Event.ENTER_FRAME,this.soundManager.update);
         this.blackRemoveTween.start();
      }
      
      internal function loadComplete(event:Event) : void
      {
         kongregate = event.target.content;
         kongregate.services.connect();
         this.registerKongPremiumAccounts();
         kongregate.services.addEventListener("login",this.onKongregateInPageLogin);
      }
      
      private function getClass(name:String) : *
      {
         try
         {
            return ApplicationDomain.currentDomain.getDefinition(name);
         }
         catch(e:ReferenceError)
         {
            trace("Class",name,"not found. Returning null");
            return null;
         }
         catch(e:Error)
         {
            trace("Unknown error:",e.toString());
         }
         return null;
      }
      
      private function MouseDown(event:MouseEvent) : void
      {
         mouse = true;
      }
      
      private function update(event:Event) : void
      {
         if(armorGamesOn)
         {
            this.handleAGI();
         }
         if(currentScreen != changeScreen && !screenChanging)
         {
            if(currentScreen != "None")
            {
               screenChanging = true;
               this.blackAddTween.start();
               if(!stage.contains(this.invisibleBox))
               {
                  addChild(this.invisibleBox);
               }
            }
         }
         if(screenChanging)
         {
            this.colorClip(this,0,this.valueHolder.blackValue);
         }
         if(doScreenRefresh && extraStuff)
         {
            doScreenRefresh = false;
            if(currentScreen == "Menu" || currentScreen == "Premium")
            {
               this.screenRefresh();
            }
         }
      }
      
      private function deactive(event:Event) : void
      {
         gameActive = false;
      }
      
      public function screenRefresh() : *
      {
         if(!screenChanging)
         {
            screenChanging = true;
            this.blackAddTween.start();
            if(!stage.contains(this.invisibleBox))
            {
               addChild(this.invisibleBox);
            }
         }
      }
      
      private function contextMenuLink(event:ContextMenuEvent) : *
      {
         navigateToURL(new URLRequest(linkWTFCake),"_blank");
      }
      
      public function colorClip(mc:*, val:Number, trans:Number = 1) : *
      {
         var color:uint = val;
         var ctMul:Number = 1 - trans;
         var ctRedOff:Number = Math.round(trans * (color >> 16 & 0xFF));
         var ctGreenOff:Number = Math.round(trans * (color >> 8 & 0xFF));
         var ctBlueOff:Number = Math.round(trans * (color & 0xFF));
         var ct:* = new ColorTransform(ctMul,ctMul,ctMul,1,ctRedOff,ctGreenOff,ctBlueOff,0);
         mc.transform.colorTransform = ct;
      }
      
      private function registerKongPremiumAccounts() : *
      {
         if(!kongregate.services.isGuest())
         {
            this.kongregatePremium();
         }
      }
      
      public function uncolorClip(mc:*) : *
      {
         mc.transform.colorTransform = new ColorTransform();
      }
      
      private function KeysDown(event:KeyboardEvent) : void
      {
         if(event.keyCode == 37)
         {
            left = true;
         }
         if(event.keyCode == 65)
         {
            left = true;
         }
         if(event.keyCode == 38)
         {
            up = true;
         }
         if(event.keyCode == 87)
         {
            up = true;
         }
         if(event.keyCode == 39)
         {
            right = true;
         }
         if(event.keyCode == 68)
         {
            right = true;
         }
         if(event.keyCode == 40)
         {
            down = true;
         }
         if(event.keyCode == 83)
         {
            down = true;
         }
         if(event.keyCode == 32)
         {
            space = true;
         }
         if(event.keyCode == 16)
         {
            keyShift = true;
         }
         if(event.keyCode == 27)
         {
            keyEsc = true;
         }
         if(event.keyCode == 80)
         {
            keyP = true;
         }
         if(event.keyCode == 81)
         {
            keyQ = true;
         }
         if(event.keyCode == 82)
         {
            keyR = true;
         }
      }
      
      private function KeysUp(event:KeyboardEvent) : void
      {
         if(event.keyCode == 37)
         {
            left = false;
         }
         if(event.keyCode == 65)
         {
            left = false;
         }
         if(event.keyCode == 38)
         {
            up = false;
         }
         if(event.keyCode == 87)
         {
            up = false;
         }
         if(event.keyCode == 39)
         {
            right = false;
         }
         if(event.keyCode == 68)
         {
            right = false;
         }
         if(event.keyCode == 40)
         {
            down = false;
         }
         if(event.keyCode == 83)
         {
            down = false;
         }
         if(event.keyCode == 32)
         {
            space = false;
         }
         if(event.keyCode == 16)
         {
            keyShift = false;
         }
         if(event.keyCode == 27)
         {
            keyEsc = false;
         }
         if(event.keyCode == 80)
         {
            keyP = false;
         }
         if(event.keyCode == 81)
         {
            keyQ = false;
         }
         if(event.keyCode == 82)
         {
            keyR = false;
         }
      }
      
      private function changeTheScreen() : void
      {
         SoundManager.musicPaused = false;
         if(currentScreen == "Menu")
         {
            this.screenLayer.removeChild(sMenu);
            sMenu = null;
         }
         else if(currentScreen == "Game")
         {
            this.screenLayer.removeChild(sGame);
            sGame = null;
         }
         else if(currentScreen == "LevelSelect")
         {
            SaveManager.saveOptionDifficulty();
            this.screenLayer.removeChild(sLevelSelect);
            sLevelSelect = null;
         }
         else if(currentScreen == "Status")
         {
            this.screenLayer.removeChild(sStatus);
            sStatus = null;
         }
         else if(currentScreen == "Upgrades")
         {
            SaveManager.saveOptionAutoSelect();
            this.screenLayer.removeChild(sUpgrades);
            sUpgrades = null;
         }
         else if(currentScreen == "Achievements")
         {
            this.screenLayer.removeChild(sAchievements);
            sAchievements = null;
         }
         else if(currentScreen == "Enemies")
         {
            this.screenLayer.removeChild(sEnemies);
            sEnemies = null;
         }
         else if(currentScreen == "Premium")
         {
            this.screenLayer.removeChild(sPremium);
            sPremium = null;
         }
         else if(currentScreen == "Options")
         {
            SaveManager.saveOptions();
            this.screenLayer.removeChild(sOptions);
            sOptions = null;
         }
         else if(currentScreen == "Splash" || currentScreen == "SplashSponsor" || currentScreen == "SplashSponsorAnimation")
         {
            this.screenLayer.removeChild(sSplash);
            sSplash = null;
         }
         if(changeScreen == "Menu")
         {
            sMenu = new ScreenMenu();
            this.screenLayer.addChild(sMenu);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Game" || changeScreen == "Reset")
         {
            sGame = new ScreenGame();
            this.screenLayer.addChild(sGame);
         }
         else if(changeScreen == "LevelSelect")
         {
            sLevelSelect = new ScreenLevelSelect();
            this.screenLayer.addChild(sLevelSelect);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Status")
         {
            sStatus = new ScreenStatus();
            this.screenLayer.addChild(sStatus);
         }
         else if(changeScreen == "Upgrades")
         {
            sUpgrades = new ScreenUpgrades();
            this.screenLayer.addChild(sUpgrades);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Achievements")
         {
            sAchievements = new ScreenAchievements();
            this.screenLayer.addChild(sAchievements);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Enemies")
         {
            sEnemies = new ScreenEnemies();
            this.screenLayer.addChild(sEnemies);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Premium")
         {
            sPremium = new ScreenPremium();
            this.screenLayer.addChild(sPremium);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Options")
         {
            sOptions = new ScreenOptions();
            this.screenLayer.addChild(sOptions);
            SoundManager.changeMusic = "Menu";
         }
         else if(changeScreen == "Splash" || changeScreen == "SplashSponsor" || changeScreen == "SplashSponsorAnimation")
         {
            sSplash = new ScreenSplash();
            if(changeScreen == "Splash")
            {
               sSplash.type = "WTFCake";
            }
            else if(changeScreen == "SplashSponsor")
            {
               sSplash.type = "Sponsor";
            }
            if(changeScreen == "SplashSponsorAnimation")
            {
               sSplash.type = "SponsorAnimation";
            }
            this.screenLayer.addChild(sSplash);
         }
         if(changeScreen != "Reset")
         {
            currentScreen = changeScreen;
         }
         else
         {
            currentScreen = "Game";
            changeScreen = "Game";
         }
      }
      
      private function onKongregateInPageLogin(event:Event) : *
      {
         this.kongregatePremium();
      }
      
      private function kongregatePremium() : *
      {
         setExtraStuffFromAPI();
      }
   }
}

