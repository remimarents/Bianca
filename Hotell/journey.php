<?php
declare(strict_types=1);
/** Content is server-owned. Only the currently revealed scene is sent to players. */
function library(string $kind): array {
    static $cache=[];
    if (!isset($cache[$kind])) {
        $file=assetDir().'/'.$kind.'.json';
        if(!is_file($file))$file=__DIR__.'/content/'.$kind.'.json';
        $rows=json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR);
        $cache[$kind]=array_column($rows,null,'id');
    }
    return $cache[$kind];
}
function migrateJourney(array &$s,int $now=0): void {
    if(($s['version']??0)>=2)return;
    $s['version']=2;$s['paused']=false;$s['usedEvents']=[];$s['usedStories']=[];$s['usedTasks']=[];
    $s['dayPlan']=[];$s['encounter']=0;$s['tasks']=[];$s['storyChoices']=[];$s['completedStories']=$s['completedStories']??[];
    $s['advanceRequested']=false;$s['dayEndsAt']=0;
    if($s['phase']==='day') {
        if($s['event']['resolved']??false)$s['history'][]='Tidligere dagsvalg: '.$s['event']['title'];
        prepareJourneyDay($s,$now?:time());
    }
    $s['rev']++;
}
/** Draw without replacement across days and seasons; old history only resets after exhaustion. */
function drawContent(array &$s,string $kind,?string $category=null): array {
    $all=library($kind);$field=['events'=>'usedEvents','stories'=>'usedStories','tasks'=>'usedTasks'][$kind];
    $seen=$s[$field]??[];$available=array_diff_key($all,array_flip($seen));
    if(!$available){$available=$all;$seen=[];}
    $preferred=$category?array_filter($available,fn($r)=>$r['category']===$category):[];
    $pool=$preferred?:$available;$ids=array_keys($pool);$id=$ids[random_int(0,count($ids)-1)];
    $seen[]=$id;$s[$field]=$seen;return $all[$id];
}
function prepareJourneyDay(array &$s,int $now): void {
    $story=drawContent($s,'stories');$s['dayStory']=$story['id'];$s['storyChoices']=[];$s['dayPlan']=[];
    $category=match($s['priority']){'mat'=>'mat','aktiviteter'=>'hage','personale'=>'personale',default=>'rom'};
    for($i=0;$i<12;$i++) {
        if(in_array($i,[0,5,11]))$s['dayPlan'][]=['kind'=>'story','id'=>$story['id'],'step'=>array_search($i,[0,5,11])];
        else {$e=drawContent($s,'events',$i%3===1?$category:null);$s['dayPlan'][]=['kind'=>'event','id'=>$e['id']];}
    }
    $s['encounter']=0;$s['dayLogStart']=count($s['history']);$s['paused']=false;
    revealEncounter($s,$now);
}
function revealEncounter(array &$s,int $now): void {
    $entry=$s['dayPlan'][$s['encounter']];
    if($entry['kind']==='story') {
        $story=library('stories')[$entry['id']];$ev=$story['scenes'][$entry['step']];
        if(isset($ev['branches'])){$last=$s['storyChoices'][$entry['step']-1]??'b';$ev['text']=$ev['branches'][$last];if(isset($ev['visualBranches'][$last]))$ev['visual']=$ev['visualBranches'][$last];unset($ev['branches']);}
        $ev['category']=$story['category'];$ev['story']=$story['title'];$ev['storyStep']=$entry['step']+1;
    }else $ev=library('events')[$entry['id']];
    $ev['sourceId']=$entry['id'];$ev['id']=token();$ev['resolved']=false;$s['event']=$ev;
    $s['proposal']=null;$s['advanceRequested']=false;$s['tasks']=[];
    // One concrete service task per scene solo; two when sharing the work.
    $count=count(present($s,$now))>1?2:1;
    // Tests and deterministic simulation can set seen timestamps in the future.
    if(count(array_filter($s['players'],fn($p)=>$p['seen']>0))===1)$count=1;
    for($j=0;$j<$count;$j++){$t=drawContent($s,'tasks',$ev['category']);$t['sourceId']=$t['id'];$t['id']=token();$t['done']=false;$t['owner']=null;$s['tasks'][]=$t;}
    foreach($s['players'] as &$p)$p['ready']=false;unset($p);
    // Guests move and develop new needs as the day proceeds, without an offline penalty.
    foreach($s['guests'] as $i=>&$g){$g['status']=['room','dining','garden'][($s['encounter']+$i)%3];$g['bubble']=($i===0?'Jeg lurer på hva dere velger.':($g['status']==='dining'?'Her er det tid for et måltid.':'Jeg ser meg litt rundt.'));}unset($g);
    if($s['encounter']>0)effect($s,['cleanliness'=>-2,'energy'=>-1,'coins'=>2]);
}
function startDay(array &$s,int $now): void {
    migrateJourney($s,$now);$s['day']++;$s['phase']='day';$s['dayEndsAt']=0;$s['paused']=false;
    $s['guests']=[];
    effect($s,match($s['profile']){'natur'=>['energy'=>5,'reputation'=>3],'luksus'=>['joy'=>6,'coins'=>-8],default=>['joy'=>3,'energy'=>3]});
    effect($s,match($s['audience']){'venner'=>['joy'=>6,'energy'=>-5],'rolige'=>['energy'=>5,'joy'=>-1],default=>['joy'=>4,'cleanliness'=>-4]});
    foreach(['Mia','Noah','Alma','Oliver','Ella','Leo'] as $i=>$name)$s['guests'][]=['id'=>$i+1,'name'=>$name,'room'=>$i+1,'kind'=>['familie','rolig','aktiv'][$i%3],'allergy'=>$i===1,'status'=>'room','need'=>'serve','mood'=>$s['metrics']['joy'],'bubble'=>'Hva skjer på hotellet i dag?'];
    effect($s,match($s['priority']){'mat'=>['joy'=>5],'aktiviteter'=>['joy'=>6,'energy'=>-3],'personale'=>['energy'=>9],default=>['cleanliness'=>8]});
    prepareJourneyDay($s,$now?:time());
}
function sceneComplete(array $s): bool {return ($s['event']['resolved']??false)&&!$s['proposal']&&!array_filter($s['tasks'],fn($t)=>!$t['done']);}
function allReady(array $s,int $now): bool {$active=present($s,$now);$ready=array_column(array_filter($s['players'],fn($p)=>$p['ready']),'id');return $active&&!array_diff($active,$ready);}
function finishJourneyDay(array &$s): void {
    effect($s,['energy'=>10,'coins'=>18]);$s['phase']=$s['day']===5?'finished':'evening';$s['proposal']=null;$s['advanceRequested']=false;
    $story=library('stories')[$s['dayStory']];$choices=$s['storyChoices'];
    $ending=$s['event']['choices'][($s['event']['chosen']??'b')==='a'?0:1]['outcome'];
    $s['completedStories'][]=['id'=>$story['id'],'season'=>$s['season'],'day'=>$s['day'],'choices'=>$choices,'ending'=>$ending];
    $s['completedStories']=array_slice($s['completedStories'],-40);
    $s['newspaper'][]=['day'=>$s['day'],'headline'=>$story['title'],'text'=>$ending,'reactions'=>[$ending,$s['metrics']['cleanliness']>=60?'Rommet mitt var koselig og rent.':'Rommet trenger litt mer stell.'],'decisions'=>array_slice($s['history'],$s['dayLogStart'],60)];
    foreach($s['players'] as &$p)$p['ready']=false;unset($p);
    if($s['phase']==='finished'){$prize=['shell','lantern','butterfly'][($s['season']-1)%3];if(!in_array($prize,$s['keepsakes']))$s['keepsakes'][]=$prize;}
}
function tick(array &$s,int $now): void {
    migrateJourney($s,$now);
    if($s['paused'])return;
    // Nothing advances merely because real time passes. No offline simulation or deadline.
    resolveVote($s,$now);
    if(in_array($s['phase'],['planning','evening'])&&allReady($s,$now)){startDay($s,$now);$s['rev']++;}
    elseif($s['phase']==='day'&&$s['advanceRequested']&&sceneComplete($s)&&allReady($s,$now)) {
        if($s['encounter']===11)finishJourneyDay($s);else{$s['encounter']++;revealEncounter($s,$now);}
        $s['rev']++;
    }
}
function resolveVote(array &$s,int $now): void {
    if(!$s['proposal']||($s['paused']??false))return;
    $active=present($s,$now);if(!$active)return;
    $p=$s['proposal'];$votes=array_intersect_key($p['votes'],array_flip($active));
    // All present players get a voice before a majority can settle the question.
    if(count($votes)<count($active))return;
    $counts=array_count_values($votes);$need=count($active)===3?2:count($active);
    foreach($counts as $choice=>$count)if($count>=$need) {
        if($choice==='no'){$s['proposal']=null;$s['history'][]='Forslaget ble lagt bort.';$s['rev']++;return;}
        if($p['kind']==='event') {
            $option=null;foreach($s['event']['choices'] as $c)if($c['id']===$choice)$option=$c;
            if(!$option)return;
            if($s['metrics']['coins']+($option['effect']['coins']??0)<0){$s['proposal']=null;$s['history'][]='Kassen endret seg. Velg en løsning hotellet har råd til.';$s['rev']++;return;}
            effect($s,$option['effect']);$s['event']['resolved']=true;$s['event']['chosen']=$choice;
            $s['event']['result']=$option['outcome']??$option['label'];
            $entry=$s['dayPlan'][$s['encounter']]??null;if(($entry['kind']??'')==='story')$s['storyChoices'][$entry['step']]=$choice;
            $s['history'][]=$s['event']['title'].': '.$option['label'];
        } else {
            $kind=$p['kind'];$effects=['pool'=>['joy'=>15,'coins'=>-30,'cleanliness'=>-10],'party'=>['joy'=>8,'energy'=>-10],'pets'=>['joy'=>6,'cleanliness'=>-8],'quiet'=>['energy'=>10,'joy'=>-2]];
            if($kind==='pool'&&($s['metrics']['coins']<30||in_array('pool',$s['upgrades']))){$s['proposal']=null;$s['rev']++;return;}
            effect($s,$effects[$kind]);guestTradeoff($s,$kind);if($kind==='pool')$s['upgrades'][]='pool';
            $s['history'][]=['pool'=>'Dere bygget basseng.','party'=>'Dere arrangerte hagefest.','pets'=>'Dere avtalte et tilbud for dyregjester.','quiet'=>'Dere valgte en rolig stund.'][$kind];
        }
        $s['proposal']=null;$s['rev']++;return;
    }
}
function journeyAction(array &$s,string $who,array $in,int $now): bool {
    $a=$in['action']??'';
    if($a==='pause'){$s['paused']=true;$s['pausedBy']=$who;foreach($s['players'] as &$p)$p['ready']=false;unset($p);$s['advanceRequested']=false;return true;}
    if($a==='resume'){$s['paused']=false;unset($s['pausedBy']);return true;}
    if($s['paused'])fail('Hotellet har pause. Trykk Fortsett når dere er klare.');
    if(in_array($a,['claimTask','task','next'])) {
        if($s['phase']!=='day')fail('Åpne hotellet først.');
        if($a==='next') {
            if(!sceneComplete($s))fail('Velg løsning og følg opp oppgavene først.');
            foreach($s['players'] as &$p)if($p['id']===$who)$p['ready']=true;unset($p);
            $s['advanceRequested']=true;tick($s,$now);return true;
        }
        foreach($s['tasks'] as &$t)if($t['id']===($in['task']??'')) {
            if($t['done'])fail('Oppgaven er allerede fulgt opp.');
            if($a==='claimTask'){$t['owner']=$who;return true;}
            $chosen=null;foreach($t['choices'] as $c)if($c['id']===($in['choice']??''))$chosen=$c;
            if(!$chosen)fail('Velg en løsning på oppgaven.');
            $t['done']=true;$t['owner']=$who;$t['chosen']=$chosen['id'];$t['result']=$chosen['outcome'];effect($s,$chosen['effect']);
            $s['history'][]=$t['title'].': '.$chosen['label'];return true;
        }
        unset($t);fail('Oppgaven tilhører en tidligere del av dagen.');
    }
    return false;
}

/** Enrich older saved encounters without changing choices, progress or revision. */
function sceneVisuals(array &$s): void {
    if(isset($s['event']['sourceId'])&&!isset($s['event']['visual'])) {
        $ev=&$s['event'];$source=isset($ev['storyStep'])?(library('stories')[$ev['sourceId']]['scenes'][$ev['storyStep']-1]??null):(library('events')[$ev['sourceId']]??null);
        if($source){$ev['visual']=$source['visual']??['kind'=>'talk','zone'=>'reception'];$last=$s['storyChoices'][($ev['storyStep']??1)-2]??'b';if(isset($source['visualBranches'][$last]))$ev['visual']=$source['visualBranches'][$last];foreach($ev['choices'] as &$choice)foreach($source['choices'] as $original)if($choice['id']===$original['id'])$choice['visual']=$original['visual'];unset($choice);}unset($ev);
    }
    foreach($s['tasks']??[] as $i=>$task)if(!isset($task['visual'])&&isset($task['sourceId'])){ $source=library('tasks')[$task['sourceId']]??null;if($source){$s['tasks'][$i]['visual']=$source['visual'];foreach($s['tasks'][$i]['choices'] as &$choice)foreach($source['choices'] as $original)if($choice['id']===$original['id'])$choice['visual']=$original['visual'];unset($choice);}}
}
