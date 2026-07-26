package
{
   import flash.display.MovieClip;
   import flash.events.MouseEvent;
   import flash.net.URLRequest;
   import flash.net.navigateToURL;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol39")]
   public class LogoWTFCakeMenu extends MovieClip
   {
      
      public function LogoWTFCakeMenu()
      {
         super();
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         this.gotoAndStop(1);
         this.buttonMode = true;
         this.tabEnabled = false;
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.gotoAndStop(1);
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 2)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.gotoAndStop(2);
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         SoundManager.sfxArray.push("InterfaceButtonClick");
         navigateToURL(new URLRequest(Main.linkWTFCake),"_blank");
      }
   }
}

