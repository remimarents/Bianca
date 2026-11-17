<?php
require __DIR__.'/../core.php';
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
function rejects($fn){try{$fn();}catch(HotelError $e){return;}throw new RuntimeException('Expected rejection');}
$now=1800000000;
function fresh(int $players=1):array{global $now;$s=initial(true);migrateJourney($s,$now);for($i=0;$i<$players;$i++)$s['players'][$i]['seen']=$now;return $s;}
function runAction(array &$s,string $who,array $input){global $now;action($s,$who,$input,$now);}
function openDay(array &$s,int $n){foreach(array_slice(['bianca','leandra','rebecca'],0,$n) as $who)runAction($s,$who,['action'=>'ready']);check($s['phase']==='day','Day opens');}
function solve(array &$s,int $n,string $choice='b'){
 global $now;$old=$s['event']['id'];runAction($s,'bianca',['action'=>'propose','kind'=>'event','choice'=>$choice]);
 if($n>1){check(!$s['event']['resolved'],'Wait for other vote');runAction($s,'leandra',['action'=>'vote','choice'=>$choice]);}
 if($n===3){check(!$s['event']['resolved'],'Third player gets a voice before majority');runAction($s,'rebecca',['action'=>'vote','choice'=>$choice==='a'?'b':'a']);}
 check($s['event']['resolved'],'Event resolves');
 foreach($s['tasks'] as $i=>$t){runAction($s,['bianca','leandra','rebecca'][$i%$n],['action'=>'task','task'=>$t['id'],'choice'=>'b']);}
 check(sceneComplete($s),'All work done');
 foreach(array_slice(['bianca','leandra','rebecca'],0,$n) as $who)runAction($s,$who,['action'=>'next']);
 check($s['phase']!=='day'||$s['event']['id']!==$old,'Advance only when all ready');
}
// Validate every branch and every playable option, not just counts.
check(count(library('events'))===150,'150 unique events');check(count(library('stories'))===20,'20 stories');check(count(library('tasks'))===60,'60 service tasks');
foreach(['events','tasks'] as $kind)foreach(library($kind) as $item){check(count($item['choices'])===2,'Two viable choices');check(($item['choices'][1]['effect']['coins']??0)>=0,'Always an affordable alternative');check(trim($item['text'])!==''&&$item['choices'][0]['label']!==$item['choices'][1]['label'],'Context and distinct choices');}
foreach(library('stories') as $story){check(count($story['scenes'])===3,'Three chapters');foreach([1,2] as $step)check(count($story['scenes'][$step]['branches'])===2,'Both narrative branches authored');}
// No content repetition until exhaustion, even across day/season boundaries.
$s=fresh();$ids=[];for($i=0;$i<150;$i++)$ids[]=drawContent($s,'events','rom')['id'];check(count(array_unique($ids))===150,'Deck exhausts before repetition');drawContent($s,'events');check(count($s['usedEvents'])===1,'Fresh deck after full exhaustion');
$s=fresh();$ids=[];for($i=0;$i<20;$i++)$ids[]=drawContent($s,'stories')['id'];check(count(array_unique($ids))===20,'20 nonrepeating stories');
foreach([1,2,3] as $n){$s=fresh($n);$s['rooms'][0]['color']='sky';$s['upgrades']=['pool'];for($day=1;$day<=5;$day++){openDay($s,$n);check(count($s['tasks'])===($n===1?1:2),'Task load follows online team');for($scene=0;$scene<12;$scene++){check($s['encounter']===$scene,'Scene order');solve($s,$n,$scene%2?'a':'b');}check($s['phase']===($day===5?'finished':'evening'),'Day ends through progress');}check(count($s['newspaper'])===5,'Five actual day reports');check(count($s['usedEvents'])===45,'45 standalone events per season');check(count($s['completedStories'])===5,'Five full branching stories');$used=$s['usedEvents'];runAction($s,'bianca',['action'=>'newSeason']);check($s['usedEvents']===$used&&$s['rooms'][0]['color']==='sky'&&$s['upgrades']===['pool'],'Season preserves long-term progress and content memory');}
$s=fresh(3);openDay($s,3);$event=$s['event']['id'];$metrics=$s['metrics'];tick($s,$now+86400*365);check($s['event']['id']===$event&&$s['metrics']===$metrics,'Offline time does not advance or damage hotel');
runAction($s,'bianca',['action'=>'pause']);rejects(function()use(&$s){runAction($s,'leandra',['action'=>'task','task'=>$s['tasks'][0]['id'],'choice'=>'a']);});tick($s,$now+86400);check($s['paused'],'Pause persists');runAction($s,'rebecca',['action'=>'resume']);check(!$s['paused'],'Resume keeps scene');
$s=fresh(2);openDay($s,2);runAction($s,'bianca',['action'=>'propose','kind'=>'event','choice'=>'b']);runAction($s,'leandra',['action'=>'vote','choice'=>'a']);check(!$s['event']['resolved'],'Two disagree without forced timeout');runAction($s,'leandra',['action'=>'vote','choice'=>'b']);check($s['event']['resolved'],'Vote can be changed');
$s=fresh();openDay($s,1);$s['metrics']['coins']=0;foreach($s['tasks'] as $t)runAction($s,'bianca',['action'=>'task','task'=>$t['id'],'choice'=>'b']);runAction($s,'bianca',['action'=>'propose','kind'=>'event','choice'=>'b']);runAction($s,'bianca',['action'=>'next']);check($s['encounter']===1,'Zero coins never deadlock');$stale=$s['tasks'][0]['id'];solve($s,1);rejects(function()use(&$s,$stale){runAction($s,'bianca',['action'=>'task','task'=>$stale,'choice'=>'a']);});
// Branches reflect the actual previous choice and stay unchanged on reload/tick.
foreach(['a','b'] as $branch){$s=fresh();openDay($s,1);$story=library('stories')[$s['dayStory']];for($i=0;$i<5;$i++)solve($s,1,$branch);check($s['event']['text']===$story['scenes'][1]['branches'][$branch],'Correct follow-up branch');$before=$s['event'];tick($s,$now+10);check($s['event']===$before,'Reload cannot reroll content');}
// Migration preserves an existing real hotel's resources and room choices.
$s=initial();$s['phase']='day';$s['day']=2;$s['rooms'][0]['color']='rose';$s['metrics']['coins']=37;$s['upgrades']=['pool'];migrateJourney($s,$now);check($s['day']===2&&$s['metrics']['coins']===37&&$s['rooms'][0]['color']==='rose'&&$s['upgrades']===['pool'],'Old saves migrated without reset');
echo "PASS: all content schemas, nonrepeating decks, 180 scenes across solo/duo/trio seasons, all voices, disagreement, pause/offline, branching, stale tasks, budgets, persistent progression and migration\n";
