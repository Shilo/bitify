// Research-only region-block Potts descent. No production imports.
import {regions,neighbors,toLab,distance,validateInput} from './regions.mjs';

/** A small region may absorb a neighboring fill if total color + interface energy
 * falls. Source dark lines and source boundary cells are hard constraints. An
 * optional designer Keep mask is a hard constraint, not automatic semantics.
 * This is deterministic local region descent, NOT alpha-expansion/global graph cut.
 */
export function spatialSimplify(input,{lambda=.008,maxArea=32,maxDistanceSquared=.05,keep=null,initialLabels=null}={}){
 validateInput(input);
 const {width,height,labels:original,colors}=input,labs=colors.map(toLab),labels=original.slice(),locked=new Uint8Array(labels.length);
 for(let p=0;p<labels.length;p++){
  const c=original[p];if(c<0)continue;
  const x=p%width,y=Math.floor(p/width);
  locked[p]=Boolean(keep?.[p]||labs[c][0]<.5||x===0||y===0||x===width-1||y===height-1||neighbors(p,width,height,8).some(q=>original[q]<0));
 }
 if(initialLabels){validateInput({...input,labels:initialLabels});for(let p=0;p<labels.length;p++){
  if((initialLabels[p]<0)!==(original[p]<0))throw new Error('Initializer changes alpha');
  if(locked[p]||original[p]<0)continue;
  if(labs[initialLabels[p]][0]<.5)throw new Error('Initializer introduces dark fill');
  labels[p]=initialLabels[p];
 }}
 // Fixed source edge conductance: cross-contrast disagreement is cheap;
 // low-contrast boundaries are penalized. No changed-color recomputation.
 const weight=(p,q)=>Math.exp(-distance(labs[original[p]],labs[original[q]])/.02);
 const energy=()=>{
  let e=0;for(let p=0;p<labels.length;p++){if(labels[p]<0)continue;e+=distance(labs[original[p]],labs[labels[p]]);
   for(const q of neighbors(p,width,height,4))if(q>p&&labels[q]>=0&&labels[p]!==labels[q])e+=lambda*weight(p,q);
  }return e;
 };
 const initialEnergy=energy(),moves=[];
 for(let pass=0;pass<8;pass++){
  let changed=false;
  for(const region of regions(labels,width,height,4).sort((a,b)=>a.pixels.length-b.pixels.length||a.pixels[0]-b.pixels[0])){
   if(region.pixels.length>maxArea||region.pixels.some(p=>locked[p]||labels[p]!==region.label))continue;
   const members=new Set(region.pixels),boundary=[];for(const p of region.pixels)for(const q of neighbors(p,width,height,4))if(!members.has(q)&&labels[q]>=0)boundary.push([p,q]);
   const candidates=[...new Set(boundary.map(([p,q])=>labels[q]))].filter(c=>c!==region.label&&labs[c][0]>=.5&&region.pixels.every(p=>distance(labs[original[p]],labs[c])<=maxDistanceSquared));
   let winner=-1,bestDelta=-1e-10;
   for(const candidate of candidates){
    let delta=0;for(const p of region.pixels)delta+=distance(labs[original[p]],labs[candidate])-distance(labs[original[p]],labs[labels[p]]);
    for(const [p,q] of boundary)delta+=lambda*weight(p,q)*(Number(candidate!==labels[q])-Number(labels[p]!==labels[q]));
    if(delta<bestDelta){bestDelta=delta;winner=candidate;}
   }
   if(winner>=0){for(const p of region.pixels)labels[p]=winner;moves.push({pass,area:region.pixels.length,delta:bestDelta});changed=true;}
  }
  if(!changed)break;
 }
 return {labels,locked,initialEnergy,finalEnergy:energy(),moves};
}
