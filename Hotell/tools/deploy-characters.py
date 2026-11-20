"""Narrow character release. Compare existing files first; never read/write player state."""
import argparse, json, urllib.request, urllib.parse, hashlib
from pathlib import Path
from deploy import KEY, upload, folder
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline',type=Path,required=True,help='Reviewed live snapshot with game.html, scenes.js, style.css and asset.php')
BASE=parser.parse_args().baseline
PRIVATE='/domains/biancanoor.no/hotell-private/assets'
PUBLIC='/domains/biancanoor.no/public_html/hotell'
def read(parent,name):
 req=urllib.request.Request('https://api.gigahost.no/api/v0/webhosting/409/files/edit?'+urllib.parse.urlencode({'path':parent+'/'+name}),headers={'Authorization':'Bearer '+KEY,'User-Agent':'curl/8.14.1'})
 d=json.load(urllib.request.urlopen(req,timeout=60));return d['data']['content'].encode()
changed=['game.html','scenes.js','style.css']
# Abort the entire release before uploading if another editor changed the same files.
for name in changed+['asset.php']:
 old=read(PUBLIC if name=='asset.php' else PRIVATE,name)
 if old!=(BASE/name).read_bytes():raise SystemExit('Concurrent change: '+name+'; release stopped')
folder(PRIVATE,'characters')
for p in sorted((ROOT/'characters').glob('*.webp')):upload(PRIVATE+'/characters',p.name,p.read_bytes())
upload(PRIVATE,'characters.js',(ROOT/'characters.js').read_bytes())
# Allow-list first, then consuming scene and final entry page.
upload(PUBLIC,'asset.php',(ROOT/'asset.php').read_bytes())
for name in ['style.css','game.html','scenes.js']:upload(PRIVATE,name,(ROOT/name).read_bytes())
for name in changed+['characters.js','asset.php']:
 assert read(PUBLIC if name=='asset.php' else PRIVATE,name)==(ROOT/name).read_bytes(),name
print('PASS narrow upload and remote byte verification; no game.js/content/state/invitation files uploaded')
