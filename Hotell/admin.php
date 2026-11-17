<?php
/** CLI only. Set HOTEL_DATA_DIR to private path outside webroot. Never redirect invitations into repository. */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/core.php';
$cmd=$argv[1]??'';$hotel=$argv[2]??'';if(!preg_match('/^[a-z0-9_-]{3,60}$/D',$hotel)){fwrite(STDERR,"Usage: php admin.php create HOTEL [qa SECONDS] | invite HOTEL PLAYER | reset HOTEL PLAYER | status HOTEL | delete-qa HOTEL\n");exit(1);}
try{$out=ownerCommand($cmd,$hotel,$argv);echo json_encode($out,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)."\n";}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
