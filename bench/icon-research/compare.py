"""Masked image experiments. Metrics describe geometry, never recognition accuracy."""
from pathlib import Path
import json, math, html, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def luma(a):
 return np.floor(a[...,:3].astype(float) @ np.array([.2126,.7152,.0722]) + .5).astype(np.uint8)

ROOT=Path(__file__).resolve().parent
inputs=json.loads((ROOT/'inputs.json').read_text())
raw={ (s['id'],s['variant']): np.array(s['data'],dtype=np.uint8).reshape(s['height'],s['width'],4) for s in inputs }
out=json.loads((ROOT/'current-output.json').read_text())
masks={(o['id'],o['variant'],o['method']): np.array(o['mask'],dtype=np.uint8).reshape(raw[o['id'],o['variant']].shape[:2])==2 for o in out}
originals={i:a for (i,v),a in raw.items() if v=='original' and not i.endswith('sheet')}

def components(a, diagonal=True):
 h,w=a.shape; seen=np.zeros_like(a); groups=[]
 steps=[(dy,dx) for dy in (-1,0,1) for dx in (-1,0,1) if (dy or dx) and (diagonal or not (dy and dx))]
 for y,x in zip(*np.where(a)):
  if seen[y,x]: continue
  seen[y,x]=1; q=[(int(y),int(x))]
  for yy,xx in q:
   for dy,dx in steps:
    Y,X=yy+dy,xx+dx
    if 0<=Y<h and 0<=X<w and a[Y,X] and not seen[Y,X]: seen[Y,X]=1; q.append((Y,X))
  groups.append(q)
 return groups

def erode(s, diagonal=False):
 p=np.pad(s,1); h,w=s.shape; a=s.copy()
 for dy in (-1,0,1):
  for dx in (-1,0,1):
   if (dy or dx) and (diagonal or not(dy and dx)): a &= p[1+dy:1+dy+h,1+dx:1+dx+w]
 return a

def otsu(g,s):
 hist=np.bincount(np.floor(g[s]+.5).clip(0,255).astype(int),minlength=256)
 n=hist.sum(); sm=np.arange(256)@hist; best=0; t=127; nb=0; sb=0
 for i in range(256):
  nb+=hist[i]; sb+=i*hist[i]
  if not nb or nb==n: continue
  v=nb*(n-nb)*(sb/nb-(sm-sb)/(n-nb))**2
  if v>best: best=v; t=i
 return t

def lab(a):
 rgb=a[...,:3].astype(float)/255
 linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
 xyz=linear @ np.array([[.4124564,.2126729,.0193339],[.3575761,.7151522,.1191920],[.1804375,.0721750,.9503041]])
 xyz/=np.array([.95047,1,1.08883]); f=np.where(xyz>(6/29)**3,np.cbrt(xyz),xyz/(3*(6/29)**2)+4/29)
 return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],axis=-1),linear@np.array([.2126,.7152,.0722])

def bilateral(g,a,s):
 # 3x3 color-guided filter; opacity is a mask, never a black neighbor.
 h,w=s.shape; gp=np.pad(g,1); sp=np.pad(s,1); ap=np.pad(a[...,:3].astype(float),((1,1),(1,1),(0,0)))
 total=np.zeros_like(g,dtype=float); weight=np.zeros_like(g,dtype=float)
 for dy in (-1,0,1):
  for dx in (-1,0,1):
   rgb=ap[1+dy:1+dy+h,1+dx:1+dx+w]
   wt=np.exp(-(dy*dy+dx*dx)/2-((rgb-a[...,:3])**2).sum(axis=-1)/(2*35**2))*sp[1+dy:1+dy+h,1+dx:1+dx+w]
   total+=wt*gp[1+dy:1+dy+h,1+dx:1+dx+w]; weight+=wt
 return total/np.maximum(weight,1e-9)

def local(g,s,kind):
 # Alpha-aware 5x5 window. Sauvola k=.2, R=128; mean offset=8.
 h,w=s.shape; gp=np.pad(g,2); sp=np.pad(s,2); n=np.zeros_like(g); sm=n.copy(); sq=n.copy()
 for dy in range(-2,3):
  for dx in range(-2,3):
   v=gp[2+dy:2+dy+h,2+dx:2+dx+w]; wt=sp[2+dy:2+dy+h,2+dx:2+dx+w]
   n+=wt; sm+=v*wt; sq+=v*v*wt
 mean=sm/np.maximum(n,1); sd=np.sqrt(np.maximum(0,sq/np.maximum(n,1)-mean*mean))
 t=mean-8 if kind=='mean' else mean*(1+.2*(sd/128-1))
 return s & (g>t)

def clean_holes(m,s):
 # Area filtering restricted to interior cut pixels, not a destructive 3x3 opening.
 cuts=s & ~m; eligible=erode(s,True); r=m.copy()
 for c in components(cuts,False):
  if len(c)==1 and all(eligible[y,x] for y,x in c):
   for y,x in c: r[y,x]=True
 return r

def metrics(m,s):
 fg=components(m); cuts=components(s & ~m,False)
 return dict(ink=int(m.sum()),retained=round(float(m.sum()/max(1,s.sum())),4),fragments=len(fg),single_ink=sum(len(c)==1 for c in fg),cut_regions=len(cuts),single_cuts=sum(len(c)==1 for c in cuts),rim_retained=round(float((m & (s & ~erode(s))).sum()/max(1,(s & ~erode(s)).sum())),4))

def color2gray(ls,s,alpha=10,theta=45):
 # Gooch et al. 2005, eq. 1, ALL ordered pairs of foreground pixels.
 # Full-neighborhood least squares has a closed solution for the complete graph.
 # For general delta: g=mean(L)+(rowSum(delta)-colSum(delta))/(2*n).
 # This solves the same objective, without the paper's iterative CG solver.
 vals=ls[s]; d=vals[:,None,:]-vals[None,:,:]
 crunch=alpha*np.tanh(np.linalg.norm(d[...,1:],axis=-1)/alpha)
 angle=np.deg2rad(theta); sign=np.where(d[...,1]*np.cos(angle)+d[...,2]*np.sin(angle)>=0,1,-1)
 delta=np.where(np.abs(d[...,0])>crunch,d[...,0],sign*crunch)
 n=len(vals); g=vals[:,0].mean()+(delta.sum(axis=1)-delta.sum(axis=0))/(2*n)
 # Check the normal equations before clipping/output encoding.
 residual=2*n*(g-g.mean())-(delta.sum(axis=1)-delta.sum(axis=0))
 assert np.abs(residual).max()<1e-8
 out=np.zeros(s.shape); out[s]=np.clip(g,0,100)*2.55
 return out

# Verify the solve reproduces neutral lightness when chroma is absent.
neutral=np.array([[[10.,0.,0.],[50.,0.,0.],[90.,0.,0.]]])
assert np.allclose(color2gray(neutral,np.ones((1,3),bool))/2.55,[10,50,90])
c2g_inputs=[]
for i,a in originals.items():
 s=a[...,3]>=128; ls,_=lab(a)
 for alpha,theta in ((10,45),(10,135),(25,45)):
  g=color2gray(ls,s,alpha,theta); v=a.copy(); v[...,:3]=np.floor(g+.5).astype(np.uint8)[...,None]
  c2g_inputs.append(dict(id=i,variant=f'c2g{alpha}_{theta}',width=16,height=16,data=v.ravel().tolist()))
(ROOT/'color2gray-inputs.json').write_text(json.dumps(c2g_inputs))
subprocess.run(['node',str(ROOT/'current.mjs'),str(ROOT/'color2gray-inputs.json'),str(ROOT/'color2gray-output.json')],check=True)
for o in json.loads((ROOT/'color2gray-output.json').read_text()):
 if o['method'] in ('solid_auto','stencil_auto'):
  masks[o['id'],'original',f"{o['variant']}_{o['method']}"]=np.array(o['mask']).reshape(16,16)==2

for i,a in originals.items():
 s=a[...,3]>=128; g=luma(a).astype(float); ls,lin=lab(a)
 masks[i,'original','normalized50']=s & (g>(float(g[s].min())+float(g[s].max()))/2)
 masks[i,'original','lab_otsu']=s & (ls[...,0]*2.55>otsu(ls[...,0]*2.55,s))
 masks[i,'original','linear50']=s & (lin>.5)
 masks[i,'original','linear_otsu']=s & (lin*255>otsu(lin*255,s))
 masks[i,'original','local_mean']=local(g,s,'mean')
 masks[i,'original','sauvola']=local(g,s,'sauvola')
 bg=bilateral(g,a,s)
 masks[i,'original','bilateral_otsu']=s & (bg>otsu(bg,s))
 masks[i,'original','stencil_clean']=clean_holes(masks[i,'original','stencil_auto'],s)
 masks[i,'original','edges_clean']=clean_holes(masks[i,'original','stencil_100_edges100'],s)
 # PCA is only an experimental color projection, NOT Color2Gray implementation.
 rgb=a[...,:3].astype(float); vals=rgb[s]; mean=vals.mean(axis=0)
 _,vectors=np.linalg.eigh(np.cov(vals.T)); axis=vectors[:,-1]
 if axis@np.array([.2126,.7152,.0722])<0: axis=-axis
 p=(rgb-mean)@axis; pp=(p-p[s].min())/max(1e-9,p[s].max()-p[s].min())*255
 masks[i,'original','pca_otsu']=s & (pp>otsu(pp,s))
 # Low-percentile interior cuts, preserving the alpha silhouette and small isolated details.
 inside=erode(s,True); t=np.percentile(g[inside],20) if inside.any() else -1
 masks[i,'original','budget20']=clean_holes(s & ~(inside & (g<=t)),s)

records=[]
for (i,v,method),m in masks.items():
 if i.endswith('sheet') or method.startswith('sweep'): continue
 records.append(dict(id=i,variant=v,method=method,**metrics(m,raw[i,v][...,3]>=128)))
(ROOT/'metrics.json').write_text(json.dumps(records,indent=2))

def pixel_image(a,scale=8):
 h,w=a.shape[:2]; yy,xx=np.indices((h,w)); c=np.where(((yy//2+xx//2)%2)[...,None],np.array([39,43,51]),np.array([30,33,39]))
 if a.ndim==2: c[a]=[240,246,240]
 else:
  s=a[...,3]>=128; c[s]=a[s,:3]
 return Image.fromarray(c.astype(np.uint8)).resize((w*scale,h*scale),Image.Resampling.NEAREST)

font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
def grid(filename,ids,methods,variant='original',scale=8):
 cw=16*scale+26; ch=16*scale+42; im=Image.new('RGB',(cw*len(methods),ch*len(ids)+32),(20,22,27)); draw=ImageDraw.Draw(im)
 labels={'source':'Original','solid_50':'Solid 50%','solid_auto':'Solid Auto','stencil_auto':'Stencil Auto','stencil_60':'Stencil Cuts 60','stencil_100_edges100':'Stencil Cuts 100\nEdges 100%','stencil_trim':'Stencil Trim','normalized50':'Range midpoint','linear50':'Linear light 50%','lab_otsu':'Lab + Otsu','bilateral_otsu':'Bilateral + Otsu','local_mean':'Local mean','sauvola':'Sauvola','budget20':'Percentile cuts','c2g10_45_solid_auto':'Color2Gray alpha10\nSolid Auto','c2g25_45_solid_auto':'Color2Gray alpha25\nSolid Auto','c2g10_45_stencil_auto':'Color2Gray alpha10\nStencil Auto','c2g25_45_stencil_auto':'Color2Gray alpha25\nStencil Auto'}
 for col,method in enumerate(methods): draw.multiline_text((col*cw+8,3),labels.get(method,method),fill='white',font=small,spacing=1)
 for row,i in enumerate(ids):
  for col,method in enumerate(methods):
   a=raw[i,variant] if method=='source' else masks[i,variant,method]
   tile=pixel_image(a,scale); im.paste(tile,(col*cw+12,row*ch+34))
   draw.text((col*cw+8,row*ch+36+16*scale),i,fill='#aab7c9',font=small)
 im.save(ROOT/filename)

hero=['source','solid_50','solid_auto','stencil_auto','stencil_60','stencil_100_edges100','stencil_trim']
grid('breastplate-baselines.png',['breastplate-1-1'],hero,scale=12)
grid('breastplate-alternatives.png',['breastplate-1-1'],['source','normalized50','lab_otsu','linear50','bilateral_otsu','local_mean','sauvola','budget20'],scale=12)
grid('breastplate-sweep.png',['breastplate-1-1'],['source']+[f'sweep_solid_{t}' for t in [40,60,80,100,120,127,140,160]],scale=10)
for group in ('general','weapons','accessories','armor'):
 ids=[i for i in originals if i.startswith(group)]
 grid(f'{group}-comparison.png',ids,['source','solid_50','solid_auto','stencil_auto','stencil_100_edges100','normalized50','local_mean','budget20'],scale=6)
grid('representative-algorithms.png',['breastplate-1-1','general-1-1','general-1-3','weapons-1-1','weapons-3-1','accessories-2-1','armor-2-2','armor-3-1'],['source','lab_otsu','linear_otsu','bilateral_otsu','sauvola','pca_otsu','stencil_clean','edges_clean'],scale=8)
grid('color2gray-comparison.png',['breastplate-1-1','general-1-1','weapons-3-1','armor-2-2','armor-3-1'],['source','solid_auto','c2g10_45_solid_auto','c2g25_45_solid_auto','stencil_auto','c2g10_45_stencil_auto','c2g25_45_stencil_auto'],scale=8)

# Palette and grayscale ablation with the exact production code.
ablation=[]
for method in ('solid_auto','solid_50','stencil_auto','stencil_100_edges100'):
 for v in ('gray','palette4','palette8','palette16','sheetpalette4','sheetpalette8','sheetpalette16'):
  changes=[int(np.count_nonzero(masks[i,'original',method]!=masks[i,v,method])) for i in originals]
  ablation.append(dict(method=method,variant=v,changed_items=sum(c>0 for c in changes),changed_pixels=sum(changes),mean_changed_pixels=round(float(np.mean(changes)),2)))
(ROOT/'ablation.json').write_text(json.dumps(ablation,indent=2))

cw,ch=148,180; variants=['original','gray','palette4','palette8','palette16','sheetpalette4','sheetpalette8','sheetpalette16']
ids=['breastplate-1-1','general-1-1','weapons-3-1','accessories-2-1','armor-2-2']
im=Image.new('RGB',(cw*len(variants),ch*len(ids)+30),(20,22,27)); d=ImageDraw.Draw(im)
for col,v in enumerate(variants): d.text((col*cw+4,6),v,fill='white',font=small)
for row,i in enumerate(ids):
 for col,v in enumerate(variants):
  im.paste(pixel_image(masks[i,v,'stencil_auto']), (col*cw+8,row*ch+30)); d.text((col*cw+4,row*ch+163),i,fill='white',font=small)
im.save(ROOT/'palette-ablation.png')

# Whole sheet versus treating a 16x16 cell as the item. Source alpha remains unchanged.
sheet_diffs={}
for group in ('general','weapons','accessories','armor'):
 for method in ('solid_auto','stencil_auto','stencil_100_edges100'):
  joined=np.zeros((64,64),bool)
  for row in range(4):
   for col in range(4): joined[row*16:(row+1)*16,col*16:(col+1)*16]=masks[f'{group}-{row+1}-{col+1}','original',method]
  sheet_diffs[f'{group}/{method}']=int(np.count_nonzero(joined!=masks[f'{group}-sheet','original',method]))
(ROOT/'sheet-differences.json').write_text(json.dumps(sheet_diffs,indent=2))

summary={}
for method in hero[1:]+['normalized50','lab_otsu','linear50','linear_otsu','bilateral_otsu','local_mean','sauvola','pca_otsu','budget20','stencil_clean','edges_clean','c2g10_45_solid_auto','c2g10_45_stencil_auto','c2g25_45_solid_auto','c2g25_45_stencil_auto']:
 rows=[r for r in records if r['method']==method and r['variant']=='original']
 summary[method]=dict(mean_retained=round(float(np.mean([r['retained'] for r in rows])),3),empty_items=sum(r['ink']==0 for r in rows),items_with_extra_fragments=sum(r['fragments']>len(components(raw[r['id'],'original'][...,3]>=128)) for r in rows),single_ink=sum(r['single_ink'] for r in rows),single_cuts=sum(r['single_cuts'] for r in rows))
(ROOT/'summary.json').write_text(json.dumps(summary,indent=2))
(ROOT/'viewer-data.json').write_text(json.dumps(dict(sources={i:a.ravel().tolist() for i,a in originals.items()},masks=[dict(id=i,variant=v,method=m,ink=a.astype(int).ravel().tolist()) for (i,v,m),a in masks.items() if not i.endswith('sheet')])))
print(f'Compared {len(originals)} items, wrote {len(records)} metric records and contact sheets.')
