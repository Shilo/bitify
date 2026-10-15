import { writeFile } from 'node:fs/promises';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { generatePaletteAsync } from '../keep-alpha-weighting-spike/palette-generated.candidate.js';
let state=0x13579bdf;
const next=()=>state=(Math.imul(state,1664525)+1013904223)>>>0;
const results=[];
for(let seed=0;seed<120;seed++){
 const alpha=[1,6,24,48,127,160,254][seed%7], values=[];
 for(let i=0;i<67+seed%19;i++){
  const rgb=next()&0xffffff,repetitions=1+next()%31;
  for(let j=0;j<repetitions;j++)values.push(rgb>>>16,rgb>>>8&255,rgb&255,alpha);
 }
 const source={width:values.length/4,height:1,data:Uint8ClampedArray.from(values)},snapshot=captureGeneratedSources([{original:source}],1);
 const before=await generatePaletteAsync(snapshot,{alphaWeight:'none'});
 for(const policy of ['linear','squared']){
  const actual=await generatePaletteAsync(snapshot,{alphaWeight:policy});
  if(JSON.stringify(before.colors)!==JSON.stringify(actual.colors))results.push({seed,alpha,policy,before:before.colors,actual:actual.colors});
 }
}
await writeFile(new URL('./uniform-alpha.json',import.meta.url),JSON.stringify({cases:240,failures:results},null,2)+'\n');
console.log(JSON.stringify({cases:240,failures:results.length,first:results[0]},null,2));
