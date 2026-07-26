package FGL.GameTracker
{
   import flash.events.Event;
   
   public class GameTrackerErrorEvent extends Event
   {
      
      public var _msg:String;
      
      public function GameTrackerErrorEvent(type:String, msg:String)
      {
         this._msg = msg;
         super(type,false,false);
      }
      
      public function get msg() : String
      {
         return this._msg;
      }
   }
}

