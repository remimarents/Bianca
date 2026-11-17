<?php
require dirname(__DIR__).'/core.php';
function check(bool $value,string $message):void {if(!$value)throw new RuntimeException($message);}
$s=initial(true,3);check($s['hotelName']==='Hotellet vårt','initial name');
$legacy=$s;unset($legacy['hotelName']);check(publicState($legacy,time())['hotelName']==='Hotellet vårt','legacy fallback');
foreach($s['players'] as &$p){$p['ready']=true;$p['seen']=time();}unset($p);
action($s,'bianca',['action'=>'configure','hotelName'=>'  Blåbærøya 🌸  '],time());
check($s['hotelName']==='Blåbærøya 🌸','Unicode name and trim');check(!array_filter($s['players'],fn($p)=>$p['ready']),'all readiness reset');
foreach([null,[],42,true,'A',str_repeat('Ø',41),str_repeat('x',161),'<b>Hei</b>',"Hei\nvenn","Hei\0venn","Hei\u{202E}","\xff\xfe"] as $bad){$copy=$s;try{action($copy,'bianca',['action'=>'configure','hotelName'=>$bad],time());throw new RuntimeException('Accepted invalid name');}catch(HotelError $e){}}
$copy=$s;action($copy,'bianca',['action'=>'configure','hotelName'=>str_repeat('Ø',40)],time());check($copy['hotelName']===str_repeat('Ø',40),'40 Unicode chars accepted');
$s['phase']='day';try{action($s,'bianca',['action'=>'configure','hotelName'=>'Nytt navn'],time());throw new RuntimeException('Rename during day');}catch(HotelError $e){}
$s['phase']='finished';action($s,'bianca',['action'=>'newSeason'],time());check($s['hotelName']==='Blåbærøya 🌸','new season preserves name');action($s,'rebecca',['action'=>'configure','hotelName'=>'Solhotellet'],time());check($s['hotelName']==='Solhotellet','new season can rename');
echo "PASS hotel name: defaults, legacy, Unicode bounds, rejected types/control/markup, readiness reset, planning only, next season\n";
