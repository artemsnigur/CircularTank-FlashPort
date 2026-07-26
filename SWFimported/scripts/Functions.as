package
{
   import flash.display.Sprite;
   
   public class Functions extends Sprite
   {
      
      public function Functions()
      {
         super();
      }
      
      public static function formatNumber(number:Number) : String
      {
         var chunk:String = null;
         var numString:String = number.toString();
         var result:String = "";
         while(numString.length > 3)
         {
            chunk = numString.substr(-3);
            numString = numString.substr(0,numString.length - 3);
            result = "," + chunk + result;
         }
         if(numString.length > 0)
         {
            result = numString + result;
         }
         return result;
      }
   }
}

