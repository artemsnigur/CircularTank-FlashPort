package
{
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.text.*;
   
   public class ImageEnemy extends MovieClip
   {
      
      public var enemyAmount:String = "None";
      
      public var textFormat:TextFormat = new TextFormat("JG",12,16777215,true,false,false);
      
      private var cursorOver:Boolean = false;
      
      public var levelText:TextField = new TextField();
      
      private var bgEnemyImage:BackgroundEnemyImage = new BackgroundEnemyImage();
      
      public var enemyLevel:String = "None";
      
      public var amountText:TextField = new TextField();
      
      public var textFormat2:TextFormat = new TextFormat("JG",11,16777215,true,false,false);
      
      private var isAdded:Boolean = false;
      
      public var enemyName:String = "None";
      
      public var pText:Object;
      
      public function ImageEnemy()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(Event.ENTER_FRAME,this.update);
      }
      
      public function update(event:Event) : void
      {
         this.setImage();
      }
      
      private function added(event:Event) : void
      {
         var theImage:Sprite = null;
         var tempImage:MovieClip = null;
         if(!this.isAdded)
         {
            this.isAdded = true;
            addChild(this.bgEnemyImage);
            this.bgEnemyImage.gotoAndStop(1);
            this.bgEnemyImage.x = -this.bgEnemyImage.width / 2;
            if(this.enemyName == "Basic")
            {
               theImage = new EnemyBasic();
            }
            else if(this.enemyName == "Fast")
            {
               theImage = new EnemyFast();
            }
            else if(this.enemyName == "Strong")
            {
               theImage = new EnemyStrong();
            }
            else if(this.enemyName == "Shrinking")
            {
               theImage = new EnemyShrinking();
            }
            else if(this.enemyName == "Shooting")
            {
               theImage = new EnemyShooting();
            }
            else if(this.enemyName == "Ghost")
            {
               tempImage = new EnemyGhost();
               tempImage.gotoAndStop(1);
               theImage = tempImage;
            }
            else if(this.enemyName == "Trap")
            {
               theImage = new EnemyTrap();
            }
            else if(this.enemyName == "Temperamental")
            {
               tempImage = new EnemyTemperamental();
               tempImage.gotoAndStop(1);
               theImage = tempImage;
            }
            else if(this.enemyName == "Ninja")
            {
               theImage = new EnemyNinja();
            }
            else if(this.enemyName == "Accelerating")
            {
               theImage = new EnemyAccelerating();
            }
            else if(this.enemyName == "Crazy")
            {
               theImage = new EnemyCrazy();
            }
            else if(this.enemyName == "Medic")
            {
               theImage = new EnemyMedic();
            }
            else if(this.enemyName == "Random")
            {
               theImage = new EnemyRandom();
            }
            else if(this.enemyName == "Scared Ghost")
            {
               tempImage = new EnemyScaredGhost();
               tempImage.gotoAndStop(1);
               theImage = tempImage;
            }
            else if(this.enemyName == "Damage Addict")
            {
               theImage = new EnemyDamageAddict();
            }
            else if(this.enemyName == "Exploding")
            {
               theImage = new EnemyExploding();
            }
            else if(this.enemyName == "Tiny")
            {
               theImage = new EnemyTiny();
            }
            else if(this.enemyName == "Grappling Hook")
            {
               theImage = new EnemyGrapplingHook();
            }
            else if(this.enemyName == "Teleporting")
            {
               tempImage = new EnemyTeleporting();
               tempImage.gotoAndStop(1);
               theImage = tempImage;
            }
            else if(this.enemyName == "Soldier")
            {
               theImage = new EnemySoldier();
            }
            if(theImage != null)
            {
               addChild(theImage);
               theImage.rotation += 90;
               theImage.y = 32;
            }
            this.addText(this.amountText,this.textFormat2,0,this.enemyAmount,16,40,-20,0,true);
            if(this.enemyLevel != "B")
            {
               this.addText(this.levelText,this.textFormat,0,String("lvl " + this.enemyLevel),16,36,-18,46,true);
            }
            else
            {
               this.addText(this.levelText,this.textFormat,0,"Boss",16,36,-18,46,true);
            }
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
         this.pText.showText = true;
         this.bgEnemyImage.gotoAndStop(2);
         var right:* = false;
         var bottom:* = false;
         var theText:* = this.enemyName + " Enemy";
         if(this.enemyLevel != "B")
         {
            this.pText.changeText(theText,right,bottom,"EnemyStrengthsWeaknesses",this.enemyName);
         }
         else
         {
            this.pText.changeText(theText + " Boss",right,bottom,"EnemyStrengthsWeaknesses",this.enemyName);
         }
      }
      
      private function setImage() : void
      {
         if(this.cursorOver)
         {
            this.pText.showText = true;
         }
         else
         {
            this.bgEnemyImage.gotoAndStop(1);
         }
      }
      
      public function addText(textName:TextField, textFormat:TextFormat, textCol:uint, theText:String, h:Number, w:Number, xPos:Number, yPos:Number, centerText:Boolean = false) : void
      {
         textFormat.color = textCol;
         if(centerText)
         {
            textFormat.align = TextFormatAlign.CENTER;
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
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
   }
}

