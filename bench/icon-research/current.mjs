// Run the actual app implementation, not a reimplementation of its algorithms.
import { readFileSync, writeFileSync } from 'node:fs';
import { analyze, mask, spritesOf } from '../../src/lib/bitify.js';
const root=import.meta.dirname;
const inputs=JSON.parse(readFileSync(process.argv[2] ?? `${root}/inputs.json`));
const outputs=[];
for (const src of inputs) {
 const img=analyze({...src,data:Uint8ClampedArray.from(src.data)});
 const methods={
  solid_auto:['solid',{}], solid_50:['solid',{threshold:127}],
  stencil_auto:['stencil',{}], stencil_60:['stencil',{cuts:60}], stencil_100:['stencil',{cuts:100}],
  stencil_100_edges100:['stencil',{cuts:100,edges:100}],
  stencil_trim:['stencil',{outline:'trim'}], cutout_auto:['cutout',{}],
  lines_fill:['lines',{}], atkinson_auto:['atkinson',{}],
 };
 if(src.variant==='original') {
  for(const source of ['value','red','green','blue']) {
   const alt=analyze({...src,data:Uint8ClampedArray.from(src.data)},source);
   outputs.push({id:src.id,variant:src.variant,method:`stencil_${source}`,mask:Array.from(mask(alt,'stencil')),auto:alt.auto});
   outputs.push({id:src.id,variant:src.variant,method:`solid_${source}`,mask:Array.from(mask(alt,'solid')),auto:alt.auto});
  }
 }
 for (const [method,[style,settings]] of Object.entries(methods)) outputs.push({id:src.id,variant:src.variant,method,mask:Array.from(mask(img,style,settings)),auto:img.auto});
 if(src.id==='breastplate-1-1' && src.variant==='original') {
  const sp=spritesOf(img);
  writeFileSync(`${root}/breastplate-analysis.json`,JSON.stringify({lum:[...img.lum],level:[...sp.level],auto:[...sp.auto],body:[...sp.body],cuts:sp.cuts,solidThreshold:img.auto},null,2));
  for(let threshold=1;threshold<=254;threshold++) outputs.push({id:src.id,variant:'original',method:`sweep_solid_${threshold}`,mask:[...mask(img,'solid',{threshold})]});
  for(let cuts=0;cuts<=254;cuts++) outputs.push({id:src.id,variant:'original',method:`sweep_stencil_${cuts}`,mask:[...mask(img,'stencil',{cuts})]});
 }
}
writeFileSync(process.argv[3] ?? `${root}/current-output.json`,JSON.stringify(outputs));
console.log(`Converted ${inputs.length} source variants; ${outputs.length} masks using actual src/lib/bitify.js.`);
