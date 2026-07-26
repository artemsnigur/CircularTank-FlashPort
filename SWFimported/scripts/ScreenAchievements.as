package
{
   import fl.transitions.Tween;
   import fl.transitions.easing.Strong;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   import flash.utils.getDefinitionByName;
   
   public class ScreenAchievements extends Sprite
   {
      
      public static var enemyKills:Number = 0;
      
      public static var moneyEarned:Number = 0;
      
      public static var achievementKills1State:Number = -1;
      
      public static var achievementKills2State:Number = -1;
      
      public static var achievementKills3State:Number = -1;
      
      public static var achievementMoney1State:Number = -1;
      
      public static var achievementMoney2State:Number = -1;
      
      public static var achievementMoney3State:Number = -1;
      
      public static var achievementMaxedPrimary1State:Number = -1;
      
      public static var achievementMaxedPrimary2State:Number = -1;
      
      public static var achievementMaxedPrimary3State:Number = -1;
      
      public static var achievementMaxedSecondary1State:Number = -1;
      
      public static var achievementMaxedSecondary2State:Number = -1;
      
      public static var achievementMaxedSecondary3State:Number = -1;
      
      public static var achievementPoisonDoctorState:Number = -1;
      
      public static var achievementFreezeTemperamentalState:Number = -1;
      
      public static var achievementTrapMineState:Number = -1;
      
      public static var achievementAddictedCakeState:Number = -1;
      
      public static var achievementRacingState:Number = -1;
      
      public static var achievementIdleState:Number = -1;
      
      public static var achievementStars1State:Number = -1;
      
      public static var achievementStars2State:Number = -1;
      
      public static var achievementStars3State:Number = -1;
      
      public static var achievementFlags1State:Number = -1;
      
      public static var achievementFlags2State:Number = -1;
      
      public static var achievementFlags3State:Number = -1;
      
      public static var achievementTowers1State:Number = -1;
      
      public static var achievementTowers2State:Number = -1;
      
      public static var achievementTowers3State:Number = -1;
      
      public static var achievementShields1State:Number = -1;
      
      public static var achievementShields2State:Number = -1;
      
      public static var achievementShields3State:Number = -1;
      
      public static var achievementBosses1State:Number = -1;
      
      public static var achievementBosses2State:Number = -1;
      
      public static var achievementBosses3State:Number = -1;
      
      public static var achievementFlagNoWeaponsState:Number = -1;
      
      public static var achievementDefensiveBombsState:Number = -1;
      
      public static var achievementBossOnlySpecialState:Number = -1;
      
      public static var achievementPlacementArray:Array = [["Kills1",55,120],["Kills2",115,120],["Kills3",175,120],["Money1",235,120],["Money2",295,120],["Money3",355,120],["MaxedPrimary1",55,176],["MaxedPrimary2",115,176],["MaxedPrimary3",175,176],["MaxedSecondary1",235,176],["MaxedSecondary2",295,176],["MaxedSecondary3",355,176],["PoisonDoctor",55,232],["FreezeTemperamental",115,232],["TrapMine",175,232],["AddictedCake",235,232],["Racing",295,232],["Idle",355,232],["Stars1",55,288],["Stars2",115,288],["Stars3",175,288],["Flags1",235,288],["Flags2",295,288],["Flags3",355,288],["Towers1",55,344],["Towers2",115,344],["Towers3",175,344],["Shields1",235,344],["Shields2",295,344],["Shields3",355,344],["Bosses1",55,400],["Bosses2",115,400],["Bosses3",175,400],["FlagNoWeapons",235,400],["DefensiveBombs",295,400],["BossOnlySpecial",355,400]];
      
      public static var achievementKills1Data:Array = ["GRAVEYARD","Kill 100 enemies.",false];
      
      public static var achievementKills2Data:Array = ["DIE HARD","Kill 1,000 enemies.",false];
      
      public static var achievementKills3Data:Array = ["TERMINATOR","Kill 10,000 enemies.",false];
      
      public static var achievementMoney1Data:Array = ["INCOME","Earn $10,000.",false];
      
      public static var achievementMoney2Data:Array = ["MONEY, MONEY, MONEY","Earn $100,000.",false];
      
      public static var achievementMoney3Data:Array = ["MILLIONARE","Earn $1,000,000.",false];
      
      public static var achievementMaxedPrimary1Data:Array = ["TOP GUN","Upgrade 1 primary weapon\nto level 10.",false];
      
      public static var achievementMaxedPrimary2Data:Array = ["BECOMING POWERFUL","Upgrade 5 primary weapons\nto level 10.",false];
      
      public static var achievementMaxedPrimary3Data:Array = ["TO THE MAX","Upgrade 10 primary weapons\nto level 10.",false];
      
      public static var achievementMaxedSecondary1Data:Array = ["MAXIMUM DANGER","Upgrade 1 secondary weapon\nto level 10.",false];
      
      public static var achievementMaxedSecondary2Data:Array = ["ADVANCED EQUIPMENT","Upgrade 5 secondary weapons\nto level 10.",false];
      
      public static var achievementMaxedSecondary3Data:Array = ["FULLY LOADED","Upgrade 10 secondary weapons\nto level 10.",false];
      
      public static var achievementPoisonDoctorData:Array = ["THE DOCTOR IS SICK","Poison a medic enemy.",false];
      
      public static var achievementFreezeTemperamentalData:Array = ["COOL DOWN","Freeze an angry temperamental enemy.",false];
      
      public static var achievementTrapMineData:Array = ["TASTE YOUR OWN MEDICINE","Kill a trap enemy with a mine.",false];
      
      public static var achievementAddictedCakeData:Array = ["ADDICTED TO CAKE","Shoot a damage addict enemy with cake.",false];
      
      public static var achievementRacingData:Array = ["ARE WE RACING?","Reach the bottom of a defense level before any enemies do it.",false];
      
      public static var achievementIdleData:Array = ["IDLE","Do nothing, in any level, until the level ends.",false];
      
      public static var achievementStars1Data:Array = ["TWINKLE TWINKLE","Earn 60 stars.",true];
      
      public static var achievementStars2Data:Array = ["SHINING STARS","Earn 120 stars.",true];
      
      public static var achievementStars3Data:Array = ["SHOOT FOR THE STARS","Earn 180 stars.",true];
      
      public static var achievementFlags1Data:Array = ["FLAG COLLECTOR","Earn 60 flags.",true];
      
      public static var achievementFlags2Data:Array = ["WAVING THE FLAGS","Earn 120 flags.",true];
      
      public static var achievementFlags3Data:Array = ["VEXILLOLOGIST","Earn 180 flags.",true];
      
      public static var achievementTowers1Data:Array = ["TOWER DEFENSE","Earn 60 towers.",true];
      
      public static var achievementTowers2Data:Array = ["CAN\'T TOUCH THIS","Earn 120 towers.",true];
      
      public static var achievementTowers3Data:Array = ["EYE OF SAURON","Earn 180 towers.",true];
      
      public static var achievementShields1Data:Array = ["BODYGUARD","Earn 60 shields.",true];
      
      public static var achievementShields2Data:Array = ["EFFECTIVE SECURITY","Earn 120 shields.",true];
      
      public static var achievementShields3Data:Array = ["YOU SHALL NOT PASS","Earn 180 shields.",true];
      
      public static var achievementBosses1Data:Array = ["ARE YOU MAD BOSS?","Earn 30 bosses.",true];
      
      public static var achievementBosses2Data:Array = ["BOSSY","Earn 60 bosses.",true];
      
      public static var achievementBosses3Data:Array = ["LIKE A BOSS!","Earn 90 bosses.",true];
      
      public static var achievementFlagNoWeaponsData:Array = ["PEACEFUL","Win a flag level and get 3 medals, without using any weapons.",true];
      
      public static var achievementDefensiveBombsData:Array = ["KABOOM!","Win a defense level and get 3 medals, by using the timed bomb cannon and no special weapons.",true];
      
      public static var achievementBossOnlySpecialData:Array = ["CHUCK NORRIS","Win a boss level with 3 bosses, and get 3 medals without using any primary weapons.",true];
      
      public static var obtainKills1:Array = ["Number",100];
      
      public static var obtainKills2:Array = ["Number",1000];
      
      public static var obtainKills3:Array = ["Number",10000];
      
      public static var obtainMoney1:Array = ["Number",10000];
      
      public static var obtainMoney2:Array = ["Number",100000];
      
      public static var obtainMoney3:Array = ["Number",1000000];
      
      public static var obtainMaxedPrimary1:Array = ["Number",1];
      
      public static var obtainMaxedPrimary2:Array = ["Number",5];
      
      public static var obtainMaxedPrimary3:Array = ["Number",10];
      
      public static var obtainMaxedSecondary1:Array = ["Number",1];
      
      public static var obtainMaxedSecondary2:Array = ["Number",5];
      
      public static var obtainMaxedSecondary3:Array = ["Number",10];
      
      public static var obtainPoisonDoctor:Array = ["Boolean"];
      
      public static var obtainFreezeTemperamental:Array = ["Boolean"];
      
      public static var obtainTrapMine:Array = ["Boolean"];
      
      public static var obtainAddictedCake:Array = ["Boolean"];
      
      public static var obtainRacing:Array = ["Boolean"];
      
      public static var obtainIdle:Array = ["Boolean"];
      
      public static var obtainStars1:Array = ["NumberArray",60];
      
      public static var obtainStars2:Array = ["NumberArray",120];
      
      public static var obtainStars3:Array = ["NumberArray",180];
      
      public static var obtainFlags1:Array = ["NumberArray",60];
      
      public static var obtainFlags2:Array = ["NumberArray",120];
      
      public static var obtainFlags3:Array = ["NumberArray",180];
      
      public static var obtainTowers1:Array = ["NumberArray",60];
      
      public static var obtainTowers2:Array = ["NumberArray",120];
      
      public static var obtainTowers3:Array = ["NumberArray",180];
      
      public static var obtainShields1:Array = ["NumberArray",60];
      
      public static var obtainShields2:Array = ["NumberArray",120];
      
      public static var obtainShields3:Array = ["NumberArray",180];
      
      public static var obtainBosses1:Array = ["NumberArray",30];
      
      public static var obtainBosses2:Array = ["NumberArray",60];
      
      public static var obtainBosses3:Array = ["NumberArray",90];
      
      public static var obtainFlagNoWeapons:Array = ["Boolean"];
      
      public static var obtainDefensiveBombs:Array = ["Boolean"];
      
      public static var obtainBossOnlySpecial:Array = ["Boolean"];
      
      public static var newAchievementsArray:Array = [];
      
      public static var textFormat:TextFormat = new TextFormat("JG",12,16777215,true,false,false);
      
      public static var killsText:TextField = new TextField();
      
      public static var moneyText:TextField = new TextField();
      
      private static var bronzeStarsText:TextField = new TextField();
      
      private static var silverStarsText:TextField = new TextField();
      
      private static var goldStarsText:TextField = new TextField();
      
      private static var bronzeFlagsText:TextField = new TextField();
      
      private static var silverFlagsText:TextField = new TextField();
      
      private static var goldFlagsText:TextField = new TextField();
      
      private static var bronzeTowersText:TextField = new TextField();
      
      private static var silverTowersText:TextField = new TextField();
      
      private static var goldTowersText:TextField = new TextField();
      
      private static var bronzeShieldsText:TextField = new TextField();
      
      private static var silverShieldsText:TextField = new TextField();
      
      private static var goldShieldsText:TextField = new TextField();
      
      private static var bronzeBossesText:TextField = new TextField();
      
      private static var silverBossesText:TextField = new TextField();
      
      private static var goldBossesText:TextField = new TextField();
      
      private var bgMenu:BackgroundMenu = new BackgroundMenu();
      
      private var contentHolder:MovieClip = new MovieClip();
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var bgWindow:BackgroundWindow = new BackgroundWindow();
      
      private var shadowArray:Array = filters;
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var theTitle:TitleAchievements = new TitleAchievements();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var contentTween:Tween = new Tween(this.contentHolder,"x",Strong.easeOut,-410,0,20,false);
      
      private var isAdded:Boolean = false;
      
      public function ScreenAchievements()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
      }
      
      public static function updateAchievements() : *
      {
         newAchievementsArray = [];
         for(var i:* = 0; i < achievementPlacementArray.length; i++)
         {
            achievementCheck(achievementPlacementArray[i][0]);
         }
         SaveManager.saveStatsAchievements();
         return newAchievementsArray;
      }
      
      private static function giveAchievementToAPI(theName:String) : void
      {
      }
      
      public static function achievementCheck(theName:String, checkEveryFrame:Boolean = false) : *
      {
         var theVariable:* = undefined;
         var theRequirement:* = undefined;
         var type:* = undefined;
         var difficultyMatters:* = undefined;
         var winStateValue:* = undefined;
         var won:* = undefined;
         var numberVarArray:* = undefined;
         var achievementLevelMode:* = undefined;
         var valueType:* = undefined;
         var obtainData:* = ScreenAchievements["obtain" + theName];
         if(obtainData == null)
         {
            return false;
         }
         theRequirement = obtainData[1];
         type = obtainData[0];
         difficultyMatters = ScreenAchievements["achievement" + theName + "Data"][2];
         if(type == "NumberArray")
         {
         }
         if(difficultyMatters)
         {
            switch(ScreenLevelSelect.levelDifficulty)
            {
               case "Easy":
                  winStateValue = 1;
                  break;
               case "Medium":
                  winStateValue = 2;
                  break;
               case "Hard":
                  winStateValue = 3;
            }
         }
         else
         {
            winStateValue = 0;
         }
         switch(theName)
         {
            case "Kills1":
            case "Kills2":
            case "Kills3":
               if(!isNaN(PartGameArea.tempEnemyKills))
               {
                  theVariable = enemyKills + PartGameArea.tempEnemyKills;
               }
               else
               {
                  theVariable = enemyKills;
               }
               break;
            case "Money1":
            case "Money2":
            case "Money3":
               if(!isNaN(ScreenGame.money))
               {
                  theVariable = moneyEarned + ScreenGame.money;
               }
               else
               {
                  theVariable = moneyEarned;
               }
               break;
            case "PoisonDoctor":
               if(PartGameArea.tempDoctorPoisoned != null)
               {
                  theVariable = PartGameArea.tempDoctorPoisoned;
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempDoctorPoisoned = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "FreezeTemperamental":
               if(PartGameArea.tempTemperamentalFrozen != null)
               {
                  theVariable = PartGameArea.tempTemperamentalFrozen;
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempTemperamentalFrozen = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "TrapMine":
               if(PartGameArea.tempTrapEnemyMineKill != null)
               {
                  theVariable = PartGameArea.tempTrapEnemyMineKill;
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempTrapEnemyMineKill = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "AddictedCake":
               if(PartGameArea.tempDamageAddictEnemyCake != null)
               {
                  theVariable = PartGameArea.tempDamageAddictEnemyCake;
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempDamageAddictEnemyCake = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "Racing":
               if(PartGameArea.tempHitBottom != null)
               {
                  if(ScreenLevelSelect.levelMode == "Defense")
                  {
                     theVariable = PartGameArea.tempHitBottom;
                  }
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempHitBottom = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "Idle":
               if(PartGameArea.tempNothingPressed != null && PartGameArea.levelDone)
               {
                  if(PartGameArea.tempNothingPressed && PartGameArea.levelDone)
                  {
                     theVariable = true;
                  }
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempNothingPressed = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "Stars1":
            case "Stars2":
            case "Stars3":
            case "Flags1":
            case "Flags2":
            case "Flags3":
            case "Towers1":
            case "Towers2":
            case "Towers3":
            case "Shields1":
            case "Shields2":
            case "Shields3":
            case "Bosses1":
            case "Bosses2":
            case "Bosses3":
               if(checkEveryFrame && !isNaN(PartGameArea.tempValuesEarned))
               {
                  switch(theName.slice(0,-1))
                  {
                     case "Stars":
                        achievementLevelMode = "Normal";
                        break;
                     case "Flags":
                        achievementLevelMode = "Flag";
                        break;
                     case "Towers":
                        achievementLevelMode = "Tower";
                        break;
                     case "Shields":
                        achievementLevelMode = "Defense";
                        break;
                     case "Bosses":
                        achievementLevelMode = "Boss";
                  }
                  if(achievementLevelMode == ScreenLevelSelect.levelMode)
                  {
                     theVariable = PartGameArea.tempValuesEarned;
                  }
                  else
                  {
                     theVariable = 0;
                  }
               }
               else
               {
                  valueType = theName.slice(0,-1);
                  numberVarArray = [ScreenLevelSelect.getTotalValues(valueType,3),ScreenLevelSelect.getTotalValues(valueType,2),ScreenLevelSelect.getTotalValues(valueType,1)];
               }
               break;
            case "FlagNoWeapons":
               if(PartGameArea.tempNoWeaponsUsed != null && PartGameArea.levelDone != null)
               {
                  if(PartGameArea.tempNoWeaponsUsed && PartGameArea.levelDone && ScreenLevelSelect.levelMode == "Flag")
                  {
                     theVariable = true;
                  }
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempNoWeaponsUsed = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "DefensiveBombs":
               if(PartGameArea.tempTimedBombsFired != null && PartGameArea.tempOtherThanTimedBombsFired != null && PartGameArea.levelDone != null)
               {
                  if(ScreenLevelSelect.levelMode == "Defense" && PartGameArea.tempTimedBombsFired && !PartGameArea.tempOtherThanTimedBombsFired && PartGameArea.levelDone)
                  {
                     theVariable = true;
                  }
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempTimedBombsFired = false;
                     PartGameArea.tempOtherThanTimedBombsFired = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "BossOnlySpecial":
               if(PartGameArea.tempOnlySpecialWeapons != null && PartGameArea.tempThreeBosses != null && PartGameArea.levelDone != null)
               {
                  if(ScreenLevelSelect.levelMode == "Boss" && PartGameArea.tempOnlySpecialWeapons && PartGameArea.tempThreeBosses && PartGameArea.levelDone)
                  {
                     theVariable = true;
                  }
                  if(!checkEveryFrame)
                  {
                     PartGameArea.tempOnlySpecialWeapons = false;
                     PartGameArea.tempThreeBosses = false;
                  }
               }
               else
               {
                  theVariable = false;
               }
               break;
            case "MaxedPrimary1":
            case "MaxedPrimary2":
            case "MaxedPrimary3":
               if(!isNaN(ScreenUpgrades.tempPrimaryWeaponsMaxed))
               {
                  theVariable = ScreenUpgrades.tempPrimaryWeaponsMaxed;
               }
               else
               {
                  theVariable = 0;
               }
               break;
            case "MaxedSecondary1":
            case "MaxedSecondary2":
            case "MaxedSecondary3":
               if(!isNaN(ScreenUpgrades.tempSecondaryWeaponsMaxed))
               {
                  theVariable = ScreenUpgrades.tempSecondaryWeaponsMaxed;
               }
               else
               {
                  theVariable = 0;
               }
         }
         won = false;
         switch(type)
         {
            case "Number":
               if(theVariable >= theRequirement && ScreenAchievements["achievement" + theName + "State"] < winStateValue)
               {
                  if(checkEveryFrame)
                  {
                     return true;
                  }
                  won = true;
               }
               else if(checkEveryFrame)
               {
                  return false;
               }
               break;
            case "Boolean":
               if(Boolean(theVariable) && ScreenAchievements["achievement" + theName + "State"] < winStateValue)
               {
                  if(checkEveryFrame)
                  {
                     return true;
                  }
                  won = true;
               }
               else if(checkEveryFrame)
               {
                  return false;
               }
               break;
            case "NumberArray":
               if(checkEveryFrame)
               {
                  if(theVariable >= theRequirement && ScreenAchievements["achievement" + theName + "State"] < winStateValue)
                  {
                     return true;
                  }
                  return false;
               }
               winStateValue = -1;
               if(numberVarArray[0] >= theRequirement)
               {
                  winStateValue = 3;
               }
               else if(numberVarArray[1] >= theRequirement)
               {
                  winStateValue = 2;
               }
               else if(numberVarArray[2] >= theRequirement)
               {
                  winStateValue = 1;
               }
               if(ScreenAchievements["achievement" + theName + "State"] < winStateValue)
               {
                  won = true;
               }
         }
         if(won)
         {
            ScreenAchievements["achievement" + theName + "State"] = winStateValue;
            newAchievementsArray.push(theName);
            giveAchievementToAPI(theName + "_" + winStateValue);
         }
      }
      
      public static function checkToGiveAchievementsToAPI() : void
      {
         var theName:* = undefined;
         var winState:* = undefined;
         for(var i:* = 0; i < achievementPlacementArray.length; i++)
         {
            theName = achievementPlacementArray[i][0];
            winState = ScreenAchievements["achievement" + theName + "State"];
            if(winState > -1)
            {
               giveAchievementToAPI(theName + "_" + winState);
            }
         }
      }
      
      public function added(event:Event) : void
      {
         var bronzeStarIcon:IconStar = null;
         var silverStarIcon:IconStar = null;
         var goldStarIcon:IconStar = null;
         var bronzeFlagIcon:IconFlag = null;
         var silverFlagIcon:IconFlag = null;
         var goldFlagIcon:IconFlag = null;
         var bronzeTowerIcon:IconTower = null;
         var silverTowerIcon:IconTower = null;
         var goldTowerIcon:IconTower = null;
         var bronzeShieldIcon:IconShield = null;
         var silverShieldIcon:IconShield = null;
         var goldShieldIcon:IconShield = null;
         var bronzeBossIcon:IconBoss = null;
         var silverBossIcon:IconBoss = null;
         var goldBossIcon:IconBoss = null;
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            addChild(this.bgTitle);
            addChild(this.bgMenu);
            this.bgMenu.y = this.bgTitle.height;
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            addChild(this.sponsorLogo);
            addChild(this.bgWindow);
            this.bgWindow.x = 640 - this.bgWindow.width;
            this.bgWindow.y = this.bgTitle.height;
            addChild(this.contentHolder);
            this.contentHolder.x = -410;
            this.placeAchievements();
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 432;
            this.addText(killsText,textFormat,16777215,"Kills: " + Functions.formatNumber(enemyKills),16,230,this.bgWindow.x + 8,this.bgWindow.y + 8,false,true);
            this.addText(moneyText,textFormat,16777215,"Money Earned: $" + Functions.formatNumber(moneyEarned),16,230,this.bgWindow.x + 8,this.bgWindow.y + 26,false,true);
            bronzeStarIcon = new IconStar();
            addChild(bronzeStarIcon);
            bronzeStarIcon.gotoAndStop(1);
            bronzeStarIcon.x = 426;
            bronzeStarIcon.y = 280;
            silverStarIcon = new IconStar();
            addChild(silverStarIcon);
            silverStarIcon.gotoAndStop(2);
            silverStarIcon.x = 504;
            silverStarIcon.y = 280;
            goldStarIcon = new IconStar();
            addChild(goldStarIcon);
            goldStarIcon.gotoAndStop(3);
            goldStarIcon.x = 582;
            goldStarIcon.y = 280;
            this.addText(bronzeStarsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Stars",1),16,230,bronzeStarIcon.x + 12,bronzeStarIcon.y - 7,false,true);
            this.addText(silverStarsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Stars",2),16,230,silverStarIcon.x + 12,silverStarIcon.y - 7,false,true);
            this.addText(goldStarsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Stars",3),16,230,goldStarIcon.x + 12,goldStarIcon.y - 7,false,true);
            bronzeFlagIcon = new IconFlag();
            addChild(bronzeFlagIcon);
            bronzeFlagIcon.gotoAndStop(1);
            bronzeFlagIcon.x = 426;
            bronzeFlagIcon.y = 312;
            silverFlagIcon = new IconFlag();
            addChild(silverFlagIcon);
            silverFlagIcon.gotoAndStop(2);
            silverFlagIcon.x = 504;
            silverFlagIcon.y = 312;
            goldFlagIcon = new IconFlag();
            addChild(goldFlagIcon);
            goldFlagIcon.gotoAndStop(3);
            goldFlagIcon.x = 582;
            goldFlagIcon.y = 312;
            this.addText(bronzeFlagsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Flags",1),16,230,bronzeFlagIcon.x + 12,bronzeFlagIcon.y - 7,false,true);
            this.addText(silverFlagsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Flags",2),16,230,silverFlagIcon.x + 12,silverFlagIcon.y - 7,false,true);
            this.addText(goldFlagsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Flags",3),16,230,goldFlagIcon.x + 12,goldFlagIcon.y - 7,false,true);
            bronzeTowerIcon = new IconTower();
            addChild(bronzeTowerIcon);
            bronzeTowerIcon.gotoAndStop(1);
            bronzeTowerIcon.x = 426;
            bronzeTowerIcon.y = 344;
            silverTowerIcon = new IconTower();
            addChild(silverTowerIcon);
            silverTowerIcon.gotoAndStop(2);
            silverTowerIcon.x = 504;
            silverTowerIcon.y = 344;
            goldTowerIcon = new IconTower();
            addChild(goldTowerIcon);
            goldTowerIcon.gotoAndStop(3);
            goldTowerIcon.x = 582;
            goldTowerIcon.y = 344;
            this.addText(bronzeTowersText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Towers",1),16,230,bronzeTowerIcon.x + 12,bronzeTowerIcon.y - 7,false,true);
            this.addText(silverTowersText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Towers",2),16,230,silverTowerIcon.x + 12,silverTowerIcon.y - 7,false,true);
            this.addText(goldTowersText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Towers",3),16,230,goldTowerIcon.x + 12,goldTowerIcon.y - 7,false,true);
            bronzeShieldIcon = new IconShield();
            addChild(bronzeShieldIcon);
            bronzeShieldIcon.gotoAndStop(1);
            bronzeShieldIcon.x = 426;
            bronzeShieldIcon.y = 376;
            silverShieldIcon = new IconShield();
            addChild(silverShieldIcon);
            silverShieldIcon.gotoAndStop(2);
            silverShieldIcon.x = 504;
            silverShieldIcon.y = 376;
            goldShieldIcon = new IconShield();
            addChild(goldShieldIcon);
            goldShieldIcon.gotoAndStop(3);
            goldShieldIcon.x = 582;
            goldShieldIcon.y = 376;
            this.addText(bronzeShieldsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Shields",1),16,230,bronzeShieldIcon.x + 12,bronzeShieldIcon.y - 7,false,true);
            this.addText(silverShieldsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Shields",2),16,230,silverShieldIcon.x + 12,silverShieldIcon.y - 7,false,true);
            this.addText(goldShieldsText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Shields",3),16,230,goldShieldIcon.x + 12,goldShieldIcon.y - 7,false,true);
            bronzeBossIcon = new IconBoss();
            addChild(bronzeBossIcon);
            bronzeBossIcon.gotoAndStop(1);
            bronzeBossIcon.x = 426;
            bronzeBossIcon.y = 408;
            silverBossIcon = new IconBoss();
            addChild(silverBossIcon);
            silverBossIcon.gotoAndStop(2);
            silverBossIcon.x = 504;
            silverBossIcon.y = 408;
            goldBossIcon = new IconBoss();
            addChild(goldBossIcon);
            goldBossIcon.gotoAndStop(3);
            goldBossIcon.x = 582;
            goldBossIcon.y = 408;
            this.addText(bronzeBossesText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Bosses",1),16,230,bronzeBossIcon.x + 12,bronzeBossIcon.y - 7,false,true);
            this.addText(silverBossesText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Bosses",2),16,230,silverBossIcon.x + 12,silverBossIcon.y - 7,false,true);
            this.addText(goldBossesText,textFormat,16777215,"" + ScreenLevelSelect.getTotalValues("Bosses",3),16,230,goldBossIcon.x + 12,goldBossIcon.y - 7,false,true);
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
         }
      }
      
      public function update(event:Event) : void
      {
      }
      
      private function placeAchievements() : void
      {
         var achievementInfo:* = undefined;
         var achievement:* = undefined;
         var achievementData:* = undefined;
         for(var i:* = 0; i < achievementPlacementArray.length; i++)
         {
            achievementInfo = achievementPlacementArray[i];
            achievement = new (getDefinitionByName("Achievement" + achievementInfo[0]) as Class)();
            achievementData = ScreenAchievements["achievement" + achievementInfo[0] + "Data"];
            achievement.pText = this.pInfoText;
            achievement.theTitle = achievementData[0];
            achievement.theDescription = achievementData[1];
            achievement.theDifficulty = achievementData[2];
            achievement.thisState = ScreenAchievements["achievement" + achievementInfo[0] + "State"];
            achievement.x = achievementInfo[1];
            achievement.y = achievementInfo[2];
            this.contentHolder.addChild(achievement);
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
   }
}

