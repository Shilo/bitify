// Reproduce: node bench/matching-spike-2026-10-16/run.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {MODES,features,render,measure,makeMatcher} from './engine.js';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
import {quantize} from '../../src/lib/quantize.js';
import {decodeGif} from '../../src/lib/gif.js';
const require=createRequire(import.meta.url),sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),out=path.join(dir,'output');await fs.mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex'),sources=[];
async function add(id,file,group='real-sprite',provenance={}){
  const bytes=await fs.readFile(file),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  sources.push({id,file,group,sha256:hash(bytes),width:info.width,height:info.height,data:new Uint8ClampedArray(data),...provenance});
}
for(const id of ['breastplate','general','weapons','accessories','armor'])await add(id,`bench/icon-research/${id}-source.png`);
for(const id of ['town','platformer'])await add(id,`video/assets/${id}.png`,'scene-capture');
const manifest=JSON.parse(await fs.readFile('bench/keep-real-art-study/cohort/manifest.json'));
const cohortIds=['glow-orb-red','glow-light-64','shadow-lpc-character','aa-twemoji-fire','aa-twemoji-ghost','fx-green-magic-32','fx-black-smoke','soft-magic-ring',...manifest.filter(x=>x.animation?.group==='anim-rubberduck-magic').map(x=>x.id)];
for(const id of cohortIds){const entry=manifest.find(x=>x.id===id);await add(id,'bench/keep-real-art-study/cohort/'+entry.file,entry.animation?'real-animation-frame':'real-art',{sourceUrl:entry.sourceUrl,license:entry.license,animation:entry.animation});}
const gifFile='bench/claude-audit-2026-10-15/device/fixtures/walk.gif',gifBytes=await fs.readFile(gifFile),gif=decodeGif(gifBytes);
for(let i=0;i<gif.frames.length;i++)sources.push({id:`walk-${i}`,file:gifFile,sha256:hash(gifBytes),group:'synthetic-animation-frame',width:gif.width,height:gif.height,data:gif.frames[i].data,delay:gif.frames[i].delay});
function synthetic(id,fn,w=128,h=32){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(fn(x,y,w,h),4*(y*w+x));sources.push({id,file:null,group:'synthetic-counterexample',width:w,height:h,data,sha256:hash(data)});}
synthetic('saturated-stripes',(x)=>{const c=[0xff0000,0x00ff00,0x0000ff,0xffff00,0x00ffff,0xff00ff,0xffffff,0x000000][x>>4];return[c>>>16,c>>>8&255,c&255,255];});
synthetic('neutral-ramp',(x,y,w)=>{const n=Math.round(x*255/(w-1));return[n,n,n,255];});
// Deliberately similar Oklab L but visibly different hues: nearest grid search.
const red=features(0xbf4040);let green=0,best=Infinity;
for(let g=0;g<256;g++){const key=0x200020|(g<<8),d=Math.abs(features(key).L-red.L);if(d<best){best=d;green=key;}}
synthetic('near-equal-lightness-detail',(x,y)=>{const c=x>=48&&x<80&&y>=8&&y<24?green:red.key;return[c>>>16,c>>>8&255,c&255,255];});
synthetic('source-color-alpha-ramp',(x)=>[0xe4,0x3b,0x44,x*2],128,16);
const rows=[],views=[];let parity=0,invariants=0;
for(const source of sources){
  const sourceFile=`${source.id}-source.png`;await sharp(Buffer.from(source.data),{raw:{width:source.width,height:source.height,channels:4}}).png().toFile(path.join(out,sourceFile));
  await fs.writeFile(path.join(out,`${source.id}.rgba`),source.data);
  views.push({...source,data:undefined,sourceFile});
  for(const palette of FULL_PRESETS){
    const baseline=render(source,palette.colors,'oklab');
    for(const mode of MODES){
      const result=mode==='oklab'?baseline:render(source,palette.colors,mode);
      if(mode==='oklab'||mode==='rgb'){assert.deepEqual(result.indices,quantize(source,palette.colors,128,undefined,undefined,{metric:mode}).indices);parity++;}
      const stats=measure(source,result,palette.colors,baseline);assert.equal(stats.exactBroken,0);invariants++;
      rows.push({source:source.id,group:source.group,palette:palette.id,mode,...stats});
      // Keep output only for the interactive review, not as product assets.
      await sharp(Buffer.from(result.data),{raw:{width:source.width,height:source.height,channels:4}}).png().toFile(path.join(out,`${source.id}-${palette.id}-${mode}.png`));
    }
  }
}
// Stable RGB output under palette reorder, exact passthrough, deterministic runs,
// alpha preservation and fixed-color animation mapping.
const checks={};
for(const mode of MODES){let reorder=0,reorderChanges=0,alpha=0,repeat=0;
  for(const p of FULL_PRESETS){const match=makeMatcher(p.colors,mode),rev=p.colors.toReversed(),back=makeMatcher(rev,mode);
    for(let key=0;key<0xffffff;key+=7919){if(p.colors[match(key)]!==rev[back(key)])reorderChanges++;reorder++;}
    p.colors.forEach((c,i)=>assert.equal(match(parseInt(c.slice(1),16)),i));
  }
  const source=sources.find(x=>x.id==='source-color-alpha-ramp'),p=FULL_PRESETS[1],a=render(source,p.colors,mode,{keep:true}),b=render(source,p.colors,mode,{keep:true});assert.deepEqual(a.data,b.data);repeat++;
  for(let i=0;i<a.indices.length;i++){assert.equal(a.data[i*4+3],source.data[i*4+3]);alpha++;}
  if(!['oklab','rgb'].includes(mode))assert.equal(reorderChanges,0);
  checks[mode]={reorder,reorderChanges,alpha,repeat};
}
const aggregate=MODES.map(mode=>{
  const r=rows.filter(x=>x.mode===mode&&['real-sprite','real-art'].includes(x.group));
  const avg=k=>r.reduce((s,x)=>s+x[k],0)/r.length;
  const byPalette=FULL_PRESETS.map(p=>{const q=r.filter(x=>x.palette===p.id),avg=k=>q.reduce((s,x)=>s+x[k],0)/q.length;return{palette:p.name,cases:q.length,changed:avg('changed'),L:avg('meanAbsL'),E:avg('meanDeltaE'),collapse:avg('edgeCollapse'),inversions:avg('inversions')};});
  return {mode,cases:r.length,changed:avg('changed'),meanAbsL:avg('meanAbsL'),meanDeltaE:avg('meanDeltaE'),edgeCollapse:avg('edgeCollapse'),inversions:avg('inversions'),byPalette};
});
const result={date:'2026-10-16',method:'All presets, full-size sources, alpha Cut128, no cap, cleanup off, dithering off. Equal case means; source groups are separate. Exact palette RGB passthrough. Scalar ties use full Oklab distance then canonical RGB.',sources:views,palettes:FULL_PRESETS,aggregate,rows,validation:{parity,invariants,checks,equalLightness:{red:red.key,green,deltaL:best}},sourceHashes:Object.fromEntries(await Promise.all(['src/lib/quantize.js','src/lib/palette-library.js','src/lib/palette-limit.js','src/lib/palette-dither.js','src/lib/palette-cleanup.js','src/lib/palette-state.js','bench/matching-spike-2026-10-16/engine.js'].map(async f=>[f,hash(await fs.readFile(f))])))};
await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));
console.table(aggregate.map(({mode,cases,changed,meanAbsL,meanDeltaE,edgeCollapse,inversions})=>({mode,cases,changed:changed.toFixed(3),L:meanAbsL.toFixed(4),E:meanDeltaE.toFixed(4),edgeCollapse:edgeCollapse.toFixed(3),inversions:inversions.toFixed(3)})));
console.log(JSON.stringify({sources:sources.length,palettes:FULL_PRESETS.length,modes:MODES.length,cases:rows.length,parity,invariants,checks}));
