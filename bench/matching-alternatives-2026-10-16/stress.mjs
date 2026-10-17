// RESEARCH ONLY: perturbation, independent CAM16 checks, and viewing assumptions.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {MODES,feature,point,score,makeMatcher,analyze,mapping,paint,Color,cam,Cam16,ViewingConditions} from './engine.js';
import {environment,toCam16} from '../../.tmp/matching-alternatives/node_modules/colorjs.io/src/spaces/cam16.js';
const out=new URL('./output/',import.meta.url),d=JSON.parse(await fs.readFile(new URL('results.json',out))),sources=await Promise.all(d.sources.map(async s=>({...s,data:new Uint8ClampedArray(await fs.readFile(new URL(s.id+'.rgba',out)))})));
const sprites=sources.filter(s=>s.group==='real-sprite'),palette=d.palettes;
function* neighbors(key){for(const shift of [16,8,0])for(const step of [-1,1]){const v=key>>shift&255;if(v+step>=0&&v+step<=255)yield key+step*2**shift;}}
const jitter=[],anchors=[],reorder=[],temporal=[],exact=[],alpha=[];
for(const mode of MODES.filter(m=>m!=='edge-aware')){
 let anchorN=0,anchorChanged=0,large=0,reorderN=0,reorderChanged=0,exactN=0;
 for(const p of palette){const m=makeMatcher(p.colors,mode),reverse=p.colors.toReversed(),r=makeMatcher(reverse,mode),features=p.colors.map(c=>feature(parseInt(c.slice(1),16)));
  for(const f of features){assert.equal(p.colors[m(f.key)],p.colors[features.indexOf(f)]);exactN++;for(const q of neighbors(f.key)){anchorN++;if(features[m(q)].key!==f.key)anchorChanged++;}}
  for(let i=0;i<128;i++){const k=(i*131071+17)&0xffffff;reorderN++;if(p.colors[m(k)]!==reverse[r(k)])reorderChanged++;}
  for(const s of sprites){const a=analyze(s);let n=0,changed=0,jumps=0;for(const [key,count]of a.hist){const x=features[m(key)];for(const q of neighbors(key)){const y=features[m(q)];n+=count;if(x.key!==y.key)changed+=count;if(Math.sqrt((x.L-y.L)**2+(x.a-y.a)**2+(x.b-y.b)**2)>=.1)jumps+=count;}}jitter.push({mode,source:s.id,palette:p.id,n,rate:changed/n,largeJumpRate:jumps/n});}
 }
 anchors.push({mode,n:anchorN,changed:anchorChanged,rate:anchorChanged/anchorN});reorder.push({mode,n:reorderN,changed:reorderChanged});exact.push({mode,n:exactN});
 const source=sources.find(s=>s.id==='source-color-alpha-ramp');const a=analyze(source,{keep:true}),p=palette[1],map=mapping(a,p.colors,mode),im=paint(a,p.colors,map,{keep:true});let checks=0;for(let i=0;i<a.keys.length;i++){assert.equal(im.data[i*4+3],source.data[i*4+3]);checks++;}alpha.push({mode,checks});
}
// Compare independent CAM16 implementations using exactly the same XYZ input,
// white, luminance, background and surround. Also compare their UCS projection.
const white=[.95047,1,1.08883],la=11.725677948856951,yb=18.418651851244416,env=environment(white,la,yb,'average',false),vc=ViewingConditions.make(white.map(v=>v*100),la,50,2,false);let camMax=0,ucsMax=0,camChecks=0;
for(let i=0;i<512;i++){
 const key=(i*32771+19)&0xffffff,c=new Color('srgb',[(key>>>16)/255,(key>>>8&255)/255,(key&255)/255]),xyz=c.to('xyz-d65').coords,one=toCam16(xyz,env),two=Cam16.fromXyzInViewingConditions(xyz[0]*100,xyz[1]*100,xyz[2]*100,vc);
 const j=1.7*one.J/(1+.007*one.J),m=Math.log1p(.0228*one.M)/.0228,h=one.h*Math.PI/180,a=m*Math.cos(h),b=m*Math.sin(h);
 camMax=Math.max(camMax,Math.abs(one.J-two.j),Math.abs(one.C-two.chroma),Math.abs(one.M-two.m));ucsMax=Math.max(ucsMax,Math.abs(j-two.jstar),Math.abs(a-two.astar),Math.abs(b-two.bstar));camChecks++;
}
assert(camMax<1e-8&&ucsMax<1e-8,`CAM implementations disagree ${camMax}/${ucsMax}`);
// Viewing-condition alternatives: these are assumptions, not measurements of the user's room.
const viewing=[],dim=ViewingConditions.make(undefined,4,20,1,false),bright=ViewingConditions.make(undefined,40,80,2,false);
for(const p of palette)for(const s of sprites){const a=analyze(s),normal=makeMatcher(p.colors,'cam16ucs');for(const [name,condition]of [['dim',dim],['bright',bright]]){const altered=makeMatcher(p.colors,'cam16ucs',{conditions:condition});let n=0,changed=0;for(const [k,count]of a.hist){n+=count;if(normal(k)!==altered(k))changed+=count;}viewing.push({source:s.id,palette:p.id,name,changed:changed/n});}}
// Context invariance is deliberately tested rather than assumed for the edge heuristic.
for(const mode of MODES){let same=0,total=0;const a=sources.find(s=>s.id==='owned-knight-a'),b=sources.find(s=>s.id==='owned-knight-b');for(const p of palette){const aa=analyze(a),bb=analyze(b),ma=mapping(aa,p.colors,mode),mb=mapping(bb,p.colors,mode);for(const key of aa.hist.keys())if(bb.hist.has(key)){total++;if(ma.get(key)===mb.get(key))same++;}}temporal.push({mode,same,total,changed:total-same});}
const jitterSummary=MODES.filter(m=>m!=='edge-aware').map(mode=>{const r=jitter.filter(x=>x.mode===mode);return{mode,rate:r.reduce((s,x)=>s+x.rate,0)/r.length,largeJumpRate:r.reduce((s,x)=>s+x.largeJumpRate,0)/r.length};});
const result={jitter,jitterSummary,anchors,reorder,exact,alpha,camValidation:{checks:camChecks,maxCoordinateError:camMax,maxUcsError:ucsMax,white,la,yb},viewing,temporal};await fs.writeFile(new URL('stress.json',out),JSON.stringify(result,null,2));console.table(jitterSummary);console.log(JSON.stringify({camValidation:result.camValidation,temporal:temporal.filter(x=>x.changed),anchors}));
