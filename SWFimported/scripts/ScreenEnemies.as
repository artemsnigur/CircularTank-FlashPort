package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Strong;
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   import flash.utils.getDefinitionByName;
   
   public class ScreenEnemies extends MovieClip
   {
      
      public static var selectedEnemy:String;
      
      public static var selectedEnemyLevel:String;
      
      public static var changeLayout:Boolean;
      
      public static var descriptionTextBasic:String = "The most boring enemy in the game.";
      
      public static var descriptionTextFast:String = "Faster than most enemies.";
      
      public static var descriptionTextShooting:String = "The first shooting enemy in the game.";
      
      public static var descriptionTextStrong:String = "Strong against explosions and bullets.";
      
      public static var descriptionTextShrinking:String = "Shrinks when damaged.";
      
      public static var descriptionTextGhost:String = "Can\'t be damaged when invisible.";
      
      public static var descriptionTextTrap:String = "Lays traps once in a while.";
      
      public static var descriptionTextTemperamental:String = "Becomes very angry when damaged.";
      
      public static var descriptionTextNinja:String = "Moves fast and shoots rapidly.";
      
      public static var descriptionTextAccelerating:String = "Becomes faster over time. Damage slows it down.";
      
      public static var descriptionTextCrazy:String = "Shoots bursts of bullets in all directions.";
      
      public static var descriptionTextMedic:String = "Heals other enemies.";
      
      public static var descriptionTextScaredGhost:String = "Becomes invisible when damaged.";
      
      public static var descriptionTextDamageAddict:String = "Dies automatically. Damage heals it.";
      
      public static var descriptionTextRandom:String = "Shoots in random directions.";
      
      public static var descriptionTextExploding:String = "Explodes when it dies.";
      
      public static var descriptionTextTiny:String = "A very small enemy.";
      
      public static var descriptionTextGrapplingHook:String = "Hooks onto you with its grappling hook.";
      
      public static var descriptionTextTeleporting:String = "Loves to teleport <3.";
      
      public static var descriptionTextSoldier:String = "Shoots bullets which follow you.";
      
      public static var enemyButtonModelArray:Array = ["Basic","Fast","Shooting","Strong","Shrinking","Ghost","Trap","Temperamental","Ninja","Accelerating","Crazy","Medic","Scared Ghost","Damage Addict","Random","Exploding","Tiny","Grappling Hook","Teleporting","Soldier"];
      
      public static var enemyDifficulty:String = "Easy";
      
      public static var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false);
      
      public static var textFormat2:TextFormat = new TextFormat("JG",14,16777215,true,false,false);
      
      public static var textFormat3:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      private static var typeText:TextField = new TextField();
      
      private static var moneyText:TextField = new TextField();
      
      private static var hpText:TextField = new TextField();
      
      private static var damageText:TextField = new TextField();
      
      private static var speedText:TextField = new TextField();
      
      public static var contentMoving:Boolean = true;
      
      public static var knownEnemiesArray:Array = ["Basic"];
      
      private var contentHolder:MovieClip = new MovieClip();
      
      private var difficultyText:TextField = new TextField();
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var weaknessesText:TextField = new TextField();
      
      private var bDifficultyMedium:ButtonDifficultyMedium = new ButtonDifficultyMedium();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var bEnemyLevel2:ButtonEnemyLevel2 = new ButtonEnemyLevel2();
      
      private var bgWindow:BackgroundWindowBig = new BackgroundWindowBig();
      
      private var bEnemyLevel1:ButtonEnemyLevel1 = new ButtonEnemyLevel1();
      
      private var bEnemyLevel3:ButtonEnemyLevel3 = new ButtonEnemyLevel3();
      
      private var strengthsText:TextField = new TextField();
      
      private var shadowArray:Array = filters;
      
      private var weaknessesIconArray:Array = [];
      
      private var textLayer:MovieClip = new MovieClip();
      
      private var spaces:RegExp = / /gi;
      
      private var strengthsIconArray:Array = [];
      
      private var bgWindowBar4:BackgroundWindowBar4 = new BackgroundWindowBar4();
      
      private var bgMenu:BackgroundMenu = new BackgroundMenu();
      
      private var bgWindowBar:BackgroundWindowBarBig = new BackgroundWindowBarBig();
      
      private var buttonArray:Array = [];
      
      private var descriptionText:TextField = new TextField();
      
      private var bDifficultyHard:ButtonDifficultyHard = new ButtonDifficultyHard();
      
      private var levelText:TextField = new TextField();
      
      private var bMore:ButtonMoreEnemies = new ButtonMoreEnemies();
      
      private var iconLayer:MovieClip = new MovieClip();
      
      private var bDifficultyEasy:ButtonDifficultyEasy = new ButtonDifficultyEasy();
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var theTitle:TitleEnemies = new TitleEnemies();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var bEnemyLevelBoss:ButtonEnemyLevelBoss = new ButtonEnemyLevelBoss();
      
      private var contentTween:Tween = new Tween(this.contentHolder,"x",Strong.easeOut,-208,0,20,false);
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var isAdded:Boolean = false;
      
      public function ScreenEnemies()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         contentMoving = true;
         this.shadowArray.push(this.myShadow);
         selectedEnemy = "None";
         selectedEnemyLevel = "1";
         this.bDifficultyEasy.myDifficulty = "Easy";
         this.bDifficultyMedium.myDifficulty = "Medium";
         this.bDifficultyHard.myDifficulty = "Hard";
         this.bEnemyLevel1.myLevel = "1";
         this.bEnemyLevel2.myLevel = "2";
         this.bEnemyLevel3.myLevel = "3";
         this.bEnemyLevelBoss.myLevel = "Boss";
         this.contentTween.stop();
         changeLayout = true;
      }
      
      public static function updateEnemies(world:Number, level:Number) : *
      {
         var enemyName:* = undefined;
         var ii:* = undefined;
         var newEnemiesArray:* = [];
         var selectedWorldModel:* = ScreenGame.worldModels[world * 3 - 3];
         var selectedLevelModel:* = selectedWorldModel[level - 1];
         var enemyTypes:* = (selectedLevelModel.length - 2) / 2;
         for(var i:* = 0; i < enemyTypes; i++)
         {
            enemyName = selectedLevelModel[i * 2 + 2].slice(0,selectedLevelModel[i * 2 + 2].length - 1);
            if(enemyName == "ScaredGhost")
            {
               enemyName = "Scared Ghost";
            }
            else if(enemyName == "DamageAddict")
            {
               enemyName = "Damage Addict";
            }
            else if(enemyName == "GrapplingHook")
            {
               enemyName = "Grappling Hook";
            }
            if(knownEnemiesArray.length > 0)
            {
               for(ii = 0; ii < knownEnemiesArray.length; ii++)
               {
                  if(enemyName == knownEnemiesArray[ii])
                  {
                     break;
                  }
                  if(ii == knownEnemiesArray.length - 1)
                  {
                     newEnemiesArray.push(enemyName);
                     knownEnemiesArray.push(enemyName);
                  }
               }
            }
            else
            {
               newEnemiesArray.push(enemyName);
               knownEnemiesArray.push(enemyName);
            }
         }
         return newEnemiesArray;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.contentTween.addEventListener(TweenEvent.MOTION_FINISH,this.contentTweenFinish);
            addChild(this.bgTitle);
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            addChild(this.sponsorLogo);
            addChild(this.bgMenu);
            this.bgMenu.y = this.bgTitle.height;
            addChild(this.bgWindow);
            this.bgWindow.x = 640 - this.bgWindow.width;
            this.bgWindow.y = this.bgTitle.height;
            addChild(this.bgWindowBar);
            this.bgWindowBar.x = this.bgWindow.x;
            this.bgWindowBar.y = this.bgWindow.y;
            this.bgWindowBar.alpha = 0;
            addChild(this.bgWindowBar4);
            this.bgWindowBar4.x = this.bgWindow.x;
            this.bgWindowBar4.y = this.bgWindow.y + 32;
            this.bgWindowBar4.alpha = 0;
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 432;
            addChild(this.contentHolder);
            this.contentHolder.x = -208;
            this.contentTween.start();
            if(!Main.extraStuff)
            {
               this.contentHolder.addChild(this.bMore);
               this.bMore.x = 104;
               this.bMore.y = 400;
            }
            this.addEnemyButtons();
            this.revealEnemies();
            addChild(this.iconLayer);
            addChild(this.textLayer);
            this.textLayer.mouseEnabled = false;
            this.addText(this.textLayer,typeText,textFormat,16777215,"",32,432,this.bgWindow.x,this.bgWindow.y + 5,true);
            this.addText(this.textLayer,this.difficultyText,textFormat,16777215,"",32,208,this.bgWindow.x + 106,this.bgWindow.y + 80,false,true);
            this.addText(this.textLayer,this.levelText,textFormat,16777215,"",32,208,this.bgWindow.x + 106,this.bgWindow.y + 130,false,true);
            this.addText(this.textLayer,moneyText,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 224);
            this.addText(this.textLayer,hpText,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 248);
            this.addText(this.textLayer,damageText,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 272);
            this.addText(this.textLayer,speedText,textFormat2,16777215,"",32,230,this.bgWindow.x + 4,this.bgWindow.y + 296);
            this.addText(this.textLayer,this.descriptionText,textFormat3,16777215,"",300,424,this.bgWindow.x + 4,this.bgWindow.y + 39,true);
            this.addText(this.textLayer,this.strengthsText,textFormat,16777215,"",32,208,this.bgWindow.x + 206,this.bgWindow.y + 224,false,true);
            this.addText(this.textLayer,this.weaknessesText,textFormat,16777215,"",32,208,this.bgWindow.x + 206,this.bgWindow.y + 284,false,true);
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
         }
      }
      
      private function addEnemyButtons() : void
      {
         var enemyNameWithoutSpaces:* = undefined;
         var bEnemy:* = undefined;
         var ii:* = 0;
         var hideAmount:* = 0;
         if(!Main.extraStuff)
         {
            hideAmount = 5;
         }
         for(var i:* = 0; i < enemyButtonModelArray.length - hideAmount; i++)
         {
            if(i - 5 * ii > 4)
            {
               ii++;
            }
            enemyNameWithoutSpaces = enemyButtonModelArray[i].replace(this.spaces,"");
            bEnemy = new (getDefinitionByName("ButtonEnemy" + enemyNameWithoutSpaces) as Class)();
            bEnemy.enemyType = enemyButtonModelArray[i];
            this.contentHolder.addChild(bEnemy);
            bEnemy.x = 3 + 41 * (i - 5 * ii);
            bEnemy.y = 91 + 41 * ii;
            this.buttonArray.push(bEnemy);
         }
      }
      
      private function contentTweenFinish(event:TweenEvent) : void
      {
         contentMoving = false;
      }
      
      private function handleStrengths() : void
      {
         var iconS:* = undefined;
         var iconW:* = undefined;
         var theStrength:* = undefined;
         var iconSText:* = undefined;
         var theWeakness:* = undefined;
         var iconWText:* = undefined;
         for(var e:* = 0; e < this.strengthsIconArray.length; e++)
         {
            this.iconLayer.removeChild(this.strengthsIconArray[e]);
            this.strengthsIconArray.splice(e,1);
            e--;
         }
         for(var ee:* = 0; ee < this.weaknessesIconArray.length; ee++)
         {
            this.iconLayer.removeChild(this.weaknessesIconArray[ee]);
            this.weaknessesIconArray.splice(ee,1);
            ee--;
         }
         var enemyStrengthsArray:* = ScreenGame[("enemy" + selectedEnemy + "Strengths").replace(this.spaces,"")];
         var enemyWeaknessesArray:* = ScreenGame[("enemy" + selectedEnemy + "Weaknesses").replace(this.spaces,"")];
         for(var i:* = 0; i < enemyStrengthsArray.length / 2; i++)
         {
            theStrength = enemyStrengthsArray[i * 2];
            iconS = new IconStrongWeak();
            iconS.pText = this.pInfoText;
            if(theStrength == "Explosions")
            {
               iconS.gotoAndStop(2);
               iconS.theText = "Explosions";
            }
            else if(theStrength == "FireLava")
            {
               iconS.gotoAndStop(3);
               iconS.theText = "Fire & lava";
            }
            else if(theStrength == "Bullets")
            {
               iconS.gotoAndStop(4);
               iconS.theText = "Bullets";
            }
            else if(theStrength == "Poison")
            {
               iconS.gotoAndStop(5);
               iconS.theText = "Poison";
            }
            else if(theStrength == "Laser")
            {
               iconS.gotoAndStop(6);
               iconS.theText = "Laser";
            }
            else if(theStrength == "Ice")
            {
               iconS.gotoAndStop(7);
               iconS.theText = "Ice";
            }
            else if(theStrength == "Food")
            {
               iconS.gotoAndStop(8);
               iconS.theText = "Food";
            }
            else if(theStrength == "Magic")
            {
               iconS.gotoAndStop(9);
               iconS.theText = "Magic";
            }
            this.iconLayer.addChild(iconS);
            iconS.x = 434 + i * 38;
            iconS.y = 348;
            iconSText = new TextField();
            this.addText(iconS,iconSText,textFormat2,16777215,Number(enemyStrengthsArray[i * 2 + 1]) * 100 + "%",14,50,-25,2,true);
            this.strengthsIconArray.push(iconS);
         }
         if(enemyStrengthsArray.length == 0)
         {
            iconS = new IconStrongWeak();
            this.iconLayer.addChild(iconS);
            iconS.x = 434;
            iconS.y = 348;
            iconS.gotoAndStop(1);
            this.strengthsIconArray.push(iconS);
         }
         for(var ii:* = 0; ii < enemyWeaknessesArray.length / 2; ii++)
         {
            theWeakness = enemyWeaknessesArray[ii * 2];
            iconW = new IconStrongWeak();
            iconW.pText = this.pInfoText;
            if(theWeakness == "Explosions")
            {
               iconW.gotoAndStop(10);
               iconW.theText = "Explosions";
            }
            else if(theWeakness == "FireLava")
            {
               iconW.gotoAndStop(11);
               iconW.theText = "Fire & lava";
            }
            else if(theWeakness == "Bullets")
            {
               iconW.gotoAndStop(12);
               iconW.theText = "Bullets";
            }
            else if(theWeakness == "Poison")
            {
               iconW.gotoAndStop(13);
               iconW.theText = "Poison";
            }
            else if(theWeakness == "Laser")
            {
               iconW.gotoAndStop(14);
               iconW.theText = "Laser";
            }
            else if(theWeakness == "Ice")
            {
               iconW.gotoAndStop(15);
               iconW.theText = "Ice";
            }
            else if(theWeakness == "Food")
            {
               iconW.gotoAndStop(16);
               iconW.theText = "Food";
            }
            else if(theWeakness == "Magic")
            {
               iconW.gotoAndStop(17);
               iconW.theText = "Magic";
            }
            this.iconLayer.addChild(iconW);
            iconW.x = 434 + ii * 38;
            iconW.y = 408;
            iconWText = new TextField();
            this.addText(iconW,iconWText,textFormat2,16777215,Number(enemyWeaknessesArray[ii * 2 + 1]) * 100 + "%",14,50,-25,2,true);
            this.weaknessesIconArray.push(iconW);
         }
         if(enemyWeaknessesArray.length == 0)
         {
            iconW = new IconStrongWeak();
            this.iconLayer.addChild(iconW);
            iconW.x = 434;
            iconW.y = 408;
            iconW.gotoAndStop(1);
            this.weaknessesIconArray.push(iconW);
         }
      }
      
      private function revealEnemies() : void
      {
         var theButton:* = undefined;
         var ii:* = undefined;
         var knownEnemy:* = undefined;
         for(var i:* = 0; i < this.buttonArray.length; i++)
         {
            theButton = this.buttonArray[i];
            for(ii = 0; ii < knownEnemiesArray.length; ii++)
            {
               knownEnemy = knownEnemiesArray[ii];
               if(theButton.enemyType == knownEnemy)
               {
                  theButton.notDiscovered = false;
                  break;
               }
            }
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
         var selectedArray:* = undefined;
         var statsString:* = undefined;
         var hpMultiplier:* = undefined;
         var damageMultiplier:* = undefined;
         var speedMultiplier:* = undefined;
         var levelMultiplier:* = undefined;
         var description:* = undefined;
         if(changeLayout)
         {
            if(selectedEnemy != "None")
            {
               if(selectedEnemyLevel != "Boss")
               {
                  statsString = ("enemy" + selectedEnemy + "Stats").replace(this.spaces,"");
               }
               else
               {
                  statsString = ("enemy" + selectedEnemy + "BStats").replace(this.spaces,"");
               }
               selectedArray = ScreenGame[statsString];
               hpMultiplier = 1;
               damageMultiplier = 1;
               speedMultiplier = 1;
               levelMultiplier = 1;
               if(enemyDifficulty == "Medium")
               {
                  if(selectedEnemyLevel != "Boss")
                  {
                     hpMultiplier = DifficultyMultipliers.multiplierHealthMedium;
                  }
                  else
                  {
                     hpMultiplier = 1;
                  }
                  damageMultiplier = DifficultyMultipliers.multiplierDamageMedium;
                  speedMultiplier = DifficultyMultipliers.multiplierSpeedMedium;
               }
               else if(enemyDifficulty == "Hard")
               {
                  if(selectedEnemyLevel != "Boss")
                  {
                     hpMultiplier = DifficultyMultipliers.multiplierHealthHard;
                  }
                  else
                  {
                     hpMultiplier = 1;
                  }
                  damageMultiplier = DifficultyMultipliers.multiplierDamageHard;
                  speedMultiplier = DifficultyMultipliers.multiplierSpeedHard;
               }
               if(selectedEnemyLevel == "2")
               {
                  levelMultiplier = DifficultyMultipliers.multiplierLevel2;
               }
               else if(selectedEnemyLevel == "3")
               {
                  levelMultiplier = DifficultyMultipliers.multiplierLevel3;
               }
               typeText.text = selectedEnemy + " Enemy";
               this.difficultyText.text = "Difficulty:";
               this.levelText.text = "Enemy Level:";
               this.strengthsText.text = "Strengths:";
               this.weaknessesText.text = "Weaknesses:";
               moneyText.text = "Money: " + Math.round(selectedArray[2] * levelMultiplier) + "$";
               hpText.text = "Health: " + Math.round(selectedArray[1] * hpMultiplier * levelMultiplier) + " HP";
               damageText.text = "Damage: " + Math.round(selectedArray[0] * damageMultiplier * levelMultiplier) + " HP";
               if(selectedEnemy != "Temperamental" && selectedEnemy != "Accelerating")
               {
                  speedText.text = "Speed: " + Math.round(selectedArray[3] * 30 * speedMultiplier) + " PX/Sec";
               }
               else if(selectedEnemy == "Temperamental")
               {
                  if(selectedEnemyLevel != "Boss")
                  {
                     speedText.text = "Speed: " + Math.round(selectedArray[3] * 30 * speedMultiplier) + "-" + Math.round(selectedArray[3] * 30 * 4 * speedMultiplier) + " PX/Sec";
                  }
                  else
                  {
                     speedText.text = "Speed: " + Math.round(selectedArray[3] * 30 * speedMultiplier) + "-" + Math.round(selectedArray[3] * 30 * 3 * speedMultiplier) + " PX/Sec";
                  }
               }
               else if(selectedEnemy == "Accelerating")
               {
                  speedText.text = "Speed: " + Math.round(selectedArray[3] * 30 * speedMultiplier) + "-" + Math.round(selectedArray[3] * 30 * 3 * speedMultiplier) + " PX/Sec";
               }
               this.handleStrengths();
               this.bgWindowBar.alpha = 1;
               this.bgWindowBar4.alpha = 1;
               description = "descriptionText" + selectedEnemy;
               description = description.replace(this.spaces,"");
               if(ScreenEnemies[description] != null)
               {
                  this.descriptionText.text = ScreenEnemies[description];
               }
               else
               {
                  this.descriptionText.text = "";
               }
               if(!stage.contains(this.bDifficultyEasy))
               {
                  addChild(this.bDifficultyEasy);
                  this.bDifficultyEasy.x = 314;
                  this.bDifficultyEasy.y = 192;
               }
               if(!stage.contains(this.bDifficultyMedium))
               {
                  addChild(this.bDifficultyMedium);
                  this.bDifficultyMedium.x = 389;
                  this.bDifficultyMedium.y = 192;
               }
               if(!stage.contains(this.bDifficultyHard))
               {
                  addChild(this.bDifficultyHard);
                  this.bDifficultyHard.x = 464;
                  this.bDifficultyHard.y = 192;
               }
               if(!stage.contains(this.bEnemyLevel1))
               {
                  addChild(this.bEnemyLevel1);
                  this.bEnemyLevel1.x = 314;
                  this.bEnemyLevel1.y = 242;
               }
               if(!stage.contains(this.bEnemyLevel2))
               {
                  addChild(this.bEnemyLevel2);
                  this.bEnemyLevel2.x = 364;
                  this.bEnemyLevel2.y = 242;
               }
               if(!stage.contains(this.bEnemyLevel3))
               {
                  addChild(this.bEnemyLevel3);
                  this.bEnemyLevel3.x = 414;
                  this.bEnemyLevel3.y = 242;
               }
               if(!stage.contains(this.bEnemyLevelBoss))
               {
                  addChild(this.bEnemyLevelBoss);
                  this.bEnemyLevelBoss.x = 464;
                  this.bEnemyLevelBoss.y = 242;
               }
            }
            else
            {
               typeText.text = "";
               this.difficultyText.text = "";
               this.levelText.text = "";
               this.strengthsText.text = "";
               this.weaknessesText.text = "";
               moneyText.text = "";
               hpText.text = "";
               damageText.text = "";
               speedText.text = "";
               this.descriptionText.text = "";
               this.bgWindowBar.alpha = 0;
               this.bgWindowBar4.alpha = 0;
               if(stage.contains(this.bDifficultyEasy))
               {
                  removeChild(this.bDifficultyEasy);
               }
               if(stage.contains(this.bDifficultyMedium))
               {
                  removeChild(this.bDifficultyMedium);
               }
               if(stage.contains(this.bDifficultyHard))
               {
                  removeChild(this.bDifficultyHard);
               }
            }
            changeLayout = false;
         }
      }
      
      public function addText(who:Object, textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false, shadowText:Boolean = true) : void
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
         who.addChild(textName);
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
   }
}

