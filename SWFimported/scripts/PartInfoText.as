package
{
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   import flash.text.*;
   import flash.utils.ByteArray;
   import flash.utils.getDefinitionByName;
   
   public class PartInfoText extends Sprite
   {
      
      public var textFormat:TextFormat = new TextFormat("Arial",14,16777215,true,false,false);
      
      public var bg:Sprite = new Sprite();
      
      public var showText:Boolean = false;
      
      private var requiredMinWidth:Number = 0;
      
      public var showTop:Boolean = false;
      
      private var shadowArray:Array = filters;
      
      private var additionalWidth:Number = 0;
      
      public var showLeft:Boolean = true;
      
      private var weaknessesIconArray:Array = new Array();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var spaces:RegExp = / /gi;
      
      private var textFormat2:TextFormat = new TextFormat("JG",14,16777215,true,false,false);
      
      private var textFormat3:TextFormat = new TextFormat("Arial",11,16777215,true,false,false);
      
      private var enemyObjectArray:Array = new Array();
      
      private var additionalHeight:Number = 0;
      
      public var infoText:TextField = new TextField();
      
      private var strengthsIconArray:Array = new Array();
      
      public function PartInfoText()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
      }
      
      public function added(event:Event) : void
      {
         addEventListener(Event.ENTER_FRAME,this.update);
         this.textFormat.color = 16777215;
         this.textFormat.align = TextFormatAlign.LEFT;
         addChild(this.bg);
         this.bg.alpha = 0.9;
         this.bg.mouseEnabled = false;
         addChild(this.infoText);
         this.infoText.width = 480;
         this.infoText.defaultTextFormat = this.textFormat;
         this.infoText.antiAliasType = AntiAliasType.NORMAL;
         this.infoText.embedFonts = true;
         this.infoText.wordWrap = true;
         this.infoText.selectable = false;
         this.infoText.mouseEnabled = false;
         this.infoText.text = "";
         this.infoText.autoSize = TextFieldAutoSize.LEFT;
         this.infoText.x = 0;
         this.infoText.y = 0;
      }
      
      private function removeStrengthsAndWeaknessIcons() : void
      {
         for(var e:* = 0; e < this.strengthsIconArray.length; e++)
         {
            this.bg.removeChild(this.strengthsIconArray[e]);
            this.strengthsIconArray.splice(e,1);
            e--;
         }
         for(var ee:* = 0; ee < this.weaknessesIconArray.length; ee++)
         {
            this.bg.removeChild(this.weaknessesIconArray[ee]);
            this.weaknessesIconArray.splice(ee,1);
            ee--;
         }
      }
      
      private function getEnemyAmountArray(theWorld:Number, theLevel:Number) : *
      {
         var enemyAmountArray:* = undefined;
         var enemyModelCurrent:* = undefined;
         var normalEnemyAmount:* = undefined;
         var enemyTypesInMap:* = undefined;
         var ratioArray:* = undefined;
         var ii:* = undefined;
         var u:* = undefined;
         var uu:* = undefined;
         var enemyNormalRatio:* = undefined;
         var currentEnemyRatio:* = undefined;
         if(ScreenLevelSelect.levelMode != "Boss" && ScreenLevelSelect.levelMode != "Flag")
         {
            enemyAmountArray = [];
            enemyModelCurrent = this.clone(ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1]);
            normalEnemyAmount = enemyModelCurrent[0];
            enemyModelCurrent[0] = this.getTotalEnemyAmount(theWorld,theLevel);
            enemyTypesInMap = (enemyModelCurrent.length - 2) / 2;
            ratioArray = [];
            for(ii = 0; ii < enemyTypesInMap; ii++)
            {
               ratioArray.push(enemyModelCurrent[3 + 2 * ii]);
            }
            u = 0;
            if(ScreenLevelSelect.levelDifficulty == "Medium" || ScreenLevelSelect.levelDifficulty == "Hard")
            {
               for(uu = 0; uu < enemyModelCurrent[0] - normalEnemyAmount; uu++)
               {
                  enemyNormalRatio = ratioArray[u] / normalEnemyAmount;
                  currentEnemyRatio = enemyModelCurrent[3 + 2 * u] / enemyModelCurrent[0];
                  if(currentEnemyRatio < enemyNormalRatio)
                  {
                     ++enemyModelCurrent[3 + 2 * u];
                  }
                  else if(u + 1 < enemyTypesInMap)
                  {
                     enemyAmountArray.push(enemyModelCurrent[3 + 2 * u]);
                     u++;
                     ++enemyModelCurrent[3 + 2 * u];
                  }
               }
               enemyAmountArray.push(enemyModelCurrent[3 + 2 * u]);
               while(u < enemyTypesInMap)
               {
                  u++;
                  enemyAmountArray.push(enemyModelCurrent[3 + 2 * u]);
               }
               return enemyAmountArray;
            }
            return ratioArray;
         }
         return false;
      }
      
      public function update(event:Event) : void
      {
         if(this.showText)
         {
            this.placeText();
         }
         else
         {
            this.additionalHeight = 0;
            this.additionalWidth = 0;
            this.requiredMinWidth = 0;
            this.infoText.text = "";
            this.bg.graphics.clear();
            this.removeStrengthsAndWeaknessIcons();
            this.removeEnemyObjects();
         }
         this.showText = false;
      }
      
      public function changeText(theText:String, left:Boolean, top:Boolean, specialType:String = "None", specialParam1:* = null, specialParam2:* = null) : void
      {
         var theWorld:* = undefined;
         var theLevel:* = undefined;
         var enemyModel:* = undefined;
         var enemyTypesInMap:* = undefined;
         var currentAddToWidth:* = undefined;
         var highestAddToWidth:* = undefined;
         var i:* = undefined;
         var enemyObject:* = undefined;
         var searchPlace:* = undefined;
         var enemyLevel:* = undefined;
         var enemyType:* = undefined;
         var enemyAmount:* = undefined;
         var enemyCount:* = undefined;
         var enemyAmountArray:* = undefined;
         var enemyObjectAmountText:* = undefined;
         var enemyIcon:* = undefined;
         var enemyObjectLevelText:* = undefined;
         var bossCount:* = undefined;
         this.additionalHeight = 0;
         this.additionalWidth = 0;
         this.requiredMinWidth = 0;
         this.infoText.width = 480;
         this.infoText.text = theText;
         this.showLeft = left;
         this.showTop = top;
         if(specialType == "Achievement")
         {
            if(specialParam1 != 0)
            {
               this.infoText.setTextFormat(this.textFormat2,0,specialParam1);
            }
            if(specialParam2 != 0)
            {
               this.infoText.setTextFormat(this.textFormat3,this.infoText.length - specialParam2,this.infoText.length);
            }
         }
         if(this.infoText.textWidth > 240)
         {
            this.infoText.width = 240;
         }
         else
         {
            this.infoText.width = this.infoText.textWidth + 8;
         }
         if(specialType == "EnemyStrengthsWeaknesses")
         {
            this.addStrengthsAndWeaknessIcons(specialParam1);
            this.requiredMinWidth = 32 + (this.strengthsIconArray.length + this.weaknessesIconArray.length) * 38;
            if(this.strengthsIconArray.length + this.weaknessesIconArray.length > 0)
            {
               this.additionalHeight = 44;
            }
         }
         else if(specialType == "AllEnemiesInLevel")
         {
            this.removeStrengthsAndWeaknessIcons();
            this.infoText.text += "\n\nEnemies:";
            theWorld = specialParam1;
            theLevel = specialParam2;
            enemyModel = ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1];
            enemyTypesInMap = (enemyModel.length - 2) / 2;
            currentAddToWidth = 0;
            highestAddToWidth = 0;
            for(i = 0; i < enemyTypesInMap; i++)
            {
               currentAddToWidth = 0;
               this.additionalHeight += 28;
               enemyObject = new Sprite();
               this.bg.addChild(enemyObject);
               searchPlace = ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][i * 2 + 2];
               enemyLevel = searchPlace.slice(searchPlace.length - 1,searchPlace.length);
               if(enemyLevel != "B")
               {
                  enemyLevel = "LVL " + enemyLevel;
               }
               else
               {
                  enemyLevel = "BOSS";
               }
               enemyType = searchPlace.slice(0,searchPlace.length - 1);
               enemyCount = ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][i * 2 + 3];
               enemyAmountArray = this.getEnemyAmountArray(theWorld,theLevel);
               if(ScreenLevelSelect.levelMode == "Normal" || ScreenLevelSelect.levelMode == "Tower" || ScreenLevelSelect.levelMode == "Defense")
               {
                  enemyAmount = enemyAmountArray[i] + " X";
               }
               else if(ScreenLevelSelect.levelMode == "Flag")
               {
                  enemyAmount = Math.round(enemyCount / ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][0] * 1000) / 10 + "%";
               }
               else if(enemyLevel != "BOSS")
               {
                  bossCount = this.getBossCount(theWorld,theLevel);
                  enemyAmount = Math.round(enemyCount / (ScreenGame.worldModels[theWorld * 3 - 3][theLevel - 1][0] - bossCount) * 1000) / 10 + "%";
               }
               else
               {
                  enemyAmount = enemyCount + " X";
               }
               enemyObjectAmountText = new TextField();
               this.addText(enemyObject,enemyObjectAmountText,this.textFormat3,16777215,enemyAmount,12,80,16,-8,false);
               enemyIcon = new (getDefinitionByName("Enemy" + enemyType) as Class)();
               enemyObject.addChild(enemyIcon);
               if(enemyIcon instanceof MovieClip)
               {
                  enemyIcon.gotoAndStop(1);
               }
               enemyIcon.scaleX = 0.8;
               enemyIcon.scaleY = 0.8;
               enemyIcon.rotation = 90;
               enemyObject.x = 0;
               enemyObject.y = this.infoText.height + 32 + 28 * i;
               enemyIcon.x = enemyObjectAmountText.textWidth + enemyIcon.width / 2 + 21;
               enemyIcon.y = 0;
               enemyObjectLevelText = new TextField();
               this.addText(enemyObject,enemyObjectLevelText,this.textFormat3,16777215,enemyLevel,12,40,enemyIcon.x + enemyIcon.width / 2 + 4,-8,false);
               currentAddToWidth += this.addStrengthsAndWeaknessIcons(enemyType,"Small",enemyObjectLevelText.x + enemyObjectLevelText.textWidth + 24,this.infoText.height + 30 + i * 28) * 28;
               currentAddToWidth += enemyIcon.width;
               if(currentAddToWidth > highestAddToWidth)
               {
                  highestAddToWidth = currentAddToWidth;
               }
               this.enemyObjectArray.push(enemyObject);
            }
            this.requiredMinWidth = 100 + highestAddToWidth;
         }
         else
         {
            this.additionalHeight = 0;
            this.additionalWidth = 0;
            this.requiredMinWidth = 0;
            this.removeStrengthsAndWeaknessIcons();
            this.removeEnemyObjects();
         }
         if(this.infoText.textWidth + 32 < this.requiredMinWidth)
         {
            this.additionalWidth = this.requiredMinWidth - (this.infoText.textWidth + 32);
         }
         this.bg.graphics.clear();
         this.bg.graphics.beginFill(0);
         this.bg.graphics.drawRect(0,0,Math.round(this.infoText.textWidth) + 32 + this.additionalWidth,Math.round(this.infoText.textHeight) + 32 + this.additionalHeight);
         this.bg.graphics.endFill();
         this.placeText();
      }
      
      private function getBossCount(specificWorld:Number, specificLevel:Number) : *
      {
         var searchPlace:* = undefined;
         var bossCount:* = 0;
         var selectedEnemyModel:* = ScreenGame.worldModels[specificWorld * 3 - 3];
         for(var i:* = 0; i < (selectedEnemyModel[specificLevel - 1].length - 2) / 2; i++)
         {
            searchPlace = selectedEnemyModel[specificLevel - 1][2 + i * 2];
            if(searchPlace.slice(searchPlace.length - 1,searchPlace.length) == "B")
            {
               bossCount += selectedEnemyModel[specificLevel - 1][3 + i * 2];
            }
         }
         return bossCount;
      }
      
      private function removeEnemyObjects() : void
      {
         for(var e:* = 0; e < this.enemyObjectArray.length; e++)
         {
            this.enemyObjectArray[e].parent.removeChild(this.enemyObjectArray[e]);
            this.enemyObjectArray.splice(e,1);
            e--;
         }
      }
      
      private function getTotalEnemyAmount(theWorld:Number, theLevel:Number) : *
      {
         var selectedEnemyModel:* = undefined;
         var amountMultiplier:* = undefined;
         if(ScreenLevelSelect.levelMode != "Boss" && ScreenLevelSelect.levelMode != "Flag")
         {
            selectedEnemyModel = ScreenGame.worldModels[theWorld * 3 - 3];
            amountMultiplier = 1;
            if(ScreenLevelSelect.levelDifficulty == "Medium")
            {
               amountMultiplier = DifficultyMultipliers.multiplierAmountMedium;
            }
            else if(ScreenLevelSelect.levelDifficulty == "Hard")
            {
               amountMultiplier = DifficultyMultipliers.multiplierAmountHard;
            }
            return Math.round(selectedEnemyModel[theLevel - 1][0] * amountMultiplier);
         }
         return 0;
      }
      
      private function placeText() : void
      {
         this.infoText.x = mouseX - this.additionalWidth - 1;
         this.infoText.y = mouseY - this.additionalHeight - 2;
         this.bg.x = mouseX;
         this.bg.y = mouseY;
         if(this.showLeft)
         {
            this.infoText.x += 16;
         }
         else
         {
            this.infoText.x -= this.infoText.textWidth + 16;
            this.bg.x -= this.bg.width;
         }
         if(this.showTop)
         {
            this.infoText.y += 16;
         }
         else
         {
            this.infoText.y -= this.infoText.textHeight + 16;
            this.bg.y -= this.bg.height;
         }
      }
      
      private function addStrengthsAndWeaknessIcons(enemyName:String, type:String = "Normal", xStart:Number = 0, yPos:Number = 0) : *
      {
         var iconS:* = undefined;
         var iconW:* = undefined;
         var theStrength:* = undefined;
         var iconSText:* = undefined;
         var theWeakness:* = undefined;
         var iconWText:* = undefined;
         if(type == "Normal")
         {
            this.removeStrengthsAndWeaknessIcons();
         }
         var amountOfStrengthsAndWeaknesses:* = 0;
         var enemyStrengthsArray:* = ScreenGame[("enemy" + enemyName + "Strengths").replace(this.spaces,"")];
         var enemyWeaknessesArray:* = ScreenGame[("enemy" + enemyName + "Weaknesses").replace(this.spaces,"")];
         for(var i:* = 0; i < enemyStrengthsArray.length / 2; i++)
         {
            amountOfStrengthsAndWeaknesses++;
            theStrength = enemyStrengthsArray[i * 2];
            iconS = new IconStrongWeak2();
            if(theStrength == "Explosions")
            {
               iconS.gotoAndStop(2);
            }
            else if(theStrength == "FireLava")
            {
               iconS.gotoAndStop(3);
            }
            else if(theStrength == "Bullets")
            {
               iconS.gotoAndStop(4);
            }
            else if(theStrength == "Poison")
            {
               iconS.gotoAndStop(5);
            }
            else if(theStrength == "Laser")
            {
               iconS.gotoAndStop(6);
            }
            else if(theStrength == "Ice")
            {
               iconS.gotoAndStop(7);
            }
            else if(theStrength == "Food")
            {
               iconS.gotoAndStop(8);
            }
            else if(theStrength == "Magic")
            {
               iconS.gotoAndStop(9);
            }
            this.bg.addChild(iconS);
            if(type == "Normal")
            {
               iconS.x = 38 + i * 38;
               iconS.y = this.infoText.height + 38;
            }
            else if(type == "Small")
            {
               iconS.scaleX = 0.75;
               iconS.scaleY = 0.75;
               iconS.x = xStart + i * 28;
               iconS.y = yPos;
            }
            iconSText = new TextField();
            if(type == "Normal")
            {
               this.addText(iconS,iconSText,this.textFormat2,16777215,Number(enemyStrengthsArray[i * 2 + 1]) * 100 + "%",16,50,-25,2,true);
            }
            else if(type == "Small")
            {
               this.addText(iconS,iconSText,this.textFormat,16777215,Number(enemyStrengthsArray[i * 2 + 1]) * 100 + "%",15,40,-20,3,true);
            }
            this.strengthsIconArray.push(iconS);
         }
         for(var ii:* = 0; ii < enemyWeaknessesArray.length / 2; ii++)
         {
            amountOfStrengthsAndWeaknesses++;
            theWeakness = enemyWeaknessesArray[ii * 2];
            iconW = new IconStrongWeak2();
            if(theWeakness == "Explosions")
            {
               iconW.gotoAndStop(10);
            }
            else if(theWeakness == "FireLava")
            {
               iconW.gotoAndStop(11);
            }
            else if(theWeakness == "Bullets")
            {
               iconW.gotoAndStop(12);
            }
            else if(theWeakness == "Poison")
            {
               iconW.gotoAndStop(13);
            }
            else if(theWeakness == "Laser")
            {
               iconW.gotoAndStop(14);
            }
            else if(theWeakness == "Ice")
            {
               iconW.gotoAndStop(15);
            }
            else if(theWeakness == "Food")
            {
               iconW.gotoAndStop(16);
            }
            else if(theWeakness == "Magic")
            {
               iconW.gotoAndStop(17);
            }
            this.bg.addChild(iconW);
            if(type == "Normal")
            {
               iconW.x = 38 + i * 38 + ii * 38;
               iconW.y = this.infoText.height + 38;
            }
            else if(type == "Small")
            {
               iconW.scaleX = 0.75;
               iconW.scaleY = 0.75;
               iconW.x = xStart + i * 28 + ii * 28;
               iconW.y = yPos;
            }
            iconWText = new TextField();
            if(type == "Normal")
            {
               this.addText(iconW,iconWText,this.textFormat2,16777215,Number(enemyWeaknessesArray[ii * 2 + 1]) * 100 + "%",16,50,-25,2,true);
            }
            else if(type == "Small")
            {
               this.addText(iconW,iconWText,this.textFormat,16777215,Number(enemyWeaknessesArray[ii * 2 + 1]) * 100 + "%",15,40,-20,3,true);
            }
            this.weaknessesIconArray.push(iconW);
         }
         if(type == "Small")
         {
            return amountOfStrengthsAndWeaknesses;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
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
      
      internal function clone(source:Object) : *
      {
         var myBA:ByteArray = new ByteArray();
         myBA.writeObject(source);
         myBA.position = 0;
         return myBA.readObject();
      }
   }
}

