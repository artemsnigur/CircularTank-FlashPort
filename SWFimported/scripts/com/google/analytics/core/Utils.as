package com.google.analytics.core
{
   public class Utils
   {
      
      public function Utils()
      {
         super();
      }
      
      public static function trim(raw:String, everything:Boolean = false) : String
      {
         var i:int = 0;
         var iLeft:int = 0;
         var iRight:* = 0;
         if(raw == "")
         {
            return "";
         }
         var whitespaces:Array = [" ","\n","\r","\t"];
         var str:String = raw;
         if(everything)
         {
            i = 0;
            while(i < whitespaces.length && str.indexOf(whitespaces[i]) > -1)
            {
               str = str.split(whitespaces[i]).join("");
               i++;
            }
         }
         else
         {
            iLeft = 0;
            while(iLeft < str.length && whitespaces.indexOf(str.charAt(iLeft)) > -1)
            {
               iLeft++;
            }
            str = str.substr(iLeft);
            iRight = int(str.length - 1);
            while(iRight >= 0 && whitespaces.indexOf(str.charAt(iRight)) > -1)
            {
               iRight--;
            }
            str = str.substring(0,iRight + 1);
         }
         return str;
      }
      
      public static function generateHash(input:String) : int
      {
         var pos:* = 0;
         var current:int = 0;
         var hash:int = 1;
         var leftMost7:int = 0;
         if(input != null && input != "")
         {
            hash = 0;
            for(pos = int(input.length - 1); pos >= 0; pos--)
            {
               current = input.charCodeAt(pos);
               hash = (hash << 6 & 0x0FFFFFFF) + current + (current << 14);
               leftMost7 = hash & 0x0FE00000;
               if(leftMost7 != 0)
               {
                  hash ^= leftMost7 >> 21;
               }
            }
         }
         return hash;
      }
      
      public static function generate32bitRandom() : int
      {
         return Math.round(Math.random() * 2147483647);
      }
      
      public static function validateAccount(account:String) : Boolean
      {
         var rel:RegExp = /^UA-[0-9]*-[0-9]*$/;
         return rel.test(account);
      }
   }
}

