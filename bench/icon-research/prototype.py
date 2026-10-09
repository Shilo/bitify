from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent

def comps(s):
 seen=np.zeros_like(s); out=[]; h,w=s.shape
 for y,x in zip(*np.where(s)):
  if seen[y,x]:continue
  q=[(y,x)];seen[y,x]=1
  for yy,xx in q:
   for dy in (-1,0,1):
    for dx in (-1,0,1):
     Y,X=yy+dy,xx+dx
     if 0<=Y<h and 0<=X<w and s[Y,X] and not seen[Y,X]:seen[Y,X]=1;q.append((Y,X))
  out.append(q)
 return out

def erode(s):
 p=np.pad(s,1);h,w=s.shape
 return s & p[:-2,1:w+1] & p[2:,1:w+1] & p[1:h+1,:-2] & p[1:h+1,2:]

def convert(a,mode=0):
 rgb=a[...,:3].astype(float); s=a[...,3]>=128; v=rgb.max(2); lum=rgb@np.array([.2126,.7152,.0722]); rim=s&~erode(s)
 inn=s&~rim;body=np.median(v[inn]) if inn.any() else np.median(v[s]);tau=min(32,body*.25)
 dark_rim=int((rim & (v<=tau)).sum()); outline=dark_rim>=rim.sum()*.55 and body>tau+20
 base=s & (v>tau) if outline else s.copy()
 # Keep at least one pixel of each originally disconnected part.
 for c in comps(s):
  if not any(base[y,x] for y,x in c):
   for y,x in c:base[y,x]=True
 if mode==0:return base,np.zeros_like(v),tau
 norm=rgb/np.maximum(v[...,None],1)
 h,w=s.shape; scores=np.zeros((h,w))
 for y,x in zip(*np.where(base)):
  if sum(0<=y+dy<h and 0<=x+dx<w and base[y+dy,x+dx] for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)))<3:continue
  for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
   Y,X=y+dy,x+dx
   if 0<=Y<h and 0<=X<w and base[Y,X] and lum[y,x]<=lum[Y,X]:
    chroma=np.max(np.abs(norm[y,x]-norm[Y,X]));delta=lum[Y,X]-lum[y,x]
    if chroma>.28 and delta>5:scores[y,x]=max(scores[y,x],min(100,chroma*130))
  valleys=[]
  for dy,dx in ((1,0),(0,1)):
   Y,X=y+dy,x+dx;Z,W=y-dy,x-dx
   if 0<=Y<h and 0<=X<w and 0<=Z<h and 0<=W<w and base[Y,X] and base[Z,W]:
    valley=min(lum[Y,X],lum[Z,W])-lum[y,x]
    valleys.append(max(0,valley))
   else:valleys.append(0)
  high=max(valleys);low=min(valleys)
  if high>18:
   factor=.35 if low>high*.75 else 1
   scores[y,x]=max(scores[y,x],min(100,high*1.4)*factor)
 candidate=base&(scores>=([0,65,45,30][mode]))
 for c in comps(candidate):
  if len(c)<2:
   for y,x in c:candidate[y,x]=False
 # Prioritize stronger marks; use a bounded budget, instead of a wholesale undo.
 budget=int(base.sum()*.15)
 coords=sorted(zip(*np.where(candidate)),key=lambda p:(-scores[p],p[0],p[1]))
 result=base.copy();n=0
 for y,x in coords:
  if n>=budget:break
  result[y,x]=False
  if len(comps(result))>len(comps(base)):result[y,x]=True
  else:n+=1
 return result,scores,tau

groups=['breastplate','general','weapons','accessories','armor'];font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
for group in groups:
 im=np.array(Image.open(ROOT/f'{group}-source.png').convert('RGBA'));h,w=im.shape[:2];cells=[]
 for y in range(0,h,16):
  for x in range(0,w,16):cells.append(im[y:y+16,x:x+16])
 canvas=Image.new('RGB',(5*154,len(cells)*152+32),(20,22,27));d=ImageDraw.Draw(canvas)
 for col,title in enumerate(['Original','Outline inference','Structural 65','Structural 45','Structural 30']):d.text((col*154+8,6),title,fill='white',font=font)
 for row,a in enumerate(cells):
  for col in range(5):
   yy,xx=np.indices((16,16));c=np.where(((yy//2+xx//2)%2)[...,None],[39,43,51],[30,33,39]).astype(np.uint8)
   if col==0:c[a[...,3]>=128]=a[a[...,3]>=128,:3]
   else:
    mask,_,tau=convert(a,col-1);c[mask]=[240,246,240]
   canvas.paste(Image.fromarray(c).resize((128,128),Image.Resampling.NEAREST),(col*154+8,row*152+30))
   d.text((col*154+8,row*152+161),f'{group} {row+1}',fill='white',font=font)
 canvas.save(ROOT/f'{group}-prototype.png')
print('Wrote structural prototypes for 65 items.')
