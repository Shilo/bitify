// Additional review diagnostic: changed labels are not perceptual magnitude.
// Distances are descriptive Oklab distances, not artist-preference thresholds.
import fs from 'node:fs/promises';
import {analyze,mapping,feature} from './engine.js';
const out=new URL('./output/',import.meta.url),d=JSON.parse(await fs.readFile(new URL('results.json',out)));
const sources=await Promise.all(d.sources.filter(s=>['real-sprite','annotated-real'].includes(s.group)).map(async s=>({...s,data:new Uint8ClampedArray(await fs.readFile(new URL(s.id+'.rgba',out)))})));
const distance=(a,b)=>Math.hypot(a.L-b.L,a.a-b.a,a.b-b.b),rows=[];
for(const s of sources){const a=analyze(s),N=[...a.hist.values()].reduce((s,v)=>s+v,0);for(const p of d.palettes){const palette=p.colors.map(c=>feature(parseInt(c.slice(1),16))),maps=Object.fromEntries(['oklab','rgb','cam16ucs'].map(m=>[m,mapping(a,p.colors,m)]));
 for(const comparison of ['oklab','rgb','either-current-pixel']){let changed=0,total=0,over02=0,over05=0,over10=0;const distribution=[];
  for(const [key,count]of a.hist){const c=palette[maps.cam16ucs.get(key)],o=palette[maps.oklab.get(key)],r=palette[maps.rgb.get(key)],delta=comparison==='oklab'?distance(c,o):comparison==='rgb'?distance(c,r):Math.min(distance(c,o),distance(c,r));
   total+=delta*count;if(delta>0)changed+=count;if(delta>=.02)over02+=count;if(delta>=.05)over05+=count;if(delta>=.1)over10+=count;distribution.push({distance:delta,weight:count/N});
  }
  rows.push({source:s.id,palette:p.id,comparison,visible:N,changed:changed/N,meanDistance:total/N,meanChangedDistance:changed?total/changed:0,over02:over02/N,over05:over05/N,over10:over10/N,distribution});
 }
}}
const summarize=rows=>['oklab','rgb','either-current-pixel'].map(comparison=>{const r=rows.filter(x=>x.comparison===comparison),avg=k=>r.reduce((s,x)=>s+x[k],0)/r.length;const samples=r.flatMap(x=>x.distribution.map(p=>({...p,weight:p.weight/r.length}))).sort((a,b)=>a.distance-b.distance),quantile=q=>{let mass=0;for(const x of samples){mass+=x.weight;if(mass>=q)return x.distance;}return samples.at(-1).distance;};return{comparison,cases:r.length,...Object.fromEntries(['changed','meanDistance','meanChangedDistance','over02','over05','over10'].map(k=>[k,avg(k)])),caseEqualPixelMedian:quantile(.5),caseEqualPixelP90:quantile(.9),caseEqualPixelP95:quantile(.95)};});
const result={description:'Compare CAM16 output to each current output, and per pixel to whichever current output is closer. The last comparison is a diagnostic mixture, not an existing global mode. Thresholds .02/.05/.1 Oklab are descriptive cutoffs, not demonstrated visibility or preference boundaries.',allPresets:summarize(rows),multicolor:summarize(rows.filter(r=>d.palettes.slice(0,6).some(p=>p.id===r.palette))),rows:rows.map(({distribution,...r})=>r)};
await fs.writeFile(new URL('novelty-probe.json',out),JSON.stringify(result,null,2));console.table(result.allPresets);console.table(result.multicolor);
