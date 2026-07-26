package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol1452")]
   public class ButtonLevelGuideAutoSelect extends MovieClip
   {
      
      private var cursorOver:Boolean = false;
      
      public var pText:Object;
      
      private var theText:String = "";
      
      public function ButtonLevelGuideAutoSelect()
      {
         super();
         addEventListener(Event.ENTER_FRAME,this.update);
         addEventListener(MouseEvent.ROLL_OVER,this.onRollOverHandler);
         addEventListener(MouseEvent.ROLL_OUT,this.onRollOutHandler);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
         this.setText();
         this.setImage();
         buttonMode = true;
         this.tabEnabled = false;
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 3)
         {
            SoundManager.sfxArray.push("InterfaceButtonClick");
         }
         LevelGuide.autoSelect = !LevelGuide.autoSelect;
         this.setText();
         this.pText.changeText(this.theText,false,false);
         this.setImage();
         if(LevelGuide.autoSelect)
         {
            LevelGuide.type = "Upcoming";
            LevelGuide.updateVariables();
            Object(parent).updateAllButtons();
         }
      }
      
      public function update(event:Event) : void
      {
         if(this.cursorOver)
         {
            this.pText.showText = true;
         }
      }
      
      private function setText() : void
      {
         if(LevelGuide.autoSelect)
         {
            this.theText = "Auto Select Level (Enabled)\n(Enabled Recommended)\n\nAutomatically selects the upcoming level for the level guide and the level select screen.";
         }
         else
         {
            this.theText = "Auto Select Level (Disabled)\n(Enabled Recommended)\n\nAutomatically selects the upcoming level for the level guide and the level select screen.";
         }
      }
      
      internal function onRollOutHandler(myEvent:MouseEvent) : *
      {
         this.cursorOver = false;
         this.setImage();
      }
      
      private function setImage() : void
      {
         if(LevelGuide.autoSelect)
         {
            if(this.cursorOver)
            {
               this.gotoAndStop(4);
            }
            else
            {
               this.gotoAndStop(3);
            }
         }
         else if(this.cursorOver)
         {
            this.gotoAndStop(2);
         }
         else
         {
            this.gotoAndStop(1);
         }
      }
      
      internal function onRollOverHandler(myEvent:MouseEvent) : *
      {
         if(this.currentFrame != 2)
         {
            SoundManager.sfxArray.push("InterfaceButtonOver1");
         }
         this.cursorOver = true;
         this.pText.changeText(this.theText,false,false);
         this.setImage();
      }
   }
}

