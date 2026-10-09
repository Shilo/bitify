"""Prepare the user's actual PNGs for a reproducible, offline conversion study."""
from pathlib import Path
import json, hashlib, shutil
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FILES = [
 ('breastplate', r'C:/Users/shilo/AppData/Local/Temp/codex-clipboard-02eb8cf5-4116-4291-b58d-108f2ebb6258.png'),
 ('general', r'C:/Users/shilo/AppData/Local/Temp/codex-clipboard-ec6be665-385a-4e8d-a122-5843262fbe9a.png'),
 ('weapons', r'C:/Users/shilo/AppData/Local/Temp/codex-clipboard-16406bb0-0d6a-48a9-b70d-9734fea3a649.png'),
 ('accessories', r'C:/Users/shilo/AppData/Local/Temp/codex-clipboard-2d6553b8-5c13-417a-a448-822b6c6921a6.png'),
 ('armor', r'C:/Users/shilo/AppData/Local/Temp/codex-clipboard-5ee67f5c-fb66-4a10-9aae-27cd8336f118.png'),
]

def luma(a):
 return np.floor(a[...,:3].astype(float) @ np.array([.2126,.7152,.0722]) + .5).astype(np.uint8)

def quant(a, n):
 out=a.copy(); s=a[...,3]>=128
 rgb=a[s,:3]
 if not len(rgb): return out
 # Quantize only foreground. Transparent RGB never consumes palette entries.
 strip=Image.fromarray(rgb.reshape(1,-1,3)).quantize(n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
 out[s,:3]=np.asarray(strip).reshape(-1,3)
 return out

items=[]; audit=[]
for group, filename in FILES:
 source=Path(filename) if Path(filename).exists() else ROOT/f'{group}-source.png'
 im=Image.open(source).convert('RGBA'); a=np.asarray(im).copy(); h,w=a.shape[:2]
 assert (w,h)==((16,16) if group=='breastplate' else (64,64))
 s=a[...,3]>=128
 audit.append(dict(group=group,path=filename,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),width=w,height=h,opaque=int(s.sum()),alpha_values=np.unique(a[...,3]).tolist(),colors=int(len(np.unique(a[s,:3],axis=0)))))
 if source.resolve()!=(ROOT/f'{group}-source.png').resolve(): shutil.copyfile(source,ROOT/f'{group}-source.png')
 sheet_quant={n:quant(a,n) for n in (4,8,16)}
 for y in range(0,h,16):
  for x in range(0,w,16):
   cell=a[y:y+16,x:x+16].copy(); variants={'original':cell}
   g=cell.copy(); g[...,:3]=luma(cell)[...,None]; variants['gray']=g
   for n in (4,8,16):
    variants[f'palette{n}']=quant(cell,n)
    variants[f'sheetpalette{n}']=sheet_quant[n][y:y+16,x:x+16].copy()
   for key,v in variants.items():
    items.append(dict(id=f'{group}-{y//16+1}-{x//16+1}',group=group,row=y//16,col=x//16,variant=key,width=16,height=16,data=v.ravel().tolist()))
 # Whole sheets expose the existing per-component Stencil versus per-image Solid behavior.
 if w>16: items.append(dict(id=f'{group}-sheet',group=group,row=-1,col=-1,variant='original',width=w,height=h,data=a.ravel().tolist()))
(ROOT/'inputs.json').write_text(json.dumps(items))
(ROOT/'source-audit.json').write_text(json.dumps(audit,indent=2))
print(json.dumps(audit,indent=2))
