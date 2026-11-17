"""Owner operations; credentials remain in Keychain, invitations copied to clipboard only."""
import argparse, hashlib, json, secrets, subprocess, urllib.request, urllib.error
from deploy import key, upload
SERVICE='biancanoor.hotell.owner'
p=argparse.ArgumentParser();p.add_argument('action',choices=['bootstrap','create','invite','reset','status','delete-qa']);p.add_argument('hotel',nargs='?',default='family');p.add_argument('--player',choices=['bianca','leandra','rebecca']);p.add_argument('--qa',action='store_true');p.add_argument('--seconds',type=int,default=300);args=p.parse_args()
secret=key(SERVICE)
if args.action=='bootstrap':
 if not secret:
  secret=secrets.token_hex(32)
  subprocess.run(['security','-i'],input='add-generic-password -U -a deploy -s '+SERVICE+' -w '+secret+'\n',text=True,check=True,capture_output=True)
 upload('/domains/biancanoor.no/hotell-private','owner-key.sha256',hashlib.sha256(secret.encode()).hexdigest().encode());print('Owner access prepared in Keychain.');raise SystemExit
if not secret:raise SystemExit('Run bootstrap first')
body={'action':args.action,'hotel':args.hotel,'player':args.player,'qa':args.qa,'seconds':args.seconds}
req=urllib.request.Request('https://biancanoor.no/hotell/owner.php',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+secret,'Content-Type':'application/json'})
try:
 with urllib.request.urlopen(req,timeout=30) as r:result=json.load(r)
except urllib.error.HTTPError as e:print('Owner request failed:',e.code);raise SystemExit(1)
if args.action in ['invite','reset'] and result.get('ok'):
 subprocess.run(['pbcopy'],input=result['result']['url'],text=True,check=True)
 print('Invitation copied to clipboard for',args.player,'— expires after 7 days; not sent.')
else:print(json.dumps(result,ensure_ascii=False))
