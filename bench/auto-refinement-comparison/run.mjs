// Offline comparison. Explicit fetch-missing.mjs --live is the only paid path.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, decode, png } from '../palette-service-research/api-common.mjs';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { quantize, colorize } from '../../src/lib/quantize.js';
import { refineAutoSubset } from '../auto-refinement-spike/candidate.mjs';
import { renderGallery } from './render-gallery.mjs';
const dir=import.meta.dirname,paired=path.resolve(dir,'../palette-paired-comparison');
const read=f=>fs.readFileSync(path.resolve(dir,f));
const save=(f,v)=>fs.writeFileSync(path.resolve(dir,f),v);
const json=(f,v)=>save(f,JSON.stringify(v,null,2)+'\n');
const normalize=p=>p.replaceAll('\\','/');
const archived=JSON.parse(fs.readFileSync(path.join(paired,'manifest.json'))).filter(r=>/^(sprite-generated[248]|count2|count8|low-count8|shared|alpha8|alpha-count2)$/.test(r.id)).map(r=>({...r,inputs:r.inputs.map(p=>path.relative(dir,path.resolve(paired,normalize(p)))),outputs:r.outputs.map(p=>path.relative(dir,path.resolve(paired,normalize(p)))),transport:'REST retained',k:r.request.num_colors}));
const fresh=JSON.parse(read('native-gap-results.json')).map(r=>({...r,inputs:[r.input],k:r.request.num_colors,transport:'REST gap-fill'}));
const cases=[...archived,...fresh,{id:'website-count2',inputs:['../palette-service-research/api-input-gradient.png'],outputs:['../palette-service-research/web-output-verification-download-0.png'],k:2,transport:'Website primary PNG download',request:{num_colors:2,dithering:'none'}}];
const deps=['../../src/lib/palette-generated.js','../../src/lib/palette-generated-sources.js','../../src/lib/palette-limit.js','../../src/lib/quantize.js','../../src/lib/palette-library.js','../../src/lib/palette-alpha.js','../../src/lib/palette-dither.js','../../src/lib/palette-dither-settings.js','../../src/lib/palette-lospec-url.js','../../src/lib/storage-migration.js','../auto-refinement-spike/candidate.mjs','../palette-service-research/api-common.mjs','run.mjs','render-gallery.mjs'];
const report={recordedAt:new Date().toISOString(),offline:true,newServiceJobs:5,reportedNewUsage:{type:'generations',generations:fresh.reduce((s,r)=>s+r.usage.generations,0)},dependencySha256:Object.fromEntries(deps.map(f=>[f,sha(read(f))])),method:{matching:'Oklab',dithering:'Off',cleanup:'Off',autoScope:'Each service job is one independent asset. Shared two-image request is treated as one two-frame asset with equal delays, not as two equally weighted wall assets.',candidate:'Research-only centroid and shared-target subset swaps initialized from the unchanged current Auto64 per-asset cap; all mean/strict/rare variants retained.',timing:'Three sequential cold core trials; medians exclude worker transfer, import decode and UI. Candidate total includes all three guards; service ms is one network roundtrip and server processing, not compute-only or an equivalent benchmark.',alpha:'Binary/opaque art uses Cut128. Partial-alpha controls use Keep eligibility1, preserving alpha. Hidden RGB is excluded from output equality and all quality metrics.',objective:'Independent full-source point squared Oklab distance, frame-delay weighted; also original source-RGB group error/previous exact loss. Mean error is not a perceptual or semantic quality ranking.'},cases:[]};
const lin=v=>v<=.04045*255?v/255/12.92:((v/255+.055)/1.055)**2.4;
function lab(r,g,b){r=lin(r);g=lin(g);b=lin(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const dist=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0),hex=(d,p)=>'#'+Buffer.from(d.subarray(p,p+3)).toString('hex');
const frames=item=>item.frames??[{original:item.original,delay:1}];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function timed(fn){let result;const samples=[];for(let i=0;i<3;i++){const start=performance.now();result=await fn();samples.push(performance.now()-start);}return{result,samples,medianMs:median(samples)};}
function render(item,colors,alphaMode){return frames(item).map(f=>{const out=colorize(quantize(f.original,colors,128,undefined,undefined,{alphaMode}),colors);return{width:out.w,height:out.h,data:out.data};});}
function measure(item,outputs,baseline,alphaMode){assert.equal(outputs.length,frames(item).length,'Output frame count must match source');let cost=0,mass=0,alphaMismatch=0,changedPixels=0,exactLost=0;const colors=new Set(),groups=new Map(),cut=alphaMode==='keep'?1:128;
 for(let f=0;f<outputs.length;f++){const src=frames(item)[f].original,out=outputs[f],base=baseline?.[f],weight=frames(item)[f].delay;assert.equal(out.width,src.width);assert.equal(out.height,src.height);
  for(let p=0;p<src.data.length;p+=4){const eligible=src.data[p+3]>=cut;alphaMismatch+=out.data[p+3]!== (alphaMode==='keep'?src.data[p+3]:eligible?255:0);if(out.data[p+3])colors.add(hex(out.data,p));if(!eligible)continue;
   const source=hex(src.data,p),output=hex(out.data,p),error=dist(lab(...src.data.subarray(p,p+3)),lab(...out.data.subarray(p,p+3)));cost+=weight*error;mass+=weight;
   const entry=groups.get(source)??{source,pixels:0,mass:0,error:0,baselineError:0,outputs:{},firstCoordinate:{frame:f,x:p/4%src.width,y:Math.floor(p/4/src.width)}};entry.pixels++;entry.mass+=weight;entry.error+=error*weight;entry.outputs[output]=(entry.outputs[output]??0)+1;
   if(base){const before=hex(base.data,p);entry.baselineError+=dist(lab(...src.data.subarray(p,p+3)),lab(...base.data.subarray(p,p+3)))*weight;changedPixels+=before!==output;exactLost+=before===source&&output!==source;}
   groups.set(source,entry);
  }
 }
 const changes=[...groups.values()].map(g=>({...g,error:g.error/g.mass,baselineError:g.baselineError/g.mass,delta:(g.error-g.baselineError)/g.mass,rare:g.mass/mass<=.01}));
 return{pointOklabMSE:mass?cost/mass:0,visibleMass:mass,usedCount:colors.size,usedColors:[...colors],alphaMismatches:alphaMismatch,changedPixelsFromCurrent:changedPixels,previousExactSourcePixelsLost:exactLost,worsenedSourceRgbGroups:baseline?changes.filter(g=>g.delta>1e-14).length:null,rareWorsenedSourceRgbGroups:baseline?changes.filter(g=>g.rare&&g.delta>1e-14).length:null,largestSourceRgbRegressions:baseline?changes.filter(g=>g.delta>1e-14).sort((a,b)=>b.delta-a.delta).slice(0,8):[]};
}
const encode=im=>png(im.width,im.height,(x,y)=>im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4));
for(const spec of cases){
 const sourceImages=spec.inputs.map(f=>decode(read(f))),service=spec.outputs.map(f=>decode(read(f)));assert.equal(sourceImages.length,service.length);
 const expectedHashes=Array.isArray(spec.inputPngSha256)?spec.inputPngSha256:spec.inputPngSha256?[spec.inputPngSha256]:spec.request.images?.map(im=>im.input_png_sha256??im.base64?.sha256);
 if(expectedHashes)for(let i=0;i<spec.inputs.length;i++)assert.equal(sha(read(spec.inputs[i])),expectedHashes[i]);
 const partial=sourceImages.some(im=>im.data.some((v,i)=>i%4===3&&v>0&&v<255)),alphaMode=partial?'keep':'cut',cut=partial?1:128;
 const item=sourceImages.length>1?{original:sourceImages[0],frames:sourceImages.map(original=>({original,delay:100}))}:{original:sourceImages[0]};
 const sourceHashes=spec.inputs.map((file,i)=>({file:normalize(file),pngSha256:sha(read(file)),rgbaSha256:sha(sourceImages[i].data),width:sourceImages[i].width,height:sourceImages[i].height}));
 const auto=await timed(()=>generatePaletteAsync(captureGeneratedSources([item],cut)));
 const subset=await timed(async()=>auto.result.colors.length<=spec.k?[...auto.result.colors]:(await selectPaletteSubset(auto.result.colors,spec.k,async function*(){for(const f of frames(item))yield{data:f.original.data,weight:f.delay};},{alphaCut:cut,metric:'oklab'})).indices.map(i=>auto.result.colors[i]));
 const current=render(item,subset.result,alphaMode),methods=[{name:'current',colors:subset.result,outputs:current,coreMedianMs:auto.medianMs+subset.medianMs,timing:{autoSamplesMs:auto.samples,subsetSamplesMs:subset.samples}}];
 const research={};
 for(const method of ['centroid','subset-swaps']){const result=await timed(()=>refineAutoSubset(subset.result,item,{alphaMode,alphaCut:128,metric:'oklab',guard:'strict',method,sharedColors:auto.result.colors}));research[method]=result.result;
  for(const guard of ['mean','strict','rare']){const v=result.result.variants[guard];methods.push({name:method+'-'+guard,colors:v.colors,outputs:render(item,v.colors,alphaMode),coreMedianMs:auto.medianMs+subset.medianMs+result.medianMs,timing:{refinementSamplesMs:result.samples},guardStats:v.stats,changed:v.changed});}}
 methods.push({name:'pixellab',outputs:service,serviceRoundtripMs:spec.ms??null});
 const row={id:spec.id,k:spec.k,transport:spec.transport,request:spec.request,usage:spec.usage??null,sourceHashes,alphaMode,sharedAutoPalette:auto.result.colors,methods:[],research};
 for(const method of methods){const metrics=measure(item,method.outputs,method.name==='current'?undefined:current,alphaMode);assert.equal(metrics.alphaMismatches,0,spec.id+'/'+method.name+' alpha');assert(metrics.usedCount<=spec.k,spec.id+'/'+method.name+' count');
  if(method.name.includes('subset-swaps'))assert(method.colors.every(c=>auto.result.colors.includes(c)),'Swap output must retain shared target membership');
  if(method.name.endsWith('-strict')){assert.equal(metrics.previousExactSourcePixelsLost,0);assert.equal(metrics.worsenedSourceRgbGroups,0);}
  if(method.name.endsWith('-rare')){assert.equal(metrics.previousExactSourcePixelsLost,0);assert.equal(metrics.rareWorsenedSourceRgbGroups,0);}
  const files=method.outputs.map((out,f)=>{const file=spec.id+'-'+method.name+'-'+f+'.png';save(file,encode(out));return file;});
  row.methods.push({...method,outputs:undefined,files,...metrics,paletteOutsideShared:method.colors?.filter(c=>!auto.result.colors.includes(c)).length??null,nativeOutputHashes:method.name==='pixellab'?spec.outputs.map((f,i)=>({file:normalize(f),pngSha256:sha(read(f)),rgbaSha256:sha(service[i].data)})):undefined});
 }
 report.cases.push(row);console.log(spec.id,'complete');
}
const rest=report.cases.find(r=>r.id==='count2'),web=report.cases.find(r=>r.id==='website-count2');
report.websiteRestCount2={sameDecodedSource:rest.sourceHashes[0].rgbaSha256===web.sourceHashes[0].rgbaSha256,sameDecodedOutput:rest.methods.at(-1).nativeOutputHashes[0].rgbaSha256===web.methods.at(-1).nativeOutputHashes[0].rgbaSha256,scope:'One retained numeric2 None gradient job through each transport; not a general algorithm equivalence claim.'};
json('results.json',report);
await renderGallery(report);
console.log(JSON.stringify({cases:report.cases.length,websiteRest:report.websiteRestCount2}));
