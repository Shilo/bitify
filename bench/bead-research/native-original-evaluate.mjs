// Exact supplied native PNG test. No resize, background removal or palette fitting.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {simplifySelectedShades} from './guided-shade-spike.mjs';
import {solidBoundary,exteriorCells} from './solid-boundary.mjs';
import {spatialSimplify} from './semantic-spike.mjs';
import {rebuildOuter} from './contour-spike.mjs';
import {regions,toLab} from './regions.mjs';
import {prepareCleanupAsync,applyCleanup} from '../../src/lib/palette-cleanup.js';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
const require=createRequire(import.meta.url),{PNG}=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const bytes=readFileSync(process.argv[2]??'C:/Users/shilo/AppData/Local/Temp/codex-clipboard-9d2e63c4-2033-4308-adcc-d9406a5a2ec0.png'),png=PNG.sync.read(bytes),colors=[],map=new Map(),labels=new Int32Array(png.width*png.height).fill(-1);
for(let p=0;p<labels.length;p++)if(png.data[p*4+3]>=128){const c='#'+png.data.subarray(p*4,p*4+3).toString('hex');if(!map.has(c)){map.set(c,colors.length);colors.push(c);}labels[p]=map.get(c);}
assert.equal(png.width,96);assert.equal(png.height,96);assert.equal(colors.length,24);assert(png.data.every((v,i)=>i%4!==3||v===0||v===255));
const image={width:png.width,height:png.height,colors,labels},source={width:png.width,height:png.height,data:png.data},boundary=exteriorCells(image),labs=colors.map(toLab),selected=new Set(['#f3be91','#c18b70'].map(c=>map.get(c))),target=map.get('#200402'),keep=new Uint8Array(labels.length);
for(let y=30;y<=50;y++)for(let x=34;x<=65;x++)keep[y*96+x]=1;
const priv=new URL('../../.tmp/bead-research-private/native-original/',import.meta.url);mkdirSync(priv,{recursive:true});writeFileSync(new URL('original.png',priv),bytes);
const palette=preparePalette(colors),baseline=colorize(applyCleanup(quantize(source,palette),await prepareCleanupAsync([source],colors)),palette),cleanup=Int32Array.from(labels,(_,p)=>baseline.data[p*4+3]<128?-1:map.get('#'+Buffer.from(baseline.data.subarray(p*4,p*4+3)).toString('hex')));
const guided=simplifySelectedShades(image,{selected}).labels,guidedKeep=simplifySelectedShades(image,{selected,keep}).labels;
const variants=[['current-cleanup',cleanup],['selected-shades',guided],['selected-shades-keep',guidedKeep],['solid',solidBoundary(image,target)],['combined',solidBoundary({...image,labels:guided},target)],['combined-keep',solidBoundary({...image,labels:guidedKeep},target)],['spatial-auto',spatialSimplify(image).labels],['spatial-keep',spatialSimplify(image,{keep}).labels],['border-refill',rebuildOuter(image,{outlineColor:target,sourceShades:new Set(['#200402','#250603','#380d06'].map(c=>map.get(c))),refill:true,bandDepth:2}).labels]];
const small=out=>regions(out,96,96,8).filter(r=>r.pixels.length<=4),metrics=out=>({smallCells:small(out).reduce((s,r)=>s+r.pixels.length,0),selectedSmallCells:small(out).filter(r=>selected.has(r.label)).reduce((s,r)=>s+r.pixels.length,0),borderColors:new Set(Array.from(out).filter((c,p)=>boundary[p])).size,usedColors:new Set(out.filter(c=>c>=0)).size});
const rows=[],pinkAccentLabels=new Set(['#f7c4ae','#fc9884','#bf6251'].map(c=>map.get(c)));
// Count losses and gains separately. Original accent-cell retention does not
// imply unchanged accent area, nor do these RGB labels identify semantic blush.
for(const [name,out]of variants){let changed=0,alphaChanged=0,faceChanged=0,pinkAccentChanged=0,pinkAccentAdded=0,pinkAccentAddedInFace=0,faceDarkChanged=0,darkAdded=0,darkRemoved=0,borderChanged=0;
 const data=Buffer.from(png.data);for(let p=0;p<out.length;p++){
  assert.equal(out[p]<0,labels[p]<0);if((out[p]<0)!==(labels[p]<0))alphaChanged++;
  if(out[p]!==labels[p]){changed++;if(keep[p]){faceChanged++;if(labs[labels[p]][0]<.5)faceDarkChanged++;}if(pinkAccentLabels.has(labels[p]))pinkAccentChanged++;if(boundary[p])borderChanged++;}
  if(!pinkAccentLabels.has(labels[p])&&pinkAccentLabels.has(out[p])){pinkAccentAdded++;if(keep[p])pinkAccentAddedInFace++;}
  if(labels[p]>=0){const old=labs[labels[p]][0]<.5,next=labs[out[p]][0]<.5;if(!old&&next)darkAdded++;if(old&&!next)darkRemoved++;const rgb=parseInt(colors[out[p]].slice(1),16);for(let k=0;k<3;k++)data[p*4+k]=rgb>>>(16-k*8)&255;}
 }
 const encoded=PNG.sync.write({width:96,height:96,data}),witness=PNG.sync.read(encoded);assert.deepEqual(witness.data,data);writeFileSync(new URL(name+'.png',priv),encoded);
 rows.push({name,changed,alphaChanged,borderChanged,faceChanged,pinkAccentChanged,pinkAccentAdded,pinkAccentAddedInFace,faceDarkChanged,darkAdded,darkRemoved,...metrics(out)});
}
const report={sourceSha256:createHash('sha256').update(bytes).digest('hex'),width:96,height:96,sourceColors:24,occupied:labels.filter(c=>c>=0).length,transparent:labels.filter(c=>c<0).length,preprocessing:'None: exact native attached PNG, original alpha, original RGB palette',choices:{selectedFillShades:[...selected].map(c=>colors[c]),outlineColor:colors[target],optionalKeepRectangle:[34,30,65,50]},baseline:metrics(labels),rows};
writeFileSync(new URL('./native-original-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
