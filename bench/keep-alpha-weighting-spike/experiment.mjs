import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { generatePaletteAsync as originalGenerate } from '../../src/lib/palette-generated.js';
import { selectPaletteSubset as originalSelect } from '../../src/lib/palette-limit.js';
import { generatePaletteAsync as candidateGenerate, createGeneratedAccumulator } from './palette-generated.candidate.js';
import { selectPaletteSubset as candidateSelect } from './palette-limit.candidate.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { quantizeAsync } from '../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
export const sha = data => crypto.createHash('sha256').update(data).digest('hex');
export function image(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return { width, height, data };
}
export async function render(items, { weighting = 'none', target, cap = 4, metric = 'oklab', cut = 1, alphaMode = 'keep', dither = 'none', chunkBytes = 128 * 1024 } = {}) {
  const gen = weighting === 'baseline' ? originalGenerate : candidateGenerate, sel = weighting === 'baseline' ? originalSelect : candidateSelect;
  const alphaWeight = weighting === 'baseline' ? 'none' : weighting;
  const snapshot = captureGeneratedSources(items, cut);
  let colors = target ?? (await gen(snapshot, { alphaWeight })).colors;
  const sharedColors = colors;
  const outputs = [], subsets = [];
  for (const item of items) {
    const frames = item.frames ?? [item];
    if (cap && cap < sharedColors.length) {
      const r = await sel(sharedColors, cap, async function* () { for (const frame of frames) for (let at = 0; at < frame.original.data.length; at += chunkBytes) yield {data:frame.original.data.subarray(at,at+chunkBytes),weight:item.frames ? frame.delay : 1}; }, { alphaCut: cut, metric, alphaWeight });
      colors = r.indices.map(i => sharedColors[i]);
    } else colors = sharedColors;
    subsets.push(colors);
    for (const frame of frames) {
      if(!colors.length){outputs.push({...frame.original,data:new Uint8ClampedArray(frame.original.data.length)});continue;}
      const q = await quantizeAsync(frame.original, colors, alphaMode === 'keep' ? 128 : cut, undefined, undefined, {metric, alphaMode, dither, ditherStrength:50});
      const rgba = new Uint8ClampedArray(q.w * q.h * 4), parsed = colors.map(c => Buffer.from(c.slice(1),'hex'));
      for (let p = 0; p < q.indices.length; p++) if (q.indices[p] < colors.length) { rgba.set(parsed[q.indices[p]],p*4); rgba[p*4+3] = q.alpha?.[p] ?? 255; }
      outputs.push({width:q.w,height:q.h,data:rgba});
    }
  }
  return { sharedColors, subsets, outputs };
}
const linear = n => (n/=255) <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4;
const lab = rgb => {
  const [r,g,b]=rgb.map(linear), l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
};
const sq = (a,b) => a.reduce((sum,n,i)=>sum+(n-b[i])**2,0);
export function metrics(src,out) {
  const bgs={black:[0,0,0],white:[255,255,255],warm:[210,160,110],cool:[70,120,180]}, result={alphaChanges:0, opaqueRgbChanges:0, faintRgbChanges:0,visible:0,weightedOklab:0,alphaMass:0,backgrounds:Object.fromEntries(Object.keys(bgs).map(k=>[k,0]))};
  for(let at=0;at<src.data.length;at+=4){
    const a=src.data[at+3]/255, s=[...src.data.subarray(at,at+3)],o=[...out.data.subarray(at,at+3)];
    if(src.data[at+3]!==out.data[at+3])result.alphaChanges++;
    if(!a)continue;
    result.visible++;result.alphaMass+=a;result.weightedOklab+=a*sq(lab(s),lab(o));
    if(s.some((n,c)=>n!==o[c])){if(a===1)result.opaqueRgbChanges++;else if(a<.1)result.faintRgbChanges++;}
    for(const [name,bg] of Object.entries(bgs))result.backgrounds[name]+=sq(lab(s.map((v,c)=>v*a+bg[c]*(1-a))),lab(o.map((v,c)=>v*a+bg[c]*(1-a))));
  }
  result.weightedOklab/=result.alphaMass||1;
  for(const name of Object.keys(bgs))result.backgrounds[name]/=result.visible||1;
  return result;
}
export async function fixtures() {
  const fixtures=[];
  const add=(name,src)=>fixtures.push({name,items:[{original:src}]});
  const art=[[220,30,30],[30,200,40],[40,60,220]];
  add('opaque-core-alpha1-spill',image(40,40,(x,y)=>x>=10&&x<30&&y>=10&&y<30?[...art[(x-10)%3===0?0:(y-10)%2?1:2],255]:[255,0,255,1]));
  add('opaque-core-alpha6-halo',image(40,40,(x,y)=>x>=10&&x<30&&y>=10&&y<30?[...art[(x-10)%3===0?0:(y-10)%2?1:2],255]:[255,0,255,6]));
  add('warm-glow',image(64,64,(x,y)=>{const r=Math.hypot(x-31.5,y-31.5);return r<8?[255,245,180,255]:r<16?[255,130,20,Math.round(255*(24-r)/16)]:r<30?[200,50,10,Math.max(1,Math.round(100*(30-r)/14))]:[0,0,0,0];}));
  add('soft-shadow-aa',image(64,64,(x,y)=>{const r=Math.hypot(x-31.5,y-27);if(r<12)return[240,70,70,Math.round(255*Math.min(1,12-r))];const e=((x-31.5)/26)**2+((y-47)/9)**2;return e<1?[45,35,80,Math.round(105*(1-e))]:[0,0,0,0];}));
  add('rare-translucent-accent',image(32,32,(x,y)=>{if(x<2&&y<8)return[30,220,255,160];return[...[[200,170,90],[180,110,70],[90,60,50],[35,25,40]][Math.floor(x/8)],255];}));
  add('all-faint-fade',image(64,32,(x,y)=>[...art[Math.floor(x/22)%3],1+Math.round(20*y/31)]));
  add('many-soft-colors',image(80,64,(x,y)=>[(x*37+y*7)%256,(x*19+y*23)%256,(x*3+y*67)%256,1+(x*11+y*31)%254]));
  add('highentropy-faint-border',image(96,64,(x,y)=>x>20&&x<75&&y>10&&y<54?[...art[Math.floor(x/19)%3],255]:[(x*37+y*7)%256,(x*19+y*23)%256,(x*3+y*67)%256,1+(x+y)%6]));
  for(const name of ['knight-a.png','glow-alpha.png','spill-alpha1.png']){
    const file=new URL(`../claude-audit-2026-10-15/service/fixtures/${name}`,import.meta.url);
    const {data,info}=await sharp(await fs.readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    add('retained-'+name,{width:info.width,height:info.height,data:new Uint8ClampedArray(data)});
  }
  const base=fixtures[2].items[0].original;
  const faint={...base,data:base.data.map((v,i)=>i%4===3?Math.round(v*.2):v)};
  fixtures.push({name:'fade-animation-duration',items:[{frames:[{original:base,delay:20},{original:faint,delay:180}]}]});
  fixtures.push({name:'shared-wall-equal-assets',items:[fixtures[0].items[0],fixtures[4].items[0],{original:image(2,2,()=>[40,180,220,24])}]});
  return fixtures;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const report={method:'Research-only copied algorithms. PNG input independently decoded with Sharp. Metrics independent and composited over black/white/warm/cool. These mathematical objectives are not universal art quality.',cases:[],invariants:[]};
  const all=await fixtures(), preset=FULL_PRESETS.find(p=>p.id==='preset-res64');if(!preset)throw new Error('Missing stable target preset-res64');const target=preset.colors;
  for(const f of all)for(const kind of ['auto','fixed'])for(const metric of ['oklab','rgb']){
    const row={name:f.name,kind,metric,cap:kind==='auto'?3:4,variants:[]};
    for(const weighting of ['baseline','none','linear','squared']){
      const t=performance.now(),r=await render(f.items,{weighting,target:kind==='fixed'?target:undefined,cap:row.cap,metric});
      row.variants.push({weighting,ms:performance.now()-t,sharedColors:r.sharedColors,subsets:r.subsets,hashes:r.outputs.map(o=>sha(o.data)),frames:r.outputs.map((o,i)=>metrics(f.items.flatMap(item=>(item.frames??[item]).map(f=>f.original))[i],o))});
    }
    report.cases.push(row);console.log(`${f.name} ${kind} ${metric}`);
  }
  for(const name of ['opaque-core-alpha6-halo','all-faint-fade','many-soft-colors']){
    const f=all.find(f=>f.name===name),src=f.items[0].original;
    for(const mode of ['opaque','binary','cut128']){
      const transformed=mode==='cut128'?src:{...src,data:src.data.map((v,i)=>i%4===3?(mode==='opaque'?255:(v>=10?255:0)):v)}, items=[{original:transformed}];
      for(const metric of ['oklab','rgb'])for(const kind of ['auto','fixed'])for(const weighting of ['linear','squared']){
        const opts={metric,target:kind==='fixed'?target:undefined,alphaMode:mode==='cut128'?'cut':'keep',cut:mode==='cut128'?128:1,cap:4};
        const b=await render(items,{...opts,weighting:'baseline'}), c=await render(items,{...opts,weighting:mode==='cut128'?'none':weighting});
        report.invariants.push({name,mode,metric,kind,weighting,exact:sha(b.outputs[0].data)===sha(c.outputs[0].data)&&JSON.stringify(b.sharedColors)===JSON.stringify(c.sharedColors)});
      }
    }
  }
  await fs.writeFile(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
