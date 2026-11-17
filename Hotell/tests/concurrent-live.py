"""Real HTTPS concurrency checks; synthetic hotel only; credentials remain in memory."""
import concurrent.futures as cf
import http.cookiejar,json,subprocess,urllib.request,urllib.error,uuid
BASE='https://biancanoor.no/hotell/'
secret=subprocess.run(['security','find-generic-password','-a','deploy','-s','biancanoor.hotell.owner','-w'],capture_output=True,text=True,check=True).stdout.strip()
hotel='qa-concurrency-'+uuid.uuid4().hex[:12]
def req(path,body=None,headers=None):
 r=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
 try:
  with urllib.request.urlopen(r,timeout=30) as x:return x.status,json.load(x),x.headers
 except urllib.error.HTTPError as e:return e.code,json.load(e),e.headers
def owner(action,**kw):
 c,d,h=req('owner.php',{'action':action,'hotel':hotel,**kw},{'Authorization':'Bearer '+secret});assert c==200,(action,c);return d['result']
def snap(i):
 c,d,h=req('api.php',headers=clients[i]);assert c==200;return d
def concurrent(posts):
 with cf.ThreadPoolExecutor(max_workers=len(posts)) as pool:return list(pool.map(lambda p:req('api.php',p[1],p[0]),posts))
clients=[]
try:
 owner('create',qa=True,seconds=30)
 for name in ['bianca','leandra','rebecca']:
  token=owner('invite',player=name)['url'].split('#invite=')[1]
  c,d,h=req('api.php',{'action':'activate','token':token});assert c==200
  clients.append({'Cookie':h['Set-Cookie'].split(';')[0]})
  clients[-1]['X-CSRF-Token']=snap(len(clients)-1)['csrf']
 s=snap(0)['state'];rev=s['rev']
 result=concurrent([(clients[i],{'action':'decorate','room':i+1,'color':'sky','id':uuid.uuid4().hex,'rev':rev}) for i in [0,1]])
 assert sorted(r[0] for r in result)==[200,409]
 after=snap(2)['state'];assert after['rev']==rev+1
 assert sum(r['color']=='sky' for r in after['rooms'][:2])==1
 loser=[i for i,r in enumerate(result) if r[0]==409][0]
 c,d,h=req('api.php',{'action':'decorate','room':loser+1,'color':'sky','id':uuid.uuid4().hex,'rev':after['rev']},clients[loser]);assert c==200
 assert all(r['color']=='sky' for r in snap(2)['state']['rooms'][:2])
 print('PASS simultaneous independent edits: exactly one 200, one409; fresh revision retry preserves both changes')
 for i in range(3):
  s=snap(i)['state'];c,d,h=req('api.php',{'action':'ready','id':uuid.uuid4().hex,'rev':s['rev']},clients[i]);assert c==200
 s=snap(0)['state'];assert s['phase']=='day'
 payload={'action':'small','kind':'welcome','id':uuid.uuid4().hex,'rev':s['rev']}
 result=concurrent([(clients[0],payload)]*2);assert [r[0] for r in result]==[200,200]
 after=snap(2)['state'];assert after['rev']==s['rev']+1
 assert after['metrics']['joy']==min(100,s['metrics']['joy']+3)
 assert after['metrics']['reputation']==min(100,s['metrics']['reputation']+1)
 assert result[0][1]['state']['metrics']==result[1][1]['state']['metrics']
 print('PASS simultaneous identical action IDs: two200 responses, one revision and one reward only')
 before=snap(1)['state'];payload={'action':'decorate','room':6,'color':'rose','id':uuid.uuid4().hex,'rev':before['rev']}
 denied=dict(clients[1]);denied['Origin']='https://untrusted.example'
 assert req('api.php',payload,denied)[0]==403
 assert snap(1)['state']['rev']==before['rev']
 print('PASS foreign Origin rejected without state change')
finally:
 owner('delete-qa');print('PASS synthetic QA hotel removed; no family seats used')
