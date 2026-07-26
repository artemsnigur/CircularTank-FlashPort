package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.*;
   import flash.display.MovieClip;
   import flash.display.Shape;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   import flash.ui.Mouse;
   import flash.ui.MouseCursor;
   
   public class PartInterface extends MovieClip
   {
      
      public static var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      public static var textFormat2:TextFormat = new TextFormat("Arial",8,16777215,true,false,false);
      
      public static var textFormat3:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      public static var textFormatBig:TextFormat = new TextFormat("JG",64,16777215,true,false,false);
      
      private static var hpText:TextField = new TextField();
      
      private static var moneyText:TextField = new TextField();
      
      private static var objectiveText:TextField = new TextField();
      
      private static var countDownText:TextField = new TextField();
      
      private static var pauseText:TextField = new TextField();
      
      private static var modeCountText:TextField = new TextField();
      
      private static var objectiveCountText:TextField = new TextField();
      
      private static var primaryText:TextField = new TextField();
      
      private static var specialText:TextField = new TextField();
      
      private static var hintShiftText:TextField = new TextField();
      
      private static var hintPrimaryText:TextField = new TextField();
      
      private static var hintSecondaryText:TextField = new TextField();
      
      private var bPauseResume:ButtonPauseResume = new ButtonPauseResume();
      
      private var isAdded:Boolean = false;
      
      private var pauseTweensArray:Array = new Array();
      
      private var bgText:* = new BackgroundText();
      
      private var blackPauseBox:Sprite = new Sprite();
      
      private var shadowArray:Array = filters;
      
      private var reloadIndicatorTweenOut2:Tween;
      
      private var bPauseQuitLevel:ButtonPauseQuitLevel = new ButtonPauseQuitLevel();
      
      private var minimapMask:Sprite = new Sprite();
      
      private var valueTweenOut2:Tween = new Tween(this.bgText,"y",Strong.easeInOut,68,-100,30,false);
      
      private var valueTweenIn:Tween = new Tween(this.bgText,"alpha",Strong.easeIn,0,1,15,false);
      
      private var valueTweenOut4:Tween = new Tween(countDownText,"y",Strong.easeInOut,60,-108,30,false);
      
      private var valueTweenOut5:Tween = new Tween(modeCountText,"alpha",Strong.easeInOut,1,0,20,false);
      
      private var valueTweenOut6:Tween = new Tween(modeCountText,"y",Strong.easeInOut,90,-78,30,false);
      
      private var valueTweenOut7:Tween = new Tween(objectiveCountText,"alpha",Strong.easeInOut,1,0,20,false);
      
      private var valueTweenOut8:Tween = new Tween(objectiveCountText,"y",Strong.easeInOut,90,-78,30,false);
      
      private var bg:InterfaceBG = new InterfaceBG();
      
      private var valueTweenOut3:Tween = new Tween(countDownText,"alpha",Strong.easeInOut,1,0,20,false);
      
      private var bPauseResetLevel:ButtonPauseResetLevel = new ButtonPauseResetLevel();
      
      public var countDown:Number = 60;
      
      private var bToggleSound:ButtonToggleSound = new ButtonToggleSound();
      
      private var enemiesNeedingIndicators:Array = new Array();
      
      private var bOptionCheckBoxAutoPause:ButtonOptionCheckBox = new ButtonOptionCheckBox();
      
      private var bToggleMusic:ButtonToggleMusic = new ButtonToggleMusic();
      
      private var valueTweenOut:Tween = new Tween(this.bgText,"alpha",Strong.easeInOut,1,0,20,false);
      
      private var markerEnemy:MarkerEnemy = new MarkerEnemy();
      
      private var checkBoxText:TextField = new TextField();
      
      private var selectedEnemyModel:Array = [];
      
      private var weaponInterface:* = new WeaponInterface();
      
      private var allTweensArray:Array = new Array();
      
      private var markerEnemyLayer:MovieClip = new MovieClip();
      
      private var enemiesHavingIndicators:Array = new Array();
      
      private var bgWeapon2:* = new BackgroundInterfaceWeapon();
      
      private var weaponInterfaceSpecial:* = new WeaponInterface();
      
      private var valueHolder:Object = new Object();
      
      private var markerEnemyArray:Array = new Array();
      
      private var markerFlagInTween:Tween = new Tween(this.valueHolder,"markerFlagScale",Regular.easeOut,1.2,0.9,15,false);
      
      private var markerFlagOutTween:Tween = new Tween(this.valueHolder,"markerFlagScale",Regular.easeIn,0.9,1.2,15,false);
      
      private var minimap:Sprite = new Sprite();
      
      private var lifeIndicatorArray:Array = new Array();
      
      private var weaponInterfaceUnused:* = new WeaponInterface();
      
      private var reloadBar1:Sprite = new Sprite();
      
      private var reloadBar2:Sprite = new Sprite();
      
      private var weaponReloadIndicator:* = new WeaponReloadIndicator();
      
      private var bgWeapon:* = new BackgroundInterfaceWeapon();
      
      private var selectedFlagModel:Array = [];
      
      private var markerFlag:MarkerFlag = new MarkerFlag();
      
      private var reloadIndicatorBoolean:Boolean = false;
      
      private var valueTweenIn2:Tween = new Tween(this.bgText,"y",Elastic.easeOut,-100,68,60,false);
      
      private var valueTweenIn3:Tween = new Tween(countDownText,"alpha",Strong.easeIn,0,1,15,false);
      
      private var valueTweenIn4:Tween = new Tween(countDownText,"y",Elastic.easeOut,-108,60,60,false);
      
      private var valueTweenIn5:Tween = new Tween(modeCountText,"alpha",Strong.easeIn,0,1,15,false);
      
      private var valueTweenIn6:Tween = new Tween(modeCountText,"y",Elastic.easeOut,-78,90,60,false);
      
      private var valueTweenIn8:Tween = new Tween(objectiveCountText,"y",Elastic.easeOut,-78,90,60,false);
      
      private var valueTweenIn7:Tween = new Tween(objectiveCountText,"alpha",Strong.easeIn,0,1,15,false);
      
      private var reloadIndicatorTweenOut3:Tween = new Tween(this.weaponReloadIndicator,"scaleY",Strong.easeOut,1.25,1.25,100,false);
      
      private var defenseEnemyBottomIndicator:DefenseEnemyBottomIndicator = new DefenseEnemyBottomIndicator();
      
      private var reloadIndicatorTweenIn1:Tween = new Tween(this.weaponReloadIndicator,"alpha",Strong.easeOut,0,1,5,false);
      
      private var reloadIndicatorTweenIn2:Tween = new Tween(this.weaponReloadIndicator,"scaleX",Strong.easeOut,5,1.25,5,false);
      
      private var sponsorLogo:SponsorLogoSmallRectangle = new SponsorLogoSmallRectangle();
      
      private var logoSponsor:LogoSponsorMenu = new LogoSponsorMenu();
      
      private var reloadIndicatorTweenOut1:Tween = new Tween(this.weaponReloadIndicator,"alpha",Strong.easeOut,1,0,100,false);
      
      private var reloadIndicatorTweenIn3:Tween = new Tween(this.weaponReloadIndicator,"scaleY",Strong.easeOut,5,1.25,5,false);
      
      public var refPauseLayer:MovieClip;
      
      private var selectedLevelDataModel:Array = [];
      
      private var bgWeaponUnused:* = new BackgroundInterfaceWeaponUnused();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      public var defenseIndicatorTween:Tween = new Tween(this.defenseEnemyBottomIndicator,"alpha",Regular.easeOut,1,0,15,false);
      
      public function PartInterface()
      {
         this.reloadIndicatorTweenOut2 = new Tween(this.weaponReloadIndicator,"scaleX",Strong.easeOut,1.25,1.25,100,false);
         super();
         textFormat2.letterSpacing = 1.5;
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.markerFlagInTween.addEventListener(TweenEvent.MOTION_FINISH,this.flagInTweenFinish);
         this.markerFlagOutTween.addEventListener(TweenEvent.MOTION_FINISH,this.flagOutTweenFinish);
         this.shadowArray.push(this.myShadow);
         this.valueTweenOut.stop();
         this.valueTweenOut2.stop();
         this.valueTweenOut3.stop();
         this.valueTweenOut4.stop();
         this.valueTweenOut5.stop();
         this.valueTweenOut6.stop();
         this.valueTweenOut7.stop();
         this.valueTweenOut8.stop();
         this.markerFlagInTween.stop();
         this.markerFlagOutTween.stop();
         this.defenseIndicatorTween.stop();
         this.reloadIndicatorTweenIn1.addEventListener(TweenEvent.MOTION_FINISH,this.reloadIndicatorTweenFinish);
         this.reloadIndicatorTweenIn1.stop();
         this.reloadIndicatorTweenIn2.stop();
         this.reloadIndicatorTweenIn3.stop();
         this.reloadIndicatorTweenOut1.stop();
         this.reloadIndicatorTweenOut2.stop();
         this.reloadIndicatorTweenOut3.stop();
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.allTweensArray = [this.valueTweenIn,this.valueTweenIn2,this.valueTweenIn3,this.valueTweenIn4,this.valueTweenIn5,this.valueTweenIn6,this.valueTweenIn7,this.valueTweenIn8,this.valueTweenOut,this.valueTweenOut2,this.valueTweenOut3,this.valueTweenOut4,this.valueTweenOut5,this.valueTweenOut6,this.valueTweenOut7,this.valueTweenOut8,this.markerFlagInTween,this.markerFlagOutTween,this.defenseIndicatorTween,this.reloadIndicatorTweenIn1,this.reloadIndicatorTweenIn2,this.reloadIndicatorTweenIn3,this.reloadIndicatorTweenOut1,this.reloadIndicatorTweenOut2,this.reloadIndicatorTweenOut3,MovieClip(parent).pGameArea.flagInTweenAlpha,MovieClip(parent).pGameArea.flagInTweenX,MovieClip(parent).pGameArea.flagInTweenY,MovieClip(parent).pGameArea.flagOutTweenX,MovieClip(parent).pGameArea.flagOutTweenY];
            this.pauseTweensArray = [];
            this.selectedEnemyModel = ScreenGame.worldModels[ScreenGame.world * 3 - 3];
            this.selectedLevelDataModel = ScreenGame.worldModels[ScreenGame.world * 3 - 2];
            this.selectedFlagModel = ScreenGame.worldModels[ScreenGame.world * 3 - 1];
            addChild(this.sponsorLogo);
            this.sponsorLogo.alpha = 0.5;
            this.sponsorLogo.x = this.sponsorLogo.width / 2 + 10;
            this.sponsorLogo.y = 400 - this.sponsorLogo.height / 2 - 4;
            addChild(this.bg);
            this.bg.y = 400;
            addChild(this.bgWeapon);
            this.bgWeapon.x = 388;
            this.bgWeapon.y = 400;
            addChild(this.bgWeapon2);
            this.bgWeapon2.x = 474;
            this.bgWeapon2.y = 400;
            addChild(this.weaponInterface);
            this.weaponInterface.x = this.bgWeapon.x + 37;
            this.weaponInterface.y = this.bgWeapon.y + 48;
            if(ScreenGame.equippedWeapons[0] != "None" && ScreenGame.equippedWeapons[1] != "None")
            {
               addChild(this.bgWeaponUnused);
               this.bgWeaponUnused.x = 348;
               this.bgWeaponUnused.y = 429;
               addChild(this.weaponInterfaceUnused);
               this.weaponInterfaceUnused.unused = true;
               this.weaponInterfaceUnused.x = this.bgWeapon.x - 20;
               this.weaponInterfaceUnused.y = this.bgWeapon.y + 56;
            }
            addChild(this.weaponInterfaceSpecial);
            this.weaponInterfaceSpecial.special = true;
            this.weaponInterfaceSpecial.x = this.bgWeapon2.x + 37;
            this.weaponInterfaceSpecial.y = this.bgWeapon2.y + 48;
            addChild(this.weaponReloadIndicator);
            this.weaponReloadIndicator.x = this.weaponInterfaceSpecial.x;
            this.weaponReloadIndicator.y = this.weaponInterfaceSpecial.y;
            this.weaponReloadIndicator.alpha = 0;
            addChild(this.reloadBar1);
            this.reloadBar1.alpha = 0.5;
            this.reloadBar1.x = this.bgWeapon.x + 74;
            this.reloadBar1.y = this.bgWeapon.y;
            addChild(this.reloadBar2);
            this.reloadBar2.alpha = 0.5;
            this.reloadBar2.x = this.bgWeapon2.x + 74;
            this.reloadBar2.y = this.bgWeapon2.y;
            this.addText(hpText,textFormat,16711680,"Health: " + ScreenGame.hp,18,160,8,410,false,true);
            this.addText(moneyText,textFormat,65280,"Money: " + ScreenGame.money,18,160,8,429,false,true);
            this.addText(objectiveText,textFormat,16777215,"Objective",18,200,8,448,false,true);
            this.addText(primaryText,textFormat,16777215,"Primary",18,74,this.bgWeapon.x,this.bgWeapon.y,true,true);
            this.addText(specialText,textFormat,16777215,"Special",18,74,this.bgWeapon2.x,this.bgWeapon2.y,true,true);
            this.setObjectiveText();
            if(ScreenGame.equippedWeapons[0] != "None" && ScreenGame.equippedWeapons[1] != "None")
            {
               this.addText(hintShiftText,textFormat2,16777215,"SHIFT",16,80,this.weaponInterfaceUnused.x - 40,468,true,true);
            }
            this.addText(hintPrimaryText,textFormat2,16777215,"CLICK",16,80,this.weaponInterface.x - 40,468,true,true);
            this.addText(hintSecondaryText,textFormat2,16777215,"SPACE",16,80,this.weaponInterfaceSpecial.x - 40,468,true,true);
            addChild(this.defenseEnemyBottomIndicator);
            this.defenseEnemyBottomIndicator.y = 400 - 32;
            this.defenseEnemyBottomIndicator.alpha = 0;
            addChild(this.markerEnemyLayer);
            addChild(this.minimapMask);
            addChild(this.minimap);
            this.minimap.mask = this.minimapMask;
            this.drawMinimap();
            if(ScreenGame.level == 1 && ScreenGame.world == 1 && PartTutorial.tutorialOn && !PartTutorial.tutorialCompleted && PartTutorial.tutorialArrayDone.length == 0)
            {
               PartGameArea.countDownDone = true;
               this.countDown = 0;
               this.valueTweenIn.stop();
               this.valueTweenIn2.stop();
               this.valueTweenIn3.stop();
               this.valueTweenIn4.stop();
               this.valueTweenIn5.stop();
               this.valueTweenIn6.stop();
               this.valueTweenIn7.stop();
               this.valueTweenIn8.stop();
            }
            else
            {
               addChild(this.bgText);
               this.bgText.y = 68;
               this.addText(countDownText,textFormatBig,16777215,"",64,200,220,this.bgText.y - 8,true,true);
               this.addText(modeCountText,textFormat,16777215,ScreenLevelSelect.levelMode + " Mode",16,200,60,this.bgText.y + 22,true,true);
               this.addText(objectiveCountText,textFormat,16711680,"",16,200,380,this.bgText.y + 22,true,true);
               this.setObjectiveCountText();
               this.countDownFunction();
            }
         }
      }
      
      private function markTheFlag() : void
      {
         var cameraX:* = undefined;
         var cameraY:* = undefined;
         var cameraW:* = undefined;
         var cameraH:* = undefined;
         var markerLength:* = undefined;
         var gameArea:* = MovieClip(parent).pGameArea;
         if(stage.contains(gameArea.flag))
         {
            cameraX = Math.abs(PartGameArea.cameraPosX);
            cameraY = Math.abs(PartGameArea.cameraPosY);
            cameraW = PartGameArea.cameraWidth;
            cameraH = PartGameArea.cameraHeight;
            markerLength = 1;
            this.markerFlag.scaleX = this.valueHolder.markerFlagScale;
            this.markerFlag.scaleY = this.valueHolder.markerFlagScale;
            if(gameArea.flag.x > 0 + cameraX && gameArea.flag.x < cameraW + cameraX && gameArea.flag.y > 0 + cameraY && gameArea.flag.y < cameraH + cameraY)
            {
               if(stage.contains(this.markerFlag))
               {
                  removeChild(this.markerFlag);
               }
            }
            else
            {
               if(!stage.contains(this.markerFlag))
               {
                  addChild(this.markerFlag);
               }
               if(gameArea.flag.x > 0 + cameraX && gameArea.flag.x < cameraW + cameraX)
               {
                  this.markerFlag.x = gameArea.flag.x - cameraX;
                  if(gameArea.flag.y > cameraY + cameraH / 2)
                  {
                     this.markerFlag.gotoAndStop(6);
                     this.markerFlag.y = cameraH - markerLength;
                  }
                  else
                  {
                     this.markerFlag.gotoAndStop(2);
                     this.markerFlag.y = 0 + markerLength;
                  }
                  if(this.markerFlag.x < 0 + markerLength)
                  {
                     this.markerFlag.x = markerLength;
                  }
                  else if(this.markerFlag.x > cameraW - markerLength)
                  {
                     this.markerFlag.x = cameraW - markerLength;
                  }
               }
               else if(gameArea.flag.y > 0 + cameraY && gameArea.flag.y < cameraH + cameraY)
               {
                  this.markerFlag.y = gameArea.flag.y - cameraY;
                  if(gameArea.flag.x > cameraX + cameraW / 2)
                  {
                     this.markerFlag.gotoAndStop(4);
                     this.markerFlag.x = cameraW - markerLength;
                  }
                  else
                  {
                     this.markerFlag.gotoAndStop(8);
                     this.markerFlag.x = 0 + markerLength;
                  }
                  if(this.markerFlag.y < 0 + markerLength)
                  {
                     this.markerFlag.y = markerLength;
                  }
                  else if(this.markerFlag.y > cameraH - markerLength)
                  {
                     this.markerFlag.y = cameraH - markerLength;
                  }
               }
               else if(gameArea.flag.x < cameraX + cameraW / 2)
               {
                  if(gameArea.flag.y < cameraY + cameraH / 2)
                  {
                     this.markerFlag.gotoAndStop(1);
                     this.markerFlag.x = markerLength;
                     this.markerFlag.y = markerLength;
                  }
                  else
                  {
                     this.markerFlag.gotoAndStop(7);
                     this.markerFlag.x = markerLength;
                     this.markerFlag.y = cameraH - markerLength;
                  }
               }
               else if(gameArea.flag.x > cameraX + cameraW / 2)
               {
                  if(gameArea.flag.y < cameraY + cameraH / 2)
                  {
                     this.markerFlag.gotoAndStop(3);
                     this.markerFlag.x = cameraW - markerLength;
                     this.markerFlag.y = markerLength;
                  }
                  else
                  {
                     this.markerFlag.gotoAndStop(5);
                     this.markerFlag.x = cameraW - markerLength;
                     this.markerFlag.y = cameraH - markerLength;
                  }
               }
            }
         }
         else if(stage.contains(this.markerFlag))
         {
            removeChild(this.markerFlag);
         }
      }
      
      public function pauseGame() : void
      {
         Mouse.cursor = MouseCursor.AUTO;
         this.refPauseLayer.addChild(this.blackPauseBox);
         this.blackPauseBox.mouseEnabled = false;
         this.blackPauseBox.graphics.beginFill(0,0.75);
         this.blackPauseBox.graphics.drawRect(0,0,640,480);
         this.blackPauseBox.graphics.endFill();
         this.addText(pauseText,textFormatBig,16777215,"Game Paused",64,640,0,60,true,true,this.refPauseLayer);
         this.bPauseResume.refInterface = this;
         this.bPauseResume.filters = this.shadowArray;
         this.bPauseResume.type = "Resume";
         this.refPauseLayer.addChild(this.bPauseResume);
         this.bPauseResume.x = 320 - this.bPauseResume.width / 2;
         this.bPauseResume.y = 156;
         this.bPauseResetLevel.filters = this.shadowArray;
         this.bPauseResetLevel.type = "Reset";
         this.refPauseLayer.addChild(this.bPauseResetLevel);
         this.bPauseResetLevel.x = this.bPauseResume.x;
         this.bPauseResetLevel.y = 184;
         this.bPauseQuitLevel.filters = this.shadowArray;
         this.bPauseQuitLevel.type = "Quit";
         this.refPauseLayer.addChild(this.bPauseQuitLevel);
         this.bPauseQuitLevel.x = this.bPauseResume.x;
         this.bPauseQuitLevel.y = 212;
         this.refPauseLayer.addChild(this.bToggleSound);
         this.bToggleSound.x = 320 - 19;
         this.bToggleSound.y = 304;
         this.refPauseLayer.addChild(this.bToggleMusic);
         this.bToggleMusic.x = 320 + 19;
         this.bToggleMusic.y = 304;
         this.bOptionCheckBoxAutoPause.marked = ScreenOptions.optionAutoPauseOn;
         this.refPauseLayer.addChild(this.bOptionCheckBoxAutoPause);
         this.bOptionCheckBoxAutoPause.x = 266;
         this.bOptionCheckBoxAutoPause.y = 254;
         this.addText(this.checkBoxText,textFormat3,16777215,"Auto pause",20,284,290,254,false,true,this.refPauseLayer);
         if(Main.sponsored)
         {
            this.refPauseLayer.addChild(this.logoSponsor);
            this.logoSponsor.x = 320;
            this.logoSponsor.y = 404;
         }
         for(var i:* = 0; i < this.allTweensArray.length; i++)
         {
            if(this.allTweensArray[i].isPlaying)
            {
               this.allTweensArray[i].stop();
               this.pauseTweensArray.push(this.allTweensArray[i]);
            }
         }
      }
      
      private function handleEnemyMarkers() : void
      {
         var b:* = undefined;
         var markerEnemy:* = undefined;
         var b2:* = undefined;
         var theEnemy:* = undefined;
         var theMarker:* = undefined;
         var dangerMarker:Boolean = false;
         var gameArea:* = MovieClip(parent).pGameArea;
         var markersNeeded:* = 0;
         for(var ii:* = 0; ii < gameArea.enemyArray.length; ii++)
         {
            gameArea.enemyArray[ii].outsideWindowMarker = false;
            if(gameArea.enemyArray[ii].outsideWindow)
            {
               markersNeeded++;
            }
         }
         var difference:* = markersNeeded - this.markerEnemyArray.length;
         if(markersNeeded > this.markerEnemyArray.length)
         {
            for(b = 0; b < difference; b++)
            {
               markerEnemy = new MarkerEnemy();
               markerEnemy.gotoAndStop(1);
               this.markerEnemyLayer.addChild(markerEnemy);
               this.markerEnemyArray.push(markerEnemy);
            }
         }
         else if(markersNeeded < this.markerEnemyArray.length)
         {
            for(b2 = 0; b2 < -difference; b2++)
            {
               if(this.markerEnemyArray[b2] != null)
               {
                  this.markerEnemyLayer.removeChild(this.markerEnemyArray[b2]);
                  this.markerEnemyArray.splice(b2,1);
               }
            }
         }
         var i:* = 0;
         for(var iii:* = 0; iii < gameArea.enemyArray.length; iii++)
         {
            theEnemy = gameArea.enemyArray[iii];
            if(Boolean(theEnemy.outsideWindow) && theEnemy.outsideWindowMarker == false)
            {
               theMarker = this.markerEnemyArray[i];
               dangerMarker = false;
               if(theEnemy.enemyLevel == "B")
               {
                  theMarker.scaleX = 2;
                  theMarker.scaleY = 2;
               }
               else
               {
                  theMarker.scaleX = 1;
                  theMarker.scaleY = 1;
               }
               theEnemy.outsideWindowMarker = true;
               if(theEnemy.outsideWindowLeft)
               {
                  theMarker.x = 0;
               }
               else if(theEnemy.outsideWindowRight)
               {
                  theMarker.x = 640;
               }
               else
               {
                  theMarker.x = theEnemy.x + PartGameArea.cameraPosX;
               }
               if(theEnemy.outsideWindowTop)
               {
                  theMarker.y = 0;
               }
               else if(theEnemy.outsideWindowBottom)
               {
                  theMarker.y = 400;
               }
               else
               {
                  theMarker.y = theEnemy.y + PartGameArea.cameraPosY;
               }
               if(theMarker.x > 640)
               {
                  theMarker.x = 640;
               }
               if(theMarker.x < 0)
               {
                  theMarker.x = 0;
               }
               if(theMarker.y > 400)
               {
                  theMarker.y = 400;
               }
               if(theMarker.y < 0)
               {
                  theMarker.y = 0;
               }
               if(theMarker.y > 0 && theMarker.y < 400)
               {
                  if(theMarker.x < 320)
                  {
                     theMarker.rotation = 180;
                  }
                  else
                  {
                     theMarker.rotation = 0;
                  }
               }
               else if(theMarker.x > 0 && theMarker.x < 640)
               {
                  if(theMarker.y < 200)
                  {
                     theMarker.rotation = 270;
                  }
                  else
                  {
                     theMarker.rotation = 90;
                     if(ScreenLevelSelect.levelMode == "Defense")
                     {
                        if(theEnemy.enemyType != "DamageAddict")
                        {
                           dangerMarker = true;
                        }
                     }
                  }
               }
               if(ScreenLevelSelect.levelMode == "Defense" && dangerMarker)
               {
                  theMarker.gotoAndStop(2);
               }
               else
               {
                  theMarker.gotoAndStop(1);
               }
               if(theMarker.x == 0 && theMarker.y == 0)
               {
                  theMarker.rotation = 225;
               }
               else if(theMarker.x == 0 && theMarker.y == 400)
               {
                  theMarker.rotation = 135;
               }
               else if(theMarker.x == 640 && theMarker.y == 0)
               {
                  theMarker.rotation = 315;
               }
               else if(theMarker.x == 640 && theMarker.y == 400)
               {
                  theMarker.rotation = 45;
               }
               i++;
            }
         }
      }
      
      private function handleReloadIndicator() : void
      {
         if(ScreenGame.reloadTimeSecondary <= 0 && !this.reloadIndicatorBoolean)
         {
            this.reloadIndicatorBoolean = true;
            this.reloadIndicatorTweenIn1.start();
            this.reloadIndicatorTweenIn2.start();
            this.reloadIndicatorTweenIn3.start();
            this.weaponInterfaceSpecial.alpha = 1;
         }
         if(ScreenGame.reloadTimeSecondary > 0)
         {
            this.reloadIndicatorBoolean = false;
            this.weaponInterfaceSpecial.alpha = 0.25;
         }
      }
      
      private function drawMinimap() : void
      {
         var enemy:* = undefined;
         var gameArea:* = MovieClip(parent).pGameArea;
         this.minimap.graphics.clear();
         this.minimap.graphics.beginFill(6710886);
         this.minimap.graphics.drawRect(0,0,80,80);
         this.minimap.graphics.endFill();
         this.minimap.x = 640 - this.minimap.width;
         this.minimap.y = 400;
         this.minimapMask.graphics.clear();
         this.minimapMask.graphics.beginFill(6710886);
         this.minimapMask.graphics.drawRect(0,0,80,80);
         this.minimapMask.graphics.endFill();
         this.minimapMask.x = 640 - this.minimapMask.width;
         this.minimapMask.y = 400;
         this.minimap.graphics.beginFill(16777215,0.2);
         this.minimap.graphics.drawRect(Math.round(Math.abs(PartGameArea.cameraPosX) * (80 / PartGameArea.roomWidth)),Math.round(Math.abs(PartGameArea.cameraPosY) * (80 / PartGameArea.roomHeight)),Math.round(80 * PartGameArea.cameraWidth / PartGameArea.roomWidth),Math.round(80 * PartGameArea.cameraHeight / PartGameArea.roomHeight));
         this.minimap.graphics.endFill();
         this.minimap.graphics.lineStyle(1,16777215,0);
         for(var i:* = 0; i < gameArea.enemyArray.length; i++)
         {
            enemy = gameArea.enemyArray[i];
            this.minimap.graphics.beginFill(16711680);
            if(enemy.enemyLevel != "B")
            {
               this.minimap.graphics.drawRect(Math.round(enemy.x * (80 / PartGameArea.roomWidth) - 2),Math.round(enemy.y * (80 / PartGameArea.roomHeight) - 2),4,4);
            }
            else
            {
               this.minimap.graphics.drawRect(Math.round(enemy.x * (80 / PartGameArea.roomWidth) - 4),Math.round(enemy.y * (80 / PartGameArea.roomHeight) - 4),8,8);
            }
            this.minimap.graphics.endFill();
         }
         if(ScreenLevelSelect.levelMode == "Flag" && stage.contains(gameArea.flag))
         {
            this.minimap.graphics.beginFill(0);
            this.minimap.graphics.drawRect(Math.round(gameArea.flag.x * (80 / PartGameArea.roomWidth) - 2),Math.round(gameArea.flag.y * (80 / PartGameArea.roomHeight) - 2),4,4);
            this.minimap.graphics.endFill();
         }
         this.minimap.graphics.beginFill(16777215);
         this.minimap.graphics.drawRect(Math.round(gameArea.tank.x * (80 / PartGameArea.roomWidth) - 2),Math.round(gameArea.tank.y * (80 / PartGameArea.roomHeight) - 2),4,4);
         this.minimap.graphics.endFill();
      }
      
      private function flagOutTweenFinish(event:TweenEvent) : void
      {
         this.markerFlagInTween.start();
      }
      
      private function countDownFunction() : void
      {
         if(PartGameArea.countDownDone == false)
         {
            if(this.countDown > 0)
            {
               --this.countDown;
            }
            else if(this.countDown == 0)
            {
               PartGameArea.countDownDone = true;
               this.valueTweenOut.start();
               this.valueTweenOut2.start();
               this.valueTweenOut3.start();
               this.valueTweenOut4.start();
               this.valueTweenOut5.start();
               this.valueTweenOut6.start();
               this.valueTweenOut7.start();
               this.valueTweenOut8.start();
               this.markerFlagInTween.start();
            }
            if(this.countDown == 54)
            {
               countDownText.text = "3";
               SoundManager.sfxArray.push("CountDownBeep1");
            }
            else if(this.countDown == 36)
            {
               countDownText.text = "2";
               SoundManager.sfxArray.push("CountDownBeep1");
            }
            else if(this.countDown == 18)
            {
               countDownText.text = "1";
               SoundManager.sfxArray.push("CountDownBeep1");
            }
            else if(this.countDown == 0 && countDownText.text != "GO!")
            {
               countDownText.text = "GO!";
               SoundManager.sfxArray.push("CountDownBeep2");
            }
         }
      }
      
      private function drawReloadBars() : void
      {
         var height1:* = undefined;
         var height2:* = undefined;
         if(this.countDown > 0)
         {
            height1 = 0;
         }
         else if(ScreenGame.reloadTime > 0 && ScreenGame.equippedWeapons[ScreenGame.currentWeapon - 1] != "MiniGun" && ScreenGame.equippedWeapons[ScreenGame.currentWeapon - 1] != "Flamethrower")
         {
            height1 = 80 - ScreenGame.reloadTime / ScreenGame.reloadTimeMax * 80;
         }
         else
         {
            height1 = 80;
         }
         this.reloadBar1.graphics.clear();
         this.reloadBar1.graphics.beginFill(16777215);
         this.reloadBar1.graphics.drawRect(0,80 - height1,4,80 - (80 - height1));
         this.reloadBar1.graphics.endFill();
         if(ScreenGame.reloadTimeSecondary > 0)
         {
            height2 = 80 - ScreenGame.reloadTimeSecondary / ScreenGame.reloadTimeMaxSecondary * 80;
         }
         else
         {
            height2 = 80;
         }
         this.reloadBar2.graphics.clear();
         this.reloadBar2.graphics.beginFill(16777215);
         this.reloadBar2.graphics.drawRect(0,80 - height2,4,80 - (80 - height2));
         this.reloadBar2.graphics.endFill();
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         if(PartGameArea.gamePaused)
         {
            if(ScreenOptions.optionAutoPauseOn != this.bOptionCheckBoxAutoPause.marked)
            {
               ScreenOptions.optionAutoPauseOn = this.bOptionCheckBoxAutoPause.marked;
               SaveManager.saveOptionAutoPause();
            }
         }
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
      
      public function unPauseGame() : void
      {
         if(ScreenOptions.optionCrosshairOn)
         {
            Mouse.cursor = "MyCursor";
         }
         if(ScreenOptions.optionAutoPauseOn != this.bOptionCheckBoxAutoPause.marked)
         {
            ScreenOptions.optionAutoPauseOn = this.bOptionCheckBoxAutoPause.marked;
            SaveManager.saveOptionAutoPause();
         }
         this.blackPauseBox.graphics.clear();
         this.refPauseLayer.removeChild(this.blackPauseBox);
         this.refPauseLayer.removeChild(pauseText);
         this.refPauseLayer.removeChild(this.bPauseResume);
         this.refPauseLayer.removeChild(this.bPauseResetLevel);
         this.refPauseLayer.removeChild(this.bPauseQuitLevel);
         this.refPauseLayer.removeChild(this.bToggleSound);
         this.refPauseLayer.removeChild(this.bToggleMusic);
         this.refPauseLayer.removeChild(this.bOptionCheckBoxAutoPause);
         this.refPauseLayer.removeChild(this.checkBoxText);
         if(stage.contains(this.logoSponsor))
         {
            this.refPauseLayer.removeChild(this.logoSponsor);
         }
         for(var i:* = 0; i < this.pauseTweensArray.length; i++)
         {
            this.pauseTweensArray[i].resume();
         }
         this.pauseTweensArray = [];
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = false, otherParent:Object = null) : void
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
         if(otherParent != null)
         {
            otherParent.addChild(textName);
         }
         else
         {
            addChild(textName);
         }
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
      
      private function reloadIndicatorTweenFinish(event:TweenEvent) : void
      {
         this.reloadIndicatorTweenOut1.start();
         this.reloadIndicatorTweenOut2.start();
         this.reloadIndicatorTweenOut3.start();
      }
      
      private function handleLifeIndicators() : void
      {
         var allowToAdd:Boolean = false;
         var v:* = undefined;
         var lifeIndicator:* = undefined;
         var theIndicator:* = undefined;
         var multiplierHealth:* = undefined;
         var enemyType:* = undefined;
         var totalHealth:* = undefined;
         var degree:* = undefined;
         var radianAngle:Number = NaN;
         var u:int = 0;
         var currentIndicatorAmount:* = this.lifeIndicatorArray.length;
         var indicatorsNeeded:* = 0;
         var gameArea:* = MovieClip(parent).pGameArea;
         for(var i:* = 0; i < gameArea.enemyArray.length; i++)
         {
            if(gameArea.enemyArray[i].enemyLevel == "B")
            {
               indicatorsNeeded++;
               allowToAdd = true;
               for(v = 0; v < this.enemiesHavingIndicators.length; v++)
               {
                  if(gameArea.enemyArray[i] == this.enemiesHavingIndicators[v])
                  {
                     allowToAdd = false;
                  }
               }
               if(allowToAdd)
               {
                  this.enemiesNeedingIndicators.push(gameArea.enemyArray[i]);
               }
            }
         }
         for(var ii:* = currentIndicatorAmount; ii < indicatorsNeeded; ii++)
         {
            lifeIndicator = new MovieClip();
            gameArea.bossHealthLayer.addChild(lifeIndicator);
            this.lifeIndicatorArray.push(lifeIndicator);
            lifeIndicator.enemy = this.enemiesNeedingIndicators[0];
            this.enemiesNeedingIndicators.splice(0,1);
            this.enemiesHavingIndicators.push(lifeIndicator.enemy);
            lifeIndicator.degree = 360;
            lifeIndicator.circleR = lifeIndicator.enemy.radius;
            lifeIndicator.circleX = 0;
            lifeIndicator.circleY = 0;
            lifeIndicator.shapeFill = new Shape();
            lifeIndicator.shapeFill.x = lifeIndicator.circleX;
            lifeIndicator.shapeFill.y = lifeIndicator.circleY;
            lifeIndicator.addChild(lifeIndicator.shapeFill);
            lifeIndicator.redCircle = new RedCircle();
            lifeIndicator.redCircle.scaleX = lifeIndicator.circleR / 50;
            lifeIndicator.redCircle.scaleY = lifeIndicator.circleR / 50;
            lifeIndicator.addChild(lifeIndicator.redCircle);
            lifeIndicator.redCircle.mask = lifeIndicator.shapeFill;
         }
         for(var iii:* = 0; iii < this.lifeIndicatorArray.length; iii++)
         {
            theIndicator = this.lifeIndicatorArray[iii];
            if(theIndicator.enemy == null || stage.contains(theIndicator.enemy))
            {
               theIndicator.x = theIndicator.enemy.x;
               theIndicator.y = theIndicator.enemy.y;
               if(theIndicator.enemy.invisible != null && Boolean(theIndicator.enemy.invisible))
               {
                  theIndicator.alpha = 0.5;
               }
               else if(theIndicator.enemy.teleporting != null && Boolean(theIndicator.enemy.teleporting))
               {
                  theIndicator.alpha = 0;
               }
               else
               {
                  theIndicator.alpha = 1;
               }
               if(theIndicator.enemy.enemyType == "ShrinkingB")
               {
                  theIndicator.circleR = theIndicator.enemy.radius;
               }
               multiplierHealth = 1;
               if(ScreenLevelSelect.levelDifficulty == "Medium")
               {
                  if(theIndicator.enemy.enemyLevel != "B")
                  {
                     multiplierHealth = DifficultyMultipliers.multiplierHealthMedium;
                  }
                  else
                  {
                     multiplierHealth = 1;
                  }
               }
               if(ScreenLevelSelect.levelDifficulty == "Hard")
               {
                  if(theIndicator.enemy.enemyLevel != "B")
                  {
                     multiplierHealth = DifficultyMultipliers.multiplierHealthHard;
                  }
                  else
                  {
                     multiplierHealth = 1;
                  }
               }
               enemyType = theIndicator.enemy.enemyType;
               totalHealth = Math.round(ScreenGame["enemy" + enemyType + "Stats"][1] * multiplierHealth / ScreenGame.bossAmount);
               degree = 360 * (1 - theIndicator.enemy.hp / totalHealth);
               radianAngle = degree * Math.PI / 180;
               theIndicator.shapeFill.graphics.clear();
               theIndicator.shapeFill.graphics.beginFill(16777215,1);
               for(u = 270; u <= degree + 270; u++)
               {
                  theIndicator.shapeFill.graphics.lineTo(theIndicator.circleR * Math.cos(u * Math.PI / 180),Number(theIndicator.circleR) * Math.sin(u * Math.PI / 180));
               }
               theIndicator.shapeFill.graphics.lineTo(0,0);
               theIndicator.shapeFill.graphics.endFill();
            }
            else
            {
               gameArea.bossHealthLayer.removeChild(theIndicator);
               this.lifeIndicatorArray.splice(iii,1);
               theIndicator = null;
               iii--;
            }
         }
      }
      
      private function setObjectiveCountText() : void
      {
         if(ScreenLevelSelect.levelMode == "Normal" || ScreenLevelSelect.levelMode == "Tower" || ScreenLevelSelect.levelMode == "Defense")
         {
            if(ScreenLevelSelect.levelDifficulty == "Easy")
            {
               objectiveCountText.text = "Kill " + this.selectedEnemyModel[ScreenGame.level - 1][0] + " Enemies";
            }
            else if(ScreenLevelSelect.levelDifficulty == "Medium")
            {
               objectiveCountText.text = "Kill " + Math.round(this.selectedEnemyModel[ScreenGame.level - 1][0] * DifficultyMultipliers.multiplierAmountMedium) + " Enemies";
            }
            else if(ScreenLevelSelect.levelDifficulty == "Hard")
            {
               objectiveCountText.text = "Kill " + Math.round(this.selectedEnemyModel[ScreenGame.level - 1][0] * DifficultyMultipliers.multiplierAmountHard) + " Enemies";
            }
         }
         else if(ScreenLevelSelect.levelMode == "Flag")
         {
            objectiveCountText.text = "Collect " + this.selectedFlagModel[ScreenGame.level - 1][0] + " Flags";
         }
         else if(ScreenLevelSelect.levelMode == "Boss")
         {
            if(ScreenGame.bossAmount == 1)
            {
               objectiveCountText.text = "Kill 1 Boss";
            }
            else
            {
               objectiveCountText.text = "Kill " + ScreenGame.bossAmount + " Bosses";
            }
         }
      }
      
      private function setObjectiveText() : void
      {
         if(ScreenLevelSelect.levelMode == "Normal" || ScreenLevelSelect.levelMode == "Tower" || ScreenLevelSelect.levelMode == "Defense")
         {
            if(ScreenLevelSelect.levelDifficulty == "Easy")
            {
               objectiveText.text = "Enemies killed: " + (this.selectedEnemyModel[ScreenGame.level - 1][0] - (ScreenGame.currentEnemies + ScreenGame.enemiesLeft)) + "/" + this.selectedEnemyModel[ScreenGame.level - 1][0];
            }
            else if(ScreenLevelSelect.levelDifficulty == "Medium")
            {
               objectiveText.text = "Enemies killed: " + (Math.round(this.selectedEnemyModel[ScreenGame.level - 1][0] * DifficultyMultipliers.multiplierAmountMedium) - (ScreenGame.currentEnemies + ScreenGame.enemiesLeft)) + "/" + Math.round(this.selectedEnemyModel[ScreenGame.level - 1][0] * DifficultyMultipliers.multiplierAmountMedium);
            }
            else if(ScreenLevelSelect.levelDifficulty == "Hard")
            {
               objectiveText.text = "Enemies killed: " + (Math.round(this.selectedEnemyModel[ScreenGame.level - 1][0] * DifficultyMultipliers.multiplierAmountHard) - (ScreenGame.currentEnemies + ScreenGame.enemiesLeft)) + "/" + Math.round(this.selectedEnemyModel[ScreenGame.level - 1][0] * DifficultyMultipliers.multiplierAmountHard);
            }
         }
         else if(ScreenLevelSelect.levelMode == "Flag")
         {
            objectiveText.text = "Flags collected: " + (this.selectedFlagModel[ScreenGame.level - 1][0] - ScreenGame.flagsLeft) + "/" + this.selectedFlagModel[ScreenGame.level - 1][0];
         }
         else if(ScreenLevelSelect.levelMode == "Boss")
         {
            objectiveText.text = "Bosses killed: " + ScreenGame.bossAmountKilled + "/" + ScreenGame.bossAmount;
         }
      }
      
      public function update(event:Event) : void
      {
         if(!PartGameArea.gamePaused)
         {
            if(!Main.screenChanging)
            {
               this.countDownFunction();
            }
            if(ScreenLevelSelect.levelMode == "Boss")
            {
               this.handleLifeIndicators();
            }
            hpText.text = "Health: " + ScreenGame.hp;
            moneyText.text = "Money: $" + ScreenGame.money;
            this.setObjectiveText();
            if(PartGameArea.roomWidth > 640 || PartGameArea.roomHeight > 400)
            {
               this.handleEnemyMarkers();
            }
            if(ScreenLevelSelect.levelMode == "Flag")
            {
               this.markTheFlag();
            }
            this.drawMinimap();
            this.drawReloadBars();
            this.handleReloadIndicator();
         }
      }
      
      private function flagInTweenFinish(event:TweenEvent) : void
      {
         this.markerFlagOutTween.start();
      }
   }
}

