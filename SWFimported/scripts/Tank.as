package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   
   public class Tank extends MovieClip
   {
      
      public static var maxSpeed:Number = 3;
      
      public static var accSpeed:Number = 0.5;
      
      public static var friction:Number = 0.2;
      
      public var xVel:Number = 0;
      
      private var speed:Number = 0;
      
      public var tower:TankTower = new TankTower();
      
      public var pushedTimer:Number = 20;
      
      public var radius:Number = 14;
      
      private var rotSpeedMax:Number = 20;
      
      public var grappingEnemy:* = null;
      
      public var damageIndicator:Number = 0;
      
      public var body:TankBody = new TankBody();
      
      public var yVel:Number = 0;
      
      private var isAdded:Boolean = false;
      
      public var pushed:Boolean = false;
      
      public var pushedTimerMax:Number = 20;
      
      public function Tank()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            addChild(this.body);
            if(ScreenLevelSelect.levelMode == "Tower")
            {
               this.body.gotoAndStop(2);
            }
            else
            {
               this.body.gotoAndStop(1);
            }
            addChild(this.tower);
            maxSpeed = ScreenUpgrades.upgradeArraySpeed[1][ScreenUpgrades.levelsArrayMisc[0]];
            accSpeed = ScreenUpgrades.upgradeArraySpeed[2][ScreenUpgrades.levelsArrayMisc[0]];
            friction = ScreenUpgrades.upgradeArraySpeed[3][ScreenUpgrades.levelsArrayMisc[0]];
         }
      }
      
      public function update(event:Event) : void
      {
         if(!PartGameArea.levelDone && !PartGameArea.gamePaused)
         {
            this.tower.rotation = Math.atan2(parent.parent.mouseY - y,parent.parent.mouseX - x) * 180 / Math.PI;
            this.rotateTank();
         }
      }
      
      public function moveTank() : *
      {
         var angleToEnemy:* = undefined;
         var diaSpeed:* = undefined;
         var newSpeed:* = undefined;
         if(this.grappingEnemy != null)
         {
            if(stage.contains(this.grappingEnemy))
            {
               maxSpeed = 8;
               accSpeed = 0.4;
               friction = 0.3;
               angleToEnemy = this.angleBetween(x,y,this.grappingEnemy.x,this.grappingEnemy.y);
               this.xVel += Math.cos(angleToEnemy) * 2;
               this.yVel += Math.sin(angleToEnemy) * 2;
            }
            else
            {
               this.grappingEnemy = null;
               maxSpeed = ScreenUpgrades.upgradeArraySpeed[1][ScreenUpgrades.levelsArrayMisc[0]];
               accSpeed = ScreenUpgrades.upgradeArraySpeed[2][ScreenUpgrades.levelsArrayMisc[0]];
               friction = ScreenUpgrades.upgradeArraySpeed[3][ScreenUpgrades.levelsArrayMisc[0]];
            }
         }
         if(!this.pushed)
         {
            diaSpeed = accSpeed * Math.sqrt(2) / 2;
            if(!PartGameArea.levelDone)
            {
               if(!Main.up && !Main.down && Main.left && !Main.right)
               {
                  this.xVel -= accSpeed;
                  this.yVel = this.reduceValue(this.yVel,accSpeed / 3);
               }
               else if(Main.up && !Main.down && Main.left && !Main.right)
               {
                  this.xVel -= diaSpeed;
                  this.yVel -= diaSpeed;
               }
               else if(Main.down && !Main.up && Main.left && !Main.right)
               {
                  this.xVel -= diaSpeed;
                  this.yVel += diaSpeed;
               }
               if(!Main.up && !Main.down && Main.right && !Main.left)
               {
                  this.xVel += accSpeed;
                  this.yVel = this.reduceValue(this.yVel,accSpeed / 3);
               }
               else if(Main.up && !Main.down && Main.right && !Main.left)
               {
                  this.xVel += diaSpeed;
                  this.yVel -= diaSpeed;
               }
               else if(Main.down && !Main.up && Main.right && !Main.left)
               {
                  this.xVel += diaSpeed;
                  this.yVel += diaSpeed;
               }
               else if(Main.up && !Main.down)
               {
                  if(!Main.left && !Main.right)
                  {
                     this.yVel -= accSpeed;
                     this.xVel = this.reduceValue(this.xVel,accSpeed / 3);
                  }
               }
               else if(Main.down && !Main.up)
               {
                  if(!Main.left && !Main.right)
                  {
                     this.yVel += accSpeed;
                     this.xVel = this.reduceValue(this.xVel,accSpeed / 3);
                  }
               }
            }
            this.speed = Math.sqrt(this.xVel * this.xVel + this.yVel * this.yVel);
            if(this.speed > maxSpeed)
            {
               this.xVel *= maxSpeed / this.speed;
               this.yVel *= maxSpeed / this.speed;
            }
         }
         if(!Main.right && !Main.left && !Main.down && !Main.up || PartGameArea.levelDone || this.pushed)
         {
            if(this.speed - friction > 0)
            {
               newSpeed = this.speed - friction;
               this.xVel *= newSpeed / this.speed;
               this.yVel *= newSpeed / this.speed;
            }
            else
            {
               this.xVel = 0;
               this.yVel = 0;
            }
         }
         if(this.xVel > 0)
         {
            if(x + this.xVel < PartGameArea.roomWidth - this.radius)
            {
               x += this.xVel;
            }
            else
            {
               x = PartGameArea.roomWidth - this.radius;
               this.xVel = -this.xVel;
            }
         }
         else if(this.xVel < 0)
         {
            if(x + this.xVel > 0 + this.radius)
            {
               x += this.xVel;
            }
            else
            {
               x = this.radius;
               this.xVel = -this.xVel;
            }
         }
         if(this.yVel > 0)
         {
            if(y + this.yVel < PartGameArea.roomHeight - this.radius)
            {
               y += this.yVel;
            }
            else
            {
               y = PartGameArea.roomHeight - this.radius;
               this.yVel = -this.yVel;
               PartGameArea.tempHitBottom = true;
            }
         }
         else if(this.yVel < 0)
         {
            if(y + this.yVel > 0 + this.radius)
            {
               y += this.yVel;
            }
            else
            {
               y = this.radius;
               this.yVel = -this.yVel;
            }
         }
         if(this.pushed)
         {
            if(this.pushedTimer > 1)
            {
               --this.pushedTimer;
            }
            else
            {
               this.pushedTimer = this.pushedTimerMax;
               this.pushed = false;
            }
         }
      }
      
      private function rotateTank() : *
      {
         var rotDifference:* = undefined;
         var rotationGoal:* = 180 - Math.atan2(this.xVel,this.yVel) * 180 / Math.PI;
         if(rotationGoal >= 180)
         {
            rotationGoal -= 360;
         }
         rotDifference = rotationGoal - this.body.rotation;
         if(Math.abs(rotDifference) > 180 || Math.abs(rotDifference) >= 180 && this.body.rotation == -90)
         {
            if(rotDifference > 0)
            {
               rotDifference = -(360 - Math.abs(rotDifference));
            }
            else
            {
               rotDifference = 360 - Math.abs(rotDifference);
            }
         }
         this.speed = Math.sqrt(this.xVel * this.xVel + this.yVel * this.yVel);
         if(this.speed > 0)
         {
            if(rotDifference < this.rotSpeedMax && rotDifference > -this.rotSpeedMax)
            {
               this.body.rotation = 180 - Math.atan2(this.xVel,this.yVel) * 180 / Math.PI;
            }
            else if(rotDifference > 0)
            {
               this.body.rotation += this.rotSpeedMax;
            }
            else
            {
               this.body.rotation -= this.rotSpeedMax;
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
      
      private function angleBetween(x1:Number, y1:Number, x2:Number, y2:Number) : Number
      {
         var dx:Number = x2 - x1;
         var dy:Number = y2 - y1;
         return Math.atan2(dy,dx);
      }
      
      private function reduceValue(theValue:Number, theReducer:Number, theLimit:Number = 0) : *
      {
         if(theValue > theLimit)
         {
            if(theValue - theReducer > theLimit)
            {
               theValue -= theReducer;
            }
            else
            {
               theValue = theLimit;
            }
         }
         else if(theValue + theReducer < theLimit)
         {
            theValue += theReducer;
         }
         else
         {
            theValue = theLimit;
         }
         return theValue;
      }
   }
}

