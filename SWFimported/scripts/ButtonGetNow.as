package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol672")]
   public class ButtonGetNow extends MovieClip
   {
      
      private var pressed:Boolean = false;
      
      public var cursorOver:Boolean = false;
      
      public var isActive:Boolean = true;
      
      private var isAdded:Boolean = false;
      
      public function ButtonGetNow()
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
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            this.pressed = true;
            this.gotoAndStop(3);
         }
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(this.isActive)
            {
               gotoAndStop(1);
               buttonMode = true;
            }
            else
            {
               gotoAndStop(4);
               buttonMode = false;
            }
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.isActive && !Main.mouse)
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
         if(this.isActive && this.pressed)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
            this.gotoAndStop(2);
            Main.googleTracker.trackEvent("Button Clicked","Button Get Now");
            if(Main.armorGamesOn)
            {
               Main.agi.content.showStore({
                  "sku":"ct-tank_awesomizer",
                  "callback":function(data:Object):void
                  {
                     var i:* = undefined;
                     if(data.success)
                     {
                        switch(data.response)
                        {
                           case Main.agi.content.RESPONSE_USER_CANCELLED:
                           case Main.agi.content.RESPONSE_PURCHASE_FAILED:
                              break;
                           case Main.agi.content.RESPONSE_PURCHASE_SUCCESS:
                              for(i = 0; i < data.purchases.length; i++)
                              {
                                 if(data.purchases[i].name == "Tank Awesomizer")
                                 {
                                    Main.premiumPurchase();
                                 }
                              }
                        }
                     }
                     else
                     {
                        trace(data.error);
                     }
                  }
               });
            }
            else if(Main.kongregateOn)
            {
               Main.kongregate.mtx.purchaseItems(["tank_awesomizer"],this.onPurchaseResult);
            }
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            this.gotoAndStop(1);
            this.cursorOver = false;
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.isActive)
         {
            if(this.pressed)
            {
               this.gotoAndStop(3);
            }
            else
            {
               this.gotoAndStop(2);
            }
            if(!this.cursorOver)
            {
               SoundManager.sfxArray.push("InterfaceButtonOver1");
            }
         }
         this.cursorOver = true;
      }
      
      internal function onPurchaseResult(result:Object) : *
      {
         if(result.success)
         {
            Main.premiumPurchase();
         }
      }
   }
}

