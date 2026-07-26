package FGL.GameTracker
{
   import flash.events.EventDispatcher;
   import flash.events.TimerEvent;
   import flash.external.ExternalInterface;
   import flash.net.NetConnection;
   import flash.net.Responder;
   import flash.utils.Timer;
   
   public class GameTracker extends EventDispatcher
   {
      
      public static const GAMETRACKER_SERVER_ERROR:String = "gametracker_server_error";
      
      public static const GAMETRACKER_CODING_ERROR:String = "gametracker_coding_error";
      
      private static var _instance:GameTracker = null;
      
      private static const TIMER_DELAY:int = 15000;
      
      private var _responder:Responder = null;
      
      private var _conn:NetConnection = null;
      
      private var _lastScore:Number = 0;
      
      private var _inLevel:Boolean = false;
      
      private var _serviceName:String = "";
      
      private var _currentGameState:String;
      
      private var _passphrase:String = "";
      
      private var _sessionID:uint;
      
      private var _isEnabled:Boolean = false;
      
      private var _serverVersionMinor:int = 0;
      
      private var _serverVersionMajor:int = 0;
      
      private var _timer:Timer = null;
      
      private var _currentGame:int = 0;
      
      private var _lastGameState:String = "";
      
      private var _msg_queue:Array = new Array();
      
      private var _inGame:Boolean = false;
      
      private var _hostUrl:String = "";
      
      private var _currentLevel:int = 0;
      
      private var _currentScore:Number;
      
      public function GameTracker()
      {
         super();
         if(_instance == null)
         {
            _instance = this;
            this.setGlobalConfig();
            if(this._isEnabled)
            {
               this._responder = new Responder(this.onSuccess,this.onNetworkingError);
               this._conn = new NetConnection();
               this._conn.connect(this._hostUrl);
               this._timer = new Timer(TIMER_DELAY);
               this._timer.addEventListener("timer",this.onTimer);
               this._timer.start();
               this._sessionID = Math.floor(new Date().getTime() / 1000);
               this.addToMsgQueue("begin_app",null,0,null,null);
            }
            return;
         }
         trace("GameTracker: Instance Error: The GameTracker class is a singleton and should only be constructed once. Use GameTracker.api instead.");
      }
      
      public static function get api() : GameTracker
      {
         if(_instance == null)
         {
            trace("GameTracker: Instance Error: Attempted to get instance before initial construction.");
            return null;
         }
         return _instance;
      }
      
      public function checkpoint(currentScore:Number = NaN, currentGameState:String = null, customMsg:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         if(!this._inGame)
         {
            dispatchEvent(new GameTrackerErrorEvent(GAMETRACKER_CODING_ERROR,"checkpoint() called before startGame() was called!"));
         }
         else
         {
            this.addToMsgQueue("checkpoint",null,this._currentScore,this._currentGameState,customMsg);
         }
      }
      
      public function getGameState() : String
      {
         return this._currentGameState;
      }
      
      private function onNetworkingError(evt:*) : void
      {
         dispatchEvent(new GameTrackerErrorEvent(GAMETRACKER_SERVER_ERROR,"Networking error"));
      }
      
      private function onSuccess(evt:*) : void
      {
         if(evt.toString() != "")
         {
            dispatchEvent(new GameTrackerErrorEvent(GAMETRACKER_SERVER_ERROR,evt.toString()));
         }
      }
      
      private function onTimer(evt:TimerEvent) : void
      {
         this.submitMsgQueue();
      }
      
      private function addToMsgQueue(action:String, subaction:String, score:Number, gamestate:String, custom_msg:String) : void
      {
         var msg:Object = null;
         if(this._isEnabled)
         {
            msg = new Object();
            msg["action"] = action;
            msg["custom_action"] = subaction;
            msg["session_id"] = this._sessionID;
            msg["game_idx"] = this._currentGame;
            msg["level"] = this._currentLevel;
            msg["score"] = score;
            msg["game_state"] = gamestate;
            msg["time"] = Math.floor(new Date().getTime() / 1000);
            msg["msg"] = custom_msg;
            this._msg_queue.push(msg);
         }
      }
      
      public function isEnabled() : Boolean
      {
         return this._isEnabled;
      }
      
      public function beginGame(currentScore:Number = NaN, currentGameState:String = null, customMsg:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         if(this._inGame)
         {
            this.endGame(this._currentScore,this._currentGameState,"AUTO:(this game automatically ended when new game was started)");
         }
         ++this._currentGame;
         this._inGame = true;
         this.addToMsgQueue("begin_game",null,this._currentScore,this._currentGameState,customMsg);
      }
      
      private function backupLastData(currentScore:Number, currentGameState:String) : void
      {
         if(isNaN(currentScore))
         {
            currentScore = this._lastScore;
         }
         else
         {
            this._lastScore = currentScore;
         }
         this._currentScore = currentScore;
         if(currentGameState != null)
         {
            this._lastGameState = "lastState : " + currentGameState;
         }
         else
         {
            currentGameState = this._lastGameState;
         }
         this._currentGameState = currentGameState;
      }
      
      private function setGlobalConfig() : void
      {
         var ret:Array = null;
         this._isEnabled = false;
         this._serverVersionMajor = 0;
         this._serverVersionMinor = 0;
         this._hostUrl = "";
         this._serviceName = "";
         this._passphrase = "";
         try
         {
            if(ExternalInterface.available)
            {
               ret = ExternalInterface.call("get_gametracker_info");
               this._serverVersionMajor = ret[0];
               this._serverVersionMinor = ret[1];
               this._hostUrl = ret[2];
               this._serviceName = ret[3];
               this._passphrase = ret[4];
               this._isEnabled = this._serverVersionMajor == 1;
            }
         }
         catch(e:*)
         {
         }
      }
      
      private function submitMsgQueue() : void
      {
         var obj:Object = null;
         if(this._isEnabled && this._msg_queue.length > 0)
         {
            obj = new Object();
            obj["actions"] = this._msg_queue;
            obj["identifier"] = this._passphrase;
            this._conn.call(this._serviceName,this._responder,obj);
            this._msg_queue = new Array();
         }
      }
      
      public function customMsg(customMsg:String = null, msgType:String = "custom", currentScore:Number = NaN, currentGameState:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         this.addToMsgQueue("custom",msgType,this._currentScore,this._currentGameState,customMsg);
      }
      
      public function beginLevel(newLevel:int, currentScore:Number = NaN, currentGameState:String = null, customMsg:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         if(!this._inGame)
         {
            dispatchEvent(new GameTrackerErrorEvent(GAMETRACKER_CODING_ERROR,"beginLevel() called before beginGame() was called!"));
         }
         else
         {
            if(this._inLevel)
            {
               this.endLevel(this._currentScore,this._currentGameState,"AUTO:(this level automatically ended when new level was started)");
            }
            this._currentLevel = newLevel;
            this._inLevel = true;
            this.addToMsgQueue("begin_level",null,this._currentScore,this._currentGameState,customMsg);
         }
      }
      
      public function alert(customMsg:String = null, currentScore:Number = NaN, currentGameState:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         this.addToMsgQueue("alert",null,this._currentScore,this._currentGameState,customMsg);
         this.submitMsgQueue();
      }
      
      public function getScore() : Number
      {
         return this._currentScore;
      }
      
      public function endLevel(currentScore:Number = NaN, currentGameState:String = null, customMsg:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         if(!this._inLevel)
         {
            dispatchEvent(new GameTrackerErrorEvent(GAMETRACKER_CODING_ERROR,"endLevel() called before beginLevel() was called!"));
         }
         else
         {
            this._inLevel = false;
            this.addToMsgQueue("end_level",null,this._currentScore,this._currentGameState,customMsg);
         }
      }
      
      public function endGame(currentScore:Number = NaN, currentGameState:String = null, customMsg:String = null) : void
      {
         this.backupLastData(currentScore,currentGameState);
         if(!this._inGame)
         {
            dispatchEvent(new GameTrackerErrorEvent(GAMETRACKER_CODING_ERROR,"endGame() called before beginGame() was called!"));
         }
         else
         {
            if(this._inLevel)
            {
               this.endLevel(this._currentScore,this._currentGameState,"AUTO:(this level automatically ended when game ended)");
            }
            this.addToMsgQueue("end_game",null,this._currentScore,this._currentGameState,customMsg);
            this._inGame = false;
            this.submitMsgQueue();
         }
      }
   }
}

