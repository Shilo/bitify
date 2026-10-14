// Isolated frozen hypotheses. No source-specific colors, annotations or keep masks.
import {neighbors,toLab,distance,validateInput} from './regions.mjs';
import {components,bridgeOneCell,thinSimple,stats} from './outline-probe.mjs';
export function exteriorBoundary(labels,w,h) {
  const exterior=new Uint8Array(labels.length),queue=[];
  for(let p=0;p<labels.length;p++)if(labels[p]<0&&(p%w===0||p%w===w-1||p<w||p>=w*(h-1))){exterior[p]=1;queue.push(p);}
  for(let i=0;i<queue.length;i++)for(const q of neighbors(queue[i],w,h))if(labels[q]<0&&!exterior[q]){exterior[q]=1;queue.push(q);}
  return Uint8Array.from(labels,(l,p)=>Number(l>=0&&(p%w===0||p%w===w-1||p<w||p>=w*(h-1)||neighbors(p,w,h).some(q=>exterior[q]))));
}
export function detectOutline(image) {
  validateInput(image);const {labels,colors,width:w,height:h}=image,boundary=exteriorBoundary(labels,w,h),labs=colors.map(toLab),counts=new Uint32Array(colors.length);
  for(let p=0;p<labels.length;p++)if(boundary[p]&&labs[labels[p]][0]<=.5)counts[labels[p]]++;
  const sorted=Array.from(counts,(_,i)=>i).filter(i=>counts[i]).sort((a,b)=>counts[b]-counts[a]||labs[a][0]-labs[b][0]||a-b),seed=sorted[0]??-1;
  const shades=new Set(seed<0?[]:labs.map((v,i)=>v[0]<=labs[seed][0]+.12&&distance(v,labs[seed])<=.04?i:-1).filter(i=>i>=0));
  const band=Uint8Array.from(boundary,(v,p)=>v||neighbors(p,w,h).some(q=>boundary[q])?1:0);
  return {boundary,band,seed,shades,mask:Uint8Array.from(labels,(l,p)=>Number(l>=0&&shades.has(l)&&band[p]))};
}
function fillVote(labels,p,w,h,excluded) {
  const votes=new Map();for(const q of neighbors(p,w,h))if(labels[q]>=0&&!excluded?.[q])votes.set(labels[q],(votes.get(labels[q])??0)+1);
  const sorted=[...votes].sort((a,b)=>b[1]-a[1]),sum=[...votes.values()].reduce((a,b)=>a+b,0);
  return sorted.length&&sorted[0][1]/sum>=.6&&(sorted.length===1||sorted[0][1]>sorted[1][1])?sorted[0][0]:-1;
}
function simpleToggle(mask,p,w,h) {
  const local=new Uint8Array(9),x=p%w,y=Math.floor(p/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)local[(dy+1)*3+dx+1]=mask[p+dy*w+dx];
  local[4]=0;if(components(local,3,3,8).length!==1)return false;
  local[4]=1;return [1,3,5,7].some(q=>!local[q])&&components(local,3,3,4,0).length===1;
}
export function regularizeAlpha(image) {
  const {labels,width:w,height:h}=image,out=labels.slice(),mask=Uint8Array.from(labels,l=>l>=0),frozen=mask.slice();
  for(let p=0;p<labels.length;p++){
    const count=neighbors(p,w,h,8).reduce((a,q)=>a+frozen[q],0),remove=frozen[p]&&count<=2,add=!frozen[p]&&count>=6;
    if((remove||add)&&simpleToggle(mask,p,w,h)){
      const target=add?fillVote(labels,p,w,h): -1;if(add&&target<0)continue;
      out[p]=target;mask[p]=add?1:0;
    }
  }
  return out;
}
export const OUTLINE_METHODS=['union','solid','repair','regularized','allLines'];
export function outlineTransform(image,method='union') {
  validateInput(image);if(!OUTLINE_METHODS.includes(method)&&method!=='colorUnion')throw new Error('Unknown outline method');
  const {labels,width:w,height:h}=image,detected=detectOutline(image),out=labels.slice(),{seed,shades}=detected;
  if(seed<0)return {labels:out,seed,abstained:true};
  if(method==='colorUnion'){for(let p=0;p<out.length;p++)if(shades.has(labels[p]))out[p]=seed;}
  else if(method==='union'||method==='solid'){
    for(let p=0;p<out.length;p++)if(detected.boundary[p]&&(method==='solid'||shades.has(labels[p])))out[p]=seed;
  }else if(method==='regularized'){
    const adjusted=regularizeAlpha(image),boundary=exteriorBoundary(adjusted,w,h);
    out.set(adjusted);for(let p=0;p<out.length;p++)if(boundary[p])out[p]=seed;
  }else{
    const mask=method==='allLines'?Uint8Array.from(labels,l=>Number(shades.has(l))):detected.mask;
    const bridged=bridgeOneCell(mask,w,h,{protectedMask:Uint8Array.from(labels,l=>l<0?1:0)}).mask;
    const protectedMask=Uint8Array.from(mask,(v,p)=>Number(detected.boundary[p]||fillVote(labels,p,w,h,mask)<0));
    const thinned=thinSimple(bridged,w,h,{protectedMask}).mask;
    for(let p=0;p<out.length;p++){
      if(thinned[p])out[p]=seed;
      else if(mask[p]){const fill=fillVote(labels,p,w,h,mask);if(fill>=0)out[p]=fill;}
    }
  }
  return {labels:out,seed,abstained:false};
}
export function outlineMetrics(image,labels=image.labels) {
  const {width:w,height:h}=image,alpha=Uint8Array.from(labels,l=>l>=0),d=detectOutline({...image,labels}),line=Uint8Array.from(labels,l=>Number(d.shades.has(l))),dist=new Uint16Array(labels.length),queue=[];
  // Chebyshev grid distance, including virtual empty cells outside the canvas.
  for(let p=0;p<labels.length;p++)if(!line[p])queue.push(p);else if(p%w===0||p%w===w-1||p<w||p>=w*(h-1)){dist[p]=1;queue.push(p);}else dist[p]=65535;
  for(let i=0;i<queue.length;i++)for(const q of neighbors(queue[i],w,h,8))if(dist[q]>dist[queue[i]]+1){dist[q]=dist[queue[i]]+1;queue.push(q);}
  const distanceHistogram={};for(let p=0;p<labels.length;p++)if(line[p])distanceHistogram[dist[p]]=(distanceHistogram[dist[p]]??0)+1;
  let changed=0,added=0,removed=0,inside=0,contourAdded=0,contourRemoved=0;
  const before=detectOutline(image);
  for(let p=0;p<labels.length;p++){
    changed+=labels[p]!==image.labels[p];added+=image.labels[p]<0&&labels[p]>=0;removed+=image.labels[p]>=0&&labels[p]<0;
    inside+=labels[p]!==image.labels[p]&&image.labels[p]>=0&&!before.boundary[p];
    contourAdded+=!before.boundary[p]&&d.boundary[p];contourRemoved+=before.boundary[p]&&!d.boundary[p];
  }
  return {changed,added,removed,inside,contourAdded,contourRemoved,alpha:stats(alpha,w,h),line:stats(line,w,h),gridDistanceHistogram:distanceHistogram,exteriorPixels:d.boundary.reduce((a,b)=>a+b,0),seed:d.seed<0?null:image.colors[d.seed]};
}
