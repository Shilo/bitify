// Independent contract challenge. Research only; no production/source mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { refineAutoSubset } from './candidate.mjs';
import { quantize, colorize } from '../../src/lib/quantize.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=['#000000','#ffffff'],shared=[...baseline,'#808080'];
const image=(width,height,pixel)=>({width,height,data:Uint8ClampedArray.from(Array.from({length:width*height},(_,i)=>pixel(i%width,Math.floor(i/width))).flat())});
const item={name:'rare-exact-highlight',original:image(32,32,(x,y)=>x===0&&y===0?[255,255,255,255]:[128,128,128,255])};
const initial=sha(item.original.data);
const report={scope:'Independent synthetic guard contracts, not a claim that this hand-selected seed is current Auto output.',candidateSha256:sha(fs.readFileSync(new URL('./candidate.mjs',import.meta.url))),checks:[]};
function vector(bytes,metric){
  if(metric==='rgb')return bytes;
  const linear=bytes.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}),[r,g,b]=linear;
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
function measured(colors,metric){const out=colorize(quantize(item.original,colors,128,undefined,undefined,{metric}),colors);let cost=0,exactLoss=0;for(let p=0;p<out.data.length;p+=4){const a=vector([...item.original.data.subarray(p,p+3)],metric),b=vector([...out.data.subarray(p,p+3)],metric);cost+=a.reduce((n,v,i)=>n+(v-b[i])**2,0);if(p===0&&!out.data.subarray(p,p+3).every(v=>v===255))exactLoss++;}return{pointError:cost/(out.data.length/4),highlightRGB:[...out.data.subarray(0,3)],exactHighlightLost:exactLoss};}

for(const metric of ['oklab','rgb']){
  const options={metric,sharedColors:shared},mean=await refineAutoSubset(baseline,item,{...options,guard:'mean'}),strict=await refineAutoSubset(baseline,item,{...options,guard:'strict'}),rare=await refineAutoSubset(baseline,item,{...options,guard:'rare'}),swaps=await refineAutoSubset(baseline,item,{...options,guard:'strict',method:'subset-swaps'});
  const original=measured(baseline,metric),adopted=measured(mean.colors,metric);
  assert(mean.changed);assert(adopted.pointError<original.pointError);assert.equal(adopted.exactHighlightLost,1);assert(mean.variants.mean.stats.exactSourceChangedPixels>0);
  assert.deepEqual(strict.colors,baseline);assert.deepEqual(rare.colors,baseline);assert.equal(strict.changed,false);assert.equal(rare.changed,false);
  assert.equal(swaps.changed,true);assert(swaps.colors.every(c=>shared.includes(c)));assert(swaps.colors.includes('#ffffff'));assert(swaps.colors.includes('#808080'));assert.equal(measured(swaps.colors,metric).pointError,0);assert.equal(swaps.variants.strict.stats.worsenedRgb,0);
  const hidden={original:image(32,33,(x,y)=>y===32?[x*7%256,x*11%256,x*19%256,0]:x===0&&y===0?[255,255,255,255]:[128,128,128,255])};
  assert.deepEqual((await refineAutoSubset(baseline,hidden,{...options,guard:'mean'})).colors,mean.colors,'Hidden source RGB changed fitting');
  const partial={original:{...item.original,data:item.original.data.slice()}};partial.original.data[3]=1;
  const cut=await refineAutoSubset(baseline,partial,{...options,guard:'strict',alphaCut:128,alphaMode:'cut'}),keep=await refineAutoSubset(baseline,partial,{...options,guard:'strict',alphaCut:128,alphaMode:'keep'});
  assert.equal(cut.changed,true);assert.equal(cut.source.visiblePixels,1023);assert.equal(keep.changed,false);assert.equal(keep.source.visiblePixels,1024);assert.equal(keep.source.effectiveAlphaCut,1);
  const overflow=await refineAutoSubset(baseline,item,{...options,maxUnique:1});assert.equal(overflow.changed,false);assert.equal(overflow.source.exactBoundExceeded,true);assert.equal(overflow.baseline.stats.objectiveComplete,false);assert.equal(overflow.baseline.stats.pointError,null);
  const a=image(16,16,()=>[128,128,128,255]),b=image(16,16,()=>[192,192,192,255]),weighted={original:a,frames:[{original:a,delay:40},{original:b,delay:160}]},split={original:a,frames:[{original:a,delay:40},{original:b,delay:80},{original:b,delay:80}]};
  const w=await refineAutoSubset(baseline,weighted,{...options,guard:'strict'}),s=await refineAutoSubset(baseline,split,{...options,guard:'strict'});assert.deepEqual(w.colors,s.colors,'Splitting equal-duration source frames changed fit');assert.equal(w.source.durationWeightedMass,s.source.durationWeightedMass);
  const zero=await refineAutoSubset(baseline,item,{...options,maxPasses:0});assert.deepEqual(zero.colors,baseline);assert.equal(zero.changed,false);
  report.checks.push({metric,baseline:original,mean:adopted,strictRetainedBaseline:true,rareRetainedBaseline:true,targetPreservingPositive:swaps.colors,hiddenRgbInvariant:true,keepProtectsAlphaOneHighlight:true,boundedOverflowRetainsBaseline:true,frameDurationSplitInvariant:true,zeroPassRetainsBaseline:true});
}
assert.equal(sha(item.original.data),initial,'Source mutation');
const controller=new AbortController();controller.abort();await assert.rejects(()=>refineAutoSubset(baseline,item,{signal:controller.signal}),{name:'AbortError'});
const busyPixels=new Uint8ClampedArray(1024*1024*4);for(let p=0;p<busyPixels.length;p+=4){const i=p/4;busyPixels[p]=i&255;busyPixels[p+1]=i>>>8&255;busyPixels[p+2]=(i*7+(i>>>8)*11)&255;busyPixels[p+3]=255;}
const busy={original:{width:1024,height:1024,data:busyPixels}},busyBefore=sha(busy.original.data),during=new AbortController(),timer=setTimeout(()=>during.abort(),0),started=performance.now();
try{await assert.rejects(()=>refineAutoSubset(baseline,busy,{method:'subset-swaps',sharedColors:shared,signal:during.signal}),{name:'AbortError'});}finally{clearTimeout(timer);}
assert.equal(sha(busy.original.data),busyBefore);report.preCanceledCheck=true;report.inFlightCanceledCheck=true;report.inFlightAbortElapsedMs=performance.now()-started;report.sourceUnchanged=true;report.completedAt=new Date().toISOString();
fs.writeFileSync(new URL('./independent-guard-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
