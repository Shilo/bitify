// Independent adversarial property checks; no external service or app writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quantize, quantizeAsync, colorize, EMPTY_INDEX } from '../src/lib/quantize.js';
let seed=0x531e94;
const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const colors=n=>Array.from({length:n},(_,i)=>'#'+((i*65793+0x1367bc)&0xffffff).toString(16).padStart(6,'0'));
const modes=['2x2','4x4','8x8'];
const cases=[];
for(const count of [1,2,3,4,5,8,16,64,256]) for(const metric of ['oklab','rgb']) {
 const width=17+next()%19,height=11+next()%13;
 const data=Uint8ClampedArray.from({length:width*height*4},()=>next()>>>24), source={width,height,data};
 const palette=colors(count),cut=[1,128,255][next()%3];
 const before=data.slice();
 for(const dither of modes) {
  const options={metric,dither,ditherStrength:[1,50,100][next()%3]};
  const full=quantize(source,palette,cut,undefined,undefined,options);
  assert.deepEqual(data,before,'source mutated');
  const out=colorize(full,palette),seen=new Uint8Array(256);let transparent=false;
  for(let i=0;i<width*height;i++) {
   const empty=data[i*4+3]<cut;
   assert.equal(full.indices[i]===EMPTY_INDEX,empty,'alpha threshold');
   assert.equal(out.data[i*4+3],empty?0:255,'binary alpha');
   if(empty)transparent=true;
   else {assert.ok(full.indices[i]<count,'target membership');seen[full.indices[i]]=1;}
  }
  assert.deepEqual(full.used,seen,'used flags');assert.equal(full.hasTransparency,transparent,'transparent flag');
  const mw=5,mh=7,small=quantize(source,palette,cut,mw,mh,options);
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++)assert.equal(small.indices[y*mw+x],full.indices[Math.floor((y+.5)*height/mh)*width+Math.floor((x+.5)*width/mw)],'sample phase');
  const async=await quantizeAsync(source,palette,cut,mw,mh,{...options,chunkPixels:8192});assert.deepEqual(async,small,'async');
  const changed={...source,data:data.slice()};changed.data[0]^=255;
  const second=quantize(changed,palette,cut,undefined,undefined,options);
  assert.deepEqual(second.indices.slice(1),full.indices.slice(1),'unchanged-coordinate churn');
  cases.push({count,metric,dither,strength:options.ditherStrength,width,height,cut});
 }
}
const result={seed:'0x531e94',cases:cases.length,assertions:['source immutability','binary alpha + threshold','target membership','used flags','source-coordinate preview phase','sync/async equality','unchanged-coordinate animation stability'],status:'passed'};
fs.mkdirSync('bench/palette-dither-review',{recursive:true});
fs.writeFileSync('bench/palette-dither-review/results.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
