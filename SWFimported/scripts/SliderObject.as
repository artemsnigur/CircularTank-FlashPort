package
{
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   public class SliderObject extends Sprite
   {
      
      public var sliderValue:Number;
      
      public var sliderBar:SliderBar = new SliderBar();
      
      public var sliderButton:SliderButton = new SliderButton();
      
      private var isAdded:Boolean = false;
      
      public var isPressed:Boolean = false;
      
      public function SliderObject()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
         addEventListener(MouseEvent.MOUSE_DOWN,this.onPressHandler);
      }
      
      public function added(event:Event) : void
      {
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            addChild(this.sliderBar);
            addChild(this.sliderButton);
            this.sliderButton.x = Math.round(this.sliderValue * this.sliderBar.width);
         }
      }
      
      public function update(event:Event) : void
      {
         if(Main.mouse)
         {
            if(this.isPressed)
            {
               if(mouseX < 0)
               {
                  this.sliderValue = 0;
                  this.sliderButton.x = 0;
               }
               else if(mouseX > this.sliderBar.width)
               {
                  this.sliderValue = 1;
                  this.sliderButton.x = this.sliderBar.width;
               }
               else
               {
                  this.sliderValue = mouseX / this.sliderBar.width;
                  this.sliderButton.x = mouseX;
               }
            }
         }
         else
         {
            this.isPressed = false;
         }
      }
      
      internal function onPressHandler(myEvent:MouseEvent) : *
      {
         this.isPressed = true;
      }
      
      public function removed(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.update);
      }
   }
}

