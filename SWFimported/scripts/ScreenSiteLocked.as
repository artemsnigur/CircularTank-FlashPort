package
{
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.text.TextField;
   import flash.text.TextFormat;
   
   public class ScreenSiteLocked extends Sprite
   {
      
      private var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false,null,null,"center");
      
      private var isAdded:Boolean = false;
      
      private var siteLockText:TextField = new TextField();
      
      public function ScreenSiteLocked()
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
            this.siteLockText.width = 400;
            this.siteLockText.height = 22;
            this.siteLockText.x = 320 - 200;
            this.siteLockText.y = 240 - 11;
            this.siteLockText.defaultTextFormat = this.textFormat;
            this.siteLockText.mouseEnabled = false;
            addChild(this.siteLockText);
            this.siteLockText.text = "This game is sitelocked to armorgames.com";
         }
      }
      
      public function removed(event:Event) : void
      {
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
   }
}

