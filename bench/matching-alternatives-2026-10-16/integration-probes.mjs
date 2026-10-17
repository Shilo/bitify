// RESEARCH ONLY. Guarded limiter copy; never changes src or product settings.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {feature,cam,MODES,analyze,mapping,measure} from './engine.js';
import {generatePaletteAsync} from '../../src/lib/palette-generated.js';
import {captureGeneratedSources} from '../../src/lib/palette-generated-sources.js';
import {selectPaletteSubset as productionSubset} from '../../src/lib/palette-limit.js';
const out=new URL('./output/',import.meta.url),d=JSON.parse(await fs.readFile(new URL('results.json',out))),sources=await Promise.all(d.sources.filter(s=>s.group==='real-sprite').map(async s=>({...s,data:new Uint8ClampedArray(await fs.readFile(new URL(s.id+'.rgba',out)))})));
const original=await fs.readFile('src/lib/palette-limit.js','utf8'),hash=createHash('sha256').update(original).digest('hex');
let text=original.replace("from './quantize.js'","from '../../../src/lib/quantize.js'");
const head='function coordinates(r, g, b, metric, out) {';assert(text.includes(head));text=text.replace(head,head+`
  if (metric === 'cam16ucs') { out.set(point((r << 16) | (g << 8) | b, 'cam16ucs')); return; }
  if (metric === 'ok2') { const x = feature((r << 16) | (g << 8) | b); out[0] = x.L; out[1] = 2*x.a; out[2] = 2*x.b; return; }
`);
const validation='  validateMatchingMetric(metric);';assert(text.includes(validation));text=text.replace(validation,"  if (!['cam16ucs', 'ok2'].includes(metric)) validateMatchingMetric(metric);");
text=`// Research copy. Source SHA256 ${hash}\nimport { point, feature } from '../engine.js';\n`+text;await fs.writeFile(new URL('palette-limit.candidate.js',out),text);
const {selectPaletteSubset}=await import(new URL('palette-limit.candidate.js',out));
const rows=[],auto=[];let baselineSubsetParity=0;
const generated=await generatePaletteAsync(captureGeneratedSources(sources.map(s=>({original:s}))));
for(const s of sources){const a=analyze(s),colors=generated.colors,base=mapping(a,colors,'oklab'),rgb=mapping(a,colors,'rgb');for(const mode of ['oklab','rgb','ok2','cam16ucs','ciede2000']){const map=mapping(a,colors,mode);auto.push({source:s.id,mode,colors:colors.length,...measure(a,colors,map,base,rgb)});}}
for(const s of sources)for(const p of d.palettes.filter(p=>['preset-res64','preset-edg32','preset-pico8'].includes(p.id)))for(const cap of [4,8]){
 const read=async function*(){for(let i=0;i<s.data.length;i+=128*1024)yield{data:s.data.subarray(i,i+128*1024),weight:1};};
 const a=analyze(s),maps={};
 for(const mode of ['oklab','rgb','ok2','cam16ucs']){const limited=await selectPaletteSubset(p.colors,cap,read,{metric:mode});assert(limited.indices.length<=cap);assert(limited.indices.every(i=>i>=0&&i<p.colors.length));
  if(['oklab','rgb'].includes(mode)){assert.deepEqual(limited.indices,(await productionSubset(p.colors,cap,read,{metric:mode})).indices);baselineSubsetParity++;}
  const subset=limited.indices.map(i=>p.colors[i]),m=mapping(a,subset,mode),map=new Map([...m].map(([key,i])=>[key,limited.indices[i]]));maps[mode]=map;
  rows.push({source:s.id,palette:p.id,cap,mode,subset,...measure(a,p.colors,map),subsetCost:limited.cost});
 }
}
// Finite CAM16 coordinates over a 33×33×33 sRGB cube and a monotonic gray axis.
const levels=Array.from({length:33},(_,i)=>Math.round(i*255/32));let finite=0,previous=-Infinity;
for(const r of levels)for(const g of levels)for(const b of levels){const c=cam((r<<16)|(g<<8)|b);assert([c.jstar,c.astar,c.bstar].every(Number.isFinite));finite++;}
for(let i=0;i<256;i++){const c=cam(i*0x010101);assert(c.jstar>=previous);previous=c.jstar;}
const result={limiterSourceHash:hash,baselineSubsetParity,subsetCases:rows.length,capRows:rows,autoRows:auto,autoColors:generated.colors,camCubeChecks:finite,camGrayChecks:256};
await fs.writeFile(new URL('integration-probes.json',out),JSON.stringify(result,null,2));
const summary=(rows,mode)=>{const a=rows.filter(r=>r.mode===mode),avg=k=>a.reduce((s,r)=>s+r[k],0)/a.length;return{mode,n:a.length,L:avg('L'),DE00:avg('DE00'),CAM:avg('CAM'),edgeCollapse:avg('edgeCollapse')};};console.table(['oklab','rgb','ok2','cam16ucs'].map(m=>summary(rows,m)));console.table(['oklab','rgb','ok2','cam16ucs','ciede2000'].map(m=>summary(auto,m)));console.log(JSON.stringify({baselineSubsetParity,subsetCases:rows.length,finite}));
