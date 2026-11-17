<?php
require __DIR__.'/core.php';
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
if(!transact(fn(&$db)=>auth($db)!==null)){http_response_code(401);exit;}
$f=$_GET['f']??'';$types=['scenes.js'=>'application/javascript','game.js'=>'application/javascript','style.css'=>'text/css','game.css'=>'text/css','hotel.jpg'=>'image/jpeg','hotel.webp'=>'image/webp','hotel.png'=>'image/png'];if(!isset($types[$f])||!is_file(assetDir().'/'.$f)){http_response_code(404);exit;}header('Content-Type: '.$types[$f]);readfile(assetDir().'/'.$f);
