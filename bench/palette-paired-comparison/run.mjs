// Paid calls occur ONLY with --live, are capped at twelve, and retained results
// are reused on subsequent runs. Never log credentials or authentication data.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { png, decode, image, api, sha } from '../palette-service-research/api-common.mjs';
import { quantizeAsync, colorize } from '../../src/lib/quantize.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { palettePngBytesAsync } from '../../src/lib/save.js';
import { extractPalette } from '../../src/lib/palette-import.js';

const dir=import.meta.dirname, archived=path.resolve(dir,'../palette-service-research');
const read=f=>fs.readFileSync(path.resolve(dir,f)), write=(f,b)=>fs.writeFileSync(path.resolve(dir,f),b);
const json=(f,v)=>write(f,JSON.stringify(v,null,2));
const hexAt=(im,p)=>'#'+Buffer.from(im.data.subarray(p,p+3)).toString('hex');
const encode=im=>png(im.width??im.w,im.height??im.h,(x,y)=>im.data.subarray((y*(im.width??im.w)+x)*4,(y*(im.width??im.w)+x)*4+4));
const colorsOf=im=>[...new Set(Array.from({length:im.width*im.height},(_,i)=>hexAt(im,i*4)))];
const hashFiles=new Map();
for(const f of fs.readdirSync(archived).filter(f=>f.startsWith('api-input-')&&f.endsWith('.png')))hashFiles.set(sha(fs.readFileSync(path.join(archived,f))),path.join(archived,f));
const hashOf=im=>im.input_png_sha256??im.base64?.sha256;
const manifest=[];
for(const f of ['api-results.json','api-extra-results.json','api-limits-temporal-results.json'])for(const record of JSON.parse(fs.readFileSync(path.join(archived,f)))){
 if(record.status!==200)continue;
 manifest.push({id:record.name,origin:'archived',evidenceFile:f,request:record.request,inputs:record.request.images.map(im=>hashFiles.get(hashOf(im))),target:record.request.palette_image?hashFiles.get(hashOf(record.request.palette_image)):null,outputs:record.images.map((_,i)=>path.join(archived,`api-output-${record.name}-${i}.png`)),usage:record.usage,ms:record.ms});
}
manifest.push({id:'colorcube',origin:'archived',evidenceFile:'api-matching-results.json',inputs:[path.join(archived,'api-input-colorcube.png')],target:path.join(archived,'api-input-metric-target.png'),outputs:[path.join(archived,'api-output-colorcube-0.png')],request:{},usage:JSON.parse(fs.readFileSync(path.join(archived,'api-matching-results.json'))).usage});

// Original artwork already present in the repository, without resizing or blur.
for(const [name,file]of [['sprite','../icon-research/general-source.png'],['armor','../icon-research/breastplate-source.png']])write(`input-${name}.png`,read(file));
write('target-2.png',read('../palette-service-research/api-input-bw.png'));
write('target-4.png',read('../palette-service-research/api-input-target.png'));
write('target-8.png',read('../palette-service-research/api-input-metric-target.png'));
const original=decode(read('input-sprite.png'));let changedAt=0;
while(original.data[changedAt*4+3]<128)changedAt++;
const changed={...original,data:Buffer.from(original.data)};changed.data[changedAt*4]=(changed.data[changedAt*4]+87)&255;
write('input-sprite-changed.png',encode(changed));
const fresh=[
 ...[2,4,8].map(k=>({id:`sprite-target${k}-none`,sources:['input-sprite.png'],target:`target-${k}.png`})),
 {id:'sprite-target8-4x4-default',sources:['input-sprite.png'],target:'target-8.png',dithering:'4x4'},
 {id:'sprite-target8-4x4-max',sources:['input-sprite.png'],target:'target-8.png',dithering:'4x4',dithering_strength:10},
 {id:'armor-target4-none',sources:['input-armor.png'],target:'target-4.png'},
 {id:'armor-target4-4x4-max',sources:['input-armor.png'],target:'target-4.png',dithering:'4x4',dithering_strength:10},
 ...[2,4,8].map(k=>({id:`sprite-generated${k}`,sources:['input-sprite.png'],num_colors:k})),
 {id:'sprite-temporal-target8-4x4-max',sources:['input-sprite.png','input-sprite-changed.png'],target:'target-8.png',dithering:'4x4',dithering_strength:10},
 {id:'colorcube-target8-8x8-max',sources:['../palette-service-research/api-input-colorcube.png'],target:'target-8.png',dithering:'8x8',dithering_strength:10},
];
const liveFile=path.join(dir,'live-results.json');const live=(fs.existsSync(liveFile)?JSON.parse(read('live-results.json')):[]).map(entry=>({...entry,inputs:entry.inputs.map(f=>path.resolve(dir,f)),target:entry.target?path.resolve(dir,entry.target):null,outputs:entry.outputs?.map(f=>path.resolve(dir,f))}));
const saveLive=()=>json('live-results.json',live.map(entry=>({...entry,inputs:entry.inputs.map(f=>path.relative(dir,f)),target:entry.target?path.relative(dir,entry.target):null,outputs:entry.outputs?.map(f=>path.relative(dir,f))})));
if(process.argv.includes('--live'))for(const spec of fresh){
 if(live.some(v=>v.id===spec.id))continue;
 if(live.length>=12)throw Error('Twelve-call ceiling reached');
 const {id,sources,target,...parameters}=spec;
 const body={images:sources.map(f=>image(read(f))),...parameters,...(target?{palette_image:image(read(target))}:{})};
 const response=await api('/reduce-colors',body);
 const entry={id,origin:'live',status:response.status,ms:response.ms,request:parameters,inputs:sources.map(f=>path.resolve(dir,f)),target:target?path.resolve(dir,target):null,inputPngSha256:sources.map(f=>sha(read(f))),targetPngSha256:target?sha(read(target)):null};
 if(response.status===200){
  entry.usage=response.result.usage;entry.reportedColors=response.result.n_colors;
  entry.outputs=response.result.images.map((v,i)=>{const name=`service-${id}-${i}.png`;write(name,Buffer.from(v.base64.replace(/^data:[^,]*,/,''),'base64'));return path.join(dir,name);});
  write(`service-${id}-palette.png`,Buffer.from(response.result.palette.base64.replace(/^data:[^,]*,/,''),'base64'));
 }else entry.error=response.result;
 live.push(entry);saveLive();console.log('Reduction',id,response.status,response.ms,'ms');
 if([401,402,429].includes(response.status))break;
}
for(const entry of live.filter(v=>v.status===200)){
 if(entry.inputs.some((f,i)=>sha(fs.readFileSync(f))!==entry.inputPngSha256[i])||entry.target&&sha(fs.readFileSync(entry.target))!==entry.targetPngSha256)throw Error(`Cached service request inputs changed: ${entry.id}. Restore the retained exact source/target; do not silently replay an unpaired comparison.`);
}
manifest.push(...live.filter(v=>v.status===200));
saveLive();
json('manifest.json',manifest.map(v=>({...v,inputs:v.inputs.map(f=>path.relative(dir,f)),target:v.target?path.relative(dir,v.target):null,outputs:v.outputs.map(f=>path.relative(dir,f))})));

const lin=v=>v<=.04045*255?v/255/12.92:((v/255+.055)/1.055)**2.4;
function lab([r,g,b]){const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const distance=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
function measurements(source,output,target,bytes){
 if(source.width!==output.width||source.height!==output.height)throw Error('Output dimensions changed');
 const palette=target?new Set(target):null;let samples=0,srgb=0,linear=0,oklab=0,rawAlphaChanges=0,classifiedAlphaChanges=0,outside=0,exact=0,exactLoss=0;const used=new Set();
 for(let p=0;p<source.data.length;p+=4){
  const sa=source.data[p+3],oa=output.data[p+3];rawAlphaChanges+=sa!==oa;classifiedAlphaChanges+=(sa>=128)!==(oa>=128);
  if(oa>0){used.add(hexAt(output,p));if(palette&&!palette.has(hexAt(output,p)))outside++;}
  if(sa<128||oa<128)continue;
  const a=[...source.data.subarray(p,p+3)],b=[...output.data.subarray(p,p+3)],al=a.map(lin),bl=b.map(lin);
  srgb+=distance(a,b)/(255*255);linear+=distance(al,bl);oklab+=distance(lab(al),lab(bl));samples++;
  if(palette?.has(hexAt(source,p))){exact++;exactLoss+=hexAt(source,p)!==hexAt(output,p);}
 }
 const block={};
 for(const side of [4,8]){let n=0,error=0,boundaryExcluded=0;
  for(let y=0;y<source.height;y+=side)for(let x=0;x<source.width;x+=side){
   const a=[0,0,0],b=[0,0,0];let visible=0,eligible=true;
   for(let yy=y;yy<Math.min(y+side,source.height);yy++)for(let xx=x;xx<Math.min(x+side,source.width);xx++){
    const p=(yy*source.width+xx)*4;if(source.data[p+3]<128||output.data[p+3]<128){eligible=false;continue;}visible++;
    for(let c=0;c<3;c++){a[c]+=lin(source.data[p+c]);b[c]+=lin(output.data[p+c]);}
   }
   // Mixed-alpha blocks are excluded, rather than integrating unrelated islands
   // or letting changed silhouettes improve their reported tone error.
   if(!eligible||!visible){boundaryExcluded++;continue;}n++;error+=distance(lab(a.map(v=>v/visible)),lab(b.map(v=>v/visible)));
  }
  block[side]={oklabMSE:n?error/n:null,blocks:n,excludedBoundaryBlocks:boundaryExcluded};
 }
 const normalized={...output,data:Buffer.from(output.data)};for(let p=0;p<normalized.data.length;p+=4)if(!normalized.data[p+3])normalized.data.fill(0,p,p+3);
 return{pixels:source.width*source.height,comparedVisible:samples,pointOklabMSE:samples?oklab/samples:null,pointLinearRgbMSE:samples?linear/samples:null,pointEncodedRgbMSE:samples?srgb/samples:null,blockTone:block,usedColors:used.size,outsideTargetPixels:palette?outside:null,exactTargetPixels:exact,exactTargetLoss:exactLoss,rawAlphaChanges,classifiedAlphaChanges,nativePngBytes:bytes,commonRgbaPngBytes:encode(normalized).length,rgbaSha256:sha(output.data)};
}
function temporal(sources,outputs){let unchanged=0,churn=0;for(let f=1;f<sources.length;f++)for(let p=0;p<sources[f].data.length;p+=4){if(Buffer.from(sources[f-1].data.subarray(p,p+4)).equals(Buffer.from(sources[f].data.subarray(p,p+4)))){unchanged++;if(!Buffer.from(outputs[f-1].data.subarray(p,p+4)).equals(Buffer.from(outputs[f].data.subarray(p,p+4))))churn++;}}return{unchangedSourceCoordinates:unchanged,changedOutputAtUnchangedCoordinates:churn};}
const results={engineSha256:Object.fromEntries(['quantize.js','palette-dither.js','palette-generated.js','palette-limit.js','palette-import.js','save.js'].map(f=>[f,sha(fs.readFileSync(path.resolve(dir,'../../src/lib',f)))])),methodology:{alphaCut:128,cleanup:false,ourDefaultMetric:'oklab',ourGenerator:'unchanged production Auto64 then existing MaxColors subset at equal budget',strengths:'native default PixelLab5/10 and Colorfetti50/100; maxima10/100; these are NOT calibrated equivalents',blockTone:'4x4 and8x8 linear-light averages then Oklab; excludes blocks containing any below-cut source/output pixel',fileSizes:'native PNGs include codec differences; common RGBA PNG encoder normalizes fully transparent RGB to zero and isolates color-pattern compressibility only when alpha and geometry agree; otherwise it includes alpha-contract differences'},billing:{newCalls:live.length,newSuccesses:live.filter(v=>v.status===200).length,newFailures:live.filter(v=>v.status!==200).length,newGenerations:live.reduce((n,v)=>n+(v.usage?.generations??0),0),archivedSuccesses:manifest.filter(v=>v.origin==='archived').length},cases:[]};
for(const entry of manifest){
 const sources=entry.inputs.map(f=>decode(fs.readFileSync(f))),serviceOutputs=entry.outputs.map(f=>decode(fs.readFileSync(f)));
 const explicit=entry.target?colorsOf(decode(fs.readFileSync(entry.target))):null;
 const servicePalette=[...new Set(serviceOutputs.flatMap(output=>Array.from({length:output.width*output.height},(_,i)=>output.data[i*4+3]>0?hexAt(output,i*4):null).filter(Boolean)))];
 const mode=entry.request.dithering??'none',serviceStrength=entry.request.dithering_strength??5,ourStrength=serviceStrength===0?0:serviceStrength===10?100:50;
 const record={id:entry.id,origin:entry.origin,inputFiles:entry.inputs.map(f=>path.relative(dir,f)),inputPngSha256:entry.inputs.map(f=>sha(fs.readFileSync(f))),dimensions:sources.map(v=>[v.width,v.height]),fixedTarget:explicit,targetImageAlphaSemantics:entry.id==='target-partial-alpha'?'service target contains hidden RGB; comparison supplies every RGB explicitly to isolate matching; Colorfetti image import skips fully transparent colors':undefined,service:{options:{mode,strength:serviceStrength,requestedCount:entry.request.num_colors??null},metrics:serviceOutputs.map((im,i)=>measurements(sources[i],im,explicit,fs.statSync(entry.outputs[i]).size)),temporal:temporal(sources,serviceOutputs),files:entry.outputs.map(f=>path.relative(dir,f))},ours:[]};
 const generated=explicit?null:await generatePaletteAsync(captureGeneratedSources(sources.map(original=>({original})),128));
 if(!explicit&&!generated.colors.length){record.oursUnavailable='Actual Auto pipeline has no visible colors at cut128 and disables color-dependent exports; no output fabricated.';results.cases.push(record);continue;}
 const budget=entry.request.num_colors??servicePalette.length;
 const variants=[{name:'oklab-none',metric:'oklab',dither:'none',ditherStrength:50},{name:'rgb-none',metric:'rgb',dither:'none',ditherStrength:50}];
 if(entry.id==='target-partial-alpha')variants.push({name:'oklab-actual-image-import',metric:'oklab',dither:'none',ditherStrength:50,importVisible:true});
 if(entry.id==='auto'||entry.id==='auto-repeat')variants.push({name:'oklab-auto-default',metric:'oklab',dither:'none',ditherStrength:50,uncapped:true});
 if(mode!=='none')variants.push({name:'oklab-native-dither',metric:'oklab',dither:mode,ditherStrength:ourStrength},{name:'rgb-native-dither',metric:'rgb',dither:mode,ditherStrength:ourStrength});
 for(const options of variants){
  let colors=explicit??generated.colors;
  if(options.importVisible)colors=(await extractPalette(decode(fs.readFileSync(entry.target)))).colors;
  if(!explicit&&!options.uncapped&&budget<colors.length){const selection=await selectPaletteSubset(colors,budget,async function*(){for(const im of sources)yield{data:im.data,weight:1};},{alphaCut:128,metric:options.metric});colors=selection.indices.map(i=>colors[i]);}
  const outputs=[],metrics=[],files=[];
  for(let i=0;i<sources.length;i++){
   const matched=await quantizeAsync(sources[i],colors,128,undefined,undefined,options),im=colorize(matched,colors),bytes=await palettePngBytesAsync({...matched,colors}),decoded=decode(Buffer.from(bytes));
   for(let p=0;p<im.data.length;p+=4)if(im.data[p+3]!==decoded.data[p+3]||im.data[p+3]&&[0,1,2].some(c=>im.data[p+c]!==decoded.data[p+c]))throw Error('Production PNG pixel roundtrip mismatch');
   const file=`ours-${entry.id}-${options.name}-${i}.png`;write(file,bytes);outputs.push(decoded);files.push(file);metrics.push({...measurements(sources[i],decoded,colors,bytes.length),exportRoundtripPassed:true});
  }
  record.ours.push({options,colors,generatedBaseCount:generated?.colors.length,equalBudget:explicit||options.uncapped?null:budget,metrics,temporal:temporal(sources,outputs),files});
 }
 results.cases.push(record);console.log('Compared',entry.id,record.ours.length,'variants');
}
json('results.json',results);

// A labeled, self-contained gallery of exact production output files.
const selected=['bw-none','bw-4x4','bw-strength10','target','colorcube','sprite-target2-none','sprite-target4-none','sprite-target8-none','sprite-target8-4x4-default','sprite-target8-4x4-max','armor-target4-none','armor-target4-4x4-max','sprite-generated2','sprite-generated4','sprite-generated8','auto','count2','count8','alpha-count2','already-member-dither','sprite-temporal-target8-4x4-max','colorcube-target8-8x8-max','target-partial-alpha'];
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const gallery=[];
for(const id of selected){const row=results.cases.find(v=>v.id===id);if(!row?.ours.length)continue;const ours=row.ours.find(v=>v.options.importVisible)??row.ours.find(v=>v.options.name==='oklab-auto-default')??row.ours.find(v=>v.options.name==='oklab-native-dither')??row.ours[0];
 const serviceLabel=id==='auto'?`PixelLab Auto (${row.service.metrics[0].usedColors} used)`:row.service.options.mode==='none'?'PixelLab Off (strength inactive)':`PixelLab ${row.service.options.mode} / native ${row.service.options.strength}`;
 const oursLabel=ours.options.importVisible?'Colorfetti image import: 3 visible RGBs':ours.generatedBaseCount?`Colorfetti Auto${ours.generatedBaseCount} ${ours.equalBudget?'cap'+ours.equalBudget:'All'}`:ours.options.dither==='none'?'Colorfetti Off (strength inactive)':`Colorfetti ${ours.options.dither} / native ${ours.options.ditherStrength}`;
 const controlLabel=row.ours[0].generatedBaseCount?`Colorfetti Auto${row.ours[0].generatedBaseCount} cap${row.ours[0].equalBudget}`:'Colorfetti nearest Oklab';
 const cells=[{label:'Original',file:row.inputFiles[0]},{label:serviceLabel,file:row.service.files[0]},{label:oursLabel,file:ours.files[0]},{label:controlLabel,file:row.ours[0].files[0]}];
 gallery.push({id,cells});
}
const html=`<!doctype html><meta charset="utf-8"><title>Paired palette outputs</title><style>body{font:16px system-ui;background:#fffdf9;color:#24202b;margin:24px}section{margin:30px 0}article{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0}img{image-rendering:pixelated;object-fit:contain;width:100%;height:240px;background:repeating-conic-gradient(#ddd 0 25%,#fafafa 0 50%) 0/16px 16px}small{display:block;max-width:1000px}</style><h1>PixelLab / current Colorfetti: exact paired outputs</h1><p>Same decoded source, same fixed target RGB where supplied. Native strength defaults/maxima are separate settings, not calibrated equivalents. Auto rows compare actual Auto64→MaxColors against direct compact generation.</p><small>Point errors reward nearest matching; block errors describe integrated tone only. Texture, silhouettes and feature readability need visual judgment. PNG bytes also depend on codecs; results.json includes a common encoder comparison.</small>${gallery.map(row=>`<section><h2>${escape(row.id)}</h2><article>${row.cells.map(cell=>`<figure><figcaption>${escape(cell.label)}</figcaption><img src="data:image/png;base64,${read(cell.file).toString('base64')}"></figure>`).join('')}</article></section>`).join('')}`;
write('contact-sheet.html',html);
try{
 const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require(process.env.SHARP_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
 for(let start=0;start<gallery.length;start+=7){const rows=gallery.slice(start,start+7),cw=250,ch=245,overlays=[];
  for(let y=0;y<rows.length;y++)for(let x=0;x<4;x++){
   const cell=rows[y].cells[x],im=decode(read(cell.file)),scale=Math.max(1,Math.floor(Math.min((cw-16)/im.width,(ch-62)/im.height))),w=im.width*scale,h=im.height*scale;
   const label=`<svg width="${cw}" height="55"><g font-family="Arial" fill="#24202b" font-size="11"><text x="7" y="18">${escape(rows[y].id)}</text><text x="7" y="38">${escape(cell.label)}</text></g></svg>`;
   overlays.push({input:Buffer.from(label),left:x*cw,top:y*ch});
   overlays.push({input:await sharp(read(cell.file)).resize(w,h,{kernel:'nearest'}).flatten({background:'#dedbd5'}).png().toBuffer(),left:x*cw+Math.floor((cw-w)/2),top:y*ch+58+Math.floor((ch-62-h)/2)});
  }
  await sharp({create:{width:cw*4,height:ch*rows.length,channels:4,background:'#fffdf9'}}).composite(overlays).png().toFile(path.join(dir,`contact-sheet-${Math.floor(start/7)+1}.png`));
 }
}catch(error){console.warn('PNG sheet unavailable:',error.message);}
console.log('Completed paired cases',results.cases.length,JSON.stringify(results.billing));
