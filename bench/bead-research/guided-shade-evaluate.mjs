import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {simplifySelectedShades} from './guided-shade-spike.mjs';
import {solidBoundary,exteriorCells} from './solid-boundary.mjs';
import {regions,toLab,distance} from './regions.mjs';
const require=createRequire(import.meta.url),{PNG}=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const source=new URL('../../.tmp/bead-research-private/semantic-spike/',import.meta.url),dest=new URL('../../.tmp/bead-research-private/guided-shade/',import.meta.url);mkdirSync(dest,{recursive:true});
const decode=png=>{const colors=[],map=new Map(),labels=new Int32Array(png.width*png.height).fill(-1);for(let p=0;p<labels.length;p++)if(png.data[p*4+3]>=128){const c='#'+[0,1,2].map(k=>png.data[p*4+k].toString(16).padStart(2,'0')).join('');if(!map.has(c)){map.set(c,colors.length);colors.push(c);}labels[p]=map.get(c);}return {width:png.width,height:png.height,labels,colors,rgba:png.data};};
const encode=(img,labels)=>{const data=Buffer.from(img.rgba);for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(img.colors[labels[p]].slice(1),16);for(let k=0;k<3;k++)data[p*4+k]=rgb>>>(16-k*8)&255;}return PNG.sync.write({width:img.width,height:img.height,data});};
const rows=[],combined=[];
for(const id of ['original-raw','original-prepared','latest','pose0','pose1','pose2','pose3']){
 const file=id==='original-raw'?new URL('../fixtures/original-attachment-native.png',source):id==='original-prepared'?new URL('../fixtures/original-attachment-background-prepared.png',source):new URL(id+'-original.png',source);
 const image=decode(PNG.sync.read(readFileSync(file))),selected=new Set(['#f3be91','#c18b70'].map(c=>{
  const exact=image.colors.indexOf(c);if(exact>=0)return exact;
  const lab=toLab(c);return image.colors.map((color,i)=>({i,error:distance(lab,toLab(color))})).sort((a,b)=>a.error-b.error)[0].i;
 }));
 for(const faceKeep of [false,true]){
  const keep=new Uint8Array(image.labels.length);if(faceKeep){const rect=id==='latest'||id.startsWith('original-')?[34,30,65,50]:id==='pose0'?[27,17,67,53]:[26,25,69,53];for(let y=rect[1];y<=rect[3];y++)for(let x=rect[0];x<=rect[2];x++)keep[y*image.width+x]=1;}
  const out=simplifySelectedShades(image,{selected,keep}),labs=image.colors.map(toLab);
  let edits=0,keepEdits=0,darkEdits=0,alphaEdits=0;
  for(let p=0;p<image.labels.length;p++)if(image.labels[p]!==out.labels[p]){edits++;if(keep[p])keepEdits++;if(labs[image.labels[p]]?.[0]<.5||labs[out.labels[p]]?.[0]<.5)darkEdits++;if((image.labels[p]<0)!==(out.labels[p]<0))alphaEdits++;}
  if(keepEdits||darkEdits||alphaEdits)throw new Error('Guided constraints failed');
  const metrics=labels=>{const r=regions(labels,image.width,image.height,8),selectedSmall=r.filter(r=>selected.has(r.label)&&r.pixels.length<=4);return {allSmall:r.filter(r=>r.pixels.length<=4).reduce((s,r)=>s+r.pixels.length,0),selectedSmall:selectedSmall.reduce((s,r)=>s+r.pixels.length,0),selectedTotal:labels.filter(c=>selected.has(c)).length,colors:new Set(labels.filter(c=>c>=0)).size};};
  const file=id+'-'+(faceKeep?'keep':'selected')+'.png';writeFileSync(new URL(file,dest),encode(image,out.labels));rows.push({id,faceKeep,shadeSelections:selected.size,selectedColors:[...selected].map(c=>image.colors[c]),edits,keepEdits,darkEdits,alphaEdits,before:metrics(image.labels),after:metrics(out.labels),merged:out.merged,abstained:out.abstained,file});
  if(id==='original-prepared'){
   const target=image.colors.indexOf('#200402'),border=exteriorCells(image),labels=solidBoundary({...image,labels:out.labels},target);let changes=0,borderChanges=0,insideChanges=0,occupancyChanges=0,faceChanges=0;
   for(let p=0;p<labels.length;p++){if((labels[p]<0)!==(image.labels[p]<0))occupancyChanges++;if(labels[p]!==image.labels[p]){changes++;if(border[p])borderChanges++;else insideChanges++;if(keep[p])faceChanges++;}}
   if(occupancyChanges||faceChanges)throw Error('Combined constraints failed');
   const borderColors=labels=>new Set(Array.from(labels).filter((c,p)=>border[p])).size;
   const comboFile=id+'-combined-'+(faceKeep?'keep':'selected')+'.png';writeFileSync(new URL(comboFile,dest),encode(image,labels));combined.push({id,faceKeep,outlineColor:image.colors[target],changes,borderChanges,insideChanges,occupancyChanges,keptFaceChanges:faceChanges,borderColorsBefore:borderColors(image.labels),borderColorsAfter:borderColors(labels),before:metrics(image.labels),after:metrics(labels),file:comboFile});
  }
 }
}
writeFileSync(new URL('./guided-shade-results.json',import.meta.url),JSON.stringify({contract:'Two selected shades; only original 8-connected components up to four cells; nearest adjacent large nonprotected fill; fixed squaredOklab .04; optional face Keep',selectionPolicy:'Original/latest: exact two shades from isolated-color references. Other poses: nearest Oklab source swatches used as designer-choice proxies, not maker annotations or automatic role recognition.',background:'Current attachment is fully opaque with two baked checker shades. Original-prepared explicitly removes those two background colors first; original-raw is a diagnostic, not a valid transparent silhouette.',cases:7,correlation:'same character poses/background variants, not independent held-outs',rows,combined},null,2));console.log(JSON.stringify({original:rows.filter(r=>r.id.startsWith('original-')).map(({id,faceKeep,selectedColors,edits,before,after})=>({id,faceKeep,selectedColors,edits,before,after})),combined},null,2));
