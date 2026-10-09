from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent
rows=json.loads((ROOT/'implemented.json').read_text())
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
for group in ['breastplate','general','weapons','accessories','armor']:
 cases=[r for r in rows if r['id'].startswith(group) and not r['id'].endswith('sheet')]
 scale=12 if group=='breastplate' else 7;cw=16*scale+32;ch=16*scale+34
 canvas=Image.new('RGB',(cw*5,ch*len(cases)+30),(20,22,27));d=ImageDraw.Draw(canvas)
 for col,title in enumerate(['Original','Previous Stencil','Icon, default','Icon, Detail Off','Icon, Detail 100']):d.text((col*cw+10,5),title,fill='white',font=font)
 for row,r in enumerate(cases):
  for col,key in enumerate(['data','old','fresh','low','high']):
   yy,xx=np.indices((16,16));c=np.where(((yy//2+xx//2)%2)[...,None],[39,43,51],[30,33,39]).astype(np.uint8)
   if key=='data':
    a=np.array(r[key]).reshape(16,16,4);c[a[...,3]>=128]=a[a[...,3]>=128,:3]
   else:c[np.array(r[key]).reshape(16,16)==2]=[240,246,240]
   canvas.paste(Image.fromarray(c).resize((16*scale,16*scale),Image.Resampling.NEAREST),(col*cw+12,row*ch+30))
   d.text((col*cw+8,row*ch+32+16*scale),r['id'],fill='#aab7c9',font=font)
 canvas.save(ROOT/f'{group}-implemented.png')
print('Rendered all 65 implemented outputs.')
