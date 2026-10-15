import { writeFile } from 'node:fs/promises';
import { independentMetrics } from './fixtures.mjs';
import { fixtures, render } from '../keep-alpha-weighting-spike/experiment.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const target=FULL_PRESETS.find(p=>p.id==='preset-res64')?.colors, reports=[];
if(!target)throw new Error('Resurrect64 preset missing.');
for(const f of (await fixtures()).filter(v=>v.name==='many-soft-colors'))for(const kind of ['auto','fixed'])for(const metric of ['oklab','rgb']){
 const row={fixture:f.name,kind,metric,variants:[]};
 for(const weighting of ['none','linear','squared']){
  const actual=await render(f.items,{weighting,target:kind==='fixed'?target:undefined,cap:kind==='auto'?3:4,metric});
  row.variants.push({weighting,colors:actual.subsets,metrics:independentMetrics(f.items[0].original,actual.outputs[0])});
 }
 reports.push(row);
}
await writeFile(new URL('./crosscheck.json',import.meta.url),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({kind:r.kind,metric:r.metric,variants:r.variants.map(v=>({policy:v.weighting,black:v.metrics.sets.all.black,white:v.metrics.sets.all.white,alpha128:v.metrics.sets.alpha128.black}))})),null,2));
