// Interleaved diagnostic, not a universal performance budget.
import fs from 'node:fs/promises';
import { image } from './experiment.mjs';
import { selectPaletteSubset as old } from '../../src/lib/palette-limit.js';
import { selectPaletteSubset as next } from './palette-limit.candidate.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const src=image(1024,1024,(x,y)=>[(x*37+y*7)%256,(x*19+y*23)%256,(x*3+y*67)%256,1+(x*11+y*31)%254]);
const preset=FULL_PRESETS.find(p=>p.id==='preset-res64');if(!preset)throw new Error('Missing stable target preset-res64');
const target=preset.colors,report={scope:'Node25 selector only, interleaved serial runs. Source immutable1Mi-pixel mixedalpha. No decoding/worker/UI/export. Environment may have parallel browser activity.',runs:[]};
for(let round=0;round<4;round++)for(const weighting of [['baseline','none','linear','squared'],['squared','linear','none','baseline']][round%2]){
  const selector=weighting==='baseline'?old:next,t=performance.now();
  const r=await selector(target,8,async function*(){for(let at=0;at<src.data.length;at+=131072)yield{data:src.data.subarray(at,at+131072),weight:1};},{alphaCut:1,alphaWeight:weighting==='baseline'?'none':weighting});
  report.runs.push({round,weighting,ms:performance.now()-t,binned:r.binned,swaps:r.swaps,indices:r.indices});
}
await fs.writeFile(new URL('./performance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
