package
{
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.net.SharedObject;
   import flash.utils.ByteArray;
   
   public class SaveManager extends Sprite
   {
      
      public static var gameSave:SharedObject;
      
      public static var optionsSave:SharedObject;
      
      public static var saveOn:Boolean = true;
      
      public static var onlineSaveSlot:int = 0;
      
      public static var saveString:String = "";
      
      public static var lastSaveString:String = "";
      
      public static const alphabet:String = "abcdefghijklmnopqrstuvwxyz";
      
      public static var saveString1Updated:Boolean = false;
      
      public static var saveString2Updated:Boolean = false;
      
      public static var saveString3Updated:Boolean = false;
      
      public static var saveStringLoaded:Boolean = false;
      
      public static var onlineString1:String = "";
      
      public static var onlineString2:String = "";
      
      public static var onlineString3:String = "";
      
      public static var onlineString1Loaded:Boolean = false;
      
      public static var onlineString2Loaded:Boolean = false;
      
      public static var onlineString3Loaded:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public function SaveManager()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         optionsSave = SharedObject.getLocal("CircularTankOptions");
         initAndLoadOptions();
      }
      
      public static function checkIfSlotHasData(slot:int) : Boolean
      {
         var hasData:* = false;
         var parenthesisFound:int = 0;
         var parenthesis1Pos:int = 0;
         for(var i:* = 0; i < saveString.length; i++)
         {
            if(saveString.charAt(i) == "(")
            {
               parenthesisFound++;
            }
            if(parenthesisFound == slot)
            {
               if(saveString.charAt(i + 1) != ")")
               {
                  hasData = true;
               }
               break;
            }
         }
         return hasData;
      }
      
      public static function numberArrayToShortString(array:Array, arraysInArrays:int) : String
      {
         var ii:* = undefined;
         var iii:* = undefined;
         var shortString:* = "";
         for(var i:* = 0; i < array.length; i++)
         {
            if(arraysInArrays == 1)
            {
               shortString += String(array[i]);
            }
            else
            {
               for(ii = 0; ii < array[i].length; ii++)
               {
                  if(arraysInArrays == 2)
                  {
                     shortString += String(array[i][ii]);
                  }
                  else if(arraysInArrays == 3)
                  {
                     for(iii = 0; iii < array[i][ii].length; iii++)
                     {
                        shortString += String(array[i][ii][iii]);
                     }
                  }
               }
            }
         }
         return shortString;
      }
      
      public static function saveUIHelpers() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.uihButtonLevel = Main.uihButtonLevel;
               gameSave.data.uihButtonPlayLevel = Main.uihButtonPlayLevel;
               gameSave.data.uihButtonNextLevel = Main.uihButtonNextLevel;
               gameSave.data.uihButtonSquarePage = Main.uihButtonSquarePage;
               gameSave.data.uihButtonUpgrades = Main.uihButtonUpgrades;
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE UIHELPERS");
      }
      
      public static function booleanToNumber(bool:Boolean) : Number
      {
         if(bool)
         {
            return 1;
         }
         return 0;
      }
      
      public static function savePremiumContent() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.extraMoneyGiven = Main.extraMoneyGiven;
               gameSave.data.money = ScreenUpgrades.money;
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
      }
      
      public static function getServerSaveString() : void
      {
         Main.agi.storage.user.retrieve({
            "key":"gameSave1",
            "callback":function(data:Object):void
            {
               if(data.success)
               {
                  onlineString1Loaded = true;
                  onlineString1 = data.keys.gameSave1.gameSaveString;
               }
               else
               {
                  trace(data.error);
               }
            }
         });
         Main.agi.storage.user.retrieve({
            "key":"gameSave2",
            "callback":function(data:Object):void
            {
               if(data.success)
               {
                  onlineString2Loaded = true;
                  onlineString2 = data.keys.gameSave2.gameSaveString;
               }
               else
               {
                  trace(data.error);
               }
            }
         });
         Main.agi.storage.user.retrieve({
            "key":"gameSave3",
            "callback":function(data:Object):void
            {
               if(data.success)
               {
                  onlineString3Loaded = true;
                  onlineString3 = data.keys.gameSave3.gameSaveString;
               }
               else
               {
                  trace(data.error);
               }
            }
         });
      }
      
      public static function loadVarsFromSaveString(slot:int, onlyLoadWorldAndDateText:Boolean = false, onlyExtraMoneyGiven:Boolean = false) : *
      {
         var theVar:String = null;
         var theValue:String = null;
         var findType:String = null;
         var u:* = undefined;
         var worldDateArray:Array = [];
         var parenthesisFound:int = 0;
         var parenthesis1Pos:int = 0;
         for(var i:* = 0; i < saveString.length; i++)
         {
            if(saveString.charAt(i) == "(")
            {
               parenthesisFound++;
            }
            if(parenthesisFound == slot)
            {
               parenthesis1Pos = i;
               break;
            }
         }
         var endParenthesisFound:Boolean = false;
         var searchPosition:int = parenthesis1Pos + 1;
         while(!endParenthesisFound)
         {
            theVar = "";
            theValue = "";
            findType = "var";
            for(u = searchPosition; u < saveString.length; u++)
            {
               if(findType == "var")
               {
                  if(saveString.charAt(u) != "=")
                  {
                     theVar += saveString.charAt(u);
                  }
                  else
                  {
                     findType = "value";
                  }
               }
               else if(findType == "value")
               {
                  if(saveString.charAt(u) == ";")
                  {
                     searchPosition = u + 1;
                     break;
                  }
                  theValue += saveString.charAt(u);
               }
               if(saveString.charAt(u) == ")")
               {
                  endParenthesisFound = true;
                  break;
               }
            }
            if(!(theVar != "" && theValue != ""))
            {
               continue;
            }
            if(!onlyLoadWorldAndDateText && !onlyExtraMoneyGiven)
            {
               switch(theVar)
               {
                  case "m":
                     ScreenUpgrades.money = Number(theValue);
                     break;
                  case "la":
                     ScreenUpgrades.levelsArray = alphabetShortStringToNumberArray(theValue);
                     break;
                  case "lam":
                     ScreenUpgrades.levelsArrayMisc = alphabetShortStringToNumberArray(theValue);
                     break;
                  case "las":
                     ScreenUpgrades.levelsArraySecondary = alphabetShortStringToNumberArray(theValue);
                     break;
                  case "ew":
                     ScreenGame.equippedWeapons = shortStringToStringArray(theValue);
                     break;
                  case "pw":
                     ScreenGame.primaryWeapon = theValue;
                     break;
                  case "sw":
                     ScreenGame.secondaryWeapon = theValue;
                     break;
                  case "wva":
                     ScreenLevelSelect.worldsValuesArrays = getWorldValuesArraysFromShortString(theValue);
                     break;
                  case "pw":
                     ScreenLevelSelect.previousWorld = Number(theValue);
                     break;
                  case "pl":
                     ScreenLevelSelect.previousLevel = Number(theValue);
                     break;
                  case "plw":
                     ScreenLevelSelect.previousLevelWon = numberToBoolean(Number(theValue));
                  case "kea":
                     ScreenEnemies.knownEnemiesArray = shortStringToStringArray(theValue);
                     break;
                  case "ek":
                     ScreenAchievements.enemyKills = Number(theValue) - 1;
                     break;
                  case "me":
                     ScreenAchievements.moneyEarned = Number(theValue) - 1;
                     break;
                  case "ak1s":
                     ScreenAchievements.achievementKills1State = Number(theValue) - 1;
                     break;
                  case "ak2s":
                     ScreenAchievements.achievementKills2State = Number(theValue) - 1;
                     break;
                  case "ak3s":
                     ScreenAchievements.achievementKills3State = Number(theValue) - 1;
                     break;
                  case "am1s":
                     ScreenAchievements.achievementMoney1State = Number(theValue) - 1;
                     break;
                  case "am2s":
                     ScreenAchievements.achievementMoney2State = Number(theValue) - 1;
                     break;
                  case "am3s":
                     ScreenAchievements.achievementMoney3State = Number(theValue) - 1;
                     break;
                  case "amp1s":
                     ScreenAchievements.achievementMaxedPrimary1State = Number(theValue) - 1;
                     break;
                  case "amp2s":
                     ScreenAchievements.achievementMaxedPrimary2State = Number(theValue) - 1;
                     break;
                  case "amp3s":
                     ScreenAchievements.achievementMaxedPrimary3State = Number(theValue) - 1;
                     break;
                  case "ams1s":
                     ScreenAchievements.achievementMaxedSecondary1State = Number(theValue) - 1;
                     break;
                  case "ams2s":
                     ScreenAchievements.achievementMaxedSecondary2State = Number(theValue) - 1;
                     break;
                  case "ams3s":
                     ScreenAchievements.achievementMaxedSecondary3State = Number(theValue) - 1;
                     break;
                  case "apds":
                     ScreenAchievements.achievementPoisonDoctorState = Number(theValue) - 1;
                     break;
                  case "afts":
                     ScreenAchievements.achievementFreezeTemperamentalState = Number(theValue) - 1;
                     break;
                  case "atms":
                     ScreenAchievements.achievementTrapMineState = Number(theValue) - 1;
                     break;
                  case "aacs":
                     ScreenAchievements.achievementAddictedCakeState = Number(theValue) - 1;
                     break;
                  case "ars":
                     ScreenAchievements.achievementRacingState = Number(theValue) - 1;
                     break;
                  case "ais":
                     ScreenAchievements.achievementIdleState = Number(theValue) - 1;
                     break;
                  case "as1s":
                     ScreenAchievements.achievementStars1State = Number(theValue) - 1;
                     break;
                  case "as2s":
                     ScreenAchievements.achievementStars2State = Number(theValue) - 1;
                     break;
                  case "as3s":
                     ScreenAchievements.achievementStars3State = Number(theValue) - 1;
                     break;
                  case "af1s":
                     ScreenAchievements.achievementFlags1State = Number(theValue) - 1;
                     break;
                  case "af2s":
                     ScreenAchievements.achievementFlags2State = Number(theValue) - 1;
                     break;
                  case "af3s":
                     ScreenAchievements.achievementFlags3State = Number(theValue) - 1;
                     break;
                  case "at1s":
                     ScreenAchievements.achievementTowers1State = Number(theValue) - 1;
                     break;
                  case "at2s":
                     ScreenAchievements.achievementTowers2State = Number(theValue) - 1;
                     break;
                  case "at3s":
                     ScreenAchievements.achievementTowers3State = Number(theValue) - 1;
                     break;
                  case "ash1s":
                     ScreenAchievements.achievementShields1State = Number(theValue) - 1;
                     break;
                  case "ash2s":
                     ScreenAchievements.achievementShields2State = Number(theValue) - 1;
                     break;
                  case "ash3s":
                     ScreenAchievements.achievementShields3State = Number(theValue) - 1;
                     break;
                  case "ab1s":
                     ScreenAchievements.achievementBosses1State = Number(theValue) - 1;
                     break;
                  case "ab2s":
                     ScreenAchievements.achievementBosses2State = Number(theValue) - 1;
                     break;
                  case "ab3s":
                     ScreenAchievements.achievementBosses3State = Number(theValue) - 1;
                     break;
                  case "afnws":
                     ScreenAchievements.achievementFlagNoWeaponsState = Number(theValue) - 1;
                     break;
                  case "adbs":
                     ScreenAchievements.achievementDefensiveBombsState = Number(theValue) - 1;
                     break;
                  case "aboss":
                     ScreenAchievements.achievementBossOnlySpecialState = Number(theValue) - 1;
                     break;
                  case "tc":
                     PartTutorial.tutorialCompleted = numberToBoolean(Number(theValue));
                     break;
                  case "tau":
                     PartTutorial.tutorialArrayUnseen = shortStringToStringArray(theValue);
                     break;
                  case "taq":
                     PartTutorial.tutorialArrayQueue = shortStringToStringArray(theValue);
                     break;
                  case "tad":
                     PartTutorial.tutorialArrayDone = shortStringToStringArray(theValue);
                     break;
                  case "ubl":
                     Main.uihButtonLevel = numberToBoolean(Number(theValue));
                     break;
                  case "ubpl":
                     Main.uihButtonPlayLevel = numberToBoolean(Number(theValue));
                     break;
                  case "ubnl":
                     Main.uihButtonNextLevel = numberToBoolean(Number(theValue));
                     break;
                  case "ubsp":
                     Main.uihButtonSquarePage = numberToBoolean(Number(theValue));
                     break;
                  case "ubu":
                     Main.uihButtonUpgrades = numberToBoolean(Number(theValue));
                     break;
                  case "hdc":
                     Main.hDifficultyChosen = numberToBoolean(Number(theValue));
                     break;
                  case "emg":
                     Main.extraMoneyGiven = numberToBoolean(Number(theValue));
               }
               continue;
            }
            if(onlyLoadWorldAndDateText)
            {
               switch(theVar)
               {
                  case "dt":
                     worldDateArray.push(theValue);
                     break;
                  case "wl":
                     worldDateArray.push(theValue);
               }
               continue;
            }
            if(!onlyExtraMoneyGiven)
            {
               continue;
            }
            switch(theVar)
            {
               case "emg":
                  return numberToBoolean(Number(theValue));
            }
         }
         if(onlyLoadWorldAndDateText)
         {
            return worldDateArray;
         }
      }
      
      public static function getWorldValuesArraysFromShortString(string:String) : Array
      {
         var smallArray:* = [];
         var mediumArray:* = [];
         var finalArray:* = [];
         for(var i:* = 0; i < string.length; i++)
         {
            smallArray.push(Number(string.charAt(i)));
            if(smallArray.length == 3)
            {
               mediumArray.push(smallArray);
               smallArray = [];
               if(mediumArray.length == 45)
               {
                  finalArray.push(mediumArray);
                  mediumArray = [];
               }
            }
         }
         return finalArray;
      }
      
      public static function setDateAndTime() : String
      {
         var dat:Date = new Date();
         var months:Array = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
         var hours:* = String(dat.getHours());
         var minutes:* = String(dat.getMinutes());
         if(hours.length == 1)
         {
            hours = "0" + hours;
         }
         if(minutes.length == 1)
         {
            minutes = "0" + minutes;
         }
         var timeDateString:String = "" + dat.getDate() + "/" + months[dat.getMonth()] + "/" + String(dat.getFullYear()).slice(2) + "/" + hours + ":" + minutes;
         if(!Main.currentSaveIsOnline)
         {
            gameSave.data.gameDateTime = timeDateString;
         }
         return timeDateString;
      }
      
      public static function resetPublicStatics() : void
      {
         ScreenLevelSelect.progressWorld = 0;
         ScreenLevelSelect.changeToWorlds = false;
         ScreenLevelSelect.changeToLevels = false;
         ScreenGame.level = 0;
         ScreenGame.world = 0;
      }
      
      public static function setGameSave(slotNumber:Number) : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(slotNumber == 1)
            {
               gameSave = SharedObject.getLocal("CircularTankSave1");
            }
            else if(slotNumber == 2)
            {
               gameSave = SharedObject.getLocal("CircularTankSave2");
            }
            else if(slotNumber == 3)
            {
               gameSave = SharedObject.getLocal("CircularTankSave3");
            }
         }
         else
         {
            gameSave = null;
            onlineSaveSlot = slotNumber;
         }
      }
      
      public static function sendSaveString(slotNum:int) : void
      {
         var string1:* = partOfSaveString(saveString,slotNum);
         var string2:* = partOfSaveString(lastSaveString,slotNum);
         if(string1 != string2 && removeDateFromSaveString(string1) != removeDateFromSaveString(string2))
         {
            lastSaveString = saveString;
            submitSaveSlotToServer(slotNum);
         }
      }
      
      public static function submitSaveSlotToServer(slotNum:int) : void
      {
         Main.agi.storage.user.submit({
            "key":"gameSave" + slotNum,
            "value":{"gameSaveString":partOfSaveString(saveString,slotNum)},
            "callback":function(data:Object):void
            {
               if(!data.success)
               {
                  trace(data.error);
               }
            }
         });
      }
      
      public static function alphabetShortStringToNumberArray(string:String) : Array
      {
         var character:* = undefined;
         var count:* = undefined;
         var ii:* = undefined;
         var array:* = [];
         for(var i:* = 0; i < string.length; i++)
         {
            character = string.charAt(i);
            count = 0;
            for(ii = 0; ii < alphabet.length; ii++)
            {
               if(character == alphabet.charAt(ii))
               {
                  break;
               }
               count++;
            }
            array.push(count);
         }
         return array;
      }
      
      public static function saveEquips() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.equippedWeapons = clone(ScreenGame.equippedWeapons);
               gameSave.data.primaryWeapon = ScreenGame.primaryWeapon;
               gameSave.data.secondaryWeapon = ScreenGame.secondaryWeapon;
               setDateAndTime();
               gameSave.flush();
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE EQUIPS");
      }
      
      public static function clone(source:Object) : *
      {
         var myBA:ByteArray = new ByteArray();
         myBA.writeObject(source);
         myBA.position = 0;
         return myBA.readObject();
      }
      
      public static function numberArrayToAlphabetShortString(array:Array) : String
      {
         var shortString:* = "";
         for(var i:* = 0; i < array.length; i++)
         {
            shortString += alphabet.charAt(array[i]);
         }
         return shortString;
      }
      
      public static function initGame() : void
      {
         ScreenUpgrades.money = 0;
         ScreenUpgrades.levelsArray = [1,0,0,0,0,0,0,0,0,0,0,0];
         ScreenUpgrades.levelsArrayMisc = [0,0,0,0,0,0,0,0,0,0,0,0];
         ScreenUpgrades.levelsArraySecondary = [1,0,0,0,0,0,0,0,0,0,0,0];
         ScreenGame.equippedWeapons = ["Cannon","None"];
         ScreenGame.primaryWeapon = "Cannon";
         ScreenGame.secondaryWeapon = "Mine";
         ScreenLevelSelect.worldsValuesArrays = [ScreenLevelSelect.valuesArrayW1,ScreenLevelSelect.valuesArrayW2,ScreenLevelSelect.valuesArrayW3,ScreenLevelSelect.valuesArrayW4,ScreenLevelSelect.valuesArrayW5,ScreenLevelSelect.valuesArrayW6,ScreenLevelSelect.valuesArrayW7,ScreenLevelSelect.valuesArrayW8,ScreenLevelSelect.valuesArrayW9];
         ScreenLevelSelect.initWorldValues();
         ScreenLevelSelect.worldsValuesVisibleArrays = clone(ScreenLevelSelect.worldsValuesArrays);
         ScreenLevelSelect.previousWorld = 1;
         ScreenLevelSelect.previousLevel = 1;
         ScreenLevelSelect.previousLevelWon = false;
         LevelGuide.type = "Upcoming";
         LevelGuide.selectedWorld = 1;
         LevelGuide.selectedLevel = 1;
         LevelGuide.maxWorld = 1;
         LevelGuide.maxLevel = 1;
         ScreenLevelSelect.selectedWorld = 1;
         ScreenEnemies.knownEnemiesArray = ["Basic"];
         ScreenAchievements.enemyKills = 0;
         ScreenAchievements.moneyEarned = 0;
         ScreenAchievements.achievementKills1State = -1;
         ScreenAchievements.achievementKills2State = -1;
         ScreenAchievements.achievementKills3State = -1;
         ScreenAchievements.achievementMoney1State = -1;
         ScreenAchievements.achievementMoney2State = -1;
         ScreenAchievements.achievementMoney3State = -1;
         ScreenAchievements.achievementMaxedPrimary1State = -1;
         ScreenAchievements.achievementMaxedPrimary2State = -1;
         ScreenAchievements.achievementMaxedPrimary3State = -1;
         ScreenAchievements.achievementMaxedSecondary1State = -1;
         ScreenAchievements.achievementMaxedSecondary2State = -1;
         ScreenAchievements.achievementMaxedSecondary3State = -1;
         ScreenAchievements.achievementPoisonDoctorState = -1;
         ScreenAchievements.achievementFreezeTemperamentalState = -1;
         ScreenAchievements.achievementTrapMineState = -1;
         ScreenAchievements.achievementAddictedCakeState = -1;
         ScreenAchievements.achievementRacingState = -1;
         ScreenAchievements.achievementIdleState = -1;
         ScreenAchievements.achievementStars1State = -1;
         ScreenAchievements.achievementStars2State = -1;
         ScreenAchievements.achievementStars3State = -1;
         ScreenAchievements.achievementFlags1State = -1;
         ScreenAchievements.achievementFlags2State = -1;
         ScreenAchievements.achievementFlags3State = -1;
         ScreenAchievements.achievementTowers1State = -1;
         ScreenAchievements.achievementTowers2State = -1;
         ScreenAchievements.achievementTowers3State = -1;
         ScreenAchievements.achievementShields1State = -1;
         ScreenAchievements.achievementShields2State = -1;
         ScreenAchievements.achievementShields3State = -1;
         ScreenAchievements.achievementBosses1State = -1;
         ScreenAchievements.achievementBosses2State = -1;
         ScreenAchievements.achievementBosses3State = -1;
         ScreenAchievements.achievementFlagNoWeaponsState = -1;
         ScreenAchievements.achievementDefensiveBombsState = -1;
         ScreenAchievements.achievementBossOnlySpecialState = -1;
         ScreenAchievements.updateAchievements();
         PartTutorial.tutorialCompleted = false;
         PartTutorial.tutorialArrayUnseen = ["AimShoot","KillEnemies","Objective","CollectFlags","Pause","Special","NoMoveTowerMode","DefendBottom","ShiftWeapon","Strength","Weakness"];
         PartTutorial.tutorialArrayQueue = ["Move"];
         PartTutorial.tutorialArrayDone = [];
         Main.uihButtonLevel = false;
         Main.uihButtonPlayLevel = false;
         Main.uihButtonNextLevel = false;
         Main.uihButtonSquarePage = false;
         Main.uihButtonUpgrades = false;
         Main.hDifficultyChosen = false;
         Main.extraMoneyGiven = false;
         Main.checkPremiumContent();
         Main.checkExtraMoney();
         setDateAndTime();
         setWorldAndLevel();
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null)
            {
               gameSave.data.money = ScreenUpgrades.money;
               gameSave.data.levelsArray = clone(ScreenUpgrades.levelsArray);
               gameSave.data.levelsArrayMisc = clone(ScreenUpgrades.levelsArrayMisc);
               gameSave.data.levelsArraySecondary = clone(ScreenUpgrades.levelsArraySecondary);
               gameSave.data.equippedWeapons = clone(ScreenGame.equippedWeapons);
               gameSave.data.primaryWeapon = ScreenGame.primaryWeapon;
               gameSave.data.secondaryWeapon = ScreenGame.secondaryWeapon;
               gameSave.data.worldsValuesArrays = clone(ScreenLevelSelect.worldsValuesArrays);
               gameSave.data.previousWorld = ScreenLevelSelect.previousWorld;
               gameSave.data.previousLevel = ScreenLevelSelect.previousLevel;
               gameSave.data.previousLevelWon = ScreenLevelSelect.previousLevelWon;
               gameSave.data.knownEnemiesArray = clone(ScreenEnemies.knownEnemiesArray);
               gameSave.data.tutorialCompleted = PartTutorial.tutorialCompleted;
               gameSave.data.tutorialArrayUnseen = clone(PartTutorial.tutorialArrayUnseen);
               gameSave.data.tutorialArrayQueue = clone(PartTutorial.tutorialArrayQueue);
               gameSave.data.tutorialArrayDone = clone(PartTutorial.tutorialArrayDone);
               gameSave.data.uihButtonLevel = Main.uihButtonLevel;
               gameSave.data.uihButtonPlayLevel = Main.uihButtonPlayLevel;
               gameSave.data.uihButtonNextLevel = Main.uihButtonNextLevel;
               gameSave.data.uihButtonSquarePage = Main.uihButtonSquarePage;
               gameSave.data.uihButtonUpgrades = Main.uihButtonUpgrades;
               gameSave.data.hDifficultyChosen = Main.hDifficultyChosen;
               gameSave.data.extraMoneyGiven = Main.extraMoneyGiven;
               gameSave.flush();
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE INIT");
         StatisticsManager.updateKills(ScreenAchievements.enemyKills);
         StatisticsManager.updateMoney(ScreenAchievements.moneyEarned);
         StatisticsManager.updatePrimaryWeapons(ScreenUpgrades.levelsArray);
         StatisticsManager.updateSecondaryWeapons(ScreenUpgrades.levelsArraySecondary);
         StatisticsManager.updateProgress(ScreenLevelSelect.worldsValuesArrays);
      }
      
      public static function removeDateFromSaveString(theString:String) : String
      {
         var startPos:int = 0;
         var endPos:int = 0;
         var i:* = undefined;
         for(var a:* = 0; a < 3; a++)
         {
            startPos = theString.indexOf("dt=");
            if(startPos == -1)
            {
               break;
            }
            endPos = 0;
            for(i = startPos; i < theString.length; i++)
            {
               if(theString.charAt(i) == ";")
               {
                  endPos = i + 1;
                  break;
               }
            }
            theString = theString.substring(0,startPos) + theString.substring(endPos,theString.length);
         }
         return theString;
      }
      
      public static function saveOptionDifficulty() : void
      {
         if(optionsSave != null && SaveManager.saveOn)
         {
            optionsSave.data.levelDifficulty = ScreenLevelSelect.levelDifficulty;
            optionsSave.flush();
         }
         trace("SAVE DIFFICULTY");
      }
      
      public static function shortStringToStringArray(string:String) : Array
      {
         var char:* = undefined;
         var array:Array = [];
         var stringPiece:String = "";
         for(var i:* = 0; i < string.length; i++)
         {
            char = string.charAt(i);
            if(char != ",")
            {
               stringPiece += char;
            }
            if(char == "," || i == string.length - 1)
            {
               array.push(stringPiece);
               stringPiece = "";
            }
         }
         return array;
      }
      
      public static function initAndLoadOptions(forceReset:Boolean = false) : void
      {
         if(optionsSave.data.optionsInitiated == null || forceReset)
         {
            optionsSave.data.optionsInitiated = true;
            PartTutorial.tutorialOn = true;
            ScreenOptions.optionCrosshairOn = true;
            ScreenOptions.optionAutoPauseOn = true;
            ScreenOptions.optionWindowULOn = true;
            LevelGuide.autoSelect = true;
            PartAchievements.achievementPopUp = true;
            SoundManager.soundOn = true;
            SoundManager.musicOn = true;
            SoundManager.soundVol = 1;
            SoundManager.musicVol = 1;
            if(!forceReset)
            {
               ScreenLevelSelect.levelDifficulty = "Easy";
            }
            optionsSave.data.tutorialOn = PartTutorial.tutorialOn;
            optionsSave.data.optionCrosshairOn = ScreenOptions.optionCrosshairOn;
            optionsSave.data.optionAutoPauseOn = ScreenOptions.optionAutoPauseOn;
            optionsSave.data.optionWindowUL = ScreenOptions.optionWindowULOn;
            optionsSave.data.autoSelect = LevelGuide.autoSelect;
            optionsSave.data.achievementPopUp = PartAchievements.achievementPopUp;
            optionsSave.data.levelDifficulty = ScreenLevelSelect.levelDifficulty;
            optionsSave.data.soundOn = SoundManager.soundOn;
            optionsSave.data.musicOn = SoundManager.musicOn;
            optionsSave.data.soundVol = SoundManager.soundVol;
            optionsSave.data.musicVol = SoundManager.musicVol;
         }
         else
         {
            PartTutorial.tutorialOn = optionsSave.data.tutorialOn;
            ScreenOptions.optionCrosshairOn = optionsSave.data.optionCrosshairOn;
            ScreenOptions.optionAutoPauseOn = optionsSave.data.optionAutoPauseOn;
            ScreenOptions.optionWindowULOn = optionsSave.data.optionWindowUL;
            LevelGuide.autoSelect = optionsSave.data.autoSelect;
            PartAchievements.achievementPopUp = optionsSave.data.achievementPopUp;
            ScreenLevelSelect.levelDifficulty = optionsSave.data.levelDifficulty;
            SoundManager.soundOn = optionsSave.data.soundOn;
            SoundManager.musicOn = optionsSave.data.musicOn;
            SoundManager.soundVol = optionsSave.data.soundVol;
            SoundManager.musicVol = optionsSave.data.musicVol;
         }
      }
      
      public static function convertSaveToSaveString(slotFrom:int, slotTo:int) : void
      {
         var localSave:SharedObject = null;
         var saveSlotInfo:* = "";
         if(slotFrom == 1)
         {
            localSave = SharedObject.getLocal("CircularTankSave1");
         }
         else if(slotFrom == 2)
         {
            localSave = SharedObject.getLocal("CircularTankSave2");
         }
         else if(slotFrom == 3)
         {
            localSave = SharedObject.getLocal("CircularTankSave3");
         }
         saveSlotInfo += "m=" + localSave.data.money + ";";
         saveSlotInfo += "la=" + numberArrayToAlphabetShortString(localSave.data.levelsArray) + ";";
         saveSlotInfo += "lam=" + numberArrayToAlphabetShortString(localSave.data.levelsArrayMisc) + ";";
         saveSlotInfo += "las=" + numberArrayToAlphabetShortString(localSave.data.levelsArraySecondary) + ";";
         saveSlotInfo += "ew=" + stringArrayToShortString(localSave.data.equippedWeapons) + ";";
         saveSlotInfo += "pw=" + localSave.data.primaryWeapon + ";";
         saveSlotInfo += "sw=" + localSave.data.secondaryWeapon + ";";
         saveSlotInfo += "wva=" + numberArrayToShortString(localSave.data.worldsValuesArrays,3) + ";";
         saveSlotInfo += "pw=" + localSave.data.previousWorld + ";";
         saveSlotInfo += "pl=" + localSave.data.previousLevel + ";";
         saveSlotInfo += "plw=" + booleanToNumber(localSave.data.previousLevelWon) + ";";
         saveSlotInfo += "kea=" + stringArrayToShortString(localSave.data.knownEnemiesArray) + ";";
         saveSlotInfo += "ek=" + (localSave.data.enemyKills + 1) + ";";
         saveSlotInfo += "me=" + (localSave.data.moneyEarned + 1) + ";";
         saveSlotInfo += "ak1s=" + (localSave.data.achievementKills1State + 1) + ";";
         saveSlotInfo += "ak2s=" + (localSave.data.achievementKills2State + 1) + ";";
         saveSlotInfo += "ak3s=" + (localSave.data.achievementKills3State + 1) + ";";
         saveSlotInfo += "am1s=" + (localSave.data.achievementMoney1State + 1) + ";";
         saveSlotInfo += "am2s=" + (localSave.data.achievementMoney2State + 1) + ";";
         saveSlotInfo += "am3s=" + (localSave.data.achievementMoney3State + 1) + ";";
         saveSlotInfo += "amp1s=" + (localSave.data.achievementMaxedPrimary1State + 1) + ";";
         saveSlotInfo += "amp2s=" + (localSave.data.achievementMaxedPrimary2State + 1) + ";";
         saveSlotInfo += "amp3s=" + (localSave.data.achievementMaxedPrimary3State + 1) + ";";
         saveSlotInfo += "ams1s=" + (localSave.data.achievementMaxedSecondary1State + 1) + ";";
         saveSlotInfo += "ams2s=" + (localSave.data.achievementMaxedSecondary2State + 1) + ";";
         saveSlotInfo += "ams3s=" + (localSave.data.achievementMaxedSecondary3State + 1) + ";";
         saveSlotInfo += "apds=" + (localSave.data.achievementPoisonDoctorState + 1) + ";";
         saveSlotInfo += "afts=" + (localSave.data.achievementFreezeTemperamentalState + 1) + ";";
         saveSlotInfo += "atms=" + (localSave.data.achievementTrapMineState + 1) + ";";
         saveSlotInfo += "aacs=" + (localSave.data.achievementAddictedCakeState + 1) + ";";
         saveSlotInfo += "ars=" + (localSave.data.achievementRacingState + 1) + ";";
         saveSlotInfo += "ais=" + (localSave.data.achievementIdleState + 1) + ";";
         saveSlotInfo += "as1s=" + (localSave.data.achievementStars1State + 1) + ";";
         saveSlotInfo += "as2s=" + (localSave.data.achievementStars2State + 1) + ";";
         saveSlotInfo += "as3s=" + (localSave.data.achievementStars3State + 1) + ";";
         saveSlotInfo += "af1s=" + (localSave.data.achievementFlags1State + 1) + ";";
         saveSlotInfo += "af2s=" + (localSave.data.achievementFlags2State + 1) + ";";
         saveSlotInfo += "af3s=" + (localSave.data.achievementFlags3State + 1) + ";";
         saveSlotInfo += "at1s=" + (localSave.data.achievementTowers1State + 1) + ";";
         saveSlotInfo += "at2s=" + (localSave.data.achievementTowers2State + 1) + ";";
         saveSlotInfo += "at3s=" + (localSave.data.achievementTowers3State + 1) + ";";
         saveSlotInfo += "ash1s=" + (localSave.data.achievementShields1State + 1) + ";";
         saveSlotInfo += "ash2s=" + (localSave.data.achievementShields2State + 1) + ";";
         saveSlotInfo += "ash3s=" + (localSave.data.achievementShields3State + 1) + ";";
         saveSlotInfo += "ab1s=" + (localSave.data.achievementBosses1State + 1) + ";";
         saveSlotInfo += "ab2s=" + (localSave.data.achievementBosses2State + 1) + ";";
         saveSlotInfo += "ab3s=" + (localSave.data.achievementBosses3State + 1) + ";";
         saveSlotInfo += "afnws=" + (localSave.data.achievementFlagNoWeaponsState + 1) + ";";
         saveSlotInfo += "adbs=" + (localSave.data.achievementDefensiveBombsState + 1) + ";";
         saveSlotInfo += "aboss=" + (localSave.data.achievementBossOnlySpecialState + 1) + ";";
         saveSlotInfo += "tc=" + booleanToNumber(localSave.data.tutorialCompleted) + ";";
         saveSlotInfo += "tau=" + stringArrayToShortString(localSave.data.tutorialArrayUnseen) + ";";
         saveSlotInfo += "taq=" + stringArrayToShortString(localSave.data.tutorialArrayQueue) + ";";
         saveSlotInfo += "tad=" + stringArrayToShortString(localSave.data.tutorialArrayDone) + ";";
         saveSlotInfo += "ubl=" + booleanToNumber(localSave.data.uihButtonLevel) + ";";
         saveSlotInfo += "ubpl=" + booleanToNumber(localSave.data.uihButtonPlayLevel) + ";";
         saveSlotInfo += "ubnl=" + booleanToNumber(localSave.data.uihButtonNextLevel) + ";";
         saveSlotInfo += "ubsp=" + booleanToNumber(localSave.data.uihButtonSquarePage) + ";";
         saveSlotInfo += "ubu=" + booleanToNumber(localSave.data.uihButtonUpgrades) + ";";
         saveSlotInfo += "hdc=" + booleanToNumber(localSave.data.hDifficultyChosen) + ";";
         saveSlotInfo += "emg=" + booleanToNumber(localSave.data.extraMoneyGiven) + ";";
         saveSlotInfo += "dt=" + localSave.data.gameDateTime + ";";
         saveSlotInfo += "wl=" + localSave.data.gameProgress + ";";
         var parenthesisFound:int = 0;
         var parenthesis1Pos:int = 0;
         for(var i:* = 0; i < saveString.length; i++)
         {
            if(saveString.charAt(i) == "(")
            {
               parenthesisFound++;
            }
            if(parenthesisFound == slotTo)
            {
               parenthesis1Pos = i;
               break;
            }
         }
         for(var ii:* = parenthesis1Pos; ii < saveString.length; ii++)
         {
            if(saveString.charAt(ii) == ")")
            {
               saveString = saveString.substring(0,parenthesis1Pos + 1) + saveSlotInfo + saveString.substring(ii,saveString.length);
               break;
            }
         }
         sendSaveString(slotTo);
      }
      
      public static function partOfSaveString(theString:String, slotNum:int) : String
      {
         var parenthesisCount:int = 0;
         var startPos:int = 0;
         var endPos:int = 0;
         for(var i:* = 0; i < theString.length; i++)
         {
            if(theString.charAt(i) == "(")
            {
               if(++parenthesisCount == slotNum)
               {
                  startPos = i;
               }
            }
            else if(parenthesisCount == slotNum)
            {
               if(theString.charAt(i) == ")")
               {
                  endPos = i + 1;
                  break;
               }
            }
         }
         return theString.substring(startPos,endPos);
      }
      
      public static function deleteFromSaveString(slot:int) : void
      {
         var parenthesisFound:int = 0;
         var parenthesis1Pos:int = 0;
         for(var i:* = 0; i < saveString.length; i++)
         {
            if(saveString.charAt(i) == "(")
            {
               parenthesisFound++;
            }
            if(parenthesisFound == slot)
            {
               parenthesis1Pos = i;
               break;
            }
         }
         for(var ii:* = parenthesis1Pos; ii < saveString.length; ii++)
         {
            if(saveString.charAt(ii) == ")")
            {
               saveString = saveString.substring(0,parenthesis1Pos + 1) + saveString.substring(ii,saveString.length);
               break;
            }
         }
         sendSaveString(slot);
      }
      
      public static function updateSaveStringSlot(slot:int) : void
      {
         switch(slot)
         {
            case 1:
               saveString1Updated = true;
               break;
            case 2:
               saveString2Updated = true;
               break;
            case 3:
               saveString3Updated = true;
         }
         var saveSlotInfo:* = "";
         saveSlotInfo += "m=" + ScreenUpgrades.money + ";";
         saveSlotInfo += "la=" + numberArrayToAlphabetShortString(ScreenUpgrades.levelsArray) + ";";
         saveSlotInfo += "lam=" + numberArrayToAlphabetShortString(ScreenUpgrades.levelsArrayMisc) + ";";
         saveSlotInfo += "las=" + numberArrayToAlphabetShortString(ScreenUpgrades.levelsArraySecondary) + ";";
         saveSlotInfo += "ew=" + stringArrayToShortString(ScreenGame.equippedWeapons) + ";";
         saveSlotInfo += "pw=" + ScreenGame.primaryWeapon + ";";
         saveSlotInfo += "sw=" + ScreenGame.secondaryWeapon + ";";
         saveSlotInfo += "wva=" + numberArrayToShortString(ScreenLevelSelect.worldsValuesArrays,3) + ";";
         saveSlotInfo += "pw=" + ScreenLevelSelect.previousWorld + ";";
         saveSlotInfo += "pl=" + ScreenLevelSelect.previousLevel + ";";
         saveSlotInfo += "plw=" + booleanToNumber(ScreenLevelSelect.previousLevelWon) + ";";
         saveSlotInfo += "kea=" + stringArrayToShortString(ScreenEnemies.knownEnemiesArray) + ";";
         saveSlotInfo += "ek=" + (ScreenAchievements.enemyKills + 1) + ";";
         saveSlotInfo += "me=" + (ScreenAchievements.moneyEarned + 1) + ";";
         saveSlotInfo += "ak1s=" + (ScreenAchievements.achievementKills1State + 1) + ";";
         saveSlotInfo += "ak2s=" + (ScreenAchievements.achievementKills2State + 1) + ";";
         saveSlotInfo += "ak3s=" + (ScreenAchievements.achievementKills3State + 1) + ";";
         saveSlotInfo += "am1s=" + (ScreenAchievements.achievementMoney1State + 1) + ";";
         saveSlotInfo += "am2s=" + (ScreenAchievements.achievementMoney2State + 1) + ";";
         saveSlotInfo += "am3s=" + (ScreenAchievements.achievementMoney3State + 1) + ";";
         saveSlotInfo += "amp1s=" + (ScreenAchievements.achievementMaxedPrimary1State + 1) + ";";
         saveSlotInfo += "amp2s=" + (ScreenAchievements.achievementMaxedPrimary2State + 1) + ";";
         saveSlotInfo += "amp3s=" + (ScreenAchievements.achievementMaxedPrimary3State + 1) + ";";
         saveSlotInfo += "ams1s=" + (ScreenAchievements.achievementMaxedSecondary1State + 1) + ";";
         saveSlotInfo += "ams2s=" + (ScreenAchievements.achievementMaxedSecondary2State + 1) + ";";
         saveSlotInfo += "ams3s=" + (ScreenAchievements.achievementMaxedSecondary3State + 1) + ";";
         saveSlotInfo += "apds=" + (ScreenAchievements.achievementPoisonDoctorState + 1) + ";";
         saveSlotInfo += "afts=" + (ScreenAchievements.achievementFreezeTemperamentalState + 1) + ";";
         saveSlotInfo += "atms=" + (ScreenAchievements.achievementTrapMineState + 1) + ";";
         saveSlotInfo += "aacs=" + (ScreenAchievements.achievementAddictedCakeState + 1) + ";";
         saveSlotInfo += "ars=" + (ScreenAchievements.achievementRacingState + 1) + ";";
         saveSlotInfo += "ais=" + (ScreenAchievements.achievementIdleState + 1) + ";";
         saveSlotInfo += "as1s=" + (ScreenAchievements.achievementStars1State + 1) + ";";
         saveSlotInfo += "as2s=" + (ScreenAchievements.achievementStars2State + 1) + ";";
         saveSlotInfo += "as3s=" + (ScreenAchievements.achievementStars3State + 1) + ";";
         saveSlotInfo += "af1s=" + (ScreenAchievements.achievementFlags1State + 1) + ";";
         saveSlotInfo += "af2s=" + (ScreenAchievements.achievementFlags2State + 1) + ";";
         saveSlotInfo += "af3s=" + (ScreenAchievements.achievementFlags3State + 1) + ";";
         saveSlotInfo += "at1s=" + (ScreenAchievements.achievementTowers1State + 1) + ";";
         saveSlotInfo += "at2s=" + (ScreenAchievements.achievementTowers2State + 1) + ";";
         saveSlotInfo += "at3s=" + (ScreenAchievements.achievementTowers3State + 1) + ";";
         saveSlotInfo += "ash1s=" + (ScreenAchievements.achievementShields1State + 1) + ";";
         saveSlotInfo += "ash2s=" + (ScreenAchievements.achievementShields2State + 1) + ";";
         saveSlotInfo += "ash3s=" + (ScreenAchievements.achievementShields3State + 1) + ";";
         saveSlotInfo += "ab1s=" + (ScreenAchievements.achievementBosses1State + 1) + ";";
         saveSlotInfo += "ab2s=" + (ScreenAchievements.achievementBosses2State + 1) + ";";
         saveSlotInfo += "ab3s=" + (ScreenAchievements.achievementBosses3State + 1) + ";";
         saveSlotInfo += "afnws=" + (ScreenAchievements.achievementFlagNoWeaponsState + 1) + ";";
         saveSlotInfo += "adbs=" + (ScreenAchievements.achievementDefensiveBombsState + 1) + ";";
         saveSlotInfo += "aboss=" + (ScreenAchievements.achievementBossOnlySpecialState + 1) + ";";
         saveSlotInfo += "tc=" + booleanToNumber(PartTutorial.tutorialCompleted) + ";";
         saveSlotInfo += "tau=" + stringArrayToShortString(PartTutorial.tutorialArrayUnseen) + ";";
         saveSlotInfo += "taq=" + stringArrayToShortString(PartTutorial.tutorialArrayQueue) + ";";
         saveSlotInfo += "tad=" + stringArrayToShortString(PartTutorial.tutorialArrayDone) + ";";
         saveSlotInfo += "ubl=" + booleanToNumber(Main.uihButtonLevel) + ";";
         saveSlotInfo += "ubpl=" + booleanToNumber(Main.uihButtonPlayLevel) + ";";
         saveSlotInfo += "ubnl=" + booleanToNumber(Main.uihButtonNextLevel) + ";";
         saveSlotInfo += "ubsp=" + booleanToNumber(Main.uihButtonSquarePage) + ";";
         saveSlotInfo += "ubu=" + booleanToNumber(Main.uihButtonUpgrades) + ";";
         saveSlotInfo += "hdc=" + booleanToNumber(Main.hDifficultyChosen) + ";";
         saveSlotInfo += "emg=" + booleanToNumber(Main.extraMoneyGiven) + ";";
         saveSlotInfo += "dt=" + setDateAndTime() + ";";
         saveSlotInfo += "wl=" + setWorldAndLevel() + ";";
         var parenthesisFound:int = 0;
         var parenthesis1Pos:int = 0;
         for(var i:* = 0; i < saveString.length; i++)
         {
            if(saveString.charAt(i) == "(")
            {
               parenthesisFound++;
            }
            if(parenthesisFound == slot)
            {
               parenthesis1Pos = i;
               break;
            }
         }
         for(var ii:* = parenthesis1Pos; ii < saveString.length; ii++)
         {
            if(saveString.charAt(ii) == ")")
            {
               saveString = saveString.substring(0,parenthesis1Pos + 1) + saveSlotInfo + saveString.substring(ii,saveString.length);
               break;
            }
         }
      }
      
      public static function stringArrayToShortString(array:Array) : String
      {
         var shortString:* = "";
         for(var i:* = 0; i < array.length; i++)
         {
            if(i < array.length - 1)
            {
               shortString += String(array[i]) + ",";
            }
            else
            {
               shortString += String(array[i]);
            }
         }
         return shortString;
      }
      
      public static function resetOptions() : void
      {
         optionsSave.clear();
         initAndLoadOptions(true);
         ScreenOptions.forceReset = true;
      }
      
      public static function saveOptionAutoPause() : void
      {
         if(optionsSave != null && SaveManager.saveOn)
         {
            optionsSave.data.optionAutoPauseOn = ScreenOptions.optionAutoPauseOn;
            optionsSave.flush();
         }
         trace("SAVE AUTOPAUSE");
      }
      
      public static function saveStatus() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.money = ScreenUpgrades.money;
               gameSave.data.worldsValuesArrays = clone(ScreenLevelSelect.worldsValuesArrays);
               gameSave.data.previousWorld = ScreenLevelSelect.previousWorld;
               gameSave.data.previousLevel = ScreenLevelSelect.previousLevel;
               gameSave.data.previousLevelWon = ScreenLevelSelect.previousLevelWon;
               gameSave.data.knownEnemiesArray = clone(ScreenEnemies.knownEnemiesArray);
               setDateAndTime();
               setWorldAndLevel();
               gameSave.flush();
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE STATUS");
         StatisticsManager.updateProgress(ScreenLevelSelect.worldsValuesArrays);
      }
      
      public static function saveOptionSoundMusic() : void
      {
         if(optionsSave != null && SaveManager.saveOn)
         {
            optionsSave.data.soundOn = SoundManager.soundOn;
            optionsSave.data.musicOn = SoundManager.musicOn;
            optionsSave.data.soundVol = SoundManager.soundVol;
            optionsSave.data.musicVol = SoundManager.musicVol;
            optionsSave.flush();
         }
         trace("SAVE SOUND MUSIC");
      }
      
      public static function setWorldAndLevel() : String
      {
         var ii:* = undefined;
         var worldLevelString:* = undefined;
         var progressSet:Boolean = false;
         for(var i:* = 0; i < ScreenLevelSelect.totalWorlds; i++)
         {
            for(ii = 0; ii < ScreenLevelSelect.worldsValuesArrays[i].length; ii++)
            {
               worldLevelString = "";
               if(ScreenLevelSelect.worldsValuesArrays[i][ii][0] == 0 && ScreenLevelSelect.worldsValuesArrays[i][ii][1] == 0 && ScreenLevelSelect.worldsValuesArrays[i][ii][2] == 0)
               {
                  worldLevelString = "World " + (i + 1) + "  Level " + (ii + 1);
                  if(!Main.currentSaveIsOnline)
                  {
                     gameSave.data.gameProgress = worldLevelString;
                     gameSave.data.selectedWorld = i + 1;
                  }
                  progressSet = true;
                  return worldLevelString;
               }
               if(i + 1 == ScreenLevelSelect.totalWorlds && ii + 1 == ScreenLevelSelect.worldsValuesArrays[i].length)
               {
                  if(Main.extraStuff)
                  {
                     worldLevelString = "Premium Completed";
                     if(!Main.currentSaveIsOnline)
                     {
                        gameSave.data.gameProgress = worldLevelString;
                     }
                  }
                  else
                  {
                     worldLevelString = "World 6  Level 45";
                     if(!Main.currentSaveIsOnline)
                     {
                        gameSave.data.gameProgress = worldLevelString;
                     }
                  }
                  if(!Main.currentSaveIsOnline)
                  {
                     gameSave.data.selectedWorld = i + 1;
                  }
                  return worldLevelString;
               }
            }
            if(progressSet)
            {
               break;
            }
         }
         return worldLevelString;
      }
      
      public static function saveOptions() : void
      {
         if(optionsSave != null && SaveManager.saveOn)
         {
            optionsSave.data.tutorialOn = PartTutorial.tutorialOn;
            optionsSave.data.optionCrosshairOn = ScreenOptions.optionCrosshairOn;
            optionsSave.data.optionAutoPauseOn = ScreenOptions.optionAutoPauseOn;
            optionsSave.data.optionWindowUL = ScreenOptions.optionWindowULOn;
            optionsSave.data.autoSelect = LevelGuide.autoSelect;
            optionsSave.data.achievementPopUp = PartAchievements.achievementPopUp;
            optionsSave.data.soundOn = SoundManager.soundOn;
            optionsSave.data.musicOn = SoundManager.musicOn;
            optionsSave.data.soundVol = SoundManager.soundVol;
            optionsSave.data.musicVol = SoundManager.musicVol;
            optionsSave.flush();
         }
         trace("SAVE OPTIONS");
      }
      
      public static function numberToBoolean(number:Number) : Boolean
      {
         if(number == 1)
         {
            return true;
         }
         return false;
      }
      
      public static function saveStatsAchievements() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            gameSave.data.enemyKills = ScreenAchievements.enemyKills;
            gameSave.data.moneyEarned = ScreenAchievements.moneyEarned;
            gameSave.data.achievementKills1State = ScreenAchievements.achievementKills1State;
            gameSave.data.achievementKills2State = ScreenAchievements.achievementKills2State;
            gameSave.data.achievementKills3State = ScreenAchievements.achievementKills3State;
            gameSave.data.achievementMoney1State = ScreenAchievements.achievementMoney1State;
            gameSave.data.achievementMoney2State = ScreenAchievements.achievementMoney2State;
            gameSave.data.achievementMoney3State = ScreenAchievements.achievementMoney3State;
            gameSave.data.achievementMaxedPrimary1State = ScreenAchievements.achievementMaxedPrimary1State;
            gameSave.data.achievementMaxedPrimary2State = ScreenAchievements.achievementMaxedPrimary2State;
            gameSave.data.achievementMaxedPrimary3State = ScreenAchievements.achievementMaxedPrimary3State;
            gameSave.data.achievementMaxedSecondary1State = ScreenAchievements.achievementMaxedSecondary1State;
            gameSave.data.achievementMaxedSecondary2State = ScreenAchievements.achievementMaxedSecondary2State;
            gameSave.data.achievementMaxedSecondary3State = ScreenAchievements.achievementMaxedSecondary3State;
            gameSave.data.achievementPoisonDoctorState = ScreenAchievements.achievementPoisonDoctorState;
            gameSave.data.achievementFreezeTemperamentalState = ScreenAchievements.achievementFreezeTemperamentalState;
            gameSave.data.achievementTrapMineState = ScreenAchievements.achievementTrapMineState;
            gameSave.data.achievementAddictedCakeState = ScreenAchievements.achievementAddictedCakeState;
            gameSave.data.achievementRacingState = ScreenAchievements.achievementRacingState;
            gameSave.data.achievementIdleState = ScreenAchievements.achievementIdleState;
            gameSave.data.achievementStars1State = ScreenAchievements.achievementStars1State;
            gameSave.data.achievementStars2State = ScreenAchievements.achievementStars2State;
            gameSave.data.achievementStars3State = ScreenAchievements.achievementStars3State;
            gameSave.data.achievementFlags1State = ScreenAchievements.achievementFlags1State;
            gameSave.data.achievementFlags2State = ScreenAchievements.achievementFlags2State;
            gameSave.data.achievementFlags3State = ScreenAchievements.achievementFlags3State;
            gameSave.data.achievementTowers1State = ScreenAchievements.achievementTowers1State;
            gameSave.data.achievementTowers2State = ScreenAchievements.achievementTowers2State;
            gameSave.data.achievementTowers3State = ScreenAchievements.achievementTowers3State;
            gameSave.data.achievementShields1State = ScreenAchievements.achievementShields1State;
            gameSave.data.achievementShields2State = ScreenAchievements.achievementShields2State;
            gameSave.data.achievementShields3State = ScreenAchievements.achievementShields3State;
            gameSave.data.achievementBosses1State = ScreenAchievements.achievementBosses1State;
            gameSave.data.achievementBosses2State = ScreenAchievements.achievementBosses2State;
            gameSave.data.achievementBosses3State = ScreenAchievements.achievementBosses3State;
            gameSave.data.achievementFlagNoWeaponsState = ScreenAchievements.achievementFlagNoWeaponsState;
            gameSave.data.achievementDefensiveBombsState = ScreenAchievements.achievementDefensiveBombsState;
            gameSave.data.achievementBossOnlySpecialState = ScreenAchievements.achievementBossOnlySpecialState;
            setDateAndTime();
            gameSave.flush();
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE ACHIEVEMENTS");
         StatisticsManager.updateKills(ScreenAchievements.enemyKills);
         StatisticsManager.updateMoney(ScreenAchievements.moneyEarned);
      }
      
      public static function saveOtherHelpers() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.hDifficultyChosen = Main.hDifficultyChosen;
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
      }
      
      public static function saveUpgrades() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.money = ScreenUpgrades.money;
               gameSave.data.levelsArray = clone(ScreenUpgrades.levelsArray);
               gameSave.data.levelsArrayMisc = clone(ScreenUpgrades.levelsArrayMisc);
               gameSave.data.levelsArraySecondary = clone(ScreenUpgrades.levelsArraySecondary);
               setDateAndTime();
               gameSave.flush();
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE UPGRADES");
         StatisticsManager.updatePrimaryWeapons(ScreenUpgrades.levelsArray);
         StatisticsManager.updateSecondaryWeapons(ScreenUpgrades.levelsArraySecondary);
      }
      
      public static function loadGame() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null)
            {
               ScreenUpgrades.money = gameSave.data.money;
               ScreenUpgrades.levelsArray = clone(gameSave.data.levelsArray);
               ScreenUpgrades.levelsArrayMisc = clone(gameSave.data.levelsArrayMisc);
               ScreenUpgrades.levelsArraySecondary = clone(gameSave.data.levelsArraySecondary);
               ScreenGame.equippedWeapons = clone(gameSave.data.equippedWeapons);
               ScreenGame.primaryWeapon = gameSave.data.primaryWeapon;
               ScreenGame.secondaryWeapon = gameSave.data.secondaryWeapon;
               ScreenLevelSelect.worldsValuesArrays = clone(gameSave.data.worldsValuesArrays);
               ScreenLevelSelect.valuesArrayW1 = clone(gameSave.data.worldsValuesArrays[0]);
               ScreenLevelSelect.valuesArrayW2 = clone(gameSave.data.worldsValuesArrays[1]);
               ScreenLevelSelect.valuesArrayW3 = clone(gameSave.data.worldsValuesArrays[2]);
               ScreenLevelSelect.valuesArrayW4 = clone(gameSave.data.worldsValuesArrays[3]);
               ScreenLevelSelect.valuesArrayW5 = clone(gameSave.data.worldsValuesArrays[4]);
               ScreenLevelSelect.valuesArrayW6 = clone(gameSave.data.worldsValuesArrays[5]);
               ScreenLevelSelect.valuesArrayW7 = clone(gameSave.data.worldsValuesArrays[6]);
               ScreenLevelSelect.valuesArrayW8 = clone(gameSave.data.worldsValuesArrays[7]);
               ScreenLevelSelect.valuesArrayW9 = clone(gameSave.data.worldsValuesArrays[8]);
               ScreenLevelSelect.previousWorld = gameSave.data.previousWorld;
               ScreenLevelSelect.previousLevel = gameSave.data.previousLevel;
               ScreenLevelSelect.previousLevelWon = gameSave.data.previousLevelWon;
               ScreenEnemies.knownEnemiesArray = clone(gameSave.data.knownEnemiesArray);
               ScreenAchievements.enemyKills = gameSave.data.enemyKills;
               ScreenAchievements.moneyEarned = gameSave.data.moneyEarned;
               ScreenAchievements.achievementKills1State = gameSave.data.achievementKills1State;
               ScreenAchievements.achievementKills2State = gameSave.data.achievementKills2State;
               ScreenAchievements.achievementKills3State = gameSave.data.achievementKills3State;
               ScreenAchievements.achievementMoney1State = gameSave.data.achievementMoney1State;
               ScreenAchievements.achievementMoney2State = gameSave.data.achievementMoney2State;
               ScreenAchievements.achievementMoney3State = gameSave.data.achievementMoney3State;
               ScreenAchievements.achievementMaxedPrimary1State = gameSave.data.achievementMaxedPrimary1State;
               ScreenAchievements.achievementMaxedPrimary2State = gameSave.data.achievementMaxedPrimary2State;
               ScreenAchievements.achievementMaxedPrimary3State = gameSave.data.achievementMaxedPrimary3State;
               ScreenAchievements.achievementMaxedSecondary1State = gameSave.data.achievementMaxedSecondary1State;
               ScreenAchievements.achievementMaxedSecondary2State = gameSave.data.achievementMaxedSecondary2State;
               ScreenAchievements.achievementMaxedSecondary3State = gameSave.data.achievementMaxedSecondary3State;
               ScreenAchievements.achievementPoisonDoctorState = gameSave.data.achievementPoisonDoctorState;
               ScreenAchievements.achievementFreezeTemperamentalState = gameSave.data.achievementFreezeTemperamentalState;
               ScreenAchievements.achievementTrapMineState = gameSave.data.achievementTrapMineState;
               ScreenAchievements.achievementAddictedCakeState = gameSave.data.achievementAddictedCakeState;
               ScreenAchievements.achievementRacingState = gameSave.data.achievementRacingState;
               ScreenAchievements.achievementIdleState = gameSave.data.achievementIdleState;
               ScreenAchievements.achievementStars1State = gameSave.data.achievementStars1State;
               ScreenAchievements.achievementStars2State = gameSave.data.achievementStars2State;
               ScreenAchievements.achievementStars3State = gameSave.data.achievementStars3State;
               ScreenAchievements.achievementFlags1State = gameSave.data.achievementFlags1State;
               ScreenAchievements.achievementFlags2State = gameSave.data.achievementFlags2State;
               ScreenAchievements.achievementFlags3State = gameSave.data.achievementFlags3State;
               ScreenAchievements.achievementTowers1State = gameSave.data.achievementTowers1State;
               ScreenAchievements.achievementTowers2State = gameSave.data.achievementTowers2State;
               ScreenAchievements.achievementTowers3State = gameSave.data.achievementTowers3State;
               ScreenAchievements.achievementShields1State = gameSave.data.achievementShields1State;
               ScreenAchievements.achievementShields2State = gameSave.data.achievementShields2State;
               ScreenAchievements.achievementShields3State = gameSave.data.achievementShields3State;
               ScreenAchievements.achievementBosses1State = gameSave.data.achievementBosses1State;
               ScreenAchievements.achievementBosses2State = gameSave.data.achievementBosses2State;
               ScreenAchievements.achievementBosses3State = gameSave.data.achievementBosses3State;
               ScreenAchievements.achievementFlagNoWeaponsState = gameSave.data.achievementFlagNoWeaponsState;
               ScreenAchievements.achievementDefensiveBombsState = gameSave.data.achievementDefensiveBombsState;
               ScreenAchievements.achievementBossOnlySpecialState = gameSave.data.achievementBossOnlySpecialState;
               PartTutorial.tutorialCompleted = gameSave.data.tutorialCompleted;
               PartTutorial.tutorialArrayUnseen = clone(gameSave.data.tutorialArrayUnseen);
               PartTutorial.tutorialArrayQueue = clone(gameSave.data.tutorialArrayQueue);
               PartTutorial.tutorialArrayDone = clone(gameSave.data.tutorialArrayDone);
               Main.uihButtonLevel = gameSave.data.uihButtonLevel;
               Main.uihButtonPlayLevel = gameSave.data.uihButtonPlayLevel;
               Main.uihButtonNextLevel = gameSave.data.uihButtonNextLevel;
               Main.uihButtonSquarePage = gameSave.data.uihButtonSquarePage;
               Main.uihButtonUpgrades = gameSave.data.uihButtonUpgrades;
               Main.hDifficultyChosen = gameSave.data.hDifficultyChosen;
               Main.extraMoneyGiven = gameSave.data.extraMoneyGiven;
            }
         }
         else
         {
            loadVarsFromSaveString(onlineSaveSlot);
         }
         ScreenLevelSelect.worldsValuesVisibleArrays = clone(ScreenLevelSelect.worldsValuesArrays);
         if(LevelGuide.autoSelect)
         {
            LevelGuide.type = "Upcoming";
         }
         else
         {
            LevelGuide.type = "Last";
         }
         LevelGuide.updateVariables();
         ScreenLevelSelect.selectedWorld = LevelGuide.selectedWorld;
         ScreenAchievements.updateAchievements();
         ScreenAchievements.checkToGiveAchievementsToAPI();
         Main.checkPremiumContent();
         Main.checkExtraMoney();
         StatisticsManager.updateKills(ScreenAchievements.enemyKills);
         StatisticsManager.updateMoney(ScreenAchievements.moneyEarned);
         StatisticsManager.updatePrimaryWeapons(ScreenUpgrades.levelsArray);
         StatisticsManager.updateSecondaryWeapons(ScreenUpgrades.levelsArraySecondary);
         StatisticsManager.updateProgress(ScreenLevelSelect.worldsValuesArrays);
      }
      
      public static function saveOptionWindowUL() : void
      {
         if(optionsSave != null && SaveManager.saveOn)
         {
            optionsSave.data.optionWindowUL = ScreenOptions.optionWindowULOn;
            optionsSave.flush();
         }
         trace("SAVE WINDOWUL");
      }
      
      public static function saveTutorial() : void
      {
         if(!Main.currentSaveIsOnline)
         {
            if(gameSave != null && SaveManager.saveOn)
            {
               gameSave.data.tutorialCompleted = PartTutorial.tutorialCompleted;
               gameSave.data.tutorialArrayUnseen = clone(PartTutorial.tutorialArrayUnseen);
               gameSave.data.tutorialArrayQueue = clone(PartTutorial.tutorialArrayQueue);
               gameSave.data.tutorialArrayDone = clone(PartTutorial.tutorialArrayDone);
               setDateAndTime();
               gameSave.flush();
            }
         }
         else
         {
            updateSaveStringSlot(onlineSaveSlot);
         }
         trace("SAVE TUTORIAL");
      }
      
      public static function saveOptionAutoSelect() : void
      {
         if(optionsSave != null && SaveManager.saveOn)
         {
            optionsSave.data.autoSelect = LevelGuide.autoSelect;
            optionsSave.flush();
         }
         trace("SAVE AUTOSELECT");
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
         }
      }
      
      public function update(event:Event) : void
      {
         var toCreateArray:* = undefined;
         var i:* = undefined;
         if(Main.armorGamesOn)
         {
            if(!saveStringLoaded)
            {
               if(onlineString1Loaded && onlineString2Loaded && onlineString3Loaded)
               {
                  toCreateArray = [];
                  if(onlineString1 == null || onlineString1 == "")
                  {
                     onlineString1 = "()";
                     toCreateArray.push(1);
                  }
                  if(onlineString2 == null || onlineString2 == "")
                  {
                     onlineString2 = "()";
                     toCreateArray.push(2);
                  }
                  if(onlineString3 == null || onlineString3 == "")
                  {
                     onlineString3 = "()";
                     toCreateArray.push(3);
                  }
                  saveString = onlineString1 + onlineString2 + onlineString3;
                  lastSaveString = saveString;
                  saveStringLoaded = true;
                  for(i = 0; i < toCreateArray.length; i++)
                  {
                     submitSaveSlotToServer(toCreateArray[i]);
                  }
               }
            }
            if(saveString1Updated)
            {
               sendSaveString(1);
               saveString1Updated = false;
            }
            if(saveString2Updated)
            {
               sendSaveString(2);
               saveString2Updated = false;
            }
            if(saveString3Updated)
            {
               sendSaveString(3);
               saveString3Updated = false;
            }
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
   }
}

