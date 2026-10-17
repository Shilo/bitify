// Secondary diagnostics: color perturbation, exact anchors, Auto and grouping.
import fs from 'node:fs/promises';
import {MODES,features,delta2,makeMatcher,render,measure} from './engine.js';
import {generatePaletteAsync} from '../../src/lib/palette-generated.js';
import {captureGeneratedSources} from '../../src/lib/palette-generated-sources.js';
const out=new URL('./output/',import.meta.url),result=JSON.parse(await fs.readFile(new URL('results.json',out)));
const images=await Promise.all(result.sources.map(async s=>({...s,data:new Uint8ClampedArray(await fs.readFile(new URL(s.id+'.rgba',out)))})));
const real=images.filter(x=>['real-sprite','real-art'].includes(x.group)),sprite=images.filter(x=>x.group==='real-sprite'),palettes=result.palettes;
const jitters=[],anchor=[];
function* adjacent(key){for(const shift of [16,8,0])for(const step of [-1,1]){const c=key>>shift&255;if(c+step>=0&&c+step<=255)yield key+step*2**shift;}}
for(const mode of MODES){
 let count=0,changed=0,jump=0,large=0;
 for(const p of palettes){const match=makeMatcher(p.colors,mode),f=p.colors.map(c=>features(parseInt(c.slice(1),16)));
  for(const c of f)for(const key of adjacent(c.key)){const mapped=f[match(key)],d=Math.sqrt(delta2(c,mapped));count++;if(mapped.key!==c.key)changed++;jump+=d;if(d>=.1)large++;}
 }
 anchor.push({mode,count,changed,changeRate:changed/count,meanJump:jump/count,largeJumpRate:large/count});
 for(const p of palettes){const match=makeMatcher(p.colors,mode),f=p.colors.map(c=>features(parseInt(c.slice(1),16)));
  for(const s of sprite){const frequency=new Map();for(let i=0;i<s.data.length;i+=4)if(s.data[i+3]>=128){const key=s.data[i]<<16|s.data[i+1]<<8|s.data[i+2];frequency.set(key,(frequency.get(key)||0)+1);}
   let n=0,change=0,j=0,large=0;for(const [key,weight]of frequency){const own=f[match(key)];for(const other of adjacent(key)){const mapped=f[match(other)],d=Math.sqrt(delta2(own,mapped));n+=weight;if(own.key!==mapped.key)change+=weight;j+=d*weight;if(d>=.1)large+=weight;}}
   jitters.push({mode,palette:p.id,source:s.id,rate:change/n,meanJump:j/n,largeJumpRate:large/n});
  }
 }
}
const auto=[];
const shared=await generatePaletteAsync(captureGeneratedSources(sprite.map(s=>({original:s}))));
for(const source of [...sprite,images.find(x=>x.id==='saturated-stripes')]){
 const own=await generatePaletteAsync(captureGeneratedSources([{original:source}]));
 for(const [target,colors]of [['own',own.colors],['shared-sprites',shared.colors]]){
  const baseline=render(source,colors,'oklab');
  for(const mode of MODES)auto.push({source:source.id,target,paletteCount:colors.length,mode,...measure(source,render(source,colors,mode),colors,baseline)});
 }
}
function means(rows){const ks=['changed','meanAbsL','meanDeltaE','edgeCollapse','inversions','chromaCollapse'];return Object.fromEntries(ks.map(k=>[k,rows.reduce((s,r)=>s+r[k],0)/rows.length]));}
const groups={};for(const group of ['real-sprite','real-art','scene-capture','real-animation-frame','synthetic-counterexample'])groups[group]=MODES.map(mode=>({mode,...means(result.rows.filter(x=>x.group===group&&x.mode===mode))}));
const jitterSummary=MODES.map(mode=>{const a=jitters.filter(x=>x.mode===mode);return{mode,meanChangeRate:a.reduce((s,r)=>s+r.rate,0)/a.length,meanJump:a.reduce((s,r)=>s+r.meanJump,0)/a.length,largeJumpRate:a.reduce((s,r)=>s+r.largeJumpRate,0)/a.length};});
const grayIdentity=MODES.map(mode=>({mode,cases:result.rows.filter(r=>['preset-gray8','preset-mono'].includes(r.palette)&&r.mode===mode).length,maxChanged:Math.max(...result.rows.filter(r=>['preset-gray8','preset-mono'].includes(r.palette)&&r.mode===mode).map(x=>x.changed))}));
const summary={description:'Perturb each channel ±1 byte at all eligible original sprite RGBs and palette members. Jitter means weight source color frequency within a case, then give cases equal weight. Large jump means Oklab distance ≥0.1. No aesthetic pass/fail is inferred.',anchor,jitterSummary,jitters,auto,groups,grayIdentity,autoSummary:MODES.map(mode=>({mode,...means(auto.filter(x=>x.mode===mode&&x.target==='own'&&x.source!=='saturated-stripes'))})),sharedColors:shared.colors};
await fs.writeFile(new URL('stress.json',out),JSON.stringify(summary,null,2));console.table(jitterSummary);console.table(anchor);console.table(summary.autoSummary);
