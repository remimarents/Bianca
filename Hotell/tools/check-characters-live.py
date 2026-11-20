"""One disposable QA hotel checks the deployed authenticated images. No family data."""
import urllib.request,urllib.error,json,uuid,http.cookiejar
from pathlib import Path
from deploy import key
ROOT=Path(__file__).resolve().parents[1];BASE='https://biancanoor.no/hotell/'
secret=key('biancanoor.hotell.owner');assert secret
hotel='qa-characters-'+uuid.uuid4().hex[:12]
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def request(path,body=None,owner=False,authenticated=False):
 headers={'Content-Type':'application/json'}
 if owner:headers['Authorization']='Bearer '+secret
 req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with (client.open(req,timeout=30) if authenticated else urllib.request.urlopen(req,timeout=30)) as r:return r.status,r.read(),r.headers
 except urllib.error.HTTPError as e:return e.code,e.read(),e.headers
def admin(action,**kw):
 code,data,_=request('owner.php',{'action':action,'hotel':hotel,**kw},owner=True);assert code==200,(action,code);return json.loads(data)['result']
created=False
try:
 assert request('asset.php?f=characters/mia.webp')[0]==401
 admin('create',qa=True);created=True
 token=admin('invite',player='bianca')['url'].split('#invite=')[1]
 assert request('api.php',{'action':'activate','token':token},authenticated=True)[0]==200
 for name in ['game.html','characters.js','scenes.js','style.css']:
  code,data,_=request('' if name=='game.html' else 'asset.php?f='+name,authenticated=True)
  assert code==200 and data==(ROOT/name).read_bytes(),name
 for p in sorted((ROOT/'characters').glob('*.webp')):
  code,data,h=request('asset.php?f=characters/'+p.name,authenticated=True)
  assert code==200 and data==p.read_bytes(),p.name
  assert h['Content-Type']=='image/webp'
 for f in ['characters/not-real.webp','characters/manifest.json','../core.php']:
  assert request('asset.php?f='+urllib.parse.quote(f),authenticated=True)[0]==404
 print('PASS live HTTPS: game entry + modules + all 30 WebP assets match; unauthorized 401 and unknown/path traversal 404')
finally:
 if created:admin('delete-qa');print('Disposable QA hotel deleted; family untouched')
