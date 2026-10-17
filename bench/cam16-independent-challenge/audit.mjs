// Review-only audit. Re-run finalists and characterize tradeoffs, not preferences.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {analyze,mapping,paint,measure} from '../matching-alternatives-2026-10-16/engine.js';
const base=new URL('../matching-alternatives-2026-10-16/output/',import.meta.url);
const d=JSON.parse(await fs.readFile(new URL('results.json',base)));
const modes=['oklab','rgb','ok2','cam16ucs'], rerun=[];
for(const s of d.sources.filter(s=>['real-sprite','annotated-real'].includes(s.group))){
 const data=new Uint8ClampedArray(await fs.readFile(new URL(s.id+'.rgba',base)));
 const a=analyze({...s,data});
 for(const p of d.palettes){
  const o=mapping(a,p.colors,'oklab'),r=mapping(a,p.colors,'rgb');
  for(const mode of modes){
   const m=mapping(a,p.colors,mode),out=paint(a,p.colors,m);
   const row=d.rows.find(x=>x.source===s.id&&x.palette===p.id&&x.mode===mode);
   assert.equal(createHash('sha256').update(out.data).digest('hex'),row.hash);
   const metrics=measure(a,p.colors,m,o,r);
   for(const k of ['L','DE00','CAM','edgeCollapse','hue','neutralC'])assert(Math.abs(metrics[k]-row[k])<1e-12);
   rerun.push({source:s.id,palette:p.id,mode,...metrics});
  }
 }
}
function summary(rows){
 const results={};
 for(const mode of ['cam16ucs','ok2']){
  const a=rows.filter(x=>x.mode===mode),counter={cases:a.length,identical:0,de00Better:0,hueWorse:0,hueBetter:0,edgeWorse:0,edgeBetter:0,neutralWorse:0,regionsWorse:0,regionsBetter:0};
  for(const r of a){
   const o=rows.find(x=>x.source===r.source&&x.palette===r.palette&&x.mode==='oklab');
   if(r.changed===0)counter.identical++;
   if(r.DE00<o.DE00-1e-10)counter.de00Better++;
   for(const [key,label]of [['hue','hue'],['edgeCollapse','edge']]){
    if(r[key]>o[key]+1e-10)counter[label+'Worse']++;
    if(r[key]<o[key]-1e-10)counter[label+'Better']++;
   }
   if(r.neutralN&&r.neutralC>o.neutralC+1e-10)counter.neutralWorse++;
   const raw=d.rows.find(x=>x.source===r.source&&x.palette===r.palette&&x.mode===mode),orig=d.rows.find(x=>x.source===r.source&&x.palette===r.palette&&x.mode==='oklab');
   if(raw.regionDominantMerged>orig.regionDominantMerged)counter.regionsWorse++;
   if(raw.regionDominantMerged<orig.regionDominantMerged)counter.regionsBetter++;
  }
  results[mode]=counter;
 }
 return results;
}
const multicolor=rerun.filter(x=>d.palettes.slice(0,6).some(p=>p.id===x.palette));
const worstEdges=multicolor.filter(x=>x.mode==='cam16ucs').map(r=>{
 const o=multicolor.find(x=>x.source===r.source&&x.palette===r.palette&&x.mode==='oklab');
 return {source:r.source,palette:r.palette,camEdge:r.edgeCollapse,okEdge:o.edgeCollapse,delta:r.edgeCollapse-o.edgeCollapse,camDE00:r.DE00,okDE00:o.DE00,camUsed:r.used,okUsed:o.used};
}).sort((a,b)=>b.delta-a.delta).slice(0,12);
const perPalette=d.palettes.map(p=>({palette:p.id,...summary(rerun.filter(x=>x.palette===p.id))}));
const report={reproducedCases:rerun.length,all:summary(rerun),multicolor:summary(multicolor),perPalette,worstEdges,
 note:'Counts are correlated source/palette combinations. Hue and edge diagnostics are not independent human preference judgments. Hash reproduction uses shared engine, not an independently implemented color model.'};
await fs.writeFile(new URL('./audit.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
