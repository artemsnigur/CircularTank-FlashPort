package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.ui.Mouse;
   import flash.ui.MouseCursor;
   
   public class ScreenGame extends MovieClip
   {
      
      public static var reloadTime:Number;
      
      public static var reloadTimeSecondary:Number;
      
      public static var bossAmount:Number;
      
      public static var money:Number;
      
      public static var reloadTimeEnemyMax:Number;
      
      public static var bossAmountKilled:Number;
      
      public static var hp:Number;
      
      public static var reloadTimeEnemy:Number;
      
      public static var flagsLeft:Number;
      
      public static var enemiesLeft:Number;
      
      public static var bossAmountSpawned:Number;
      
      public static var reloadTimeMax:Number;
      
      public static var level:Number;
      
      public static var world:Number;
      
      public static var reloadTimeMaxSecondary:Number;
      
      public static var bossAmountSpawnedFull:Number;
      
      public static var currentEnemies:Number = 0;
      
      public static var maxEnemies:Number = 35;
      
      public static var currentWeapon:Number = 1;
      
      public static var canChangeWeapon:Boolean = true;
      
      public static var enemyModelW1:Array = [[10,45.53,"Basic1",10],[18,42,"Basic1",12,"Fast1",6],[14,104.36,"Basic1",10,"Fast1",4],[20,49.55,"Basic1",10,"Fast1",10],[20,100,"Fast1",20],[26,47.14,"Basic1",13,"Shooting1",13],[20,98.03,"Basic1",10,"Fast1",10],[28,60.08,"Fast1",14,"Shooting1",14],[20,143.94,"BasicB",1,"Fast1",7,"Basic1",6,"Shooting1",6],[20,109.06,"Fast1",14,"Basic1",6],[31,45.1,"Shooting1",18,"Basic1",13],[24,79.21,"Basic1",15,"Fast1",9],[24,78,"Strong1",10,"Basic1",8,"Shooting1",6],[15,165.1,"Strong1",8,"Basic1",4,"Fast1",3],[18,119.44,"Basic1",7,"Fast1",7,"Shooting1",4],[13,209.53,"Strong1",9,"Fast1",4],[27,57.02,"Shooting1",12,"Fast1",8,"Strong1",7],[27,63.97,"FastB",1,"Basic1",13,"Strong1",8,"Fast1",5],[35,28.25,"Basic1",26,"Fast1",9],[19,108.3,"Strong1",19],[21,82.19,"Fast2",11,"Basic1",6,"Shooting1",4],[28,52.19,"Shooting1",17,"Fast2",11],[26,65.28,"Basic2",13,"Shooting1",8,"Strong1",5],[20,96.28,"Shrinking1",12,"Shooting1",8],[18,120.31,"Basic1",6,"Fast2",6,"Strong1",6]
      ,[16,152.12,"Strong1",9,"Fast2",4,"Basic1",3],[20,117.14,"ShootingB",1,"Basic2",8,"Fast1",7,"Strong1",4],[26,58.43,"Shooting2",13,"Shrinking1",13],[30,40.93,"Fast1",15,"Shrinking1",15],[15,158.03,"Basic1",5,"Shooting2",5,"Strong1",5],[20,114.34,"Basic2",10,"Strong1",10],[24,76.36,"Basic1",12,"Shrinking1",7,"Strong2",5],[29,49.43,"Shrinking1",13,"Fast1",10,"Strong1",6],[16,168.12,"Fast2",8,"Strong1",8],[34,37.06,"Basic1",17,"Shooting2",17],[23,88.88,"StrongB",1,"Ghost1",9,"Shooting2",7,"Shrinking1",6],[20,106.25,"Ghost1",20],[26,62.85,"Shooting2",11,"Strong1",9,"Shrinking1",6],[24,74.97,"Shooting2",8,"Strong1",8,"Shrinking1",8],[28,53.73,"Fast3",14,"Shooting1",14],[19,123.3,"Strong1",11,"Basic1",4,"Shrinking1",4],[27,59.36,"Fast3",9,"Shrinking1",9,"Ghost1",9],[32,38.19,"Shooting1",21,"Fast1",11],[21,101.79,"Basic1",7,"Strong1",7,"Ghost1",7],[22,87.21,"ShrinkingB",1,"Fast2",7,"Shrinking1",7,"Ghost1",7]];
      
      public static var levelDataModelW1:Array = [[640,400,0,0,0,0,"Normal",1,"Desert",610309764],[900,720,0,0,0,0,"Normal",1,"Desert",1189992843],[640,400,0,0,0,0,"Flag",1,"Desert",704323495],[800,600,0,0,0,0,"Normal",2,"Desert",575239832],[900,720,0,0,0,0,"Flag",2,"Desert",861242918],[900,720,0,0,0,0,"Normal",2,"Desert",207996863],[640,640,0,0,0,0,"Tower",2,"Desert",324264984],[900,720,0,0,0,0,"Normal",2,"Desert",1633496533],[800,600,0,0,0,0,"Boss",2,"Desert",262724775],[640,640,0,0,0,0,"Tower",2,"Desert",805911635],[640,960,0,0,0,0,"Defense",2,"Desert",1480085701],[640,640,0,0,0,0,"Tower",2,"Desert",1936488106],[640,960,0,0,0,0,"Defense",2,"Desert",822228100],[640,640,0,0,0,0,"Tower",2,"Desert",2099559426],[800,600,0,0,0,0,"Flag",3,"Desert",1095353936],[640,640,0,0,0,0,"Tower",3,"Desert",1908538568],[900,720,0,0,0,0,"Normal",3,"Desert",1268957751],[900,720,0,0,0,0,"Boss",3,"Desert",1823006788],[900,720,0,0,0,0,"Flag",3,"Desert",26099572],[640,960,0,0,0,0,"Defense",3,"Desert",879753392],[900
      ,720,0,0,0,0,"Flag",3,"Desert",1331168017],[640,960,0,0,0,0,"Defense",3,"Desert",1067470683],[800,600,0,0,0,0,"Normal",3,"Desert",333674164],[800,600,0,0,0,0,"Flag",3,"Desert",879009477],[640,640,0,0,0,0,"Tower",3,"Desert",1152946120],[640,640,0,0,0,0,"Tower",3,"Desert",1943400849],[800,600,0,0,0,0,"Boss",3,"Desert",1787169264],[800,600,0,0,0,0,"Normal",3,"Desert",108386495],[640,960,0,0,0,0,"Defense",3,"Desert",488572530],[640,400,0,0,0,0,"Flag",4,"Desert",622859723],[640,640,0,0,0,0,"Tower",4,"Desert",1562753748],[640,640,0,0,0,0,"Tower",4,"Desert",1299262404],[640,960,0,0,0,0,"Defense",4,"Desert",1469301463],[640,640,0,0,0,0,"Tower",4,"Desert",1964570764],[640,960,0,0,0,0,"Defense",4,"Desert",1929017984],[900,720,0,0,0,0,"Boss",4,"Desert",613133923],[640,640,0,0,0,0,"Tower",4,"Desert",287074266],[640,960,0,0,0,0,"Defense",4,"Desert",996675206],[900,720,0,0,0,0,"Flag",4,"Desert",1734003335],[640,960,0,0,0,0,"Defense",4,"Desert",1952066236],[640,640,0,0,0,0,"Tower",4,"Desert",689932839]
      ,[800,600,0,0,0,0,"Flag",4,"Desert",1324713087],[900,720,0,0,0,0,"Normal",4,"Desert",788248653],[640,640,0,0,0,0,"Tower",4,"Desert",317127480],[800,600,0,0,0,0,"Boss",4,"Desert",802051633]];
      
      public static var flagModelW1:Array = [[0,0],[0,0],[10,102],[0,0],[8,136],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[12,122],[0,0],[0,0],[0,0],[11,142],[0,0],[12,143],[0,0],[0,0],[14,129],[0,0],[0,0],[0,0],[0,0],[0,0],[20,104],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[16,152],[0,0],[0,0],[19,136],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW2:Array = [[28,55.36,"Strong1",14,"Shrinking1",14],[27,50.59,"Ghost1",11,"Fast1",9,"Basic2",7],[28,50.91,"Basic1",20,"Shooting2",8],[16,149.15,"Fast1",8,"Shooting1",4,"Ghost1",4],[42,16.38,"Basic2",28,"Shrinking1",14],[17,135.71,"Strong1",6,"Ghost1",6,"Fast2",5],[27,62.1,"Fast1",20,"Strong2",7],[30,49.1,"Trap1",30],[27,65.55,"GhostB",1,"Shooting2",13,"Shrinking2",13],[25,71.62,"Ghost1",11,"Strong1",9,"Shooting1",5],[18,118.78,"Shrinking3",6,"Ghost1",6,"Trap1",6],[26,64.21,"Ghost2",14,"Basic2",7,"Shooting3",5],[25,72.53,"Trap1",12,"Strong1",8,"Fast1",5],[38,24.89,"Basic3",19,"Shrinking1",19],[18,120.42,"Fast1",6,"Strong1",6,"Ghost1",6],[23,82.67,"Strong1",12,"Trap1",11],[21,94.69,"Fast1",7,"Shooting1",7,"Ghost2",7],[22,92.63,"TrapB",1,"Shooting1",7,"Strong1",7,"Shrinking3",7],[28,53.84,"Ghost1",21,"Strong1",7],[31,48,"Fast2",14,"Strong1",9,"Shooting1",8],[27,59.07,"Temperamental1",20,"Trap1",7],[22,89.69,"Strong1",12,"Shrinking1",5,"Trap1",5],[37,25.74,"Basic2"
      ,26,"Fast1",11],[24,73.96,"Ghost1",14,"Shrinking1",10],[24,80.72,"Shooting3",11,"Temperamental1",7,"Trap3",6],[37,29.49,"Shooting2",37],[21,122.3,"TemperamentalB",1,"Shrinking2",10,"Trap1",10],[38,27.66,"Basic1",16,"Shooting1",13,"Shrinking2",9],[22,97.79,"Fast2",11,"Temperamental1",6,"Ghost1",5],[30,55.26,"Strong1",10,"Shrinking1",10,"Ghost2",10],[30,46.16,"Fast1",10,"Strong1",10,"Temperamental1",10],[18,123.87,"Basic1",9,"Trap1",9],[26,65.38,"Shrinking1",9,"Temperamental1",9,"Trap3",8],[39,26.5,"Fast2",15,"Ghost1",15,"Temperamental1",9],[30,53.14,"Shooting1",15,"Strong1",15],[21,125.37,"ShootingB",1,"GhostB",1,"Strong2",11,"Trap2",8],[33,43.31,"Basic1",11,"Trap1",11,"Temperamental1",11],[30,51.48,"Fast1",11,"Ghost1",11,"Shooting1",8],[25,77.77,"Shrinking2",10,"Strong1",9,"Basic1",6],[23,86.09,"Ghost1",12,"Temperamental1",11],[28,57.7,"Shrinking1",15,"Fast3",7,"Basic2",6],[26,67.96,"Trap1",17,"Temperamental2",9],[34,36.79,"Basic2",17,"Trap1",17],[27,57.67,"Shooting3",9,"Ghost3",9,"Ninja1"
      ,9],[25,81.83,"NinjaB",1,"Shooting2",15,"Temperamental1",9]];
      
      public static var levelDataModelW2:Array = [[640,960,0,0,0,0,"Defense",5,"Grass",567123519],[640,400,0,0,0,0,"Normal",5,"Grass",1906090400],[900,720,0,0,0,0,"Flag",5,"Grass",1048096351],[640,400,0,0,0,0,"Flag",5,"Grass",2109249108],[900,720,0,0,0,0,"Normal",5,"Grass",122140014],[640,640,0,0,0,0,"Tower",5,"Grass",704483022],[640,960,0,0,0,0,"Defense",5,"Grass",1710240942],[640,960,0,0,0,0,"Defense",5,"Grass",1764746745],[900,720,0,0,0,0,"Boss",5,"Grass",1522081549],[640,960,0,0,0,0,"Defense",5,"Grass",2082844073],[800,600,0,0,0,0,"Flag",5,"Grass",1515335346],[900,720,0,0,0,0,"Flag",5,"Grass",1846059020],[640,960,0,0,0,0,"Defense",5,"Grass",1576692796],[900,720,0,0,0,0,"Flag",5,"Grass",817884114],[640,640,0,0,0,0,"Tower",5,"Grass",833767555],[800,600,0,0,0,0,"Normal",5,"Grass",181795699],[800,600,0,0,0,0,"Flag",5,"Grass",367037672],[900,720,0,0,0,0,"Boss",5,"Grass",1182621205],[640,960,0,0,0,0,"Defense",5,"Grass",303080571],[900,720,0,0,0,0,"Normal",5,"Grass",615925364],[640,960,0,0,0,0,"Defense"
      ,5,"Grass",1776821094],[900,720,0,0,0,0,"Flag",5,"Grass",1309121820],[800,600,0,0,0,0,"Normal",5,"Grass",1612655662],[640,640,0,0,0,0,"Tower",5,"Grass",764073779],[640,400,0,0,0,0,"Normal",5,"Grass",1913074257],[900,720,0,0,0,0,"Normal",6,"Grass",13442509],[800,600,0,0,0,0,"Boss",6,"Grass",1585263524],[900,720,0,0,0,0,"Normal",6,"Grass",778555516],[640,640,0,0,0,0,"Tower",6,"Grass",1808288408],[800,600,0,0,0,0,"Flag",6,"Grass",663584014],[800,600,0,0,0,0,"Normal",6,"Grass",26846447],[640,400,0,0,0,0,"Flag",6,"Grass",1547367293],[800,600,0,0,0,0,"Normal",6,"Grass",1832370127],[900,720,0,0,0,0,"Normal",6,"Grass",1545237635],[640,960,0,0,0,0,"Defense",6,"Grass",2123667541],[900,720,0,0,0,0,"Boss",6,"Grass",1969389448],[640,960,0,0,0,0,"Defense",6,"Grass",540273277],[800,600,0,0,0,0,"Normal",6,"Grass",937896191],[640,640,0,0,0,0,"Tower",6,"Grass",2019575584],[640,640,0,0,0,0,"Tower",6,"Grass",942570407],[640,640,0,0,0,0,"Tower",6,"Grass",1283267016],[900,720,0,0,0,0,"Flag",6,"Grass",1427868010]
      ,[640,960,0,0,0,0,"Defense",6,"Grass",1878513401],[640,960,0,0,0,0,"Defense",6,"Grass",15217116],[900,720,0,0,0,0,"Boss",6,"Grass",1905504994]];
      
      public static var flagModelW2:Array = [[0,0],[0,0],[18,152],[24,111],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[20,140],[18,160],[0,0],[18,161],[0,0],[0,0],[20,144],[0,0],[0,0],[0,0],[0,0],[18,168],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[21,147],[0,0],[26,122],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[18,176],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW3:Array = [[22,85,"Strong1",12,"Fast1",5,"Shrinking1",5],[25,74.6,"Trap1",17,"Shrinking1",8],[23,125,"Ninja1",11,"Strong2",6,"Temperamental2",6],[27,67.58,"Ghost1",12,"Shrinking1",9,"Fast1",6],[36,32.8,"Temperamental1",36],[29,54.45,"Basic1",12,"Ninja1",10,"Fast1",7],[18,131.89,"Strong3",8,"Ninja1",6,"Fast3",4],[16,150.44,"Ghost1",11,"Ninja1",5],[22,108.62,"ShrinkingB",1,"TrapB",1,"Fast3",10,"Trap2",10],[27,64.14,"Ghost1",16,"Shooting1",6,"Ninja1",5],[28,58.85,"Basic2",9,"Strong1",8,"Fast1",6,"Ninja1",5],[18,115.1,"Shooting3",6,"Strong2",6,"Ninja1",6],[30,50.73,"Shrinking1",22,"Fast1",8],[17,133.98,"Accelerating1",9,"Trap2",8],[26,75.55,"Shrinking1",8,"Trap1",7,"Ninja1",6,"Strong1",5],[33,41.43,"Accelerating1",33],[29,55.51,"Shooting3",12,"Ghost2",11,"Strong2",6],[32,52.63,"AcceleratingB",1,"Basic1",17,"Shrinking1",14],[33,40.32,"Shooting2",11,"Trap1",11,"Ninja1",11],[27,68.7,"Strong2",9,"Ghost2",9,"Ninja3",9],[26,71.76,"Strong1",11,"Ninja1",9,"Trap1",6],[29
      ,40,"Fast2",14,"Basic2",9,"Ninja1",6],[24,80.03,"Fast3",6,"Shrinking1",6,"Ghost1",6,"Temperamental3",6],[30,50.49,"Basic3",10,"Trap3",10,"Ninja2",10],[22,102.89,"Strong2",11,"Temperamental1",11],[30,57.38,"Fast2",10,"Trap1",10,"Accelerating1",10],[29,68.08,"FastB",1,"NinjaB",1,"Shrinking1",12,"Temperamental2",8,"Ghost1",7],[44,17.58,"Temperamental2",26,"Basic3",18],[24,82.73,"Accelerating1",14,"Strong2",5,"Ghost1",5],[26,70.06,"Trap1",10,"Ghost1",6,"Shooting2",5,"Shrinking1",5],[25,72.84,"Ninja2",16,"Shooting2",9],[24,87.44,"Fast2",13,"Shrinking2",6,"Strong3",5],[18,120.26,"Shooting2",6,"Trap1",6,"Ninja2",6],[29,55.13,"Accelerating2",12,"Fast2",7,"Strong2",5,"Ghost2",5],[44,17.82,"Basic2",29,"Temperamental1",15],[20,115.25,"CrazyB",1,"Strong1",11,"Shrinking2",8],[27,61.26,"Trap1",9,"Ninja1",9,"Crazy1",9],[25,71.46,"Accelerating1",16,"Fast2",9],[31,30,"Shrinking2",31],[18,130.03,"Trap1",9,"Crazy1",5,"Ninja1",4],[34,40.87,"Strong1",14,"Ninja1",11,"Shooting2",9],[27,62.09,"Ghost1",11,"Trap1"
      ,9,"Crazy1",7],[26,74.74,"Temperamental3",18,"Accelerating2",8],[25,76,"Fast2",14,"Ghost2",11],[20,127.03,"StrongB",1,"TemperamentalB",1,"Ninja2",9,"Accelerating2",9]];
      
      public static var levelDataModelW3:Array = [[640,640,0,0,0,0,"Tower",6,"BlueDirt",1149584223],[640,400,0,0,0,0,"Normal",6,"BlueDirt",829837967],[640,960,0,0,0,0,"Defense",6,"BlueDirt",1142716518],[640,640,0,0,0,0,"Tower",6,"BlueDirt",970364843],[640,960,0,0,0,0,"Defense",6,"BlueDirt",1238015405],[900,720,0,0,0,0,"Normal",6,"BlueDirt",1358894772],[900,720,0,0,0,0,"Flag",6,"BlueDirt",235623735],[800,600,0,0,0,0,"Flag",6,"BlueDirt",1255364226],[900,720,0,0,0,0,"Boss",6,"BlueDirt",314352699],[900,720,0,0,0,0,"Flag",7,"BlueDirt",171551263],[900,720,0,0,0,0,"Normal",7,"BlueDirt",1733650394],[800,600,0,0,0,0,"Flag",7,"BlueDirt",938567387],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1735575380],[640,400,0,0,0,0,"Flag",7,"BlueDirt",151387388],[900,720,0,0,0,0,"Flag",7,"BlueDirt",1794249759],[640,400,0,0,0,0,"Normal",7,"BlueDirt",841167180],[900,720,0,0,0,0,"Flag",7,"BlueDirt",1347598032],[800,600,0,0,0,0,"Boss",7,"BlueDirt",1505616813],[640,960,0,0,0,0,"Defense",7,"BlueDirt",493722144],[900,720,0,0,0,0
      ,"Normal",7,"BlueDirt",720497030],[640,960,0,0,0,0,"Defense",7,"BlueDirt",417565988],[640,960,0,0,0,0,"Defense",7,"BlueDirt",1947515015],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1296600746],[640,960,0,0,0,0,"Defense",7,"BlueDirt",947612373],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1295550427],[800,600,0,0,0,0,"Normal",7,"BlueDirt",956831974],[900,720,0,0,0,0,"Boss",7,"BlueDirt",352699986],[900,720,0,0,0,0,"Normal",7,"BlueDirt",185960698],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1265449876],[800,600,0,0,0,0,"Flag",7,"BlueDirt",1133087247],[900,720,0,0,0,0,"Flag",7,"BlueDirt",979742934],[640,640,0,0,0,0,"Tower",7,"BlueDirt",167906800],[640,400,0,0,0,0,"Flag",7,"BlueDirt",2111266446],[640,400,0,0,0,0,"Normal",7,"BlueDirt",797624675],[800,600,0,0,0,0,"Normal",7,"BlueDirt",879179633],[800,600,0,0,0,0,"Boss",7,"BlueDirt",702150048],[640,960,0,0,0,0,"Defense",7,"BlueDirt",25885159],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1765343515],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1364686625],[800,600,0,0,0,0,"Flag"
      ,7,"BlueDirt",201112409],[900,720,0,0,0,0,"Normal",7,"BlueDirt",1636319134],[640,960,0,0,0,0,"Defense",7,"BlueDirt",1696509698],[640,640,0,0,0,0,"Tower",7,"BlueDirt",1415913541],[640,640,0,0,0,0,"Tower",7,"BlueDirt",768979904],[900,720,0,0,0,0,"Boss",7,"BlueDirt",1855324124]];
      
      public static var flagModelW3:Array = [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[18,184],[21,163],[0,0],[19,179],[0,0],[22,159],[0,0],[27,131],[19,182],[0,0],[19,184],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,171],[19,194],[0,0],[27,142],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,177],[0,0],[0,0],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW4:Array = [[18,131.05,"Strong3",12,"Ghost2",6],[36,35.05,"Trap1",13,"Shooting3",10,"Ninja1",7,"Temperamental1",6],[26,77.77,"Fast2",13,"Ghost2",7,"Accelerating2",6],[34,62,"Ghost2",17,"Temperamental1",10,"Shooting3",7],[33,46.61,"Basic2",11,"Ninja1",11,"Accelerating2",11],[32,45.32,"Shrinking3",13,"Crazy1",10,"Shooting2",9],[24,83.75,"Ninja2",10,"Shooting1",5,"Crazy1",5,"Trap2",4],[27,63.86,"Basic2",9,"Strong2",9,"Temperamental1",9],[26,83.28,"BasicB",1,"CrazyB",1,"Trap2",12,"Accelerating3",7,"Shooting2",5],[27,50,"Fast1",9,"Shooting1",9,"Crazy1",9],[40,52,"Shooting2",23,"Temperamental1",17],[18,120.54,"Ninja2",9,"Crazy1",9],[24,68,"Ghost3",12,"Accelerating2",12],[28,63.65,"Basic2",7,"Shooting2",7,"Strong2",7,"Trap2",7],[39,32.59,"Medic1",15,"Trap2",9,"Shooting3",8,"Strong1",7],[28,64.97,"Ghost2",14,"Fast3",7,"Shrinking2",7],[29,63.38,"Crazy1",10,"Fast2",7,"Shrinking2",6,"Ninja1",6],[22,100.18,"MedicB",1,"Medic1",12,"Ninja1",9],[39,30.43,"Accelerating1",17,"Shooting3"
      ,8,"Shrinking2",7,"Temperamental1",7],[33,47.05,"Basic2",20,"Strong1",13],[28,62.64,"Fast3",7,"Shrinking2",7,"Trap2",7,"Ninja3",7],[34,44.05,"Medic1",13,"Temperamental2",11,"Accelerating1",10],[30,53.11,"Fast3",10,"Trap2",10,"Crazy1",10],[24,81.37,"Strong1",8,"Ghost1",8,"Accelerating3",8],[37,34.2,"Basic2",13,"Ghost2",9,"Temperamental1",8,"Shooting3",7],[24,76.91,"Trap2",8,"Crazy3",8,"Medic1",8],[25,91.25,"BasicB",1,"ShootingB",1,"TrapB",1,"Shrinking3",11,"Accelerating1",11],[33,22,"Fast3",13,"Shooting3",10,"Crazy1",10],[28,64.73,"Crazy1",13,"Temperamental3",9,"Ninja2",6],[26,68.16,"Crazy1",10,"Shrinking2",9,"Strong3",7],[32,38,"Ninja1",32],[26,68.91,"Temperamental2",19,"Strong1",7],[40,27.62,"Accelerating1",23,"Basic1",9,"Ghost2",8],[31,48.58,"Crazy3",23,"Shooting1",8],[26,72.16,"Medic1",9,"Shrinking2",7,"Fast2",5,"Strong2",5],[20,134.92,"AcceleratingB",1,"MedicB",1,"Fast3",6,"Crazy2",6,"Medic1",6],[39,33.15,"Shrinking3",20,"Shooting2",11,"Ghost2",8],[19,116.14,"Ninja2",6,"Medic1",5,"Strong2"
      ,4,"Ghost2",4],[23,91.28,"Strong1",17,"Medic1",6],[11,224.05,"Temperamental2",6,"Crazy1",3,"Accelerating1",2],[24,80.13,"ScaredGhost1",17,"Crazy1",7],[28,67.39,"Fast2",13,"Medic1",9,"Ghost1",6],[27,68.99,"Ghost1",9,"Trap3",9,"Crazy3",9],[45,20.23,"Basic2",24,"Temperamental2",11,"Shooting1",10],[22,98.07,"ScaredGhostB",1,"ScaredGhost1",9,"Crazy3",7,"Accelerating2",5]];
      
      public static var levelDataModelW4:Array = [[640,640,0,0,0,0,"Tower",8,"Beach",293908737],[640,960,0,0,0,0,"Defense",8,"Beach",583173833],[640,640,0,0,0,0,"Tower",8,"Beach",1196017794],[640,960,0,0,0,0,"Defense",8,"Beach",2103367135],[900,720,0,0,0,0,"Normal",8,"Beach",1537766201],[640,960,0,0,0,0,"Defense",8,"Beach",862669220],[900,720,0,0,0,0,"Flag",8,"Beach",1947779328],[640,640,0,0,0,0,"Tower",8,"Beach",981314479],[900,720,0,0,0,0,"Boss",8,"Beach",1364274085],[800,600,0,0,0,0,"Normal",8,"Beach",1412555128],[640,960,0,0,0,0,"Defense",8,"Beach",422172748],[900,720,0,0,0,0,"Flag",8,"Beach",1044364862],[640,640,0,0,0,0,"Tower",8,"Beach",1735933763],[800,600,0,0,0,0,"Flag",8,"Beach",158744882],[900,720,0,0,0,0,"Normal",8,"Beach",865810113],[640,640,0,0,0,0,"Tower",8,"Beach",420279511],[640,960,0,0,0,0,"Defense",8,"Beach",1471042566],[900,720,0,0,0,0,"Boss",8,"Beach",435404168],[640,960,0,0,0,0,"Defense",8,"Beach",1569663150],[640,640,0,0,0,0,"Tower",8,"Beach",1972311406],[900,720,0,0,0,0
      ,"Flag",8,"Beach",213650451],[640,400,0,0,0,0,"Normal",8,"Beach",1623460228],[640,960,0,0,0,0,"Defense",8,"Beach",782839542],[640,640,0,0,0,0,"Tower",8,"Beach",1536079524],[900,720,0,0,0,0,"Flag",8,"Beach",549355863],[800,600,0,0,0,0,"Normal",8,"Beach",901504781],[800,600,0,0,0,0,"Boss",8,"Beach",474064516],[640,960,0,0,0,0,"Defense",8,"Beach",555954348],[900,720,0,0,0,0,"Normal",8,"Beach",508953152],[640,960,0,0,0,0,"Defense",8,"Beach",675963066],[900,720,0,0,0,0,"Normal",8,"Beach",1727325283],[640,640,0,0,0,0,"Tower",8,"Beach",1607389289],[800,600,0,0,0,0,"Flag",8,"Beach",1868098049],[640,960,0,0,0,0,"Defense",8,"Beach",1909520342],[640,640,0,0,0,0,"Tower",8,"Beach",812750073],[900,720,0,0,0,0,"Boss",8,"Beach",1875988040],[900,720,0,0,0,0,"Flag",8,"Beach",57680527],[800,600,0,0,0,0,"Flag",8,"Beach",1703304853],[640,640,0,0,0,0,"Tower",8,"Beach",1462845636],[640,400,0,0,0,0,"Flag",8,"Beach",1746851086],[640,960,0,0,0,0,"Defense",8,"Beach",196536825],[640,640,0,0,0,0,"Tower",8,"Beach",1142982122]
      ,[800,600,0,0,0,0,"Normal",8,"Beach",2106092583],[640,960,0,0,0,0,"Defense",8,"Beach",1849107271],[900,720,0,0,0,0,"Boss",8,"Beach",917295822]];
      
      public static var flagModelW4:Array = [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[20,202],[0,0],[0,0],[0,0],[0,0],[20,205],[0,0],[23,182],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[20,212],[0,0],[0,0],[0,0],[20,215],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[23,194],[0,0],[0,0],[0,0],[20,223],[23,197],[0,0],[28,163],[0,0],[0,0],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW5:Array = [[40,30.32,"Shooting2",10,"Ninja1",10,"Accelerating1",10,"Medic2",10],[42,25.45,"Fast2",29,"Ghost3",13],[41,26.56,"Accelerating2",26,"Strong1",15],[39,29.92,"Medic1",16,"ScaredGhost1",15,"Trap2",8],[46,19.49,"Shrinking2",23,"Medic2",23],[46,24,"ScaredGhost1",46],[24,79.2,"Shooting1",11,"Ninja2",8,"Trap1",5],[48,15.67,"Temperamental2",28,"Ghost1",20],[25,88.37,"GhostB",1,"NinjaB",1,"ScaredGhostB",1,"Strong2",8,"Ninja2",8,"Shooting1",6],[40,60,"Accelerating3",20,"Medic1",20],[22,92.21,"Basic2",8,"Shrinking2",6,"Trap1",4,"Crazy1",4],[24,40,"Crazy1",10,"Trap1",9,"Basic3",5],[39,33.77,"Trap3",15,"Strong1",14,"Basic3",10],[31,48.66,"Ninja3",10,"Crazy1",8,"Temperamental2",7,"Trap2",6],[50,14.38,"Ghost1",32,"Basic2",18],[30,52.34,"Shrinking2",10,"Temperamental2",10,"Medic1",10],[33,46.98,"Ninja2",18,"Crazy1",8,"Trap2",7],[30,64.75,"StrongB",1,"ShrinkingB",1,"AcceleratingB",1,"Shooting2",11,"Shrinking2",11,"Strong2",5],[38,35.98,"Shooting2",19,"Medic2",19],[28
      ,56.7,"Fast2",7,"Temperamental1",7,"Accelerating2",7,"ScaredGhost1",7],[38,47,"Strong2",19,"Accelerating2",19],[40,28.87,"Fast3",15,"Trap1",15,"Ninja2",10],[34,44.12,"Shrinking1",17,"ScaredGhost1",9,"Temperamental2",8],[25,72.53,"DamageAddict1",16,"ScaredGhost1",9],[33,35,"Ninja3",17,"Basic1",9,"Crazy1",7],[16,128.83,"Ninja1",4,"Crazy2",4,"Medic1",4,"ScaredGhost2",4],[37,33.67,"DamageAddictB",1,"Shooting3",12,"Trap2",12,"ScaredGhost1",12],[26,69.8,"Ninja2",13,"DamageAddict1",13],[31,51.72,"Fast2",17,"Temperamental1",8,"Accelerating2",6],[31,53.54,"Accelerating2",21,"Medic1",10],[27,62.16,"Temperamental1",13,"Strong2",7,"Medic2",7],[32,30,"Crazy1",21,"Ghost2",11],[31,51.75,"ScaredGhost1",13,"Shrinking2",12,"DamageAddict1",6],[30,50.9,"Crazy2",12,"Medic1",12,"Ninja2",6],[18,100,"Strong3",9,"Crazy1",9],[36,44.69,"TemperamentalB",1,"MedicB",1,"Basic3",17,"Trap1",17],[25,75.65,"Crazy1",25],[27,66.6,"Ghost2",9,"Medic2",9,"ScaredGhost1",9],[50,17.24,"Basic2",25,"ScaredGhost2",25],[15,137.55,"Strong2"
      ,5,"Crazy2",5,"DamageAddict1",5],[38,32.92,"Temperamental2",21,"Fast2",17],[41,27.59,"DamageAddict1",31,"Accelerating2",10],[28,59.09,"Strong3",14,"Shrinking2",14],[30,51.03,"Ghost2",10,"Ninja2",10,"Medic1",10],[32,55.04,"FastB",1,"DamageAddictB",1,"Accelerating3",10,"Medic1",10,"DamageAddict1",10]];
      
      public static var levelDataModelW5:Array = [[900,720,0,0,0,0,"Normal",9,"Concrete",30559719],[900,720,0,0,0,0,"Flag",9,"Concrete",551935313],[900,720,0,0,0,0,"Flag",9,"Concrete",80872853],[900,720,0,0,0,0,"Normal",9,"Concrete",1996190005],[900,720,0,0,0,0,"Normal",9,"Concrete",1206607835],[800,600,0,0,0,0,"Normal",9,"Concrete",1088561457],[640,400,0,0,0,0,"Flag",9,"Concrete",807381674],[900,720,0,0,0,0,"Normal",9,"Concrete",1041252441],[900,720,0,0,0,0,"Boss",9,"Concrete",850367514],[640,960,0,0,0,0,"Defense",9,"Concrete",132873556],[800,600,0,0,0,0,"Flag",9,"Concrete",738275317],[640,400,0,0,0,0,"Normal",9,"Concrete",1487813396],[640,960,0,0,0,0,"Defense",9,"Concrete",408757480],[640,960,0,0,0,0,"Defense",9,"Concrete",374033062],[800,600,0,0,0,0,"Normal",9,"Concrete",88577841],[640,640,0,0,0,0,"Tower",9,"Concrete",722080449],[640,960,0,0,0,0,"Defense",9,"Concrete",1125470071],[900,720,0,0,0,0,"Boss",9,"Concrete",1265722317],[900,720,0,0,0,0,"Flag",9,"Concrete",1996020864],[640,640,0,0,0
      ,0,"Tower",9,"Concrete",1252242768],[640,960,0,0,0,0,"Defense",9,"Concrete",1341740504],[900,720,0,0,0,0,"Normal",9,"Concrete",1287341270],[640,640,0,0,0,0,"Tower",9,"Concrete",1587786297],[640,640,0,0,0,0,"Tower",9,"Concrete",175842858],[900,720,0,0,0,0,"Normal",9,"Concrete",685797514],[800,600,0,0,0,0,"Flag",9,"Concrete",114494028],[900,720,0,0,0,0,"Boss",9,"Concrete",1523282141],[900,720,0,0,0,0,"Flag",9,"Concrete",738629623],[640,640,0,0,0,0,"Tower",9,"Concrete",1468813373],[640,640,0,0,0,0,"Tower",9,"Concrete",2017291247],[640,640,0,0,0,0,"Tower",9,"Concrete",1657835357],[640,960,0,0,0,0,"Defense",9,"Concrete",2069729820],[640,640,0,0,0,0,"Tower",9,"Concrete",2119297745],[640,960,0,0,0,0,"Defense",9,"Concrete",1424919043],[800,600,0,0,0,0,"Flag",9,"Concrete",1430843296],[900,720,0,0,0,0,"Boss",9,"Concrete",1684049091],[900,720,0,0,0,0,"Flag",9,"Concrete",1370537869],[640,640,0,0,0,0,"Tower",9,"Concrete",449924411],[640,960,0,0,0,0,"Defense",9,"Concrete",806928210],[800,600,0,0,0,0,"Flag"
      ,9,"Concrete",1069662727],[800,600,0,0,0,0,"Flag",9,"Concrete",707452134],[640,960,0,0,0,0,"Defense",9,"Concrete",168635243],[640,640,0,0,0,0,"Tower",9,"Concrete",930824051],[800,600,0,0,0,0,"Normal",9,"Concrete",1964398071],[800,600,0,0,0,0,"Boss",9,"Concrete",283246493]];
      
      public static var flagModelW5:Array = [[0,0],[21,222],[21,222],[0,0],[0,0],[0,0],[29,163],[0,0],[0,0],[0,0],[24,201],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[21,233],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[24,210],[0,0],[21,240],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[24,216],[0,0],[21,246],[0,0],[0,0],[24,219],[24,219],[0,0],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW6:Array = [[30,51.68,"Ghost3",22,"Fast1",8],[34,42.88,"Crazy2",16,"Shooting3",6,"Medic2",6,"ScaredGhost3",6],[32,48.21,"Shooting3",8,"Shrinking3",8,"Ninja2",8,"DamageAddict1",8],[21,89.52,"Temperamental2",10,"Trap2",6,"Ninja3",5],[33,44.88,"Shooting3",11,"Crazy3",11,"ScaredGhost2",11],[27,60.9,"Accelerating2",9,"Medic2",9,"DamageAddict2",9],[39,30.52,"Fast2",13,"Trap2",13,"Random1",13],[31,52.64,"DamageAddict2",16,"Accelerating1",8,"Shrinking3",7],[24,86.21,"RandomB",1,"Random1",13,"Shooting2",10],[34,42.78,"Crazy2",17,"ScaredGhost3",17],[33,45.82,"Ninja1",11,"Random1",10,"Basic2",6,"Trap2",6],[42,26.57,"Trap1",27,"Strong2",15],[25,71.32,"Medic1",11,"Ninja3",9,"Temperamental2",5],[52,13.8,"Ghost3",22,"Shrinking3",19,"Basic2",11],[43,42,"Shooting3",14,"Medic1",11,"DamageAddict1",11,"ScaredGhost3",7],[33,43.87,"Medic2",33],[27,61.27,"Strong3",9,"Accelerating2",9,"ScaredGhost1",9],[19,142.2,"ScaredGhostB",1,"DamageAddictB",1,"RandomB",1,"Ninja2",10,"Random1",6]
      ,[29,56.08,"ScaredGhost2",14,"Temperamental3",5,"Accelerating2",5,"DamageAddict1",5],[41,28.03,"Accelerating2",19,"Trap3",14,"Ninja2",8],[31,53.26,"Fast2",15,"Temperamental1",10,"Random1",6],[37,34.28,"Temperamental2",15,"Random1",12,"Basic2",10],[28,54.87,"Shrinking2",7,"Trap1",7,"Crazy2",7,"DamageAddict2",7],[26,62.87,"Strong2",14,"Fast1",6,"ScaredGhost2",6],[36,41,"Ninja3",18,"Crazy3",18],[40,29.62,"Ghost3",22,"Basic3",9,"ScaredGhost2",9],[30,61.43,"CrazyB",1,"RandomB",1,"Shooting3",11,"Shrinking3",10,"Accelerating1",7],[31,50.78,"Temperamental3",19,"DamageAddict2",12],[42,25.92,"Fast1",14,"Trap2",14,"DamageAddict1",14],[52,14.47,"Accelerating1",36,"Shooting3",16],[26,66.14,"Random1",11,"Medic2",8,"Crazy2",7],[31,50.27,"Random2",19,"Basic3",6,"Medic3",6],[32,49.97,"Strong3",8,"Shrinking3",8,"Ninja2",8,"DamageAddict2",8],[47,26,"ScaredGhost1",47],[20,94.94,"Crazy2",15,"Medic3",5],[33,48.3,"StrongB",1,"MedicB",1,"Random1",21,"Shooting2",10],[42,25.38,"Basic3",14,"Fast1",14,"Shrinking3"
      ,14],[33,39.31,"Strong2",11,"Ghost2",11,"Crazy3",11],[36,37.38,"Temperamental2",18,"Medic2",11,"Random2",7],[42,26.04,"Strong3",24,"Shooting3",18],[36,36.53,"Trap3",12,"Ninja3",12,"Random1",12],[39,29.65,"Medic1",11,"Ninja2",10,"DamageAddict1",10,"Trap3",8],[37,34.93,"Crazy2",27,"Random2",10],[51,13.57,"Fast3",17,"Shrinking3",17,"DamageAddict2",17],[33,48.06,"ShootingB",1,"RandomB",1,"Trap3",16,"Basic2",9,"Medic3",6]];
      
      public static var levelDataModelW6:Array = [[640,640,0,0,0,0,"Tower",9,"Biology",116280948],[640,960,0,0,0,0,"Defense",9,"Biology",521006105],[640,400,0,0,0,0,"Normal",9,"Biology",1016494433],[640,400,0,0,0,0,"Flag",9,"Biology",927854351],[800,600,0,0,0,0,"Normal",9,"Biology",2047778363],[640,640,0,0,0,0,"Tower",9,"Biology",65474926],[640,960,0,0,0,0,"Defense",9,"Biology",1837324846],[640,640,0,0,0,0,"Tower",9,"Biology",2027362395],[800,600,0,0,0,0,"Boss",9,"Biology",469189341],[900,720,0,0,0,0,"Normal",10,"Biology",39239580],[900,720,0,0,0,0,"Flag",10,"Biology",1218073890],[640,960,0,0,0,0,"Defense",10,"Biology",679655944],[640,400,0,0,0,0,"Normal",10,"Biology",1269237745],[900,720,0,0,0,0,"Flag",10,"Biology",125438583],[640,960,0,0,0,0,"Defense",10,"Biology",1781300651],[800,600,0,0,0,0,"Flag",10,"Biology",305019989],[640,640,0,0,0,0,"Tower",10,"Biology",2142491960],[800,600,0,0,0,0,"Boss",10,"Biology",1811025529],[640,640,0,0,0,0,"Tower",10,"Biology",1473325486],[640,960,0,0,0,0,"Defense"
      ,10,"Biology",214936459],[800,600,0,0,0,0,"Normal",10,"Biology",7837100],[640,960,0,0,0,0,"Defense",10,"Biology",305334208],[900,720,0,0,0,0,"Flag",10,"Biology",723056146],[640,640,0,0,0,0,"Tower",10,"Biology",227449513],[900,720,0,0,0,0,"Normal",10,"Biology",839933708],[640,400,0,0,0,0,"Flag",10,"Biology",1019621697],[900,720,0,0,0,0,"Boss",10,"Biology",164170818],[640,640,0,0,0,0,"Tower",10,"Biology",908025719],[640,960,0,0,0,0,"Defense",10,"Biology",2065906104],[900,720,0,0,0,0,"Normal",10,"Biology",1308540204],[900,720,0,0,0,0,"Flag",10,"Biology",172761351],[800,600,0,0,0,0,"Normal",10,"Biology",446557330],[900,720,0,0,0,0,"Flag",10,"Biology",322394593],[800,600,0,0,0,0,"Flag",10,"Biology",392691235],[800,600,0,0,0,0,"Flag",10,"Biology",1963952401],[900,720,0,0,0,0,"Boss",10,"Biology",237055544],[640,640,0,0,0,0,"Tower",10,"Biology",2130761819],[900,720,0,0,0,0,"Normal",10,"Biology",617484905],[640,960,0,0,0,0,"Defense",10,"Biology",1148162079],[640,960,0,0,0,0,"Defense",10,"Biology"
      ,110503646],[800,600,0,0,0,0,"Normal",10,"Biology",947637962],[640,960,0,0,0,0,"Defense",10,"Biology",1641992058],[640,960,0,0,0,0,"Defense",10,"Biology",1846427668],[900,720,0,0,0,0,"Normal",10,"Biology",177947521],[900,720,0,0,0,0,"Boss",10,"Biology",168744417]];
      
      public static var flagModelW6:Array = [[0,0],[0,0],[0,0],[29,184],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,249],[0,0],[0,0],[22,251],[0,0],[25,223],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,257],[0,0],[0,0],[30,188],[0,0],[0,0],[0,0],[0,0],[22,263],[0,0],[22,264],[25,233],[25,234],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW7:Array = [[46,21.15,"Exploding1",31,"DamageAddict1",15],[35,40.77,"ScaredGhost1",12,"DamageAddict1",8,"Random2",8,"Basic2",7],[35,55,"Ghost3",12,"Temperamental3",12,"Accelerating3",11],[28,68,"Medic2",18,"Random1",10],[45,26,"Shooting3",21,"ScaredGhost1",13,"DamageAddict2",11],[29,49.34,"Crazy2",14,"Accelerating1",9,"Random2",6],[42,26.81,"Basic3",21,"Exploding1",21],[34,41.45,"Ghost3",12,"Random1",12,"Shrinking2",10],[23,111.78,"ExplodingB",1,"Random1",11,"Medic2",6,"ScaredGhost1",5],[39,34.53,"ScaredGhost1",16,"Temperamental3",13,"Trap3",10],[26,61.91,"DamageAddict1",12,"Ninja2",9,"Strong2",5],[36,43.83,"Fast3",9,"Trap2",9,"Ninja2",9,"DamageAddict1",9],[17,135.73,"Random1",17],[28,61.3,"Ghost3",14,"Medic3",14],[54,11.96,"Fast2",27,"Temperamental2",27],[29,65,"Strong2",11,"Exploding1",7,"Accelerating3",6,"ScaredGhost2",5],[36,40,"Crazy2",23,"Ninja2",13],[21,142.99,"BasicB",1,"GhostB",1,"CrazyB",1,"Ninja3",9,"Medic1",9],[42,23.02,"Shrinking2",14,"Trap2",14,"Accelerating2"
      ,14],[35,54.5,"ScaredGhost2",15,"Shooting2",13,"Ninja3",7],[36,32.86,"Strong2",12,"Accelerating3",12,"Random1",12],[29,57.46,"Ghost3",14,"Medic2",5,"DamageAddict2",5,"Exploding3",5],[44,23.63,"Basic3",32,"DamageAddict1",12],[23,67.8,"Crazy1",10,"ScaredGhost2",8,"Shrinking3",5],[36,41.79,"Medic2",16,"Exploding3",11,"DamageAddict1",9],[39,36.66,"Tiny1",29,"DamageAddict1",10],[30,66.17,"TinyB",1,"DamageAddict1",14,"Ninja3",9,"Shrinking2",6],[47,20.82,"Accelerating2",26,"DamageAddict1",21],[26,67.75,"Strong3",13,"ScaredGhost2",7,"Exploding1",6],[30,53.72,"Medic3",15,"Exploding1",15],[45,19.88,"Shooting3",15,"Ninja2",15,"Random1",15],[58,8.49,"Tiny1",58],[39,30.09,"Trap2",13,"Crazy3",13,"Exploding1",13],[39,35.56,"Trap3",27,"DamageAddict3",12],[23,77.02,"Fast2",10,"Temperamental2",7,"Crazy3",6],[24,105.01,"ShrinkingB",1,"NinjaB",1,"ExplodingB",1,"Ghost3",7,"Temperamental2",7,"Random1",7],[32,51.65,"Strong2",8,"Shrinking1",8,"ScaredGhost3",8,"Exploding2",8],[27,70.48,"Crazy2",15,"Ghost1",12],[32
      ,45.42,"ScaredGhost2",15,"Exploding1",9,"Random2",8],[48,18.8,"Exploding1",48],[32,49.28,"DamageAddict1",16,"Exploding1",16],[48,18.96,"Temperamental3",28,"Fast1",10,"Shrinking1",10],[26,65.81,"Medic2",15,"ScaredGhost2",6,"Strong2",5],[48,18.71,"Shooting3",30,"GrapplingHook1",18],[22,160.5,"GrapplingHookB",1,"Shrinking3",7,"Ninja3",7,"Exploding1",7]];
      
      public static var levelDataModelW7:Array = [[640,960,0,0,0,0,"Defense",10,"Hell",1800347108],[640,960,0,0,0,0,"Defense",10,"Hell",1218263124],[640,960,0,0,0,0,"Defense",10,"Hell",1467226913],[900,720,0,0,0,0,"Flag",10,"Hell",176491006],[640,960,0,0,0,0,"Defense",10,"Hell",2130132549],[800,600,0,0,0,0,"Normal",10,"Hell",1611114050],[640,640,0,0,0,0,"Tower",10,"Hell",1423446568],[800,600,0,0,0,0,"Normal",10,"Hell",274866063],[800,600,0,0,0,0,"Boss",10,"Hell",87799556],[900,720,0,0,0,0,"Flag",10,"Hell",967340638],[640,400,0,0,0,0,"Normal",10,"Hell",1698080567],[900,720,0,0,0,0,"Flag",10,"Hell",272878838],[640,400,0,0,0,0,"Flag",10,"Hell",1113284562],[640,640,0,0,0,0,"Tower",10,"Hell",493444572],[900,720,0,0,0,0,"Normal",10,"Hell",723694174],[640,640,0,0,0,0,"Tower",10,"Hell",163575383],[900,720,0,0,0,0,"Normal",10,"Hell",52186136],[800,600,0,0,0,0,"Boss",10,"Hell",860738542],[800,600,0,0,0,0,"Normal",10,"Hell",1146449102],[640,960,0,0,0,0,"Defense",10,"Hell",193753070],[900,720,0,0,0,0,"Normal"
      ,10,"Hell",1836591972],[640,640,0,0,0,0,"Tower",10,"Hell",651918155],[640,640,0,0,0,0,"Tower",10,"Hell",1726090930],[640,400,0,0,0,0,"Normal",10,"Hell",1617401248],[800,600,0,0,0,0,"Flag",10,"Hell",788745503],[640,400,0,0,0,0,"Flag",10,"Hell",2002476960],[900,720,0,0,0,0,"Boss",10,"Hell",871092230],[640,960,0,0,0,0,"Defense",10,"Hell",1113249444],[640,640,0,0,0,0,"Tower",10,"Hell",1173211882],[640,640,0,0,0,0,"Tower",10,"Hell",1055331219],[900,720,0,0,0,0,"Normal",10,"Hell",666380305],[900,720,0,0,0,0,"Normal",10,"Hell",1976463143],[640,960,0,0,0,0,"Defense",10,"Hell",1279212848],[900,720,0,0,0,0,"Flag",10,"Hell",984409696],[640,400,0,0,0,0,"Normal",10,"Hell",910810262],[900,720,0,0,0,0,"Boss",10,"Hell",1128557333],[640,640,0,0,0,0,"Tower",10,"Hell",256278723],[900,720,0,0,0,0,"Flag",10,"Hell",359176951],[640,960,0,0,0,0,"Defense",10,"Hell",1685725115],[640,960,0,0,0,0,"Defense",10,"Hell",1183783486],[640,640,0,0,0,0,"Tower",10,"Hell",1844942041],[640,960,0,0,0,0,"Defense",10,"Hell",1759943190]
      ,[640,640,0,0,0,0,"Tower",10,"Hell",973092150],[640,960,0,0,0,0,"Defense",10,"Hell",636794258],[800,600,0,0,0,0,"Boss",10,"Hell",1877712254]];
      
      public static var flagModelW7:Array = [[0,0],[0,0],[0,0],[22,270],[0,0],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[22,270],[30,195],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[25,238],[30,195],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[0,0],[0,0],[22,270],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW8:Array = [[47,18.74,"Accelerating2",30,"DamageAddict2",17],[22,92.64,"Strong3",8,"GrapplingHook1",8,"Random1",6],[33,49.96,"Ghost3",15,"Ninja2",11,"Exploding1",7],[54,12.94,"Basic3",35,"ScaredGhost3",19],[39,31.89,"GrapplingHook1",19,"Shrinking1",10,"Random1",10],[38,40,"Crazy1",19,"Tiny2",19],[32,49.96,"ScaredGhost2",16,"Exploding2",8,"Tiny1",8],[32,52.45,"Medic1",18,"Ninja3",7,"Exploding1",7],[22,124.83,"ExplodingB",1,"TinyB",1,"GrapplingHookB",1,"DamageAddict2",14,"GrapplingHook1",5],[42,24.98,"Exploding1",18,"Fast3",13,"GrapplingHook1",11],[30,53.39,"Strong1",10,"Medic2",10,"Tiny2",10],[36,35.05,"Ninja3",14,"Tiny1",9,"GrapplingHook1",7,"Random3",6],[27,69.47,"Crazy1",17,"Ghost2",10],[31,46.78,"DamageAddict3",19,"Shrinking3",6,"Random3",6],[31,58.45,"Trap3",12,"Exploding3",12,"GrapplingHook1",7],[33,49,"Tiny3",18,"ScaredGhost2",8,"Temperamental2",7],[39,34.38,"Random2",13,"Tiny2",13,"GrapplingHook1",13],[23,102.28,"TinyB",1,"GrapplingHookB",1,"Fast3",7,"Random2"
      ,7,"GrapplingHook1",7],[39,28.46,"Random1",17,"Tiny2",14,"Exploding1",8],[31,54.68,"Teleporting1",17,"Accelerating3",14],[33,44.92,"Shrinking2",15,"Strong3",9,"Exploding1",9],[36,32.28,"Ghost2",9,"Trap1",9,"Temperamental3",9,"Random3",9],[24,80.48,"ScaredGhost2",10,"Medic2",9,"GrapplingHook2",5],[30,85.5,"Random1",9,"Tiny2",8,"GrapplingHook2",7,"Ninja2",6],[41,30.18,"Exploding1",19,"GrapplingHook1",13,"Tiny2",9],[29,55.26,"DamageAddict3",17,"Tiny1",12],[33,56.74,"TeleportingB",1,"Teleporting1",15,"Shooting3",9,"Random1",8],[36,36.41,"Random3",17,"Fast1",11,"Crazy2",8],[32,48.39,"Strong3",8,"Random3",8,"GrapplingHook1",8,"Teleporting1",8],[36,36.46,"Accelerating2",16,"Tiny2",11,"Trap3",9],[38,36.08,"Temperamental2",19,"Ninja3",19],[28,57.45,"Medic2",7,"ScaredGhost2",7,"Exploding1",7,"Teleporting1",7],[50,18.85,"Ghost3",35,"ScaredGhost2",15],[32,46.32,"Crazy3",8,"Medic2",8,"DamageAddict3",8,"Random1",8],[34,41.32,"Exploding1",34],[31,66.54,"DamageAddictB",1,"TeleportingB",1,"Shrinking1",20
      ,"GrapplingHook2",9],[48,35.5,"Tiny1",29,"Trap2",19],[26,67.68,"DamageAddict2",17,"Medic3",9],[26,72.95,"Crazy2",16,"Fast2",10],[20,111.71,"Strong3",8,"Random3",7,"Medic3",5],[40,29.65,"Basic1",20,"Teleporting1",20],[31,60,"ScaredGhost3",11,"Accelerating3",8,"Tiny1",6,"Teleporting1",6],[43,24,"Random1",21,"Shooting3",12,"GrapplingHook3",10],[36,37.68,"Teleporting1",26,"GrapplingHook1",10],[29,74.2,"FastB",1,"TrapB",1,"Medic3",20,"Tiny1",7]];
      
      public static var levelDataModelW8:Array = [[800,600,0,0,0,0,"Normal",10,"MagicStone",92491086],[800,600,0,0,0,0,"Flag",10,"MagicStone",20787588],[900,720,0,0,0,0,"Flag",10,"MagicStone",1249822890],[640,960,0,0,0,0,"Defense",10,"MagicStone",1462279194],[640,960,0,0,0,0,"Defense",10,"MagicStone",332708735],[640,960,0,0,0,0,"Defense",10,"MagicStone",151118585],[640,640,0,0,0,0,"Tower",10,"MagicStone",1997050300],[900,720,0,0,0,0,"Flag",10,"MagicStone",561139934],[900,720,0,0,0,0,"Boss",10,"MagicStone",509587868],[900,720,0,0,0,0,"Normal",10,"MagicStone",734612774],[640,640,0,0,0,0,"Tower",10,"MagicStone",1199432824],[640,960,0,0,0,0,"Defense",10,"MagicStone",492377198],[900,720,0,0,0,0,"Flag",10,"MagicStone",895358382],[640,960,0,0,0,0,"Defense",10,"MagicStone",1278832984],[800,600,0,0,0,0,"Flag",10,"MagicStone",1183995239],[640,640,0,0,0,0,"Tower",10,"MagicStone",1612834202],[640,960,0,0,0,0,"Defense",10,"MagicStone",1864683528],[900,720,0,0,0,0,"Boss",10,"MagicStone",1537551393],[900,720
      ,0,0,0,0,"Normal",10,"MagicStone",1866234947],[640,400,0,0,0,0,"Flag",10,"MagicStone",752374817],[640,640,0,0,0,0,"Tower",10,"MagicStone",1496164961],[800,600,0,0,0,0,"Normal",10,"MagicStone",1983980477],[800,600,0,0,0,0,"Flag",10,"MagicStone",671827255],[900,720,0,0,0,0,"Flag",10,"MagicStone",412709125],[640,960,0,0,0,0,"Defense",10,"MagicStone",361178302],[640,640,0,0,0,0,"Tower",10,"MagicStone",1710674955],[900,720,0,0,0,0,"Boss",10,"MagicStone",80053770],[900,720,0,0,0,0,"Normal",10,"MagicStone",1866935402],[800,600,0,0,0,0,"Normal",10,"MagicStone",680860181],[640,400,0,0,0,0,"Normal",10,"MagicStone",1055040562],[640,960,0,0,0,0,"Defense",10,"MagicStone",1218147211],[640,640,0,0,0,0,"Tower",10,"MagicStone",1400253175],[900,720,0,0,0,0,"Flag",10,"MagicStone",392877618],[640,960,0,0,0,0,"Defense",10,"MagicStone",1679531740],[640,640,0,0,0,0,"Tower",10,"MagicStone",228535589],[900,720,0,0,0,0,"Boss",10,"MagicStone",247090595],[640,960,0,0,0,0,"Defense",10,"MagicStone",1957149312],[640,640
      ,0,0,0,0,"Tower",10,"MagicStone",649403090],[900,720,0,0,0,0,"Flag",10,"MagicStone",1818288997],[800,600,0,0,0,0,"Flag",10,"MagicStone",444764867],[640,640,0,0,0,0,"Tower",10,"MagicStone",472092434],[640,640,0,0,0,0,"Tower",10,"MagicStone",2119841171],[900,720,0,0,0,0,"Normal",10,"MagicStone",1071280640],[640,960,0,0,0,0,"Defense",10,"MagicStone",1171777979],[800,600,0,0,0,0,"Boss",10,"MagicStone",63998802]];
      
      public static var flagModelW8:Array = [[0,0],[25,238],[22,270],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[25,238],[0,0],[0,0],[0,0],[0,0],[30,195],[0,0],[0,0],[25,238],[22,270],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[0,0],[0,0],[0,0],[0,0],[22,270],[25,238],[0,0],[0,0],[0,0],[0,0],[0,0]];
      
      public static var enemyModelW9:Array = [[43,25.03,"Soldier1",23,"Strong1",11,"Random1",9],[39,32.71,"GrapplingHook1",15,"Ninja2",13,"Tiny1",11],[18,420,"GrapplingHook1",18],[37,35.8,"DamageAddict2",14,"Soldier1",13,"GrapplingHook1",10],[38,36.84,"Shooting2",19,"Exploding1",19],[28,55.33,"Fast2",16,"Crazy2",6,"Teleporting1",6],[30,55.29,"ScaredGhost2",10,"Tiny2",10,"Teleporting2",10],[34,42.71,"Temperamental2",18,"Accelerating3",16],[28,90,"SoldierB",1,"Tiny2",9,"GrapplingHook2",9,"Teleporting1",9],[34,46.28,"Soldier1",23,"GrapplingHook1",11],[40,30.41,"Exploding2",19,"Soldier1",12,"Teleporting1",9],[45,21.3,"ScaredGhost2",15,"Teleporting2",15,"Soldier1",15],[28,64.19,"DamageAddict2",7,"Tiny1",7,"GrapplingHook1",7,"Soldier1",7],[35,40.12,"GrapplingHook2",26,"Random2",9],[36,42.58,"Basic3",9,"Medic3",9,"Tiny2",9,"Teleporting1",9],[32,43.81,"GrapplingHook1",20,"Ninja2",12],[41,31.81,"Tiny2",31,"Strong3",10],[21,131.95,"AcceleratingB",1,"ExplodingB",1,"TinyB",1,"Trap3",6,"Random2",6,"Teleporting2"
      ,6],[32,43.41,"Shrinking3",18,"Random3",14],[48,17.54,"Trap3",26,"Accelerating3",22],[33,70,"Soldier3",33],[26,66.62,"Teleporting2",16,"Medic3",5,"Exploding3",5],[30,45,"Exploding2",20,"Teleporting1",10],[22,85.58,"DamageAddict2",11,"ScaredGhost3",6,"Crazy2",5],[30,55.68,"Temperamental3",15,"Teleporting1",9,"DamageAddict2",6],[36,31.96,"Crazy2",12,"Teleporting1",12,"Soldier2",12],[24,111.99,"TemperamentalB",1,"ScaredGhostB",1,"SoldierB",1,"Fast2",9,"Random1",8,"Teleporting1",4],[58,11.07,"Basic1",29,"Ghost2",29],[23,79.96,"Strong3",13,"ScaredGhost3",5,"DamageAddict2",5],[28,78,"Shooting3",14,"Soldier1",14],[39,50,"Tiny1",13,"Teleporting2",13,"Soldier2",13],[36,35.23,"Medic2",12,"Exploding1",12,"GrapplingHook1",12],[32,53.19,"Soldier2",14,"Ninja3",11,"DamageAddict3",7],[33,47.37,"ScaredGhost3",11,"Random2",11,"Soldier2",11],[32,47.69,"Tiny1",16,"Teleporting2",16],[22,117.77,"TeleportingB",1,"SoldierB",1,"Crazy3",15,"DamageAddict3",5],[28,59.09,"Exploding2",14,"Teleporting2",14],[26,66.66
      ,"Medic3",15,"Teleporting1",11],[37,32.57,"GrapplingHook1",16,"Random3",12,"DamageAddict2",9],[40,27.21,"GrapplingHook1",21,"Random2",10,"Soldier1",9],[23,87.93,"Tiny2",8,"GrapplingHook2",6,"Crazy1",5,"Soldier2",4],[32,34,"Shrinking2",8,"Ninja3",8,"ScaredGhost1",8,"Random2",8],[33,48.53,"Soldier2",18,"Fast3",8,"GrapplingHook2",7],[47,40,"Exploding2",18,"Tiny2",12,"Accelerating3",9,"Temperamental2",8],[19,175.5,"GrapplingHookB",1,"TeleportingB",1,"SoldierB",1,"GrapplingHook2",8,"Teleporting2",8]];
      
      public static var levelDataModelW9:Array = [[900,720,0,0,0,0,"Normal",10,"Futuristic",1382485614],[640,960,0,0,0,0,"Defense",10,"Futuristic",570532579],[640,400,0,0,0,0,"Flag",10,"Futuristic",889065572],[640,960,0,0,0,0,"Defense",10,"Futuristic",1746390572],[800,600,0,0,0,0,"Flag",10,"Futuristic",1469405276],[800,600,0,0,0,0,"Normal",10,"Futuristic",754473642],[640,640,0,0,0,0,"Tower",10,"Futuristic",545734113],[640,640,0,0,0,0,"Tower",10,"Futuristic",663548662],[900,720,0,0,0,0,"Boss",10,"Futuristic",1401097713],[900,720,0,0,0,0,"Flag",10,"Futuristic",2110316285],[640,960,0,0,0,0,"Defense",10,"Futuristic",872500503],[900,720,0,0,0,0,"Normal",10,"Futuristic",1194610696],[800,600,0,0,0,0,"Flag",10,"Futuristic",988425952],[640,960,0,0,0,0,"Defense",10,"Futuristic",1428530071],[640,640,0,0,0,0,"Tower",10,"Futuristic",848837100],[800,600,0,0,0,0,"Normal",10,"Futuristic",746262989],[800,600,0,0,0,0,"Flag",10,"Futuristic",1777127904],[800,600,0,0,0,0,"Boss",10,"Futuristic",2007777744],[800,600
      ,0,0,0,0,"Normal",10,"Futuristic",221346883],[900,720,0,0,0,0,"Normal",10,"Futuristic",702423038],[640,960,0,0,0,0,"Defense",10,"Futuristic",491507827],[640,640,0,0,0,0,"Tower",10,"Futuristic",656781649],[640,640,0,0,0,0,"Tower",10,"Futuristic",1606902471],[640,400,0,0,0,0,"Normal",10,"Futuristic",1391522256],[640,640,0,0,0,0,"Tower",10,"Futuristic",2068184376],[900,720,0,0,0,0,"Normal",10,"Futuristic",276002109],[900,720,0,0,0,0,"Boss",10,"Futuristic",1271532973],[900,720,0,0,0,0,"Flag",10,"Futuristic",1940335536],[640,640,0,0,0,0,"Tower",10,"Futuristic",1070207064],[640,400,0,0,0,0,"Flag",10,"Futuristic",413100044],[640,960,0,0,0,0,"Defense",10,"Futuristic",199661956],[640,960,0,0,0,0,"Defense",10,"Futuristic",290361120],[900,720,0,0,0,0,"Flag",10,"Futuristic",2049466564],[900,720,0,0,0,0,"Flag",10,"Futuristic",688903276],[640,640,0,0,0,0,"Tower",10,"Futuristic",249154819],[900,720,0,0,0,0,"Boss",10,"Futuristic",274742757],[640,640,0,0,0,0,"Tower",10,"Futuristic",459012419],[640,640,0
      ,0,0,0,"Tower",10,"Futuristic",558152951],[900,720,0,0,0,0,"Normal",10,"Futuristic",96347461],[900,720,0,0,0,0,"Normal",10,"Futuristic",7365919],[800,600,0,0,0,0,"Flag",10,"Futuristic",1630855019],[800,600,0,0,0,0,"Normal",10,"Futuristic",1149895348],[900,720,0,0,0,0,"Flag",10,"Futuristic",190578478],[640,960,0,0,0,0,"Defense",10,"Futuristic",205594426],[900,720,0,0,0,0,"Boss",10,"Futuristic",1886685304]];
      
      public static var flagModelW9:Array = [[0,0],[0,0],[30,195],[0,0],[25,238],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[0,0],[25,238],[0,0],[0,0],[0,0],[25,238],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[22,270],[0,0],[30,195],[0,0],[0,0],[22,270],[22,270],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[25,238],[0,0],[22,270],[0,0],[0,0]];
      
      public static var worldModels:Array = [enemyModelW1,levelDataModelW1,flagModelW1,enemyModelW2,levelDataModelW2,flagModelW2,enemyModelW3,levelDataModelW3,flagModelW3,enemyModelW4,levelDataModelW4,flagModelW4,enemyModelW5,levelDataModelW5,flagModelW5,enemyModelW6,levelDataModelW6,flagModelW6,enemyModelW7,levelDataModelW7,flagModelW7,enemyModelW8,levelDataModelW8,flagModelW8,enemyModelW9,levelDataModelW9,flagModelW9];
      
      public static var enemyBasicStats:Array = [5,10,50,1.5,0.2,1,"EnemyGreen",false];
      
      public static var enemyBasicBStats:Array = [15,500,500,1.5,0.2,1,"EnemyGreen",false];
      
      public static var enemyFastStats:Array = [5,10,50,3,0.2,2,"EnemyYellow",false];
      
      public static var enemyFastBStats:Array = [15,600,600,3,0.1,2,"EnemyYellow",false];
      
      public static var enemyShootingStats:Array = [5,10,60,1.5,0.2,1,"EnemyGrey",true,"Basic","Front",150,1];
      
      public static var enemyShootingBStats:Array = [15,650,700,1.5,0.2,1,"EnemyGrey",true,"BasicBoss","FrontAmount",100,4];
      
      public static var enemyStrongStats:Array = [5,20,100,2,0.3,1.5,"EnemyRedGrey",false];
      
      public static var enemyStrongBStats:Array = [15,700,800,2,0.1,1.5,"EnemyRedGrey",false];
      
      public static var enemyShrinkingStats:Array = [5,10,70,2,0.1,2.5,"EnemyCyan",false];
      
      public static var enemyShrinkingBStats:Array = [15,750,900,2,0.1,2.5,"EnemyCyan",false];
      
      public static var enemyGhostStats:Array = [5,10,80,2,0.25,3,"EnemyWhite",false];
      
      public static var enemyGhostBStats:Array = [15,450,1000,2,0.25,3,"EnemyWhite",false];
      
      public static var enemyTrapStats:Array = [5,15,80,1.5,0.2,1,"EnemyOrangeBrown",true,"Trap","BackTrap",100,1];
      
      public static var enemyTrapBStats:Array = [15,750,1100,1.5,0.2,1,"EnemyOrangeBrown",true,"Trap","BackTrap",75,3];
      
      public static var enemyTemperamentalStats:Array = [6,20,100,1,0.2,2,"EnemyWhiteRed",false];
      
      public static var enemyTemperamentalBStats:Array = [15,800,1200,1,0.2,2,"EnemyWhiteRed",false];
      
      public static var enemyNinjaStats:Array = [5,10,100,3,0.2,2,"EnemyBlack",true,"Basic","Front",60,1];
      
      public static var enemyNinjaBStats:Array = [15,850,1300,3,0.1,2,"EnemyBlack",true,"BasicBoss","FrontAmount",35,1];
      
      public static var enemyAcceleratingStats:Array = [6,20,120,1,0.2,2,"EnemyPurple",false];
      
      public static var enemyAcceleratingBStats:Array = [15,900,1400,1,0.2,2,"EnemyPurple",false];
      
      public static var enemyCrazyStats:Array = [5,15,100,1.5,0.2,1,"EnemyRed",true,"Basic","Circle",180,6];
      
      public static var enemyCrazyBStats:Array = [15,950,1500,1.5,0.2,1,"EnemyRed",true,"BasicBoss","Circle",120,12];
      
      public static var enemyMedicStats:Array = [5,25,200,2,0.3,2,"EnemyGreen2",false];
      
      public static var enemyMedicBStats:Array = [15,1000,1600,2,0.3,2,"EnemyGreen2",false];
      
      public static var enemyRandomStats:Array = [5,20,150,2,0.1,1.5,"EnemyLightBlue",true,"Basic","Circle",60,1];
      
      public static var enemyRandomBStats:Array = [15,1050,1700,2,0.1,1.5,"EnemyLightBlue",true,"BasicBoss","Circle",15,1];
      
      public static var enemyScaredGhostStats:Array = [5,10,150,2,0.5,3,"EnemyWhite2",false];
      
      public static var enemyScaredGhostBStats:Array = [15,400,1800,2,0.5,3,"EnemyWhite2",false];
      
      public static var enemyDamageAddictStats:Array = [5,25,150,1.5,0.25,2.5,"EnemyPink",false];
      
      public static var enemyDamageAddictBStats:Array = [15,500,1900,1.5,0.25,2.5,"EnemyPink",false];
      
      public static var enemyExplodingStats:Array = [5,20,150,2.5,0.25,2.5,"EnemyOrange",false];
      
      public static var enemyExplodingBStats:Array = [15,1200,2000,2.5,0.25,2.5,"EnemyOrange",false];
      
      public static var enemyTinyStats:Array = [5,15,150,1.8,0.4,2,"EnemyGreen2",false];
      
      public static var enemyTinyBStats:Array = [15,1200,2100,1.8,0.4,2,"EnemyGreen2",false];
      
      public static var enemyGrapplingHookStats:Array = [5,20,150,1.5,0.2,3,"EnemyBlue",true,"Hook","Front",60,1];
      
      public static var enemyGrapplingHookBStats:Array = [15,1200,2200,1.5,0.2,3,"EnemyBlue",true,"Hook","FrontAmount",60,3];
      
      public static var enemyTeleportingStats:Array = [5,20,150,2.5,0.3,3,"EnemyYellow2",false];
      
      public static var enemyTeleportingBStats:Array = [15,1200,2300,2.5,0.3,3,"EnemyYellow2",false];
      
      public static var enemySoldierStats:Array = [5,20,150,2.5,0.2,2,"EnemyGreen3",true,"Following","Front",150,1];
      
      public static var enemySoldierBStats:Array = [15,1200,2400,2.5,0.2,2,"EnemyGreen3",true,"FollowingBoss","FrontSides",150,3];
      
      public static var enemyBasicStrengths:Array = [];
      
      public static var enemyBasicWeaknesses:Array = [];
      
      public static var enemyFastStrengths:Array = [];
      
      public static var enemyFastWeaknesses:Array = [];
      
      public static var enemyShootingStrengths:Array = [];
      
      public static var enemyShootingWeaknesses:Array = [];
      
      public static var enemyStrongStrengths:Array = ["Explosions",0.5,"Bullets",0.5];
      
      public static var enemyStrongWeaknesses:Array = [];
      
      public static var enemyShrinkingStrengths:Array = ["Laser",0.5];
      
      public static var enemyShrinkingWeaknesses:Array = ["FireLava",0.75];
      
      public static var enemyGhostStrengths:Array = ["Poison",0.5];
      
      public static var enemyGhostWeaknesses:Array = ["Laser",0.5];
      
      public static var enemyTrapStrengths:Array = ["Ice",0.25,"Magic",0.75];
      
      public static var enemyTrapWeaknesses:Array = ["Explosions",0.5];
      
      public static var enemyTemperamentalStrengths:Array = ["FireLava",0.75,"Food",0.5];
      
      public static var enemyTemperamentalWeaknesses:Array = ["Ice",0.75];
      
      public static var enemyNinjaStrengths:Array = ["Bullets",0.25,"Laser",0.75];
      
      public static var enemyNinjaWeaknesses:Array = ["FireLava",0.5];
      
      public static var enemyAcceleratingStrengths:Array = ["Explosions",0.25,"Magic",0.5];
      
      public static var enemyAcceleratingWeaknesses:Array = ["Food",0.75];
      
      public static var enemyCrazyStrengths:Array = ["Poison",0.75];
      
      public static var enemyCrazyWeaknesses:Array = ["Bullets",0.5];
      
      public static var enemyMedicStrengths:Array = ["FireLava",0.5,"Food",0.25];
      
      public static var enemyMedicWeaknesses:Array = ["Poison",0.5];
      
      public static var enemyRandomStrengths:Array = ["Magic",0.75];
      
      public static var enemyRandomWeaknesses:Array = ["Explosions",0.75];
      
      public static var enemyScaredGhostStrengths:Array = ["Ice",0.5];
      
      public static var enemyScaredGhostWeaknesses:Array = ["Poison",0.75,"Magic",0.5];
      
      public static var enemyDamageAddictStrengths:Array = [];
      
      public static var enemyDamageAddictWeaknesses:Array = [];
      
      public static var enemyExplodingStrengths:Array = ["Bullets",0.75];
      
      public static var enemyExplodingWeaknesses:Array = ["Laser",0.75];
      
      public static var enemyTinyStrengths:Array = ["Food",0.75,"Magic",0.25];
      
      public static var enemyTinyWeaknesses:Array = ["Bullets",0.75];
      
      public static var enemyGrapplingHookStrengths:Array = ["Poison",0.25,"Ice",0.75];
      
      public static var enemyGrapplingHookWeaknesses:Array = ["Magic",0.75];
      
      public static var enemyTeleportingStrengths:Array = ["Laser",0.25];
      
      public static var enemyTeleportingWeaknesses:Array = ["Ice",0.5];
      
      public static var enemySoldierStrengths:Array = ["Explosions",0.75,"FireLava",0.25];
      
      public static var enemySoldierWeaknesses:Array = ["Food",0.5];
      
      public static var equippedWeapons:Array = ["Cannon","None"];
      
      public static var primaryWeapon:String = "Cannon";
      
      public static var secondaryWeapon:String = "Mine";
      
      private var selectedFlagModel:Array = [];
      
      public var pAchievements:PartAchievements;
      
      private var selectedLevelDataModel:Array = [];
      
      public var pauseLayer:MovieClip;
      
      public var pInterface:PartInterface;
      
      public var pTutorial:PartTutorial;
      
      public var pGameArea:PartGameArea;
      
      private var isAdded:Boolean = false;
      
      public var enemyModelCurrent:Array = new Array();
      
      private var selectedUpgradeLimit:Number = 0;
      
      private var selectedEnemyModel:Array = [];
      
      public function ScreenGame()
      {
         super();
         addEventListener(Event.ADDED_TO_STAGE,this.added);
         addEventListener(Event.REMOVED_FROM_STAGE,this.removed);
      }
      
      public function added(event:Event) : void
      {
         var i:* = undefined;
         var enemyTypesInMap:* = undefined;
         var ratioArray:* = undefined;
         var ii:* = undefined;
         var u:* = undefined;
         var normalEnemyAmount:* = undefined;
         var uu:* = undefined;
         var enemyNormalRatio:* = undefined;
         var currentEnemyRatio:* = undefined;
         if(!this.isAdded)
         {
            this.isAdded = true;
            addEventListener(Event.ENTER_FRAME,this.update);
            if(ScreenOptions.optionCrosshairOn)
            {
               Mouse.cursor = "MyCursor";
            }
            ScreenLevelSelect.previousWorld = ScreenGame.world;
            ScreenLevelSelect.previousLevel = ScreenGame.level;
            ScreenLevelSelect.previousLevelWon = false;
            LevelGuide.type = "Upcoming";
            LevelGuide.updateVariables();
            SaveManager.saveStatus();
            this.selectedEnemyModel = worldModels[world * 3 - 3];
            this.selectedLevelDataModel = worldModels[world * 3 - 2];
            this.selectedFlagModel = worldModels[world * 3 - 1];
            this.selectedUpgradeLimit = ScreenGame.worldModels[world * 3 - 2][level - 1][7];
            this.removeAboveLimit();
            bossAmountKilled = 0;
            bossAmountSpawned = 0;
            bossAmountSpawnedFull = 0;
            if(ScreenLevelSelect.levelMode == "Boss")
            {
               bossAmount = this.getBossCount();
            }
            else
            {
               bossAmount = 0;
            }
            SoundManager.changeMusic = ScreenLevelSelect.levelMode;
            this.pauseLayer = new MovieClip();
            this.pGameArea = new PartGameArea();
            addChild(this.pGameArea);
            this.pInterface = new PartInterface();
            this.pInterface.refPauseLayer = this.pauseLayer;
            addChild(this.pInterface);
            if(PartAchievements.achievementPopUp)
            {
               this.pAchievements = new PartAchievements();
               addChild(this.pAchievements);
            }
            if(PartTutorial.tutorialOn && !PartTutorial.tutorialCompleted)
            {
               this.pTutorial = new PartTutorial();
               addChild(this.pTutorial);
            }
            addChild(this.pauseLayer);
            hp = 100;
            money = 0;
            flagsLeft = this.selectedFlagModel[level - 1][0];
            for(i = 0; i < this.selectedEnemyModel[level - 1].length; i++)
            {
               normalEnemyAmount = this.selectedEnemyModel[level - 1][0];
               if(ScreenLevelSelect.levelDifficulty == "Medium")
               {
                  if(i == 0 && ScreenLevelSelect.levelMode != "Boss" && ScreenLevelSelect.levelMode != "Flag")
                  {
                     this.enemyModelCurrent[i] = Math.round(this.selectedEnemyModel[level - 1][i] * DifficultyMultipliers.multiplierAmountMedium);
                  }
                  else if(i == 1)
                  {
                     this.enemyModelCurrent[i] = Math.round(this.selectedEnemyModel[level - 1][i] * DifficultyMultipliers.multiplierSpawnRateMedium);
                  }
                  else
                  {
                     this.enemyModelCurrent[i] = this.selectedEnemyModel[level - 1][i];
                  }
               }
               else if(ScreenLevelSelect.levelDifficulty == "Hard")
               {
                  if(i == 0 && ScreenLevelSelect.levelMode != "Boss" && ScreenLevelSelect.levelMode != "Flag")
                  {
                     this.enemyModelCurrent[i] = Math.round(this.selectedEnemyModel[level - 1][i] * DifficultyMultipliers.multiplierAmountHard);
                  }
                  else if(i == 1)
                  {
                     this.enemyModelCurrent[i] = Math.round(this.selectedEnemyModel[level - 1][i] * DifficultyMultipliers.multiplierSpawnRateHard);
                  }
                  else
                  {
                     this.enemyModelCurrent[i] = this.selectedEnemyModel[level - 1][i];
                  }
               }
               else
               {
                  this.enemyModelCurrent[i] = this.selectedEnemyModel[level - 1][i];
               }
            }
            enemyTypesInMap = (this.enemyModelCurrent.length - 2) / 2;
            ratioArray = [];
            for(ii = 0; ii < enemyTypesInMap; ii++)
            {
               ratioArray.push(this.enemyModelCurrent[3 + 2 * ii]);
            }
            u = 0;
            if((ScreenLevelSelect.levelDifficulty == "Medium" || ScreenLevelSelect.levelDifficulty == "Hard") && ScreenLevelSelect.levelMode != "Boss" && ScreenLevelSelect.levelMode != "Flag")
            {
               for(uu = 0; uu < this.enemyModelCurrent[0] - normalEnemyAmount; uu++)
               {
                  enemyNormalRatio = ratioArray[u] / normalEnemyAmount;
                  currentEnemyRatio = this.enemyModelCurrent[3 + 2 * u] / this.enemyModelCurrent[0];
                  if(currentEnemyRatio < enemyNormalRatio)
                  {
                     ++this.enemyModelCurrent[3 + 2 * u];
                  }
                  else if(u + 1 < enemyTypesInMap)
                  {
                     u++;
                     ++this.enemyModelCurrent[3 + 2 * u];
                  }
               }
            }
            if(equippedWeapons[0] != "None")
            {
               this.chooseWeapon(1);
               currentWeapon = 1;
            }
            else
            {
               this.chooseWeapon(2);
               currentWeapon = 2;
            }
            reloadTimeSecondary = reloadTimeMaxSecondary;
            reloadTime = reloadTimeMax;
            reloadTimeEnemyMax = this.enemyModelCurrent[1];
            reloadTimeEnemy = 0;
            enemiesLeft = this.enemyModelCurrent[0];
            currentEnemies = 0;
            this.setVisibleTankWeapon();
         }
      }
      
      public function update(event:Event) : void
      {
         if((Main.keyShift || Main.keyQ) && canChangeWeapon && !PartGameArea.gamePaused)
         {
            canChangeWeapon = false;
            if(currentWeapon == 1)
            {
               if(equippedWeapons[1] != "None")
               {
                  currentWeapon = 2;
                  reloadTime = reloadTimeMax;
                  SoundManager.sfxArray.push("WeaponChange");
               }
            }
            else if(equippedWeapons[0] != "None")
            {
               currentWeapon = 1;
               reloadTime = reloadTimeMax;
               SoundManager.sfxArray.push("WeaponChange");
            }
            this.chooseWeapon(currentWeapon);
            if(currentWeapon == 1)
            {
               if(equippedWeapons[1] != "None")
               {
                  reloadTime = reloadTimeMax;
               }
            }
            else if(equippedWeapons[0] != "None")
            {
               reloadTime = reloadTimeMax;
            }
            this.setVisibleTankWeapon();
         }
         else if(!Main.keyShift && !Main.keyQ)
         {
            canChangeWeapon = true;
         }
      }
      
      public function setVisibleTankWeapon() : void
      {
         var object:* = this.pGameArea.tank.tower;
         if(ScreenGame.primaryWeapon == "Cannon")
         {
            object.gotoAndStop(1);
         }
         else if(ScreenGame.primaryWeapon == "MiniGun")
         {
            object.gotoAndStop(2);
         }
         else if(ScreenGame.primaryWeapon == "Big Cannon")
         {
            object.gotoAndStop(3);
         }
         else if(ScreenGame.primaryWeapon == "Flamethrower")
         {
            object.gotoAndStop(4);
         }
         else if(ScreenGame.primaryWeapon == "Shotgun")
         {
            object.gotoAndStop(5);
         }
         else if(ScreenGame.primaryWeapon == "Timed Bomb Cannon")
         {
            object.gotoAndStop(6);
         }
         else if(ScreenGame.primaryWeapon == "Gummy Bear Cannon")
         {
            object.gotoAndStop(7);
         }
         else if(ScreenGame.primaryWeapon == "Poison Cannon")
         {
            object.gotoAndStop(8);
         }
         else if(ScreenGame.primaryWeapon == "Laser Cannon")
         {
            object.gotoAndStop(9);
         }
         else if(ScreenGame.primaryWeapon == "Cake Cannon")
         {
            object.gotoAndStop(10);
         }
         else if(ScreenGame.primaryWeapon == "Penetration Cannon")
         {
            object.gotoAndStop(11);
         }
         else if(ScreenGame.primaryWeapon == "Magic Cannon")
         {
            object.gotoAndStop(12);
         }
      }
      
      private function removeAboveLimit() : *
      {
         for(var i:* = 0; i < ScreenUpgrades.levelsArray.length; i++)
         {
            if(ScreenUpgrades.levelsArray[i] > this.selectedUpgradeLimit)
            {
               ScreenUpgrades.levelsArrayRemoved[i] += ScreenUpgrades.levelsArray[i] - this.selectedUpgradeLimit;
               ScreenUpgrades.levelsArray[i] = this.selectedUpgradeLimit;
            }
         }
         for(var ii:* = 0; ii < ScreenUpgrades.levelsArraySecondary.length; ii++)
         {
            if(ScreenUpgrades.levelsArraySecondary[ii] > this.selectedUpgradeLimit)
            {
               ScreenUpgrades.levelsArraySecondaryRemoved[ii] += ScreenUpgrades.levelsArraySecondary[ii] - this.selectedUpgradeLimit;
               ScreenUpgrades.levelsArraySecondary[ii] = this.selectedUpgradeLimit;
            }
         }
         for(var iii:* = 0; iii < ScreenUpgrades.levelsArrayMisc.length; iii++)
         {
            if(ScreenUpgrades.levelsArrayMisc[iii] > this.selectedUpgradeLimit)
            {
               ScreenUpgrades.levelsArrayMiscRemoved[iii] += ScreenUpgrades.levelsArrayMisc[iii] - this.selectedUpgradeLimit;
               ScreenUpgrades.levelsArrayMisc[iii] = this.selectedUpgradeLimit;
            }
         }
      }
      
      private function chooseWeapon(weaponNumber:Number) : void
      {
         primaryWeapon = equippedWeapons[weaponNumber - 1];
         if(primaryWeapon == "Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayCannon[1][ScreenUpgrades.levelsArray[0] - 1];
         }
         else if(primaryWeapon == "MiniGun")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayMiniGun[1][ScreenUpgrades.levelsArray[1] - 1];
         }
         else if(primaryWeapon == "Big Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayBigCannon[1][ScreenUpgrades.levelsArray[2] - 1];
         }
         else if(primaryWeapon == "Flamethrower")
         {
            reloadTimeMax = 0;
         }
         else if(primaryWeapon == "Shotgun")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayShotgun[1][ScreenUpgrades.levelsArray[4] - 1];
         }
         else if(primaryWeapon == "Timed Bomb Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayShotgun[1][ScreenUpgrades.levelsArray[5] - 1];
         }
         else if(primaryWeapon == "Gummy Bear Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayGummyBearCannon[1][ScreenUpgrades.levelsArray[6] - 1];
         }
         else if(primaryWeapon == "Poison Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayPoisonCannon[1][ScreenUpgrades.levelsArray[7] - 1];
         }
         else if(primaryWeapon == "Laser Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayLaserCannon[1][ScreenUpgrades.levelsArray[8] - 1];
         }
         else if(primaryWeapon == "Cake Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayCakeCannon[1][ScreenUpgrades.levelsArray[9] - 1];
         }
         else if(primaryWeapon == "Penetration Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayPenetrationCannon[1][ScreenUpgrades.levelsArray[10] - 1];
         }
         else if(primaryWeapon == "Magic Cannon")
         {
            reloadTimeMax = ScreenUpgrades.upgradeArrayMagicCannon[1][ScreenUpgrades.levelsArray[11] - 1];
         }
         if(secondaryWeapon == "Mine")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayMine[1][ScreenUpgrades.levelsArraySecondary[0] - 1];
         }
         else if(secondaryWeapon == "Grenade")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayGrenade[1][ScreenUpgrades.levelsArraySecondary[1] - 1];
         }
         else if(secondaryWeapon == "Ice Grenade")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayIceGrenade[1][ScreenUpgrades.levelsArraySecondary[2] - 1];
         }
         else if(secondaryWeapon == "Poison Grenade")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayPoisonGrenade[1][ScreenUpgrades.levelsArraySecondary[3] - 1];
         }
         else if(secondaryWeapon == "Icicles")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayIcicles[1][ScreenUpgrades.levelsArraySecondary[4] - 1];
         }
         else if(secondaryWeapon == "Poison Spikes")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayPoisonSpikes[1][ScreenUpgrades.levelsArraySecondary[5] - 1];
         }
         else if(secondaryWeapon == "Shield")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayShield[1][ScreenUpgrades.levelsArraySecondary[6] - 1];
         }
         else if(secondaryWeapon == "Rockets")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayRockets[1][ScreenUpgrades.levelsArraySecondary[7] - 1];
         }
         else if(secondaryWeapon == "Ice Ball")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayIceball[1][ScreenUpgrades.levelsArraySecondary[8] - 1];
         }
         else if(secondaryWeapon == "Lava Ball")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayLavaball[1][ScreenUpgrades.levelsArraySecondary[9] - 1];
         }
         else if(secondaryWeapon == "Crazy Cheese")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayCrazyCheese[1][ScreenUpgrades.levelsArraySecondary[10] - 1];
         }
         else if(secondaryWeapon == "Magic Bunny")
         {
            reloadTimeMaxSecondary = ScreenUpgrades.upgradeArrayMagicBunny[1][ScreenUpgrades.levelsArraySecondary[11] - 1];
         }
      }
      
      private function getBossCount() : *
      {
         var searchPlace:* = undefined;
         var bossCount:* = 0;
         for(var i:* = 0; i < (this.selectedEnemyModel[level - 1].length - 2) / 2; i++)
         {
            searchPlace = this.selectedEnemyModel[level - 1][2 + i * 2];
            if(searchPlace.slice(searchPlace.length - 1,searchPlace.length) == "B")
            {
               bossCount += this.selectedEnemyModel[level - 1][3 + i * 2];
            }
         }
         return bossCount;
      }
      
      private function addAboveLimit() : *
      {
         for(var i:* = 0; i < ScreenUpgrades.levelsArrayRemoved.length; i++)
         {
            ScreenUpgrades.levelsArray[i] += ScreenUpgrades.levelsArrayRemoved[i];
            ScreenUpgrades.levelsArrayRemoved[i] = 0;
         }
         for(var ii:* = 0; ii < ScreenUpgrades.levelsArraySecondaryRemoved.length; ii++)
         {
            ScreenUpgrades.levelsArraySecondary[ii] += ScreenUpgrades.levelsArraySecondaryRemoved[ii];
            ScreenUpgrades.levelsArraySecondaryRemoved[ii] = 0;
         }
         for(var iii:* = 0; iii < ScreenUpgrades.levelsArrayMiscRemoved.length; iii++)
         {
            ScreenUpgrades.levelsArrayMisc[iii] += ScreenUpgrades.levelsArrayMiscRemoved[iii];
            ScreenUpgrades.levelsArrayMiscRemoved[iii] = 0;
         }
      }
      
      public function removed(event:Event) : void
      {
         Mouse.cursor = MouseCursor.AUTO;
         this.addAboveLimit();
         removeEventListener(Event.ENTER_FRAME,this.update);
         for(var i:* = int(this.numChildren - 1); i >= 0; i--)
         {
            this.removeChildAt(i);
         }
      }
   }
}

