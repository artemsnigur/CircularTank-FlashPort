package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.net.URLRequest;
   import flash.net.navigateToURL;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol572")]
   public class ButtonPremium extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      private var addFrames:int = 0;
      
      private var cursorOver:Boolean = false;
      
      private var isAdded:Boolean = false;
      
      public var pText:Object;
      
      private var theText:String = "Premium Shop";
      
      public function ButtonPremium()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         addEventListener(MouseEvent.MOUSE_UP,this.onReleaseHandler);
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.tabEnabled = false;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(!Main.siteLockVersion)
            {
               this.addFrames = 0;
            }
            else if(Main.sponsorLogoForReplacingPremiumButton)
            {
               this.addFrames = 7;
               this.theText = "Armor Games";
            }
            else
            {
               this.addFrames = 4;
               this.theText = "WTFCake";
            }
            if(Main.changeScreen != "Premium")
            {
               this.gotoAndStop(1 + this.addFrames);
               buttonMode = true;
            }
            else
            {
               this.gotoAndStop(4);
            }
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(Main.changeScreen != "Premium")
         {
            this.pText.changeText(this.theText,false,false);
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
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(Main.changeScreen != "Premium")
         {
            this.pressed = true;
            this.gotoAndStop(3 + this.addFrames);
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver)
         {
            if(this.pText != null)
            {
               this.pText.showText = true;
            }
         }
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
         if(Main.changeScreen != "Premium" && this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2 + this.addFrames);
            if(this.addFrames == 0)
            {
               Main.changeScreen = "Premium";
               Main.googleTracker.trackEvent("Button Clicked","Button Premium");
            }
            else if(this.addFrames == 4)
            {
               navigateToURL(new URLRequest(Main.linkWTFCake),"_blank");
            }
            else if(this.addFrames == 7)
            {
               navigateToURL(new URLRequest(Main.linkSponsor),"_blank");
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(Main.changeScreen != "Premium")
         {
            this.gotoAndStop(1 + this.addFrames);
            this.cursorOver = false;
         }
      }
   }
}

