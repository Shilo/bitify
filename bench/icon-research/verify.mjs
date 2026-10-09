import { readFileSync, writeFileSync } from 'node:fs';
import { analyze, mask, colorize } from '../../src/lib/bitify.js';
const root=import.meta.dirname;
const all=JSON.parse(readFileSync(`${root}/inputs.json`));
const items=v=>all.filter(x=>x.variant===v && x.width===16).map(x=>({...x,data:Uint8ClampedArray.from(x.data)}));
const results={};
for(const variant of ['original','gray']) {
 const input=items(variant);
 const work=()=>{for(const src of input) mask(analyze(src),'stencil');};
 for(let n=0;n<20;n++)work();
 const times=[];
 for(let run=0;run<7;run++) {const t=performance.now(); for(let n=0;n<100;n++)work(); times.push((performance.now()-t)/100);}
 times.sort((a,b)=>a-b);
 results[variant]={median_ms_per_65_items:times[3],min:times[0],max:times[6]};
}
let inspected=0;
for(const src of items('original')) {
 const m=mask(analyze(src),'stencil');
 const pixels=colorize(m,null,'#f0f6f0');
 for(let p=0;p<m.length;p++) {
  const alpha=pixels[p*4+3];
  if(alpha!==(m[p]===2?255:0))throw Error('None alpha mismatch');
  if(alpha && (pixels[p*4]!==240 || pixels[p*4+1]!==246 || pixels[p*4+2]!==240)) throw Error('Unexpected ink');
  if(src.data[p*4+3]===0 && alpha)throw Error('Painting outside input');
  inspected++;
 }
}
results.none={items:65,pixels:inspected,passed:true};
writeFileSync(`${root}/verification.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
