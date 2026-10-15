import { generatePaletteAsync as baseGenerate } from '../../src/lib/palette-generated.js';
import { selectPaletteSubset as baseSelect } from '../../src/lib/palette-limit.js';
import { generatePaletteAsync as nextGenerate } from './palette-generated.candidate.js';
import { selectPaletteSubset as nextSelect } from './palette-limit.candidate.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { quantizeAsync } from '../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const source=(w,h,pixel)=>{const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(pixel(x,y),(y*w+x)*4);return{width:w,height:h,data};};
const art=[[220,30,30],[30,200,40],[40,60,220]];
const res64=FULL_PRESETS.find(p=>p.id==='preset-res64');if(!res64)throw new Error('Missing stable research target preset-res64');
const cases=[
  ['alpha1-spill',source(40,40,(x,y)=>x>=10&&x<30&&y>=10&&y<30?[...art[(x-10)%3===0?0:(y-10)%2?1:2],255]:[255,0,255,1])],
  ['alpha6-halo',source(40,40,(x,y)=>x>=10&&x<30&&y>=10&&y<30?[...art[(x-10)%3===0?0:(y-10)%2?1:2],255]:[255,0,255,6])],
  ['all-faint',source(64,32,(x,y)=>[...art[Math.floor(x/22)%3],1+Math.round(20*y/31)])],
  ['many-soft-colors',source(80,64,(x,y)=>[(x*37+y*7)%256,(x*19+y*23)%256,(x*3+y*67)%256,1+(x*11+y*31)%254])],
  ['intentional-cyan-halo',source(64,64,(x,y)=>{const d=Math.hypot(x-31.5,y-31.5);return d<9?[[28,32,44,255],[110,100,88,255],[232,210,166,255]][Math.floor(d)%3]:d<29?[38,206,244,48]:[0,0,0,0];})],
  ['opaque',source(32,32,(x,y)=>[...art[(x+y)%3],255])],
  ['binary',source(32,32,(x,y)=>[...art[(x+y)%3],x%3?255:0])],
];
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
async function run(src,weighting,kind,metric,dither='none'){
  const alphaWeight=weighting==='baseline'?'none':weighting,gen=weighting==='baseline'?baseGenerate:nextGenerate,sel=weighting==='baseline'?baseSelect:nextSelect;
  let colors=kind==='fixed'?res64.colors:(await gen(captureGeneratedSources([{original:src}],1),{alphaWeight})).colors;
  const cap=kind==='fixed'?4:3;
  if(colors.length>cap){const r=await sel(colors,cap,async function*(){for(let at=0;at<src.data.length;at+=131072)yield{data:src.data.subarray(at,at+131072),weight:1};},{alphaCut:1,metric,alphaWeight});colors=r.indices.map(i=>colors[i]);}
  const q=await quantizeAsync(src,colors,128,undefined,undefined,{metric,alphaMode:'keep',dither,ditherStrength:50});
  const rgba=new Uint8Array(src.data.length), parsed=colors.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
  let alphaChanges=0,opaqueChanges=0,membershipViolations=0;
  const members=new Set(colors.map(c=>parseInt(c.slice(1),16)));
  for(let i=0;i<q.indices.length;i++){const p=i*4;if(src.data[p+3]&&q.indices[i]>=colors.length)membershipViolations++;if(q.indices[i]<colors.length){rgba.set(parsed[q.indices[i]],p);rgba[p+3]=q.alpha[i];}if(rgba[p+3]&&!members.has(rgba[p]<<16|rgba[p+1]<<8|rgba[p+2]))membershipViolations++;if(src.data[p+3]!==rgba[p+3])alphaChanges++;if(src.data[p+3]===255&&[0,1,2].some(c=>rgba[p+c]!==src.data[p+c]))opaqueChanges++;}
  return{colors,hash:await hash(rgba),alphaChanges,opaqueChanges,membershipViolations};
}
document.querySelector('#run').addEventListener('click',async()=>{
  const button=document.querySelector('#run'),status=document.querySelector('#status'),out=document.querySelector('#out');button.disabled=true;status.textContent='Running';
  try{
    const report={userAgent:navigator.userAgent,at:new Date().toISOString(),cases:[],assertions:[],scope:'Research modules in native browser; not built-app native decode or export.'};
    for(const[name,src]of cases)for(const kind of ['auto','fixed'])for(const metric of ['oklab','rgb']){
      const row={name,kind,metric,variants:[]};
      for(const weighting of ['baseline','none','linear','squared']){const t=performance.now();const r=await run(src,weighting,kind,metric);row.variants.push({weighting,ms:performance.now()-t,...r});report.assertions.push({name:`alpha:${name}:${kind}:${metric}:${weighting}`,pass:r.alphaChanges===0});report.assertions.push({name:`membership:${name}:${kind}:${metric}:${weighting}`,pass:r.membershipViolations===0});}
      report.assertions.push({name:`research-control:${name}:${kind}:${metric}`,pass:row.variants[0].hash===row.variants[1].hash});
      if(['opaque','binary'].includes(name))for(const r of row.variants)report.assertions.push({name:`unchanged:${name}:${kind}:${metric}:${r.weighting}`,pass:r.hash===row.variants[0].hash});
      report.cases.push(row);status.textContent=`Running ${report.cases.length}/${cases.length*4} cases`;
    }
    // Source-coordinate dithering retains exact opacity for a soft fixture.
    for(const weighting of ['linear','squared']){const r=await run(cases[1][1],weighting,'auto','oklab','4x4');report.assertions.push({name:`dither-alpha:${weighting}`,pass:r.alphaChanges===0});report.assertions.push({name:`dither-membership:${weighting}`,pass:r.membershipViolations===0});}
    report.failures=report.assertions.filter(a=>!a.pass);report.pass=report.failures.length===0;
    const device=new URL(location.href).searchParams.get('device')??'browser';
    const saved=await fetch('/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device,report})});report.serverReceipt=await saved.json();
    out.textContent=JSON.stringify(report,null,2);status.textContent=report.pass?'PASS':'FAIL';
  }catch(error){status.textContent='ERROR';out.textContent=String(error.stack??error);}finally{button.disabled=false;}
});
