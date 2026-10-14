// Research only: explicit style replacement, not inferred artistic error correction.
import {neighbors,validateInput} from './regions.mjs';
import {exteriorBoundary,detectOutline} from './method-outline.mjs';
import {components} from './outline-probe.mjs';
const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
export function traceOuter(image) {
  validateInput(image);const {labels,width:w,height:h}=image,mask=Uint8Array.from(labels,l=>l>=0),trace=new Uint8Array(labels.length),paths=[];
  for(const region of components(mask,w,h,8)) {
    const start=Math.min(...region),sx=start%w,sy=Math.floor(start/w);let x=sx,y=sy,bx=sx-1,by=sy,first=null;const path=[];
    for(let step=0;step<labels.length*8;step++) {
      const startDir=dirs.findIndex(([dx,dy])=>x+dx===bx&&y+dy===by);let next=null,back=null;
      for(let k=1;k<=8;k++) {const d=(startDir+k+8)%8,[dx,dy]=dirs[d],nx=x+dx,ny=y+dy;
        if(nx>=0&&nx<w&&ny>=0&&ny<h&&mask[ny*w+nx]) {next=[nx,ny];const prev=dirs[(d+7)%8];back=[x+prev[0],y+prev[1]];break;}
      }
      if(!next){trace[y*w+x]=1;path.push(y*w+x);break;}
      if(first&&x===sx&&y===sy&&next[0]===first[0]&&next[1]===first[1])break;
      trace[y*w+x]=1;path.push(y*w+x);if(!first)first=next;[x,y]=next;[bx,by]=back;
      if(step===labels.length*8-1)throw new Error('Contour did not terminate');
    }
    paths.push(path);
  }
  return {trace,paths};
}
export function rebuildOuter(image,{outlineColor,sourceShades,refill=false,bandDepth=2}={}) {
  validateInput(image);const {labels,width:w,height:h}=image,d=detectOutline(image),seed=outlineColor??d.seed,selected=sourceShades??d.shades,out=labels.slice();
  if(seed<0||seed>=image.colors.length)return {labels:out,abstained:true};
  // Opaque canvas does not contain a foreground/background silhouette.
  if(labels.every(l=>l>=0))return {labels:out,abstained:true};
  const {trace,paths}=traceOuter(image),boundary=exteriorBoundary(labels,w,h),depth=new Int32Array(labels.length).fill(-1),q=[];
  for(let p=0;p<labels.length;p++)if(boundary[p]){depth[p]=0;q.push(p);}
  for(let j=0;j<q.length;j++)for(const n of neighbors(q[j],w,h))if(labels[n]>=0&&depth[n]<0){depth[n]=depth[q[j]]+1;q.push(n);}
  const removal=Uint8Array.from(labels,(l,p)=>Number(refill&&l>=0&&!trace[p]&&depth[p]<bandDepth&&selected.has(l))),fill=new Int32Array(labels.length).fill(-1),queue=[];
  // Flood source fill labels into candidate old border cells, never through the new contour.
  for(let p=0;p<labels.length;p++)if(labels[p]>=0&&!trace[p]&&!selected.has(labels[p])){fill[p]=labels[p];queue.push(p);}
  for(let j=0;j<queue.length;j++)for(const n of neighbors(queue[j],w,h))if(removal[n]&&fill[n]<0){fill[n]=fill[queue[j]];queue.push(n);}
  let refilled=0,unresolved=0;
  for(let p=0;p<labels.length;p++)if(trace[p])out[p]=seed;else if(removal[p]){if(fill[p]>=0){out[p]=fill[p];refilled++;}else unresolved++;}
  return {labels:out,trace,paths,abstained:false,refilled,unresolved,depth};
}
