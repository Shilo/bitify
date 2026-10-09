// Review the production integration, using native masks and frozen comparators.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {analyze,mask} from '../../src/lib/bitify.js';
import {pngBytes,zipBytes} from '../../src/lib/save.js';
import {detect} from './icon-candidate.mjs';
const root=import.meta.dirname,fixtures=JSON.parse(readFileSync(`${root}/../../src/lib/fixtures/ai-inventory.json`));
mkdirSync(`${root}/.tmp`,{recursive:true});
writeFileSync(`${root}/.tmp/icon-before.js`,execFileSync('git',['show','274d86b:src/lib/icon.js']));
const {iconOf:oldIcon}=await import(pathToFileURL(`${root}/.tmp/icon-before.js`));
function components(ink,w,h){
 const seen=new Set(),groups=[];
 for(let s=0;s<ink.length;s++)if(ink[s]&&!seen.has(s)){
  const group=[s];seen.add(s);
  for(const p of group)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const x=p%w+dx,y=Math.floor(p/w)+dy,q=y*w+x;
   if(x>=0&&y>=0&&x<w&&y<h&&ink[q]&&!seen.has(q)){seen.add(q);group.push(q);}
  }groups.push(group);
 }return groups;
}
function prepareRegions(img){
 const {w,h,data}=img,ink=Uint8Array.from({length:w*h},(_,p)=>+(data[p*4+3]>=img.cut));
 const rim=ink.map((v,p)=>+(v&&(p%w===0||p%w===w-1||p<w||p>=w*(h-1)||!ink[p-1]||!ink[p+1]||!ink[p-w]||!ink[p+w])));
 const thin=ink.map((v,p)=>+(v&&!rim[p]&&((rim[p-1]&&rim[p+1])||(rim[p-w]&&rim[p+w]))));
 return {ink,rim,thin};
}
const methods=[{id:'source',label:'AI source'},{id:'before',label:'Previous Icon 50'},{id:'candidate',label:'Reviewed candidate'},{id:'keep',label:'New Icon 50 / Keep'},{id:'auto',label:'New Icon 50 / Auto'},{id:'high',label:'New Icon 100 / Auto'},{id:'stencil',label:'Stencil Auto / Keep'}];
const targets=JSON.parse(readFileSync(`${root}/icon-targets.json`)).items;
const rows=fixtures.map(f=>{
 const src={width:f.w,height:f.h,data:Uint8ClampedArray.from([...Buffer.from(f.indices,'base64')].flatMap(i=>f.palette[i]))},img=analyze(src),old=oldIcon(analyze(src));
 const before=Array.from(img.lum,(_,p)=>src.data[p*4+3]<128?0:old.ink[p]&&old.detail[p]>50?2:1),candidate=[...detect(img,{bays:'open',protectAll:true,openSeams:false}).mask];
 const variants={before,candidate,keep:[...mask(img,'icon',{border:'keep'})],auto:[...mask(img,'icon')],high:[...mask(img,'icon',{detail:100})],stencil:[...mask(img,'stencil')]};
 const prepared=prepareRegions(img),required=Object.values(targets[f.id]?.required??{}).flat().map(([x,y])=>y*f.w+x);
 for(const border of ['keep','auto','trim']){
  let previous=mask(img,'icon',{detail:0,border});
  for(let detail=1;detail<=100;detail++){
   const m=mask(img,'icon',{detail,border});
   assert(m.every((v,p)=>!!v===!!prepared.ink[p]&&!(previous[p]===1&&v===2)),`${f.id}/${border}/${detail}: support or monotonicity`);
   assert.equal(components(Uint8Array.from(m,v=>+(v===2)),f.w,f.h).length,components(prepared.ink,f.w,f.h).length,`${f.id}/${border}/${detail}: fragmentation`);
   previous=m;
  }
 }
 const measures=Object.fromEntries(Object.entries(variants).map(([id,m])=>[id,{removed:m.filter(v=>v===1).length,rim:m.filter((v,p)=>v===1&&prepared.rim[p]).length,core:m.filter((v,p)=>v===1&&prepared.thin[p]).length,target:required.filter(p=>m[p]===1).length,required:required.length,differenceFromCandidate:m.filter((v,p)=>v!==candidate[p]).length}]));
 return {id:f.id,w:f.w,h:f.h,rgba:[...src.data],variants,measures};
});
// Git can check out CRLF on Windows; fingerprint the candidate's canonical LF text.
const output={baselineCommit:'274d86b',productionSha256:createHash('sha256').update(readFileSync(`${root}/../../src/lib/icon-glyph.js`)).digest('hex'),candidateSha256:createHash('sha256').update(readFileSync(`${root}/icon-candidate.mjs`,'utf8').replace(/\r\n/g,'\n')).digest('hex'),methods,rows};
assert.equal(output.candidateSha256,'755ff52f0fac27c22b9fe1970d6e9a7fa51168260a17453a4479cf8db4c6323c');
assert(rows.every(r=>r.measures.auto.differenceFromCandidate===0),'Default production masks drifted from the approved candidate');
const exports=rows.map(r=>{
 const png=pngBytes({mask:Uint8Array.from(r.variants.auto),w:r.w,h:r.h,first:null,second:'#f0f6f0'}),view=new DataView(png.buffer,png.byteOffset),chunks={};
 for(let at=8;at<png.length;){const n=view.getUint32(at),name=String.fromCharCode(...png.subarray(at+4,at+8));chunks[name]=png.subarray(at+8,at+8+n);at+=n+12;}
 const header=new DataView(chunks.IHDR.buffer,chunks.IHDR.byteOffset);
 assert.equal(header.getUint32(0),r.w);assert.equal(header.getUint32(4),r.h);
 assert.equal(chunks.IHDR[8],2);assert.deepEqual([...chunks.tRNS],[0,0]);
 assert.deepEqual([...chunks.PLTE],[240,246,240,240,246,240,240,246,240]);
 const raw=inflateSync(chunks.IDAT),stride=1+Math.ceil(r.w/4);
 for(let y=0;y<r.h;y++){
  assert.equal(raw[y*stride],0);
  for(let x=0;x<r.w;x++)assert.equal((raw[y*stride+1+(x>>2)]>>(6-(x%4)*2))&3,r.variants.auto[y*r.w+x]);
 }
 return png;
});
writeFileSync(`${root}/integration-exports.zip`,zipBytes(rows.map(r=>`${r.id}.png`),exports));
output.exportChecks={items:exports.length,nativeDimensions:true,maskExact:true,oneInk:true,binaryAlpha:true};
writeFileSync(`${root}/integration-icon.json`,JSON.stringify(output));
console.log(JSON.stringify(rows.filter(r=>targets[r.id]).map(r=>({id:r.id,measures:r.measures})),null,2));
