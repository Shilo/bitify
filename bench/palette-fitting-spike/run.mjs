// Offline research only. Production source is never changed; no service requests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import omggif from 'omggif';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { quantize, colorize } from '../../src/lib/quantize.js';
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const dir=import.meta.dirname,hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const saveJson=(name,value)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');
const corePath=new URL('../../src/lib/palette-generated.js',import.meta.url),core=fs.readFileSync(corePath,'utf8');
assert.equal(core.split('COLORS = GENERATED_MAX_COLORS').length,2,'The experiment needs exactly one capacity constant');
async function fittedAt(k){
 const edited=core.replace('COLORS = GENERATED_MAX_COLORS','COLORS = '+k).replace(/from '([^']+)'/g,(_,relative)=>"from '"+new URL(relative,corePath).href+"'");
 return (await import('data:text/javascript;base64,'+Buffer.from(edited).toString('base64'))).generatePaletteAsync;
}
const variants=new Map();for(const k of[2,4,8,16])variants.set(k,await fittedAt(k));
const linear=v=>v<=.04045*255?v/255/12.92:((v/255+.055)/1.055)**2.4;
function lab(r,g,b){r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const distance=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
const image=(w,h,pixel)=>({width:w,height:h,data:Uint8ClampedArray.from(Array.from({length:w*h},(_,i)=>pixel(i%w,Math.floor(i/w))).flat())});
const rgbaKey=(im,p)=>'#'+Buffer.from(im.data.subarray(p,p+3)).toString('hex');
async function png(file,im){const width=im.width??im.w,height=im.height??im.h;await sharp(im.data,{raw:{width,height,channels:4}}).png().toFile(path.join(dir,file));}
async function input(name,file){const bytes=fs.readFileSync(file),decoded=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const original={width:decoded.info.width,height:decoded.info.height,data:new Uint8ClampedArray(decoded.data)};await png(name+'-source.png',original);return{name,original,provenance:{file:path.relative(process.cwd(),file instanceof URL?fileURLToPath(file):file),pngSha256:hash(bytes),rgbaSha256:hash(original.data)}};}
const sprite=await input('sprite',new URL('../icon-research/general-source.png',import.meta.url)),armor=await input('armor',new URL('../icon-research/breastplate-source.png',import.meta.url));
const ramp={name:'ramp',original:image(64,32,(x)=>{const v=Math.round(x*255/63);return[v,v,v,255];})};
const cube={name:'cube',original:image(64,64,(x,y)=>[Math.round(x%16*255/15),Math.round(y%16*255/15),Math.round((Math.floor(x/16)+Math.floor(y/16)*4)*255/15),255])};
await png('ramp-source.png',ramp.original);await png('cube-source.png',cube.original);
const changed={...armor.original,data:armor.original.data.slice()};for(let p=0;p<changed.data.length;p+=4)if(changed.data[p+3]>=128&&changed.data[p+2]>changed.data[p])changed.data[p]=Math.min(255,changed.data[p]+25);
const clip={name:'held-armor-clip',original:armor.original,frames:[{original:armor.original,delay:40},{original:changed,delay:160},{original:armor.original,delay:80}],loop:0};
await png('clip-frame-1.png',changed);
const clipColors=[...new Set(clip.frames.flatMap(f=>Array.from({length:f.original.width*f.original.height},(_,i)=>f.original.data[i*4+3]>=128?rgbaKey(f.original,i*4):null).filter(Boolean)))];
assert(clipColors.length<256,'This exact source GIF needs room for transparency');
const clipTable=[0,...clipColors.map(c=>parseInt(c.slice(1),16))];while(clipTable.length<2||clipTable.length&(clipTable.length-1))clipTable.push(0);
const clipBytes=new Uint8Array(65536),writer=new omggif.GifWriter(clipBytes,armor.original.width,armor.original.height,{palette:clipTable,loop:0});
for(const frame of clip.frames){const indices=Uint8Array.from({length:frame.original.width*frame.original.height},(_,i)=>frame.original.data[i*4+3]<128?0:clipColors.indexOf(rgbaKey(frame.original,i*4))+1);writer.addFrame(0,0,frame.original.width,frame.original.height,indices,{delay:frame.delay/10,transparent:0,disposal:2});}
const sourceGif=clipBytes.subarray(0,writer.end());fs.writeFileSync(path.join(dir,'duration-weighted-source.gif'),sourceGif);
const reader=new omggif.GifReader(sourceGif);assert.equal(reader.numFrames(),3);assert.equal(reader.loopCount(),0);
for(let i=0;i<3;i++){const data=new Uint8Array(reader.width*reader.height*4);reader.decodeAndBlitFrameRGBA(i,data);assert.equal(reader.frameInfo(i).delay*10,clip.frames[i].delay);for(let p=0;p<data.length;p+=4){assert.equal(data[p+3],clip.frames[i].original.data[p+3]>=128?255:0);if(data[p+3])assert.deepEqual([...data.subarray(p,p+3)],[...clip.frames[i].original.data.subarray(p,p+3)]);}clip.frames[i]={original:{width:reader.width,height:reader.height,data},delay:clip.frames[i].delay};}
clip.original=clip.frames[0].original;
const frames=item=>item.frames??[{original:item.original,delay:1}];
const visibleMass=item=>frames(item).reduce((sum,f)=>sum+Array.from({length:f.original.width*f.original.height},(_,i)=>f.original.data[i*4+3]>=128?f.delay:0).reduce((a,b)=>a+b,0),0);
function readChunks(items,{equalAsset=false}={}){return async function*(){for(const item of items){const mass=equalAsset?visibleMass(item):1;for(const frame of frames(item))yield{data:frame.original.data,weight:frame.delay/mass};}};}
async function limited(colors,k,items,equalAsset=false){if(colors.length<=k)return [...colors];const selected=await selectPaletteSubset(colors,k,readChunks(items,{equalAsset}),{alphaCut:128,metric:'oklab'});return selected.indices.map(i=>colors[i]);}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function timed(fn){const ms=[];let result;for(let i=0;i<3;i++){const begin=performance.now();result=await fn();ms.push(performance.now()-begin);}return{result,ms,medianMs:median(ms)};}
function render(item,colors){return frames(item).map(f=>{const result=quantize(f.original,colors,128);return{...colorize(result,colors),delay:f.delay,indices:result.indices};});}
function score(item,outputs){let error=0,mass=0,alphaMismatches=0;const used=new Set();for(let f=0;f<outputs.length;f++){const original=frames(item)[f].original,output=outputs[f],weight=frames(item)[f].delay;assert.equal(output.w,original.width);assert.equal(output.h,original.height);for(let p=0;p<original.data.length;p+=4){if(output.data[p+3]!== (original.data[p+3]>=128?255:0))alphaMismatches++;if(original.data[p+3]<128)continue;error+=distance(lab(...original.data.subarray(p,p+3)),lab(...output.data.subarray(p,p+3)))*weight;mass+=weight;used.add(rgbaKey(output,p));}}return{pointOklabMSE:error/mass,usedColors:[...used],usedCount:used.size,alphaMismatches};}
const scopes=[... [sprite,armor,ramp,cube].map(item=>({name:item.name,items:[item]})),{name:'whole-wall',items:[sprite,armor,ramp,cube]},{name:'duration-weighted-clip',items:[clip]}];
const report={method:{offline:true,productionEdited:false,sourceCoreSha256:hash(core),directExperiment:'In-memory module changes only COLORS = GENERATED_MAX_COLORS to requested K; uses the original exported accumulator/generator with original source validation, equal nonempty asset mass, source alpha128 and frame-delay weighting.',samples:'Three sequential core runs per phase; median includes cooperative scheduler turns, excludes worker transfer, source decode and UI rendering. Cold totals are sums of separately measured fit and selection medians, not an end-to-end wall timing.',matching:'Oklab, dithering Off, Cleanup Off',error:'Mean squared Oklab point error over visible source pixels, duration-weighted within each asset; equal-weight asset mean across wall.',semanticCaution:'Current Auto64 fits one shared wall palette, then cap selects separate per-asset subsets. DirectK fits one shared K-color wall palette. A separate shared-subset control makes equal-scope shared-K comparisons.'},sources:scopes.slice(0,4).map(s=>({name:s.name,width:s.items[0].original.width,height:s.items[0].original.height,...s.items[0].provenance})),clip:{file:'duration-weighted-source.gif',pngFrameSource:'armor-source.png plus one channel-adjusted frame',sha256:hash(sourceGif),frames:3,delays:[40,160,80],weights:'Original frame colors, red-channel adjustment on blue-dominant body pixels; changed frame held160ms versus40ms and80ms original frames',independentGifRoundtrip:true},scopes:[],locks:{}};
for(const scope of scopes){
 const snapshot=captureGeneratedSources(scope.items,128),auto=await timed(()=>generatePaletteAsync(snapshot)),rows=[];
 for(const k of[2,4,8,16]){
  const direct=await timed(()=>variants.get(k)(snapshot));
  const subset=await timed(async()=>{const palettes=[];for(const item of scope.items)palettes.push(await limited(auto.result.colors,k,[item]));return palettes;});
  const shared=await timed(()=>limited(auto.result.colors,k,scope.items,true));
  const variantsOut=[{name:'auto64-then-per-asset-cap',palettes:subset.result,fitMs:auto.medianMs,selectMs:subset.medianMs},{name:'direct-shared-k-fit',palettes:scope.items.map(()=>direct.result.colors),fitMs:direct.medianMs,selectMs:0},{name:'auto64-then-shared-subset-control',palettes:scope.items.map(()=>shared.result),fitMs:auto.medianMs,selectMs:shared.medianMs}];
  const methods=[];
  for(const method of variantsOut){let mean=0;const assets=[],union=new Set();for(let i=0;i<scope.items.length;i++){const item=scope.items[i],outputs=render(item,method.palettes[i]),metrics=score(item,outputs);assert.equal(metrics.alphaMismatches,0);assert(method.palettes[i].length<=k);for(const c of metrics.usedColors){assert(method.palettes[i].includes(c));union.add(c);}mean+=metrics.pointOklabMSE/scope.items.length;const files=[];for(let f=0;f<outputs.length;f++){const file=scope.name+'-k'+k+'-'+method.name+'-'+item.name+'-'+f+'.png';await png(file,outputs[f]);files.push(file);}assets.push({name:item.name,palette:method.palettes[i],...metrics,files});}methods.push({name:method.name,pointOklabMSE:mean,globalUsedColorUnion:union.size,fitMedianMs:method.fitMs,selectMedianMs:method.selectMs,coldTotalMedianSumMs:method.fitMs+method.selectMs,assets});}
  rows.push({k,methods,directFitSamplesMs:direct.ms,capSamplesMs:subset.ms,sharedSubsetSamplesMs:shared.ms});
 }
 report.scopes.push({name:scope.name,auto64Colors:auto.result.colors,auto64FitSamplesMs:auto.ms,auto64FitMedianMs:auto.medianMs,rows});console.log('Measured',scope.name);
}

// A deliberately tiny counterexample: one red eye among broad blue-gray shading.
const redEye=image(16,16,(x,y)=>x<2||y<2||x>13||y>13?[0,0,0,0]:x===10&&y===5?[255,0,0,255]:y<7?[64,96,128,255]:y<11?[84,112,144,255]:[32,48,80,255]);
const mutedEye={...redEye,data:redEye.data.slice()};mutedEye.data.set([106,59,59,255],(5*16+10)*4);
const lockPalette=['#203050','#406080','#547090','#ff0000'];
for(const [label,original] of [['exact-red-eye',redEye],['muted-eye',mutedEye]]){
 const item={name:label,original},unlocked=await limited(lockPalette,2,[item]),candidates=lockPalette.filter(c=>c!=='#ff0000').map(c=>['#ff0000',c]);
 const measured=candidates.map(colors=>({colors,outputs:render(item,colors)}));for(const candidate of measured)candidate.metrics=score(item,candidate.outputs);measured.sort((a,b)=>a.metrics.pointOklabMSE-b.metrics.pointOklabMSE);
 const locked=measured[0],baseline=render(item,unlocked),redPixels=outputs=>outputs[0].indices.reduce((n,_,i)=>n+(rgbaKey(outputs[0],i*4)==='#ff0000'&&outputs[0].data[i*4+3]>0),0);
 await png(label+'-source.png',original);await png(label+'-unlocked-cap2.png',baseline[0]);await png(label+'-red-in-palette-cap2.png',locked.outputs[0]);
 report.locks[label]={palette:lockPalette,unlockedSubset:unlocked,unlocked:score(item,baseline),unlockedRedPixels:redPixels(baseline),lockedSubset:locked.colors,locked:locked.metrics,lockedRedPixels:redPixels(locked.outputs),eyeOutputUnlocked:rgbaKey(baseline[0],(5*16+10)*4),eyeOutputLocked:rgbaKey(locked.outputs[0],(5*16+10)*4)};
}
saveJson('results.json',report);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const sheets=[];
for(const scope of report.scopes){const methods=['auto64-then-per-asset-cap','direct-shared-k-fit'];const body=scope.rows.map(row=>'<section><h2>K '+row.k+'</h2>'+row.methods.filter(m=>methods.includes(m.name)).map(m=>'<article><h3>'+escape(m.name)+'</h3><p>Point '+m.pointOklabMSE.toFixed(7)+'; global used '+m.globalUsedColorUnion+'; cold core '+m.coldTotalMedianSumMs.toFixed(1)+' ms</p>'+m.assets.map(a=>a.files.map(file=>'<img alt="'+escape(a.name)+'"'+(scope.name==='armor'?' width="16"':'')+' src="'+file+'"><img class="large" alt="Enlarged '+escape(a.name)+'" src="'+file+'">').join('')).join('')+'</article>').join('')+'</section>').join('');const file=scope.name+'-comparison.html';fs.writeFileSync(path.join(dir,file),'<!doctype html><meta charset="utf-8"><title>'+scope.name+' fitting</title><style>body{font:14px system-ui;background:#fffdf9;color:#241d2d;margin:24px}section{display:flex;gap:16px;align-items:start;margin:20px 0}article{width:44%;border:1px solid #ddd;padding:10px}img{image-rendering:pixelated;background:#dedbd5;margin:4px;vertical-align:top}.large{width:192px;height:192px;object-fit:contain}</style><h1>'+scope.name+': direct K vs Auto64 + cap</h1><p>Native-size images and nearest-neighbor enlarged copies. Research only; point error is not an artistic quality score.</p>'+body);sheets.push(file);}
// Compact native/detail figures for the two actual-art sources, four K values each.
for(const scope of report.scopes.filter(s=>['sprite','armor'].includes(s.name))){const cw=330,ch=250,overlays=[{input:Buffer.from('<svg width="660" height="50"><text x="8" y="24" font-family="Arial" font-size="16">Original: native pixels and enlarged</text></svg>'),left:0,top:0},{input:fs.readFileSync(path.join(dir,scope.name+'-source.png')),left:20,top:90},{input:await sharp(path.join(dir,scope.name+'-source.png')).resize(160,160,{kernel:'nearest'}).png().toBuffer(),left:130,top:80}];for(let r=0;r<4;r++)for(let c=0;c<2;c++){const m=scope.rows[r].methods[c],im=await sharp(path.join(dir,m.assets[0].files[0])).resize(160,160,{kernel:'nearest',fit:'contain',background:'#dedbd5'}).png().toBuffer(),label='<svg width="330" height="70"><g font-family="Arial" font-size="13" fill="#241d2d"><text x="8" y="20">K'+scope.rows[r].k+' '+(c?'Direct shared K fit':'Auto64 then per-asset cap')+'</text><text x="8" y="42">Point '+m.pointOklabMSE.toFixed(7)+'</text><text x="8" y="61">'+m.coldTotalMedianSumMs.toFixed(2)+' ms core | '+m.globalUsedColorUnion+' used</text></g></svg>';overlays.push({input:Buffer.from(label),left:c*cw,top:(r+1)*ch},{input:im,left:c*cw+130,top:(r+1)*ch+80},{input:fs.readFileSync(path.join(dir,m.assets[0].files[0])),left:c*cw+20,top:(r+1)*ch+90});}await sharp({create:{width:cw*2,height:ch*5,channels:4,background:'#fffdf9'}}).composite(overlays).png().toFile(path.join(dir,scope.name+'-comparison.png'));}
const locksOverlays=[];for(let r=0;r<2;r++){const name=r?'muted-eye':'exact-red-eye',files=[name+'-source.png',name+'-unlocked-cap2.png',name+'-red-in-palette-cap2.png'];for(let c=0;c<3;c++){const label=['Source','Cap2: no lock','Cap2: red retained'][c];locksOverlays.push({input:Buffer.from('<svg width="220" height="60"><g font-family="Arial" font-size="13"><text x="8" y="22">'+name+'</text><text x="8" y="45">'+label+'</text></g></svg>'),left:c*220,top:r*230},{input:await sharp(path.join(dir,files[c])).resize(128,128,{kernel:'nearest'}).png().toBuffer(),left:c*220+70,top:r*230+75},{input:fs.readFileSync(path.join(dir,files[c])),left:c*220+16,top:r*230+85});}}await sharp({create:{width:660,height:460,channels:4,background:'#fffdf9'}}).composite(locksOverlays).png().toFile(path.join(dir,'color-lock-counterexamples.png'));
fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><title>Auto fitting spike</title><h1>Offline fitting comparisons</h1>'+sheets.map(file=>'<p><a href="'+file+'">'+file+'</a></p>').join(''));
console.log(JSON.stringify({scopes:report.scopes.length,cases:report.scopes.reduce((n,s)=>n+s.rows.length,0),locks:report.locks},null,2));
