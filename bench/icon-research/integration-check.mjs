// Production safeguards on unseen synthetic geometry, not recognition evaluation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyze,mask} from '../../src/lib/bitify.js';
function pieces(m,diagonal){
 const seen=new Set();let n=0;
 for(let s=0;s<256;s++)if(m[s]===2&&!seen.has(s)){
  const q=[s];seen.add(s);n++;
  for(const p of q)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const x=p%16+dx,y=Math.floor(p/16)+dy,k=y*16+x;
   if((dx||dy)&&(diagonal||!dx||!dy)&&x>=0&&y>=0&&x<16&&y<16&&m[k]===2&&!seen.has(k)){seen.add(k);q.push(k);}
  }
 }return n;
}
function check(data,name){
 const src={width:16,height:16,data},img=analyze(src),solid=Uint8Array.from({length:256},(_,p)=>data[p*4+3]>=128?2:0);
 for(const detail of [0,25,50,75,100]){
  const keep=mask(img,'icon',{border:'keep',detail}),open=mask(img,'icon',{detail});
  for(const [mode,m] of [['keep',keep],['auto',open]]){
   assert.equal(pieces(m,true),pieces(solid,true),`${name}/${detail}/${mode}: source fragmentation`);
   for(let p=0;p<256;p++){
    assert.equal(!!m[p],!!solid[p]);if(m[p]!==1)continue;
    let beside=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const x=p%16+dx,y=Math.floor(p/16)+dy;if((dx||dy)&&x>=0&&y>=0&&x<16&&y<16&&m[y*16+x]===1)beside++;
    }assert(beside,`${name}/${detail}/${mode}: isolated cut`);
   }
   for(const turn of [false,true]){
    const other=data.slice(),positions=[];
    for(let p=0;p<256;p++){const q=turn?p%16*16+15-Math.floor(p/16):Math.floor(p/16)*16+15-p%16;positions[p]=q;other.set(data.subarray(p*4,p*4+4),q*4);}
    const transformed=mask(analyze({...src,data:other}),'icon',{detail,border:mode==='keep'?'keep':'auto'});
    assert.deepEqual(positions.map(p=>transformed[p]),[...m],`${name}/${detail}/${mode}: transform bias`);
   }
  }
  // Only opening paths differ. At default, opening adds no corner-only ink bridges.
  if(detail===50)assert(pieces(open,false)<=pieces(keep,false),`${name}: opening hangs by a corner`);
  for(let p=0;p<256;p++)if(keep[p]===1)assert.equal(open[p],1,`${name}: opening altered inner cuts`);
 }
}
const cases=JSON.parse(readFileSync(new URL('../../src/lib/fixtures/icon-opening-stress.json',import.meta.url)));
for(const c of cases)check(Uint8ClampedArray.from(Buffer.from(c.rgba,'base64')),`regression ${c.sample}`);
let seed=0x8bc117ad;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let sample=0;sample<600;sample++){
 const data=new Uint8ClampedArray(1024),solid=new Uint8Array(256);
 for(let y=2;y<14;y++)for(let x=2;x<14;x++)solid[y*16+x]=1;
 for(let n=0;n<5;n++){
  const edge=Math.floor(random()*4),a=3+Math.floor(random()*10),depth=1+Math.floor(random()*4),width=1+Math.floor(random()*3);
  for(let d=0;d<depth;d++)for(let v=0;v<width;v++){const x=edge===0?2+d:edge===1?13-d:a+v,y=edge===2?2+d:edge===3?13-d:a+v;if(x<14&&y<14)solid[y*16+x]=0;}
 }
 for(let p=0;p<256;p++)if(solid[p]){const v=!solid[p-1]||!solid[p+1]||!solid[p-16]||!solid[p+16]?8:180;data.set([v,v,v,255],p*4);}
 for(let n=0;n<8;n++){
  const x=3+Math.floor(random()*10),y=3+Math.floor(random()*10),width=1+Math.floor(random()*3),height=1+Math.floor(random()*3),v=random()<.5?8:60+Math.floor(random()*60);
  for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){const p=(y+dy)*16+x+dx;if(x+dx<14&&y+dy<14&&solid[p])data.set([v,v,v,255],p*4);}
 }check(data,`generated ${sample}`);
}
console.log('Production checks pass: 3 rollback regressions + 600 generated shapes, 5 Detail levels, Keep/Auto, reflection and quarter turn.');
