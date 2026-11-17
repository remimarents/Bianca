"""Publish only hotel code and homepage using existing Gigahost Keychain account."""
import json, subprocess, urllib.request, urllib.parse, secrets, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def key(service):
 r=subprocess.run(['security','find-generic-password','-a','deploy','-s',service,'-w'],capture_output=True,text=True)
 return r.stdout.strip() if r.returncode==0 else None
KEY=key('gigahost.veiledningskompetanse')
if not KEY: raise SystemExit('Deploy account unavailable')
def call(path,data):
 req=urllib.request.Request('https://api.gigahost.no/api/v0'+path,data=json.dumps(data).encode(),headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json','User-Agent':'curl/8.14.1'},method='POST')
 with urllib.request.urlopen(req,timeout=60) as r: return json.load(r)
def folder(parent,name):
 r=call('/webhosting/409/files/folder',{'path':parent,'name':name})
 print('folder',name,r['meta']['status'])
def upload(parent,name,content):
 q=urllib.parse.urlencode({'name':name,'path':parent})
 req=urllib.request.Request('https://api.gigahost.no/api/v0/webhosting/409/files/upload?'+q,data=content,headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/octet-stream','User-Agent':'curl/8.14.1'},method='POST')
 with urllib.request.urlopen(req,timeout=60) as r: result=json.load(r)
 if result['meta']['status'] not in (200,201):raise RuntimeError('Upload failed '+name+' '+str(result['meta']['status']))
 print('uploaded',name)
if __name__=='__main__':
 domain='/domains/biancanoor.no';public=domain+'/public_html';private=domain+'/hotell-private'
 folder(public,'hotell');folder(domain,'hotell-private');folder(private,'assets')
 for f in ['game.html','game.js','style.css','hotel.jpg']:upload(private+'/assets',f,(ROOT/f).read_bytes())
 for f in ['core.php','api.php','asset.php','help.php','index.php','owner.php']:upload(public+'/hotell',f,(ROOT/f).read_bytes())
 print('Hotel published; homepage is a separate final step.')
