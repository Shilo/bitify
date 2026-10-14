// Research only. Explicitly selecting fill shades supplies designer intent.
import {mergeNearest} from './method-nearest.mjs';
import {regions,toLab,validateInput} from './regions.mjs';

export function simplifySelectedShades(input,{selected=new Set(),keep=null,maxDistanceSquared=.04}={}){
 validateInput(input);
 const protectedLabels=new Set(input.colors.map((hex,i)=>{
  const rgb=parseInt(hex.slice(1),16),r=rgb>>>16,g=rgb>>>8&255,b=rgb&255;
  return toLab(hex)[0]<.5||toLab(hex)[0]>.96||(r>g+20&&b>g+5)?i:-1;
 }).filter(i=>i>=0));
 // Whole 8-connected components are classified before 4-neighbor fill proposals.
 // Retain coherent shading and diagonal selected lines larger than four cells.
 const eligible=new Uint8Array(input.labels.length);
 for(const region of regions(input.labels,input.width,input.height,8,selected))
  if(region.pixels.length<=4&&!region.pixels.some(p=>keep?.[p]))for(const p of region.pixels)eligible[p]=1;
 const result=mergeNearest(input,{selected,protected:protectedLabels,maxDistanceSquared,minimumAnchorSize:5});
 const labels=input.labels.slice();let merged=0,abstained=0;
 for(const d of result.decisions){if(d.pixels.every(p=>eligible[p])&&d.replacement!==null){for(const p of d.pixels)labels[p]=d.replacement;merged++;}else abstained++;}
 return {labels,merged,abstained,protectedLabels};
}
