<?php
require __DIR__.'/../core.php';
function check($ok,$msg){if(!$ok)throw new RuntimeException($msg);}
$now=1800000000;$phone=token();$who=['hotel'=>'qa','player'=>'bianca','csrf'=>token()];
$db=['hotels'=>['qa'=>initial(true)],'keys'=>[hash('sha256',$phone)=>$who],'invites'=>[]];
$code=issueDeviceCode($db,$who,$now);$pc=consumeDeviceCode($db,strtolower($code['code']),'test-ip',$now+1);
check($pc['ok'],'Code accepted');check(count($db['keys'])===2,'Phone remains valid');$binding=$db['keys'][hash('sha256',$pc['deviceKey'])];check($binding['player']==='bianca'&&$binding['hotel']==='qa','Same server-owned identity');check($binding['csrf']!==$who['csrf'],'Independent device key and CSRF');check(!consumeDeviceCode($db,$code['code'],'test-ip',$now+2)['ok'],'One use only');
$old=issueDeviceCode($db,$who,$now+3);$new=issueDeviceCode($db,$who,$now+4);check(!consumeDeviceCode($db,$old['code'],'test-ip',$now+5)['ok'],'New code revokes old unused code');check(!consumeDeviceCode($db,$new['code'],'test-ip',$now+605)['ok'],'Expired code rejected');
for($i=0;$i<12;$i++)check(consumeDeviceCode($db,'BAD-CODE','other-ip',$now)['status']===401,'Invalid attempts counted');check(consumeDeviceCode($db,'BAD-CODE','other-ip',$now)['status']===429,'Rate limit');check(consumeDeviceCode($db,'BAD-CODE','other-ip',$now+601)['status']===401,'Rate limit expires');
$other=['hotel'=>'qa','player'=>'leandra','csrf'=>token()];$code=issueDeviceCode($db,$other,$now);$linked=consumeDeviceCode($db,$code['code'],'third-ip',$now);check($db['keys'][hash('sha256',$linked['deviceKey'])]['player']==='leandra','Other girl keeps own identity');
// Actual owner reset revokes all devices/codes for one player, preserves the other.
$path=sys_get_temp_dir().'/hotel-device-'.bin2hex(random_bytes(8));mkdir($path,0700);putenv('HOTEL_DATA_DIR='.$path);
try{issueDeviceCode($db,$who,$now);file_put_contents($path.'/state.json',json_encode($db));ownerCommand('reset','qa',['admin.php','reset','qa','bianca']);$saved=json_decode(file_get_contents($path.'/state.json'),true);check(count($saved['keys'])===1&&array_values($saved['keys'])[0]['player']==='leandra','Reset only selected player devices');foreach($saved['deviceCodes']??[] as $c)check($c['player']!=='bianca','Reset invalidates unused pairing codes');}
finally{foreach(glob($path.'/*') as $f)unlink($f);rmdir($path);}
echo "PASS device pairing: same identity/progress, independent keys, one use, expiry, rate limiting, replacement code and selective owner reset\n";
