import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {Color,deltaE2000,inSpace,feature,analyze,mapping,paint} from './engine.js';
import {prepareCiede,ciedeSquared} from './ciede-kernel.js';
const out=new URL('./output/',import.meta.url);let references=0,maxError=0;
const raw=await fs.readFile(new URL('./references/ciede2000testdata.txt',import.meta.url),'utf8');
for(const line of raw.trim().split(/\r?\n/)){const a=line.trim().split(/\s+/).map(Number),v=Math.sqrt(ciedeSquared(prepareCiede(a.slice(0,3)),prepareCiede(a.slice(3,6))));assert(Math.abs(v-a[6])<.00005);references++;}
for(let i=0;i<4096;i++){const x=inSpace((i*4099+33)&0xffffff,'lab'),y=inSpace((i*65521+723)&0xffffff,'lab'),v=Math.sqrt(ciedeSquared(prepareCiede(x.coords),prepareCiede(y.coords))),ref=deltaE2000(x,y);maxError=Math.max(maxError,Math.abs(v-ref));}assert(maxError<1e-9);
const d=JSON.parse(await fs.readFile(new URL('results.json',out))),p=d.palettes;
// Search an explicit context counterexample for the image-dependent heuristic.
let context=null;
outer:for(const palette of p.slice(0,6))for(let i=1;i<128;i++){
 const key=(i*131071+17)&0xffffff,outputs=[];
 for(const bg of palette.colors.slice(0,16)){
  const b=parseInt(bg.slice(1),16),data=new Uint8ClampedArray(3*3*4);for(let z=0;z<9;z++)data.set([b>>>16,b>>>8&255,b&255,255],z*4);data.set([key>>>16,key>>>8&255,key&255,255],16);
  const a=analyze({width:3,height:3,data}),m=mapping(a,palette.colors,'edge-aware'),n=m.get(key);outputs.push({bg,source:key,target:palette.colors[n]});
 }
 if(new Set(outputs.map(x=>x.target)).size>1){context={palette:palette.id,source:'#'+key.toString(16).padStart(6,'0'),examples:outputs};break outer;}
}
const result={references,independentPairs:4096,maxError,context};await fs.writeFile(new URL('kernel-validation.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
