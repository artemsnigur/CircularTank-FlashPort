package
{
   import fl.transitions.Tween;
   import fl.transitions.TweenEvent;
   import fl.transitions.easing.Strong;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.media.SoundTransform;
   import flash.net.URLRequest;
   import flash.net.navigateToURL;
   
   public class ScreenSplash extends Sprite
   {
      
      public var type:String = "";
      
      private var bg:BackgroundSplashScreen = new BackgroundSplashScreen();
      
      private var isAdded:Boolean = false;
      
      private var tweenValueObj:Object = new Object();
      
      private var splashLogo:Sprite;
      
      private var clickReady:Boolean = false;
      
      private var splashAnimation:MovieClip;
      
      private var timeTween:Tween = new Tween(this.tweenValueObj,"tweenValue",Strong.easeOut,1,0,100,false);
      
      public function ScreenSplash()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         addEventListener(Event.ENTER_FRAME,this.update);
         buttonMode = true;
      }
      
      public function added(event:Event) : void
      {
         var vol:* = undefined;
         var soundTrans:* = undefined;
         if(!this.isAdded)
         {
            this.isAdded = true;
            if(this.type != "SponsorAnimation")
            {
               addChild(this.bg);
            }
            if(this.type == "WTFCake")
            {
               this.timeTween.addEventListener(TweenEvent.MOTION_FINISH,this.contentTweenFinish);
               this.splashLogo = new SplashScreenWTFCake();
               addChild(this.splashLogo);
            }
            else if(this.type == "Sponsor")
            {
               this.timeTween.addEventListener(TweenEvent.MOTION_FINISH,this.contentTweenFinish);
               this.splashLogo = new SplashScreenSponsor();
               addChild(this.splashLogo);
            }
            else if(this.type == "SponsorAnimation")
            {
               this.splashAnimation = new SponsorIntro();
               addChild(this.splashAnimation);
               this.splashAnimation.x = 320;
               this.splashAnimation.y = 240;
               vol = SoundManager.soundVol;
               if(!SoundManager.soundOn)
               {
                  vol = 0;
               }
               soundTrans = new SoundTransform(vol,0);
               this.splashAnimation.soundTransform = soundTrans;
            }
         }
      }
      
      private function changeScreen() : void
      {
         if(this.type == "WTFCake")
         {
            Main.changeScreen = "Menu";
         }
         else if(this.type == "Sponsor" || this.type == "SponsorAnimation")
         {
            if(Main.wtfcakeSplashAccepted)
            {
               Main.changeScreen = "Splash";
            }
            else
            {
               Main.changeScreen = "Menu";
            }
         }
      }
      
      private function contentTweenFinish(event:TweenEvent) : void
      {
         this.changeScreen();
      }
      
      public function update(event:Event) : void
      {
         var shakeDistMax:* = undefined;
         var shakeDist:* = undefined;
         var shakeAngle:* = undefined;
         if(this.type != "SponsorAnimation")
         {
            shakeDistMax = 30;
            shakeDist = this.tweenValueObj.tweenValue * shakeDistMax;
            shakeAngle = Math.random() * 360;
            this.splashLogo.x = Math.cos(shakeAngle) * shakeDist;
            this.splashLogo.y = Math.sin(shakeAngle) * shakeDist;
         }
         else if(this.splashAnimation.currentFrame == 150)
         {
            this.splashAnimation.gotoAndStop(149);
            this.changeScreen();
         }
         if(!Main.mouse)
         {
            this.clickReady = true;
         }
         else if(this.clickReady)
         {
            if(this.type == "WTFCake")
            {
               navigateToURL(new URLRequest(Main.linkWTFCake),"_blank");
            }
            else if(this.type == "Sponsor" || this.type == "SponsorAnimation")
            {
               navigateToURL(new URLRequest(Main.linkSponsor),"_blank");
            }
            this.clickReady = false;
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
   }
}

