package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class Achievement extends MovieClip
   {
      
      public var onStatusScreen:Boolean = false;
      
      private var difficultyText:String = "";
      
      private var cursorOver:Boolean = false;
      
      public var theDescription:String = "";
      
      public var theDifficulty:Boolean;
      
      public var thisState:Number = -1;
      
      public var theTitle:String = "";
      
      private var isAdded:Boolean = false;
      
      public var pText:Object;
      
      private var theText:String;
      
      public function Achievement()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            switch(this.thisState)
            {
               case -1:
                  gotoAndStop(1);
                  break;
               case 0:
               case 1:
                  gotoAndStop(2);
                  break;
               case 2:
                  gotoAndStop(3);
                  break;
               case 3:
                  gotoAndStop(4);
            }
            switch(this.theDifficulty)
            {
               case false:
                  this.difficultyText = "\n\n(Difficulty doesn\'t matter.)";
                  break;
               case true:
                  switch(this.thisState)
                  {
                     case -1:
                        this.difficultyText = "\n\n(Difficulty matters.)";
                        break;
                     case 1:
                        this.difficultyText = "\n\n(Completed on EASY.)";
                        break;
                     case 2:
                        this.difficultyText = "\n\n(Completed on MEDIUM.)";
                        break;
                     case 3:
                        this.difficultyText = "\n\n(Completed on HARD.)";
                  }
            }
            this.theText = this.theTitle + "\n" + this.theDescription + this.difficultyText;
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = true;
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver)
         {
            if(this.pText != null)
            {
               this.pText.showText = true;
               if(!this.onStatusScreen)
               {
                  this.pText.changeText(this.theText,true,false,"Achievement",this.theTitle.length,this.difficultyText.length);
               }
               else
               {
                  this.pText.changeText(this.theText,false,false,"Achievement",this.theTitle.length,this.difficultyText.length);
               }
            }
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
      }
   }
}

