package
{
   import flash.display.Sprite;
   import flash.events.Event;
   
   public class BottomBar extends Sprite
   {
      
      private var bMenu:ButtonMenu = new ButtonMenu();
      
      private var bOptions:ButtonOptions = new ButtonOptions();
      
      private var bEnemies:ButtonEnemies = new ButtonEnemies();
      
      private var bAchievements:ButtonAchievements = new ButtonAchievements();
      
      private var bgBottom:BackgroundBottom = new BackgroundBottom();
      
      private var bPremium:ButtonPremium = new ButtonPremium();
      
      private var isAdded:Boolean = false;
      
      private var bUpgrades:ButtonUpgrades = new ButtonUpgrades();
      
      public var pText:Object;
      
      private var bLevelSelect:ButtonLevelSelect = new ButtonLevelSelect();
      
      public function BottomBar()
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
            addChild(this.bgBottom);
            addChild(this.bUpgrades);
            this.bUpgrades.x = 5;
            this.bUpgrades.y = 4;
            addChild(this.bLevelSelect);
            this.bLevelSelect.x = 209;
            this.bLevelSelect.y = 4;
            this.bAchievements.pText = this.pText;
            addChild(this.bAchievements);
            this.bAchievements.x = 413;
            this.bAchievements.y = 4;
            this.bEnemies.pText = this.pText;
            addChild(this.bEnemies);
            this.bEnemies.x = 458;
            this.bEnemies.y = 4;
            this.bPremium.pText = this.pText;
            addChild(this.bPremium);
            this.bPremium.x = 503;
            this.bPremium.y = 4;
            this.bMenu.pText = this.pText;
            addChild(this.bMenu);
            this.bMenu.x = 548;
            this.bMenu.y = 4;
            this.bOptions.pText = this.pText;
            addChild(this.bOptions);
            this.bOptions.x = 593;
            this.bOptions.y = 4;
         }
      }
      
      public function update(event:Event) : void
      {
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
   }
}

