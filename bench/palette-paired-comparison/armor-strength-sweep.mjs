// Offline strength calibration study. No service requests or credentials.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { png, decode, sha } from '../palette-service-research/api-common.mjs';
import { quantizeAsync } from '../../src/lib/quantize.js';
import { palettePngBytesAsync } from '../../src/lib/save.js';
const dir=import.meta.dirname,read=f=>fs.readFileSync(path.join(dir,f));
const source=decode(read('input-armor.png')),target=decode(read('target-4.png'));
const cached=JSON.parse(read('live-results.json')).find(row=>row.id==='armor-target4-none');
assert.equal(sha(read('input-armor.png')),cached.inputPngSha256[0],'Armor source changed since service request');
assert.equal(sha(read('target-4.png')),cached.targetPngSha256,'Armor target changed since service request');
const colors=Array.from({length:target.width*target.height},(_,i)=>'#'+target.data.subarray(i*4,i*4+3).toString('hex'));
const linear=n=>n<=.04045*255?n/255/12.92:((n/255+.055)/1.055)**2.4;
function lab(r,g,b){const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const dist=(a,b)=>a.reduce((n,v,i)=>n+(v-b[i])**2,0);
const labAt=(im,p)=>lab(linear(im.data[p]),linear(im.data[p+1]),linear(im.data[p+2]));
function metrics(output){
 let point=0,n=0,alphaChanges=0;const used=new Set();
 for(let p=0;p<source.data.length;p+=4){alphaChanges+=(source.data[p+3]>=128)!==(output.data[p+3]>=128);if(source.data[p+3]<128||output.data[p+3]<128)continue;n++;point+=dist(labAt(source,p),labAt(output,p));used.add(output.data.subarray(p,p+3).toString('hex'));}
 let tone=0,blocks=0,excluded=0;
 for(let y=0;y<16;y+=4)for(let x=0;x<16;x+=4){const a=[0,0,0],b=[0,0,0];let opaque=true;
  for(let yy=y;yy<y+4;yy++)for(let xx=x;xx<x+4;xx++){const p=(yy*16+xx)*4;if(source.data[p+3]<128||output.data[p+3]<128){opaque=false;continue;}for(let c=0;c<3;c++){a[c]+=linear(source.data[p+c])/16;b[c]+=linear(output.data[p+c])/16;}}
  if(!opaque){excluded++;continue;}blocks++;tone+=dist(lab(...a),lab(...b));
 }
 const brightest=colors.map(c=>parseInt(c.slice(1),16)).sort((a,b)=>{const L=c=>lab(linear(c>>>16),linear(c>>>8&255),linear(c&255))[0];return L(b)-L(a);})[0];
 const flags=new Uint8Array(256),coords=[];
 for(let i=0;i<256;i++)if(output.data[i*4+3]>=128&&((output.data[i*4]<<16|output.data[i*4+1]<<8|output.data[i*4+2])===brightest)){flags[i]=1;coords.push([i%16,Math.floor(i/16)]);}
 const components=[];
 for(let i=0;i<256;i++)if(flags[i]){const queue=[i];flags[i]=0;let count=0;for(let at=0;at<queue.length;at++){const p=queue[at],x=p%16,y=Math.floor(p/16);count++;for(const q of [x?p-1:-1,x<15?p+1:-1,y?p-16:-1,y<15?p+16:-1])if(q>=0&&flags[q]){flags[q]=0;queue.push(q);}}components.push(count);}
 components.sort((a,b)=>b-a);
 return{pointOklabMSE:point/n,block4ToneOklabMSE:tone/blocks,visiblePixels:n,opaqueBlocks:blocks,excludedBlocks:excluded,usedColors:used.size,alphaClassificationChanges:alphaChanges,brightestTarget:{rgb:'#'+brightest.toString(16).padStart(6,'0'),pixels:coords.length,coordinates:coords,fourConnectedComponentSizes:components,singlePixelComponents:components.filter(n=>n===1).length},rgbaSha256:sha(output.data)};
}
const rows=[{name:'Original',file:'input-armor.png',kind:'source'},{name:'PixelLab Off (strength inactive)',file:'service-armor-target4-none-0.png',kind:'service'},{name:'PixelLab 4×4 / native maximum10',file:'service-armor-target4-4x4-max-0.png',kind:'service'}];
for(const strength of [0,10,20,30,40,50,75,100]){
 const result=await quantizeAsync(source,colors,128,undefined,undefined,{metric:'oklab',dither:'4x4',ditherStrength:strength}),file=`armor-sweep-strength-${strength}.png`;
 fs.writeFileSync(path.join(dir,file),await palettePngBytesAsync({...result,colors}));rows.push({name:`Colorfetti 4×4 / strength ${strength}`,file,kind:'application',strength});
}
for(const row of rows)if(row.kind!=='source')row.metrics=metrics(decode(read(row.file)));
const originalReport=JSON.parse(read('results.json'));
for(const [file,id]of [['service-armor-target4-none-0.png','armor-target4-none'],['service-armor-target4-4x4-max-0.png','armor-target4-4x4-max']])assert.equal(sha(decode(read(file)).data),originalReport.cases.find(c=>c.id===id).service.metrics[0].rgbaSha256,'Retained service output changed');
for(const row of rows.filter(r=>r.kind==='application')){
 const output=decode(read(row.file)),targetSet=new Set(colors.map(c=>parseInt(c.slice(1),16)));
 for(let p=0;p<output.data.length;p+=4){assert.equal(output.data[p+3],source.data[p+3]>=128?255:0);if(output.data[p+3])assert(targetSet.has(output.data[p]<<16|output.data[p+1]<<8|output.data[p+2]));}
}
const report={methodology:{source:'input-armor.png',sourcePngSha256:sha(read('input-armor.png')),target:'target-4.png',targetPngSha256:sha(read('target-4.png')),colors,alphaCut:128,metric:'oklab',matrix:'4x4',cleanup:false,pointMetric:'mean per-visible-pixel sum of squared Oklab-axis differences',toneMetric:'mean squared Oklab difference after4x4 linear-light averaging, fully opaque blocks only',connectivity:'descriptive4-neighbor components of brightest target color; NOT a visual-quality score',serviceComparison:'Service Off/max are uncalibrated references, not equivalent strength levels',billing:'offline; no service requests',checksPassed:['source and target hashes match retained live request','retained service output hashes match paired evidence','all8 application PNGs retain binary alpha and target membership']},rows};
fs.writeFileSync(path.join(dir,'armor-strength-sweep-results.json'),JSON.stringify(report,null,2));
const html=`<!doctype html><meta charset="utf-8"><title>Armor strength sweep</title><style>body{font:16px system-ui;background:#fffdf9;color:#241d2d;margin:24px}main{display:grid;grid-template-columns:repeat(3,minmax(260px,1fr));gap:20px}article{border:1px solid #ddd2cc;padding:14px}img{image-rendering:pixelated;background:#dedbd5}.native{width:16px;height:16px}.large{width:192px;height:192px;margin:10px;vertical-align:top}small{display:block;line-height:1.6}</style><h1>Existing strength control: native16px and12× armor</h1><p>All Colorfetti variants: same source, four target RGBs, opacity cut128, Oklab matching and4×4 matrix. PixelLab Off/max are uncalibrated references. Tone covers only4 opaque4×4 blocks; connectivity counts describe texture, not readability.</p><main>${rows.map(row=>`<article><h2>${row.name}</h2><div><img class="native" alt="Native16pixel artwork" src="data:image/png;base64,${read(row.file).toString('base64')}"><img class="large" alt="Nearest-neighbor enlarged artwork" src="data:image/png;base64,${read(row.file).toString('base64')}"></div>${row.metrics?`<small>Point ${row.metrics.pointOklabMSE.toFixed(7)} · tone ${row.metrics.block4ToneOklabMSE.toFixed(7)}<br>${row.metrics.usedColors} used colors · brightest components [${row.metrics.brightestTarget.fourConnectedComponentSizes.join(', ')}]</small>`:''}</article>`).join('')}</main>`;
fs.writeFileSync(path.join(dir,'armor-strength-sweep.html'),html);
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require(process.env.SHARP_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const cw=320,ch=305,overlays=[];
for(let i=0;i<rows.length;i++){
 const row=rows[i],left=i%3*cw,top=Math.floor(i/3)*ch,m=row.metrics;
 const label=`<svg width="${cw}" height="75"><g font-family="Arial" fill="#241d2d" font-size="12"><text x="8" y="18">${row.name.replaceAll('&','&amp;')}</text>${m?`<text x="8" y="38">point ${m.pointOklabMSE.toFixed(6)} | tone ${m.block4ToneOklabMSE.toFixed(6)}</text><text x="8" y="58">${m.usedColors} colors | light components [${m.brightestTarget.fourConnectedComponentSizes.join(', ')}]</text>`:''}</g></svg>`;
 overlays.push({input:Buffer.from(label),left,top});
 for(const size of [16,192])overlays.push({input:await sharp(read(row.file)).resize(size,size,{kernel:'nearest'}).flatten({background:'#dedbd5'}).png().toBuffer(),left:left+(size===16?12:100),top:top+85});
}
await sharp({create:{width:cw*3,height:ch*Math.ceil(rows.length/3),channels:4,background:'#fffdf9'}}).composite(overlays).png().toFile(path.join(dir,'armor-strength-sweep.png'));
console.log(JSON.stringify(report.rows.filter(r=>r.metrics).map(r=>({name:r.name,...r.metrics})),null,2));
