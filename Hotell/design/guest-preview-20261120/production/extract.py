from PIL import Image
from pathlib import Path
import json
src=Path('/Users/remimarents/.codex/generated_images/01a1ea2f-c168-7a42-aac8-bf2047080b0f')
root=Path(__file__).resolve().parents[3]
groups=[
('exec-0a3b034a-a89d-48c9-a13d-ba90b73451a8.png','mia noah alma oliver ella leo'.split()),
('exec-9086e1dd-0623-438e-aefa-65ce4697ea2f.png','mia-baby toddler boy girl dog elder'.split()),
('exec-0dff09aa-2353-4019-9b8d-97f02a7c5899.png','mia-night mia-swim mia-party noah-night noah-swim noah-party'.split()),
('exec-53e930f8-b810-4f9d-a5d1-63d3b3048f1b.png','wheelchair-manual wheelchair-power musician alma-tour baker courier'.split()),
('exec-1a07001b-9095-465b-80c6-78ca61cb8d8a.png','mia-rain noah-rain alma-rain leo-tour technician boy-night'.split())]
manifest={}
for file,ids in groups:
 im=Image.open(src/file).convert('RGBA');w,h=im.size
 for i,id in enumerate(ids):
  col=i%3;row=i//3;x0=round(col*w/3);x1=round((col+1)*w/3)
  strip=im.crop((x0,0,x1,h));a=strip.getchannel('A')
  split=min(range(int(h*.46),int(h*.54)),key=lambda y:sum(a.crop((0,y,x1-x0,y+1)).getdata()))
  cell=strip.crop((0,0 if row==0 else split,x1-x0,split if row==0 else h))
  # Alpha only: do not repaint or remove any part of the generated character.
  bbox=cell.getchannel('A').point(lambda a: 255 if a>=32 else 0).getbbox();assert bbox
  cell=cell.crop(bbox);cell.thumbnail((240,320),Image.Resampling.LANCZOS)
  out=Image.new('RGBA',(cell.width+8,cell.height+8));out.paste(cell,(4,4))
  out.save(root/'characters'/f'{id}.webp',quality=90,method=6)
  manifest[id]={'file':f'{id}.webp','width':out.width,'height':out.height,'sceneHeight':{'toddler':40,'boy':54,'boy-night':54,'girl':60,'dog':30,'wheelchair-manual':58,'wheelchair-power':60}.get(id,72),'source':file,'alpha':True}
(root/'characters/manifest.json').write_text(json.dumps(manifest,indent=2))
print('Exported',len(manifest),'individual alpha sprites;',sum(p.stat().st_size for p in (root/'characters').glob('*.webp')),'bytes')
