"""Isolated HTTPS regression check. No invitation/device credentials are printed or persisted."""
import urllib.request,urllib.error,json,subprocess,time,uuid,http.cookiejar
from deploy import key
BASE='https://biancanoor.no/hotell/'
secret=key('biancanoor.hotell.owner');assert secret
hotel='qa-api-'+uuid.uuid4().hex[:12]
def req(path,body=None,opener=None,headers={}):
 r=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**headers})
 try:
  with (opener.open(r,timeout=30) if opener else urllib.request.urlopen(r,timeout=30)) as x:return x.status,json.load(x)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def owner(action,**kw):
 code,d=req('owner.php',{'action':action,'hotel':hotel,**kw},headers={'Authorization':'Bearer '+secret});assert code==200,(action,code);return d['result']
def get(i):
 code,d=req('api.php',opener=clients[i]);assert code==200;return d
def act(i,action,**kw):
 for _ in range(5):
  d=get(i);code,r=req('api.php',{'action':action,'id':uuid.uuid4().hex,'rev':d['state']['rev'],**kw},clients[i],{'X-CSRF-Token':d['csrf']})
  if code==409:continue
  assert code==200,(action,code,r);return r
 raise AssertionError('conflicts')
clients=[urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())) for _ in range(3)]
try:
 owner('create',qa=True,seconds=12)
 assert req('api.php')[0]==401
 for i,p in enumerate(['bianca','leandra','rebecca']):
  url=owner('invite',player=p)['url'];token=url.split('#invite=')[1]
  assert req('api.php',{'action':'activate','token':token},clients[i])[0]==200
  assert req('api.php',{'action':'activate','token':token})[0]==401
  get(i)
 print('PASS: isolated invitation activation, single-use replay rejection, unauthorized rejection')
 act(0,'decorate',room=1,color='sky');assert get(2)['state']['rooms'][0]['color']=='sky'
 for i in range(3):get(i)
 for i in range(2):assert act(i,'ready')['state']['phase']=='planning'
 assert act(2,'ready')['state']['phase']=='day'
 act(0,'propose',kind='party');assert get(1)['state']['proposal']
 assert act(1,'vote',choice='yes')['state']['proposal'] is None
 guests=get(2)['state']['guests'];assert len(set(g['mood'] for g in guests))>1
 d=get(0);payload={'action':'small','kind':'welcome','id':uuid.uuid4().hex,'rev':d['state']['rev']};h={'X-CSRF-Token':d['csrf']}
 c,a=req('api.php',payload,clients[0],h);c,b=req('api.php',payload,clients[0],h);assert a['state']['metrics']==b['state']['metrics'];assert a['state']['rev']==b['state']['rev']
 assert req('api.php',{'action':'role','role':'rom','id':uuid.uuid4().hex,'rev':b['state']['rev']},clients[0])[0]==403
 print('PASS: cross-player sync, three-player readiness, 2/3 vote, guest tradeoff, deduplication, CSRF')
 for day in range(1,6):
  deadline=time.time()+30
  while time.time()<deadline:
   d=get(0)
   for i in [1,2]:get(i)
   if d['state']['phase']!='day':break
   time.sleep(1)
  assert d['state']['day']==day
  if day<5:
   for i in range(3):act(i,'ready')
 assert d['state']['phase']=='finished';assert len(d['state']['newspaper'])==5;assert d['state']['keepsakes']
 old=d['state']['keepsakes'];r=act(0,'newSeason')['state'];assert r['season']==2 and r['keepsakes']==old and r['rooms'][0]['color']=='sky'
 print('PASS: complete five-day season, newspaper, next season and retained decor')
 # Replace one QA browser only; old browser becomes unauthorized.
 owner('reset',player='bianca');assert req('api.php',opener=clients[0])[0]==401;assert get(1)['state']['season']==2
 print('PASS: owner replacement revokes old browser without altering other seats')
finally:
 owner('delete-qa');print('QA hotel deleted; family hotel untouched')
