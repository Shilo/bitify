import {regions,boundary,toLab,distance,regionSizes,validateInput,neighbors} from './regions.mjs';

// Frozen boundary-majority proposal followed by vetoes. No second winner after
// a veto: skipping an ambiguous edit is preferable to silently changing policy.
export function mergeVote(input, options={}) {
  validateInput(input);
  const {width,height,labels,colors}=input, selected=options.selected??new Set(), protectedColors=options.protected??new Set();
  if(!(selected instanceof Set)||!(protectedColors instanceof Set)||[...selected,...protectedColors].some(l=>!Number.isInteger(l)||l<0||l>=colors.length)||!Number.isFinite(options.maxDistanceSquared??.02)||(options.maxDistanceSquared??.02)<0||!Number.isInteger(options.minimumAnchorSize??5)||(options.minimumAnchorSize??5)<1||(options.protectedPixels!==undefined&&(!(options.protectedPixels instanceof Uint8Array)||options.protectedPixels.length!==labels.length)))throw new Error('Invalid vote research options');
  const labs=colors.map(toLab), out=labels.slice(), decisions=[], sizes=regionSizes(labels,width,height);
  const maxDistanceSquared=options.maxDistanceSquared??.02, minimumAnchorSize=options.minimumAnchorSize??5;
  for(const region of regions(labels,width,height,4,selected)) {
    const decision={label:region.label,pixels:region.pixels,replacement:null,reason:'no-boundary'};
    if(protectedColors.has(region.label)||region.pixels.some(p=>options.protectedPixels?.[p])){decision.reason='protected';decisions.push(decision);continue;}
    const votes=boundary(region,labels,width,height,selected), ranked=[...votes].sort((a,b)=>b[1]-a[1]||colors[a[0]].localeCompare(colors[b[0]]));
    if(!ranked.length){decisions.push(decision);continue;}
    const [winner,count]=ranked[0];decision.distanceSquared=distance(labs[region.label],labs[winner]);
    let anchored=false;for(const p of region.pixels)for(const q of neighbors(p,width,height))if(labels[q]===winner&&sizes[q]>=minimumAnchorSize&&sizes[q]>region.pixels.length)anchored=true;
    if(ranked[1]?.[1]===count)decision.reason='tie';
    else if(protectedColors.has(winner))decision.reason='protected-boundary';
    else if(!anchored)decision.reason='unanchored';
    else if(decision.distanceSquared>maxDistanceSquared)decision.reason='color-distance';
    else {decision.reason='merged';decision.replacement=winner;for(const p of region.pixels)out[p]=winner;}
    decisions.push(decision);
  }
  return {labels:out,decisions};
}
