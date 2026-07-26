package
{
   public class PM_PRNG
   {
      
      public var seed:uint;
      
      public function PM_PRNG()
      {
         super();
         this.seed = 1;
      }
      
      private function gen() : uint
      {
         return this.seed = this.seed * 16807 % 2147483647;
      }
      
      public function nextIntRange(min:Number, max:Number) : uint
      {
         min -= 0.4999;
         max += 0.4999;
         return Math.round(min + (max - min) * this.nextDouble());
      }
      
      public function nextDouble() : Number
      {
         return this.gen() / 2147483647;
      }
      
      public function nextDoubleRange(min:Number, max:Number) : Number
      {
         return min + (max - min) * this.nextDouble();
      }
      
      public function nextInt() : uint
      {
         return this.gen();
      }
   }
}

