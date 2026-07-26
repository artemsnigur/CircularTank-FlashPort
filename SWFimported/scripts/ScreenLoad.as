package
{
   import flash.display.Loader;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.net.URLRequest;
   import flash.system.Security;
   import flash.text.TextField;
   import flash.text.TextFormat;
   
   public class ScreenLoad extends Sprite
   {
      
      private var textFormat:TextFormat = new TextFormat("JG",16,16777215,true,false,false,null,null,"center");
      
      public var percent:Number = 0;
      
      public var totalBytes:int = 0;
      
      private var loadingBackground:LoadingBackground = new LoadingBackground();
      
      private var loadingRing:LoadingRing = new LoadingRing();
      
      private var loadAngle:Number = 0;
      
      private var logoWTFCake:LogoWTFCakeMenu = new LogoWTFCakeMenu();
      
      private var bToggleSound:ButtonToggleSound = new ButtonToggleSound();
      
      private var loadingBall:LoadingBall = new LoadingBall();
      
      private var bPlay:ButtonPlay = new ButtonPlay();
      
      private var trueBallAngle:Number = 0;
      
      private var logoSponsor:LogoSponsorMenu = new LogoSponsorMenu();
      
      private var loadingGlow:LoadingGlow = new LoadingGlow();
      
      private var tankBody:TankBody = new TankBody();
      
      public var loadedBytes:int = 0;
      
      private var textFormat2:TextFormat = new TextFormat("Arial",12,16777215,true,false,false,null,null,"center");
      
      private var bToggleMusic:ButtonToggleMusic = new ButtonToggleMusic();
      
      private var prevTrueAngle:Number = 0;
      
      public var bytesText:TextField = new TextField();
      
      public var progressText:TextField = new TextField();
      
      private var isAdded:Boolean = false;
      
      private var theMask:MovieClip = new MovieClip();
      
      private var tankTower:TankTower = new TankTower();
      
      public function ScreenLoad()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function update(event:Event) : void
      {
         var u:int = 0;
         this.loadAngle = this.loadedBytes / this.totalBytes * 360 - 180;
         this.trueBallAngle = this.prevTrueAngle + (this.loadAngle - this.prevTrueAngle) / 3;
         if(this.trueBallAngle < 179)
         {
            this.loadingBall.x = 320 + Math.cos(this.trueBallAngle * Math.PI / 180) * 148;
            this.loadingBall.y = 220 + Math.sin(this.trueBallAngle * Math.PI / 180) * 148;
            this.loadingBall.scaleX = 1.3 - this.loadedBytes / this.totalBytes;
            this.loadingBall.scaleY = 1.3 - this.loadedBytes / this.totalBytes;
            this.tankTower.rotation = this.trueBallAngle;
         }
         else
         {
            if(stage.contains(this.loadingBall))
            {
               removeChild(this.loadingBall);
            }
            if(!stage.contains(this.bPlay))
            {
               this.bPlay.activeButton = true;
               addChild(this.bPlay);
               this.bPlay.x = 320 - this.bPlay.width / 2;
               this.bPlay.y = 408;
            }
            this.tankTower.rotation = Math.atan2(this.tankBody.x - mouseX,mouseY - this.tankBody.y) * 180 / Math.PI + 90;
         }
         var degree:* = this.trueBallAngle + 180;
         if(degree > 359)
         {
            degree = 360;
         }
         var radianAngle:Number = degree * Math.PI / 180;
         this.theMask.graphics.clear();
         this.theMask.graphics.beginFill(16777215,1);
         for(u = 360; u <= degree * 2 + 360; u++)
         {
            this.theMask.graphics.lineTo(this.theMask.circleR * Math.cos(u * Math.PI / 360),Number(this.theMask.circleR) * Math.sin(u * Math.PI / 360));
         }
         this.theMask.graphics.lineTo(0,0);
         this.theMask.graphics.endFill();
         this.prevTrueAngle = this.trueBallAngle;
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(Main.absOn)
            {
               addChild(this.loadingBackground);
            }
            else
            {
               this.progressText.x = 320 - 50;
               this.progressText.y = 220 + 20;
               this.bytesText.x = 320 - 50;
               this.bytesText.y = 220 + 40;
               addChild(this.loadingGlow);
               this.loadingGlow.x = 320;
               this.loadingGlow.y = 220;
               addChild(this.loadingRing);
               this.loadingRing.x = 320;
               this.loadingRing.y = 220;
               addChild(this.loadingBall);
               this.loadingBall.x = 320 - 148;
               this.loadingBall.y = 220;
               addChild(this.tankBody);
               this.tankBody.gotoAndStop(1);
               this.tankBody.x = 320;
               this.tankBody.y = 220;
               addChild(this.tankTower);
               this.tankTower.x = 320;
               this.tankTower.y = 220;
               this.tankTower.gotoAndStop(1);
               this.loadAngle = this.loadedBytes / this.totalBytes * 360 - 180;
               this.trueBallAngle = this.loadAngle;
               this.prevTrueAngle = this.loadAngle;
               this.theMask.degree = 360;
               this.theMask.circleR = 160;
               this.theMask.x = 320;
               this.theMask.y = 220;
               addChild(this.theMask);
               this.loadingRing.mask = this.theMask;
            }
            this.progressText.width = 100;
            this.progressText.height = 22;
            this.progressText.text = "";
            this.progressText.defaultTextFormat = this.textFormat;
            this.progressText.mouseEnabled = false;
            addChild(this.progressText);
            this.bytesText.width = 100;
            this.bytesText.height = 16;
            this.bytesText.text = "";
            this.bytesText.defaultTextFormat = this.textFormat2;
            this.bytesText.mouseEnabled = false;
            addChild(this.bytesText);
            addChild(this.logoWTFCake);
            this.logoWTFCake.x = 118;
            this.logoWTFCake.y = 412;
            addChild(this.logoSponsor);
            this.logoSponsor.x = 522;
            this.logoSponsor.y = 412;
            addChild(this.bToggleSound);
            addChild(this.bToggleMusic);
            if(Main.absOn)
            {
               this.showABS();
               this.progressText.x = 320 - 50;
               this.progressText.y = 304 + 20;
               this.bytesText.x = 320 - 50;
               this.bytesText.y = 304 + 40;
               this.bToggleSound.x = 320 - 19;
               this.bToggleSound.y = 382;
               this.bToggleMusic.x = 320 + 19;
               this.bToggleMusic.y = 382;
            }
            else
            {
               this.bToggleSound.x = 320 - 19;
               this.bToggleSound.y = 330;
               this.bToggleMusic.x = 320 + 19;
               this.bToggleMusic.y = 330;
            }
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
      
      private function showABS() : *
      {
         var urlRequest:URLRequest;
         var loader:Loader;
         var abs:* = undefined;
         var loadComplete:Function = null;
         loadComplete = function(e:Event):void
         {
            abs = e.currentTarget.content;
            addChild(abs);
            abs.show({
               "x":320 - 150,
               "y":192 - 125
            });
         };
         var abs_url:String = "http://agi.armorgames.com/assets/agi/ABS.swf";
         Security.allowDomain(abs_url);
         urlRequest = new URLRequest(abs_url);
         loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,loadComplete);
         loader.load(urlRequest);
      }
   }
}

