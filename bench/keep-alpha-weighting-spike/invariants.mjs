import fs from 'node:fs/promises';
import { fixtures, image, render, sha } from './experiment.mjs';
import { createGeneratedAccumulator as candidate } from './palette-generated.candidate.js';
import { createGeneratedAccumulator as baseline } from '../../src/lib/palette-generated.js';
import { selectPaletteSubset } from './palette-limit.candidate.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const all=await fixtures(),report={checks:[],timings:[]};
const check=(name,pass,details={})=>report.checks.push({name,pass,...details});
async function generate(items,weighting,chunkBytes=131072){
  const acc=weighting==='baseline'?baseline(1):candidate(1,{alphaWeight:weighting});
  for(const item of items){acc.beginAsset();for(const frame of item.frames??[item])for(let at=0;at<frame.original.data.length;at+=chunkBytes)await acc.addChunk(frame.original.data.subarray(at,at+chunkBytes),item.frames?frame.delay:1);await acc.endAsset();}
  return acc.finish();
}
for(const f of all)for(const weighting of ['linear','squared']){
  const ref=await generate(f.items,weighting);
  const chunked=await generate(f.items,weighting,28);
  check(`chunk-boundary:${f.name}:${weighting}`,JSON.stringify(ref)===JSON.stringify(chunked));
  const rev=await generate([...f.items].reverse(),weighting);
  check(`asset-order:${f.name}:${weighting}`,JSON.stringify(ref)===JSON.stringify(rev));
  const before=f.items.flatMap(i=>(i.frames??[i]).map(f=>sha(f.original.data)));
  const run=await render(f.items,{weighting,cap:3,dither:'4x4'});
  const after=f.items.flatMap(i=>(i.frames??[i]).map(f=>sha(f.original.data)));
  check(`source-immutable:${f.name}:${weighting}`,JSON.stringify(before)===JSON.stringify(after));
  let k=0,alphas=true,membership=true;
  for(const [ii,item]of f.items.entries())for(const frame of item.frames??[item]){
    const out=run.outputs[k++],members=new Set(run.subsets[ii].map(x=>parseInt(x.slice(1),16)));
    for(let p=0;p<out.data.length;p+=4){if(out.data[p+3]!==frame.original.data[p+3])alphas=false;if(out.data[p+3]&&!members.has(out.data[p]<<16|out.data[p+1]<<8|out.data[p+2]))membership=false;}
  }
  check(`dither-alpha-membership:${f.name}:${weighting}`,alphas&&membership);
}
const first=image(2,2,()=>[230,20,40,1]),second=image(64,64,()=>[20,40,230,255]);
for(const weighting of ['linear','squared']){
  const equal=await generate([{original:first},{original:second}],weighting);
  check(`equal-asset-even-faint:${weighting}`,equal.assets===2&&equal.colors.includes('#e61428')&&equal.colors.includes('#1428e6'),equal);
  const animation=[{frames:[{original:first,delay:20},{original:image(2,2,()=>[20,40,230,255]),delay:180}]}];
  const reversed=[{frames:[...animation[0].frames].reverse()}];
  check(`frame-order:${weighting}`,JSON.stringify(await generate(animation,weighting))===JSON.stringify(await generate(reversed,weighting)));
  const targets=['#e61428','#1428e6'];
  const selected=await selectPaletteSubset(targets,1,async function*(){for(const f of animation[0].frames)yield{data:f.original.data,weight:f.delay};},{alphaCut:1,alphaWeight:weighting});
  check(`duration-and-opacity-mass:${weighting}`,selected.indices[0]===1,selected);
}
// Rare mixed-alpha same-RGB ordering deliberately perturbs FP additions in each histogram.
for(const weighting of ['linear','squared']){
  const src=image(127,127,(x,y)=>[(x*17)%256,(y*13)%256,((x+y)%4)*50,1+((x*31+y*7)%255)]);
  const reverse={...src,data:new Uint8ClampedArray(src.data.length)};
  for(let p=0;p<src.data.length;p+=4)reverse.data.set(src.data.subarray(p,p+4),src.data.length-p-4);
  const a=await generate([{original:src}],weighting),b=await generate([{original:reverse}],weighting);
  check(`pixel-order-binned:${weighting}`,JSON.stringify(a.colors)===JSON.stringify(b.colors),{binned:a.binned});
}
const preset=FULL_PRESETS.find(p=>p.id==='preset-res64');if(!preset)throw new Error('Missing stable target preset-res64');const target=preset.colors;
for(const [name,src]of [['1MP-four',image(1024,1024,(x,y)=>[...[[220,20,30],[20,220,30],[20,30,220],[200,170,100]][(x+y)%4],x%4?255:6])],['1MP-many',image(1024,1024,(x,y)=>[(x*37+y*7)%256,(x*19+y*23)%256,(x*3+y*67)%256,1+(x*11+y*31)%254])]]){
  for(const weighting of ['baseline','linear','squared']){
    const times=[];
    for(let i=0;i<7;i++){const t=performance.now();await render([{original:src}],{weighting,target,cap:8});times.push(performance.now()-t);}
    report.timings.push({name,weighting,median:times.slice(2).sort((a,b)=>a-b)[2],samples:times,scope:'Node warm source/cap/quantization; no native decode, UI, worker, PNG or phone'});
  }
}
await fs.writeFile(new URL('./invariants-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks.length,failures:report.checks.filter(c=>!c.pass),timings:report.timings},null,2));
