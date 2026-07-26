package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.net.URLRequest;
   import flash.net.navigateToURL;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol1625")]
   public class ButtonSocial extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var addFrames:int = 0;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public var type:String = "";
      
      public function ButtonSocial()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
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
            if(this.type == "FacebookWTFCake")
            {
               this.addFrames = 0;
            }
            else if(this.type == "FacebookSponsor")
            {
               this.addFrames = 3;
            }
            else if(this.type == "TwitterWTFCake")
            {
               this.addFrames = 6;
            }
            else if(this.type == "TwitterSponsor")
            {
               this.addFrames = 9;
            }
            this.gotoAndStop(1 + this.addFrames);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            this.gotoAndStop(3 + this.addFrames);
         }
         else
         {
            this.gotoAndStop(2 + this.addFrames);
         }
         if(!this.cursorOver)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.cursorOver = true;
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         this.pressed = true;
         this.gotoAndStop(3 + this.addFrames);
      }
      
      public function update(event:Event) : void
      {
         if(!Main.mouse)
         {
            this.pressed = false;
         }
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
      
      internal function onReleaseHandler(myEvent:MouseEvent) : *
      {
         if(this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2 + this.addFrames);
            if(this.type == "FacebookWTFCake")
            {
               navigateToURL(new URLRequest(Main.linkFacebookWTFCake),"_blank");
            }
            else if(this.type == "FacebookSponsor")
            {
               navigateToURL(new URLRequest(Main.linkFacebookSponsor),"_blank");
            }
            else if(this.type == "TwitterWTFCake")
            {
               navigateToURL(new URLRequest(Main.linkTwitterWTFCake),"_blank");
            }
            else if(this.type == "TwitterSponsor")
            {
               navigateToURL(new URLRequest(Main.linkTwitterSponsor),"_blank");
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1 + this.addFrames);
         this.cursorOver = false;
      }
   }
}

