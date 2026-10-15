import { writeFile } from 'node:fs/promises';
import { heldOutFixtures } from './fixtures.mjs';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { generatePaletteAsync } from '../keep-alpha-weighting-spike/palette-generated.candidate.js';
import { selectPaletteSubset } from '../keep-alpha-weighting-spike/palette-limit.candidate.js';

const results=[];
const fixtures=heldOutFixtures(), a=fixtures.find(v=>v.name==='all-soft-water-ramp'), b=fixtures.find(v=>v.name==='binned-soft-spectrum');
const colors=['#000000','#342753','#7751a9','#116a62','#32acb9','#df9af1','#f03b29','#ffffff'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const generate=(assets,policy)=>generatePaletteAsync(captureGeneratedSources(assets,1),{alphaWeight:policy});
const reader=frames=>async function*(){for(const {original,delay} of frames)yield{data:original.data,weight:delay};};
for(const policy of ['none','linear','squared']){
 const expected=await generate([a,b],policy);
 const duplicate={original:{width:a.original.width*2,height:a.original.height,data:Uint8ClampedArray.from([...a.original.data,...a.original.data])}};
 results.push({policy,check:'asset-order',pass:same((await generate([b,a],policy)).colors,expected.colors)});
 results.push({policy,check:'equal-asset-weight-resize',pass:same((await generate([duplicate,b],policy)).colors,expected.colors)});
 const normal={frames:[{original:a.original,delay:37},{original:{...a.original,data:a.original.data.slice().reverse()},delay:121}]};
 // Reverse whole RGBA pixels rather than individual channels.
 for(let at=0;at<a.original.data.length;at+=4)normal.frames[1].original.data.set(a.original.data.subarray(a.original.data.length-at-4,a.original.data.length-at),at);
 const scaled={frames:normal.frames.map(f=>({...f,delay:f.delay*3}))};
 const split={frames:[normal.frames[0],{...normal.frames[1],delay:60},{...normal.frames[1],delay:61}]};
 const original=await generate([normal,b],policy);
 results.push({policy,check:'duration-scale',pass:same((await generate([scaled,b],policy)).colors,original.colors)});
 results.push({policy,check:'duration-split',pass:same((await generate([split,b],policy)).colors,original.colors)});
 for(const metric of ['rgb','oklab']){
  const source=await selectPaletteSubset(colors,3,reader(normal.frames),{alphaCut:1,metric,alphaWeight:policy});
  const scale=await selectPaletteSubset(colors,3,reader(scaled.frames),{alphaCut:1,metric,alphaWeight:policy});
  const splice=await selectPaletteSubset(colors,3,reader(split.frames),{alphaCut:1,metric,alphaWeight:policy});
  results.push({policy,metric,check:'subset-duration-scale',pass:same(source.indices,scale.indices)});
  results.push({policy,metric,check:'subset-duration-split',pass:same(source.indices,splice.indices)});
 }
 const abort=new AbortController();abort.abort();let canceled=false;
 try{await generatePaletteAsync(captureGeneratedSources([b],1),{alphaWeight:policy,signal:abort.signal});}catch(error){canceled=error.name==='AbortError';}
 results.push({policy,check:'abort-before',pass:canceled});
}
await writeFile(new URL('./invariants.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({checks:results.length,failed:results.filter(v=>!v.pass)},null,2));
