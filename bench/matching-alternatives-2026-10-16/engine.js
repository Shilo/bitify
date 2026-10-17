// RESEARCH ONLY. Dependencies are installed into .tmp, never the product.
import Color from '../../.tmp/matching-alternatives/node_modules/colorjs.io/src/index.js';
import deltaE2000 from '../../.tmp/matching-alternatives/node_modules/colorjs.io/src/deltaE/deltaE2000.js';
import deltaEHelmlab from '../../.tmp/matching-alternatives/node_modules/colorjs.io/src/deltaE/deltaEHelmlab.js';
import {Cam16} from '../../.tmp/matching-alternatives/node_modules/@material/material-color-utilities/hct/cam16.js';
import {ViewingConditions} from '../../.tmp/matching-alternatives/node_modules/@material/material-color-utilities/hct/viewing_conditions.js';
import {features as oldFeatures,delta2} from '../matching-spike-2026-10-16/engine.js';
export {Color,deltaE2000,Cam16,ViewingConditions};
export const MODES=['oklab','rgb','ok2','ciede2000','cam16ucs','hct','lab76','luv76','ipt','jz','itp','redmean','linear-rgb','hue4','chroma4','lightness4','oklrab','helmlab','oklch-equivalent','edge-aware'];
export const LABELS={oklab:'Oklab · current',rgb:'RGB · current',ok2:'ΔE OK2 · color priority',ciede2000:'CIEDE2000',cam16ucs:'CAM16-UCS',hct:'HCT · UCS-style distance',lab76:'CIELAB · ΔE76',luv76:'CIELUV · ΔE76',ipt:'IPT',jz:'Jzazbz · 203 nit white',itp:'ICtCp · ΔE ITP',redmean:'Redmean RGB','linear-rgb':'Linear RGB',hue4:'Hue priority · 4× hue²',chroma4:'Chroma priority · 4× chroma²',lightness4:'Lightness priority · 4× L²',oklrab:'Oklrab · revised lightness',helmlab:'Helmlab · experimental','oklch-equivalent':'OKLCH · equivalent Oklab','edge-aware':'Edge-aware · research heuristic'};
const base=new Map(),spaces=new Map(),cams=new Map();
export function clearCaches(){base.clear();spaces.clear();cams.clear();}
export function feature(key){if(!base.has(key)){const x=oldFeatures(key);x.C=Math.hypot(x.a,x.b);x.h=Math.atan2(x.b,x.a);base.set(key,x);}return base.get(key);}
export function inSpace(key,id){const k=key+':'+id;if(!spaces.has(k)){const x=feature(key);spaces.set(k,new Color('srgb',[x.R/255,x.G/255,x.B/255]).to(id));}return spaces.get(k);}
export function cam(key,conditions){if(conditions)return Cam16.fromIntInViewingConditions((0xff000000|key)>>>0,conditions);if(!cams.has(key))cams.set(key,Cam16.fromInt((0xff000000|key)>>>0));return cams.get(key);}
const euclid=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function ipt(key){
  const xyz=inSpace(key,'xyz-d65').coords;
  const l=.4002*xyz[0]+.7075*xyz[1]-.0807*xyz[2],m=-.2280*xyz[0]+1.1500*xyz[1]+.0612*xyz[2],s=.9184*xyz[2];
  const power=v=>Math.sign(v)*Math.abs(v)**.43,L=power(l),M=power(m),S=power(s);
  return[.4*L+.4*M+.2*S,4.455*L-4.851*M+.396*S,.8056*L+.3572*M-1.1628*S];
}
const spaceFor={lab76:'lab',luv76:'luv',jz:'jzazbz',itp:'ictcp',oklrab:'oklrab',helmlab:'helmlab-metric',ciede2000:'lab'};
export function point(key,mode){
  if(spaceFor[mode])return inSpace(key,spaceFor[mode]);
  if(mode==='ipt')return ipt(key);
  if(mode==='cam16ucs'||mode==='hct'){const c=cam(key);return[mode==='hct'?feature(key).cie*100:c.jstar,c.astar,c.bstar];}
  if(mode==='linear-rgb')return inSpace(key,'srgb-linear').coords;
  return feature(key);
}
export function score(x,y,mode){
  switch(mode){
    case 'rgb':return(x.R-y.R)**2+(x.G-y.G)**2+(x.B-y.B)**2;
    case 'redmean':{const r=(x.R+y.R)/2;return(2+r/256)*(x.R-y.R)**2+4*(x.G-y.G)**2+(2+(255-r)/256)*(x.B-y.B)**2;}
    case 'ok2':return(x.L-y.L)**2+4*(x.a-y.a)**2+4*(x.b-y.b)**2;
    case 'lightness4':return 4*(x.L-y.L)**2+(x.a-y.a)**2+(x.b-y.b)**2;
    case 'hue4':case 'chroma4':case 'oklch-equivalent':{
      const dc=(x.C-y.C)**2,dh=Math.max(0,(x.a-y.a)**2+(x.b-y.b)**2-dc);
      return(x.L-y.L)**2+(mode==='chroma4'?4:1)*dc+(mode==='hue4'?4:1)*dh;
    }
    case 'ciede2000':return deltaE2000(x,y)**2;
    case 'helmlab':return deltaEHelmlab(x,y)**2;
    case 'cam16ucs':case 'hct':case 'ipt':case 'linear-rgb':return euclid(x,y);
    case 'lab76':case 'luv76':case 'jz':case 'oklrab':return euclid(x.coords,y.coords);
    case 'itp':return(x.coords[0]-y.coords[0])**2+.25*(x.coords[1]-y.coords[1])**2+(x.coords[2]-y.coords[2])**2;
    default:return delta2(x,y);
  }
}
export function makeMatcher(colors,mode,{memo=true,conditions}={}){
  const keys=colors.map(c=>parseInt(c.slice(1),16)),exact=new Map(keys.map((k,i)=>[k,i])),cache=new Map(),p=keys.map(k=>conditions&&mode==='cam16ucs'?cam(k,conditions):point(k,mode));
  return key=>{
    if(exact.has(key))return exact.get(key);if(memo&&cache.has(key))return cache.get(key);
    let x=point(key,mode),best=Infinity,n=0;
    if(conditions&&mode==='cam16ucs'){const c=cam(key,conditions);x=[c.jstar,c.astar,c.bstar];}
    for(let i=0;i<keys.length;i++){
      const y=conditions&&mode==='cam16ucs'?[p[i].jstar,p[i].astar,p[i].bstar]:p[i],d=score(x,y,mode);
      if(!Number.isFinite(d)||d<0)throw Error(`Invalid distance ${mode}/${key}/${keys[i]}: ${d}`);
      // Production first-minimum behavior is the baseline. Candidates use RGB order for exact ties.
      if(d<best||d===best&&!['oklab','rgb','oklch-equivalent'].includes(mode)&&keys[i]<keys[n]){best=d;n=i;}
    }
    if(memo)cache.set(key,n);return n;
  };
}
export function analyze(image,{keep=false}={}){
  const keys=new Int32Array(image.width*image.height).fill(-1),hist=new Map(),pairs=new Map();
  for(let i=0;i<keys.length;i++){const a=i*4;if(image.data[a+3]<(keep?1:128))continue;const k=image.data[a]<<16|image.data[a+1]<<8|image.data[a+2];keys[i]=k;hist.set(k,(hist.get(k)||0)+1);}
  for(let i=0;i<keys.length;i++)if(keys[i]>=0)for(const j of [i%image.width<image.width-1?i+1:-1,i+image.width])if(j>=0&&j<keys.length&&keys[j]>=0&&keys[i]!==keys[j]){
    const a=Math.min(keys[i],keys[j]),b=Math.max(keys[i],keys[j]),id=a*16777216+b;pairs.set(id,(pairs.get(id)||0)+1);
  }
  const edges=[...pairs].map(([id,count])=>{const a=Math.floor(id/16777216),b=id%16777216;return{a,b,count,de:Math.sqrt(delta2(feature(a),feature(b))),dl:feature(a).L-feature(b).L};});
  return{keys,hist,edges,width:image.width,height:image.height,data:image.data};
}
export function mapping(analysis,colors,mode,options={}){
  const match=makeMatcher(colors,mode==='edge-aware'?'oklab':mode,options),map=new Map([...analysis.hist.keys()].map(k=>[k,match(k)]));
  if(mode!=='edge-aware')return map;
  // Exploratory coordinate descent. This is NOT a reproduction of a published region algorithm.
  // Preserve clipped neighbor contrast while minimizing point error. Exact palette members stay pinned.
  const p=colors.map(c=>feature(parseInt(c.slice(1),16))),exact=new Set(p.map(c=>c.key)),neighbors=new Map();
  for(const e of analysis.edges){if(!neighbors.has(e.a))neighbors.set(e.a,[]);if(!neighbors.has(e.b))neighbors.set(e.b,[]);neighbors.get(e.a).push({key:e.b,count:e.count,target:Math.min(.15,e.de)});neighbors.get(e.b).push({key:e.a,count:e.count,target:Math.min(.15,e.de)});}
  const order=[...analysis.hist.keys()].sort((a,b)=>a-b);
  for(let pass=0;pass<3;pass++)for(const key of order){if(exact.has(key))continue;const x=feature(key),weight=analysis.hist.get(key),near=neighbors.get(key)||[];let best=Infinity,winner=map.get(key);
    for(let i=0;i<p.length;i++){let cost=weight*delta2(x,p[i]);for(const n of near){const d=Math.min(.15,Math.sqrt(delta2(p[i],p[map.get(n.key)])));cost+=2*n.count*(d-n.target)**2;}if(cost<best){best=cost;winner=i;}}
    map.set(key,winner);
  }
  return map;
}
export function paint(analysis,colors,map,{keep=false}={}){
  const palette=colors.map(c=>parseInt(c.slice(1),16)),indices=new Uint16Array(analysis.keys.length),data=new Uint8ClampedArray(analysis.keys.length*4);
  for(let i=0;i<indices.length;i++){const key=analysis.keys[i];if(key<0){indices[i]=256;continue;}const n=map.get(key),rgb=palette[n];indices[i]=n;data[i*4]=rgb>>>16;data[i*4+1]=rgb>>>8&255;data[i*4+2]=rgb&255;data[i*4+3]=keep?analysis.data[i*4+3]:255;}
  return{indices,data,width:analysis.width,height:analysis.height};
}
export function render(image,colors,mode,options={}){const a=analyze(image,options);return paint(a,colors,mapping(a,colors,mode,options),options);}
export function measure(a,colors,map,baseMap,rgbMap){
  const p=colors.map(c=>feature(parseInt(c.slice(1),16)));let N=0,L=0,E=0,D=0,CAM=0,H=0,hueN=0,neutralC=0,neutralN=0,changed=0,differentBoth=0,exactBroken=0;
  const used=new Set(),members=new Set(p.map(c=>c.key));
  for(const [key,count]of a.hist){const x=feature(key),n=map.get(key),y=p[n];N+=count;used.add(n);L+=Math.abs(x.L-y.L)*count;E+=delta2(x,y)*count;D+=deltaE2000(inSpace(key,'lab'),inSpace(y.key,'lab'))*count;
    CAM+=Math.sqrt(score(point(key,'cam16ucs'),point(y.key,'cam16ucs'),'cam16ucs'))*count;
    if(x.C>=.05){hueN+=count;const angle=y.C<.02?90:Math.acos(Math.max(-1,Math.min(1,(x.a*y.a+x.b*y.b)/(x.C*y.C))))*180/Math.PI;H+=angle*count;}
    if(x.C<.02){neutralN+=count;neutralC+=y.C*count;}
    if(baseMap&&n!==baseMap.get(key))changed+=count;if(baseMap&&rgbMap&&n!==baseMap.get(key)&&n!==rgbMap.get(key))differentBoth+=count;
    if(members.has(key)&&p[n].key!==key)exactBroken+=count;
  }
  let edges=0,collapsed=0,inversions=0,toneEdges=0,contrastError=0;
  for(const e of a.edges){const x=p[map.get(e.a)],y=p[map.get(e.b)];if(e.de>=.05){edges+=e.count;if(x.key===y.key)collapsed+=e.count;contrastError+=Math.abs(Math.min(.15,Math.sqrt(delta2(x,y)))-Math.min(.15,e.de))*e.count;}if(Math.abs(e.dl)>=.03){toneEdges+=e.count;if(e.dl*(x.L-y.L)<-1e-12)inversions+=e.count;}}
  return{visible:N,used:used.size,changed:N?changed/N:0,differentBoth:N?differentBoth/N:0,L:N?L/N:0,OK:N?Math.sqrt(E/N):0,DE00:N?D/N:0,CAM:N?CAM/N:0,hue:hueN?H/hueN:0,hueN,neutralC:neutralN?neutralC/neutralN:0,neutralN,edgeCollapse:edges?collapsed/edges:0,edges,inversions:toneEdges?inversions/toneEdges:0,toneEdges,contrastError:edges?contrastError/edges:0,exactBroken};
}
