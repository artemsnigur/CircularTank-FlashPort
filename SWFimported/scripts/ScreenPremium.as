package
{
   import fl.transitions.Tween;
   import fl.transitions.easing.Strong;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.DropShadowFilter;
   
   public class ScreenPremium extends Sprite
   {
      
      public static var triggeredFromMenu:Boolean = false;
      
      private var contentTween:Tween;
      
      private var bgMenu:BackgroundMenu = new BackgroundMenu();
      
      private var contentHolder:MovieClip = new MovieClip();
      
      private var pInfoText:PartInfoText = new PartInfoText();
      
      private var bgTitle:BackgroundTitle = new BackgroundTitle();
      
      private var bgSquareBig:BackgroundSquareBig = new BackgroundSquareBig();
      
      private var shadowArray:Array = filters;
      
      private var bGetNow:ButtonGetNow = new ButtonGetNow();
      
      private var arrowToMenu:ArrowToMenu = new ArrowToMenu();
      
      private var sponsorLogo:SponsorLogoCorner = new SponsorLogoCorner();
      
      private var theTitle:TitlePremium = new TitlePremium();
      
      private var bottomBar:BottomBar = new BottomBar();
      
      private var bPlayWithPremiumBig:ButtonPlayWithPremiumBig = new ButtonPlayWithPremiumBig();
      
      private var premiumContentStuff:PremiumContentStuff = new PremiumContentStuff();
      
      private var myShadow:* = new DropShadowFilter(0,0,0,1,4,4,5,2);
      
      private var isAdded:Boolean = false;
      
      public function ScreenPremium()
      {
         this.contentTween = new Tween(this.contentHolder,"x",Strong.easeOut,-640,0,20,false);
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         this.shadowArray.push(this.myShadow);
         this.contentTween.stop();
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            addChild(this.bgTitle);
            addChild(this.bgMenu);
            this.bgMenu.y = this.bgTitle.height;
            addChild(this.bgSquareBig);
            this.bgSquareBig.y = this.bgTitle.height;
            addChild(this.theTitle);
            this.theTitle.x = 320;
            this.theTitle.y = 40;
            this.theTitle.scaleX = 0.9;
            this.theTitle.scaleY = 0.9;
            addChild(this.sponsorLogo);
            this.bottomBar.pText = this.pInfoText;
            addChild(this.bottomBar);
            this.bottomBar.x = 0;
            this.bottomBar.y = 432;
            addChild(this.contentHolder);
            this.contentHolder.x = -640;
            this.contentTween.start();
            this.contentHolder.addChild(this.premiumContentStuff);
            this.premiumContentStuff.y = 88;
            this.premiumContentStuff.filters = this.shadowArray;
            if(Main.extraStuff)
            {
               this.premiumContentStuff.gotoAndStop(5);
               if(triggeredFromMenu)
               {
                  addChild(this.arrowToMenu);
                  this.arrowToMenu.x = 548 + 20.5;
                  this.arrowToMenu.y = 432;
               }
            }
            else
            {
               if(Main.armorGamesOn)
               {
                  if(!Main.agi.user.isGuest())
                  {
                     this.premiumContentStuff.gotoAndStop(1);
                     this.bGetNow.isActive = true;
                  }
                  else
                  {
                     this.premiumContentStuff.gotoAndStop(3);
                     this.bGetNow.isActive = false;
                  }
               }
               else if(Main.kongregateOn)
               {
                  if(!Main.kongregate.services.isGuest())
                  {
                     this.premiumContentStuff.gotoAndStop(1);
                     this.bGetNow.isActive = true;
                  }
                  else
                  {
                     this.premiumContentStuff.gotoAndStop(4);
                     this.bGetNow.isActive = false;
                  }
               }
               else if(Main.viralVersion)
               {
                  this.premiumContentStuff.gotoAndStop(2);
                  this.contentHolder.addChild(this.bPlayWithPremiumBig);
                  this.bPlayWithPremiumBig.x = 320;
                  this.bPlayWithPremiumBig.y = 264;
               }
               if(Main.armorGamesOn || Main.kongregateOn)
               {
                  this.contentHolder.addChild(this.bGetNow);
                  this.bGetNow.x = 320;
                  this.bGetNow.y = 264;
               }
            }
            addChild(this.pInfoText);
            this.pInfoText.mouseEnabled = false;
         }
      }
      
      public function update(event:Event) : void
      {
      }
      
      public function premiumBought() : void
      {
         if(stage.contains(this.bGetNow))
         {
            this.contentHolder.removeChild(this.bGetNow);
         }
         this.premiumContentStuff.gotoAndStop(5);
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

