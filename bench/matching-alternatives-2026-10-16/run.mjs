// RESEARCH ONLY. npm dependencies live under .tmp/matching-alternatives.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {MODES,LABELS,Color,deltaE2000,feature,inSpace,cam,point,score,makeMatcher,analyze,mapping,paint,measure} from './engine.js';
import {quantize} from '../../src/lib/quantize.js';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
const require=createRequire(import.meta.url),sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.join(here,'output');await fs.mkdir(out,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex'),old=JSON.parse(await fs.readFile('bench/matching-spike-2026-10-16/output/results.json')),sources=[];
for(const s of old.sources)sources.push({...s,data:new Uint8ClampedArray(await fs.readFile(`bench/matching-spike-2026-10-16/output/${s.id}.rgba`))});
const annotated=JSON.parse(await fs.readFile('bench/important-colors-review/manifest.json'));
for(const s of annotated.files){const file='bench/important-colors-review/'+s.file,bytes=await fs.readFile(file),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(sha(bytes),s.sha256);sources.push({id:s.id,group:s.kind==='real'?'annotated-real':s.kind==='real-montage'?'annotated-montage':'annotated-synthetic',file,width:info.width,height:info.height,data:new Uint8ClampedArray(data),sha256:sha(bytes),regions:s.regions,provenance:s.source,intent:s.intent});}
const rows=[],sourceViews=[],validation={ciede2000:[],baselineParity:0,exactBroken:0,oklchDifference:0};
const ciedeData=await fs.readFile(path.join(here,'references/ciede2000testdata.txt'),'utf8');
for(const line of ciedeData.trim().split(/\r?\n/)){const values=line.trim().split(/\s+/).map(Number),actual=deltaE2000(new Color('lab',values.slice(0,3)),new Color('lab',values.slice(3,6))),error=Math.abs(actual-values[6]);assert(error<.00005,`CIEDE2000 reference ${error}`);validation.ciede2000.push({expected:values[6],actual,error});}
function regional(a,colors,map,regions){
  if(!regions?.length)return{};
  const targets=regions.map(r=>{const counts=new Map(),keys=new Map();
    if(r.sourceColors)for(const h of r.sourceColors){const key=parseInt(h,16);keys.set(key,a.hist.get(key)||0);}
    else{const pixels=r.pixels?[...r.pixels]:[];if(r.rect){const [x,y,w,h]=r.rect;for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels.push([i,j]);}for(const [x,y]of pixels){const key=a.keys[y*a.width+x];if(key>=0)keys.set(key,(keys.get(key)||0)+1);}}
    for(const [key,count]of keys){const n=map.get(key);if(n!==undefined)counts.set(n,(counts.get(n)||0)+count);}const sorted=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);return{id:r.id,dominant:sorted[0]?.[0],outputs:[...counts.keys()]};});
  let pairs=0,same=0;for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++)if(targets[i].dominant!==undefined&&targets[j].dominant!==undefined){pairs++;if(targets[i].dominant===targets[j].dominant)same++;}
  return{regionPairs:pairs,regionDominantMerged:same,regions:targets};
}
for(const source of sources){
 const {id,width,height,data}=source;await fs.writeFile(path.join(out,id+'.rgba'),data);await sharp(Buffer.from(data),{raw:{width,height,channels:4}}).png().toFile(path.join(out,id+'.png'));sourceViews.push({...source,data:undefined,sourceFile:id+'.png'});
 const a=analyze(source);
 for(const palette of FULL_PRESETS){
  const baseline=mapping(a,palette.colors,'oklab'),rgb=mapping(a,palette.colors,'rgb');
  for(const mode of MODES){const map=mode==='oklab'?baseline:mode==='rgb'?rgb:mapping(a,palette.colors,mode),image=paint(a,palette.colors,map),stats=measure(a,palette.colors,map,baseline,rgb);assert.equal(stats.exactBroken,0);validation.exactBroken+=stats.exactBroken;
   if(['oklab','rgb'].includes(mode)){assert.deepEqual(image.indices,quantize(source,palette.colors,128,undefined,undefined,{metric:mode}).indices);validation.baselineParity++;}
   if(mode==='oklch-equivalent')validation.oklchDifference+=stats.changed*stats.visible;
   rows.push({source:id,group:source.group,palette:palette.id,mode,...stats,...regional(a,palette.colors,map,source.regions),hash:sha(image.data),indexHash:sha(new Uint8Array(image.indices.buffer))});
  }
 }
 console.log('Measured',id);
}
const keys=['changed','differentBoth','L','OK','DE00','CAM','hue','neutralC','edgeCollapse','inversions','contrastError'];
function aggregate(group){return MODES.map(mode=>{const r=rows.filter(x=>x.mode===mode&&group.includes(x.group)),avg=k=>r.reduce((s,x)=>s+x[k],0)/r.length,regions=r.filter(x=>x.regionPairs);return{mode,cases:r.length,...Object.fromEntries(keys.map(k=>[k,avg(k)])),regionDominantMerged:regions.reduce((s,x)=>s+x.regionDominantMerged,0),regionPairs:regions.reduce((s,x)=>s+x.regionPairs,0)};});}
const groups={original:aggregate(['real-sprite']),annotated:aggregate(['annotated-real']),allRealStills:aggregate(['real-sprite','annotated-real','real-art']),scenes:aggregate(['scene-capture']),animations:aggregate(['real-animation-frame']),synthetic:aggregate(['synthetic-counterexample','annotated-synthetic'])};
const hashes=Object.fromEntries(await Promise.all(['src/lib/quantize.js','src/lib/palette-library.js','src/lib/palette-limit.js','src/lib/palette-dither.js','src/lib/palette-cleanup.js','src/lib/palette-state.js','bench/matching-alternatives-2026-10-16/engine.js','bench/important-colors-review/manifest.json'].map(async f=>[f,sha(await fs.readFile(f))])));
const result={date:'2026-10-16',settings:{cut:128,cap:'All',cleanup:false,dither:false,exact:true,baselineTies:'first minimum',candidateTies:'canonical RGB'},sources:sourceViews,palettes:FULL_PRESETS,modes:MODES,labels:LABELS,rows,groups,validation,hashes,dependencyVersions:{'colorjs.io':'0.7.1','@material/material-color-utilities':'0.4.0'},notes:'Equal case means. Oklab and CIEDE2000 and CAM16 each favor their own minimizer. Edge-aware is an original exploratory coordinate-descent heuristic, not a reproduction of the region-recoloring paper.'};
await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));await fs.copyFile('.tmp/matching-alternatives/package-lock.json',path.join(here,'research-deps-lock.json'));
console.table(groups.original.map(({mode,changed,differentBoth,L,DE00,CAM,hue,edgeCollapse})=>({mode,changed:changed.toFixed(3),differentBoth:differentBoth.toFixed(3),L:L.toFixed(4),DE00:DE00.toFixed(2),CAM:CAM.toFixed(2),hue:hue.toFixed(1),edgeCollapse:edgeCollapse.toFixed(3)})));
console.log(JSON.stringify({sources:sources.length,palettes:FULL_PRESETS.length,modes:MODES.length,cases:rows.length,validation}));
