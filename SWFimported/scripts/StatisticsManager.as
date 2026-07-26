package
{
   import flash.display.Sprite;
   import flash.events.Event;
   
   public class StatisticsManager extends Sprite
   {
      
      private var isAdded:Boolean = false;
      
      public function StatisticsManager()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public static function updateSecondaryWeapons(levelsArray:Array) : void
      {
         var weaponsBought:Number = NaN;
         var weaponsMaxed:Number = NaN;
         var i:* = undefined;
         if(Main.kongregateOn)
         {
            weaponsBought = 0;
            weaponsMaxed = 0;
            for(i = 0; i < levelsArray.length; i++)
            {
               if(levelsArray[i] > 0)
               {
                  weaponsBought++;
               }
               if(levelsArray[i] == 10)
               {
                  weaponsMaxed++;
               }
            }
            Main.kongregate.stats.submit("SecondaryWeaponsBought",weaponsBought);
            Main.kongregate.stats.submit("SecondaryWeaponsMaxed",weaponsMaxed);
         }
      }
      
      public static function updateKills(kills:Number) : void
      {
         if(Main.kongregateOn)
         {
            Main.kongregate.stats.submit("EnemiesKilled",kills);
         }
      }
      
      public static function updateProgress(valuesArrays:Array) : void
      {
         var levelsCompleted:Number = NaN;
         var worldsCompleted:Number = NaN;
         var i:* = undefined;
         var ii:* = undefined;
         if(Main.kongregateOn)
         {
            levelsCompleted = 0;
            worldsCompleted = 0;
            loop0:
            for(i = 0; i < valuesArrays.length; i++)
            {
               for(ii = 0; ii < valuesArrays[i].length; ii++)
               {
                  if(valuesArrays[i][ii][0] == 0 && valuesArrays[i][ii][1] == 0 && valuesArrays[i][ii][2] == 0)
                  {
                     break loop0;
                  }
                  levelsCompleted++;
                  if(ii == valuesArrays[i].length - 1)
                  {
                     worldsCompleted++;
                  }
               }
            }
            Main.kongregate.stats.submit("LevelsCompleted",levelsCompleted);
            Main.kongregate.stats.submit("worldsCompleted",worldsCompleted);
         }
      }
      
      public static function updatePrimaryWeapons(levelsArray:Array) : void
      {
         var weaponsBought:Number = NaN;
         var weaponsMaxed:Number = NaN;
         var i:* = undefined;
         if(Main.kongregateOn)
         {
            weaponsBought = 0;
            weaponsMaxed = 0;
            for(i = 0; i < levelsArray.length; i++)
            {
               if(levelsArray[i] > 0)
               {
                  weaponsBought++;
               }
               if(levelsArray[i] == 10)
               {
                  weaponsMaxed++;
               }
            }
            Main.kongregate.stats.submit("PrimaryWeaponsBought",weaponsBought);
            Main.kongregate.stats.submit("PrimaryWeaponsMaxed",weaponsMaxed);
         }
      }
      
      public static function updateMoney(money:Number) : void
      {
         if(Main.kongregateOn)
         {
            Main.kongregate.stats.submit("MoneyEarned",money);
         }
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
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
   }
}

