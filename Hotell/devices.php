<?php
declare(strict_types=1);
function pruneDeviceCodes(array &$db,int $now): void {
    foreach($db['deviceCodes']??[] as $key=>$v)if($v['expires']<$now)unset($db['deviceCodes'][$key]);
    foreach($db['pairAttempts']??[] as $key=>$v)if($v['until']<=$now)unset($db['pairAttempts'][$key]);
}
function issueDeviceCode(array &$db,array $who,int $now): array {
    pruneDeviceCodes($db,$now);
    foreach($db['deviceCodes']??[] as $key=>$v)if($v['hotel']===$who['hotel']&&$v['player']===$who['player'])unset($db['deviceCodes'][$key]);
    $alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';$code='';
    for($i=0;$i<8;$i++)$code.=$alphabet[random_int(0,strlen($alphabet)-1)];
    $db['deviceCodes'][hash('sha256',$code)]=['hotel'=>$who['hotel'],'player'=>$who['player'],'expires'=>$now+600];
    return ['code'=>substr($code,0,4).'-'.substr($code,4),'expiresAt'=>$now+600];
}
/** Invalid attempts return a response so the transaction persists rate limiting. */
function consumeDeviceCode(array &$db,mixed $input,string $address,int $now): array {
    pruneDeviceCodes($db,$now);$rate=hash('sha256',$address);
    $attempt=$db['pairAttempts'][$rate]??['until'=>$now+600,'count'=>0];
    if($attempt['count']>=12)return ['ok'=>false,'status'=>429,'error'=>'For mange forsøk. Vent ti minutter og prøv igjen.'];
    $attempt['count']++;$db['pairAttempts'][$rate]=$attempt;
    $code=is_string($input)?strtoupper(preg_replace('/[\s-]/','',substr($input,0,40))):'';
    $hash=hash('sha256',$code);$entry=$db['deviceCodes'][$hash]??null;
    if(!preg_match('/^[A-HJ-NP-Z2-9]{8}$/D',$code)||!$entry||$entry['expires']<$now||!isset($db['hotels'][$entry['hotel']]))return ['ok'=>false,'status'=>401,'error'=>'Koden er ugyldig, brukt eller utløpt. Hent en ny kode på enheten du allerede bruker.'];
    unset($db['deviceCodes'][$hash]);
    // Add a browser key; do not replace any existing phone/PWA/computer key.
    $key=token();$db['keys'][hash('sha256',$key)]=['hotel'=>$entry['hotel'],'player'=>$entry['player'],'csrf'=>token()];
    return ['ok'=>true,'deviceKey'=>$key];
}
function deviceCookie(string $key): void {
    setcookie('hotel_device',$key,['expires'=>time()+31536000,'path'=>'/hotell/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
}
