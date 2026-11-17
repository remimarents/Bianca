<?php
declare(strict_types=1);
require __DIR__.'/core.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try {
 $file=storage().'/owner-key.sha256';$expected=is_file($file)?trim(file_get_contents($file)):'';$auth=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'';
 if(!preg_match('/^Bearer ([a-f0-9]{64})$/D',$auth,$m)||!preg_match('/^[a-f0-9]{64}$/D',$expected)||!hash_equals($expected,hash('sha256',$m[1])))fail('Ikke tilgjengelig.',404);
 if($_SERVER['REQUEST_METHOD']!=='POST')fail('POST required.',405);
 if((int)($_SERVER['CONTENT_LENGTH']??0)>4096)fail('Request too large.',413);
 $in=json_decode(file_get_contents('php://input'),true);if(!is_array($in))fail('JSON required.');$cmd=$in['action']??'';$hotel=$in['hotel']??'';
 if(!in_array($cmd,['create','invite','reset','status','delete-qa'],true)||!is_string($hotel)||!preg_match('/^[a-z0-9_-]{3,60}$/D',$hotel))fail('Invalid command.');
 $args=['admin.php',$cmd,$hotel];if($cmd==='create'){$args[]=(($in['qa']??false)===true)?'qa':'';$args[]=(int)($in['seconds']??300);}else $args[]=$in['player']??'';
 echo json_encode(['ok'=>true,'result'=>ownerCommand($cmd,$hotel,$args)],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
}catch(HotelError $e){http_response_code($e->getCode()?:400);echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);}catch(Throwable $e){http_response_code(500);echo '{"ok":false,"error":"Storage error"}';}
