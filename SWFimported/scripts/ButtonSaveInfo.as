package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol557")]
   public class ButtonSaveInfo extends MovieClip
   {
      
      public var type:String;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public var pText:Object;
      
      public function ButtonSaveInfo()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            this.gotoAndStop(1);
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver)
         {
            this.pText.showText = true;
            if(this.type == "Local")
            {
               this.pText.changeText("Local saves are saved on your computer and can be lost if the cookies get deleted.",false,true);
            }
            else if(this.type == "Online")
            {
               this.pText.changeText("Online saves are saved on your Armor Games account. With these saves you can save and load your progress from any computer.",false,true);
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
         this.cursorOver = false;
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(2);
         if(!this.cursorOver)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.cursorOver = true;
      }
   }
}

