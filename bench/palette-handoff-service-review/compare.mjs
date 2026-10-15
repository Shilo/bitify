// Bounded live comparison: at most four standard reductions (0.4 generations
// at the last observed rate) and one validation rejection. Owned fixtures only.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { api, png, image, sha } from '../palette-service-research/api-common.mjs';
import { quantizeAsync } from '../../src/lib/quantize.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { palettePngBytesAsync } from '../../src/lib/save.js';
const require=createRequire(import.meta.url);
const sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=import.meta.dirname;
const write=(n,b)=>fs.writeFileSync(path.join(dir,n),b);
const json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n');
const decode=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data};};
const colors=['#081820','#346856','#88c070','#e0f8d0'];
const rgba=c=>[...Buffer.from(c.slice(1),'hex'),255];
const palette=png(4,1,x=>rgba(colors[x]));
const gradient=fs.readFileSync(path.join(dir,'../palette-service-research/api-input-gradient.png'));
const armor=fs.readFileSync(path.join(dir,'../palette-paired-comparison/input-armor.png'));
const alpha=png(32,16,(x,y)=>[x<16?200:30,x<16?40:160,60,[0,1,64,127,128,192,254,255][y%8]]);
const low=png(16,16,x=>x<8?[200,40,60,255]:[30,160,60,255]);
const cases=[
 {id:'gradient-count8',input:gradient,count:8},
 {id:'two-color-count8',input:low,count:8},
 {id:'alpha-target4',input:alpha,target:true,alphaMode:'keep'},
 {id:'armor-target4-dither',input:armor,target:true,dither:'4x4'},
];
const lab=(r,g,b)=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};r=f(r);g=f(g);b=f(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
function metric(src,out,target){let alpha=0,outside=0,error=0,n=0,exact=0,exactLoss=0;const used=new Set(),set=target&&new Set(target),alphas={};for(let p=0;p<src.data.length;p+=4){alpha+=src.data[p+3]!==out.data[p+3];const a=out.data[p+3];alphas[a]=(alphas[a]??0)+1;if(a){const c='#'+out.data.subarray(p,p+3).toString('hex');used.add(c);if(set&&!set.has(c))outside++;}if(!src.data[p+3]||!a)continue;const ca='#'+src.data.subarray(p,p+3).toString('hex'),cb='#'+out.data.subarray(p,p+3).toString('hex');if(set?.has(ca)){exact++;exactLoss+=ca!==cb;}const la=lab(...src.data.subarray(p,p+3)),lb=lab(...out.data.subarray(p,p+3));error+=la.reduce((s,v,i)=>s+(v-lb[i])**2,0);n++;}return {width:out.width,height:out.height,visibleRgbCount:used.size,alphaChanges:alpha,alphaHistogram:alphas,outsideTarget:target?outside:null,exactTargetPixels:exact,exactTargetLoss:exactLoss,pointOklabMse:n?error/n:null,rgbaSha256:sha(out.data)};}
const results=[];
for(const spec of cases){
 write(`input-${spec.id}.png`,spec.input);
 const body={images:[image(spec.input)],...(spec.count?{num_colors:spec.count}:{}),...(spec.target?{palette_image:image(palette)}:{}),dithering:spec.dither??'none',...(spec.dither?{dithering_strength:5}:{})};
 const archive=path.join(dir,`response-${spec.id}.json`);let r;
 if(fs.existsSync(archive))r=JSON.parse(fs.readFileSync(archive));else{r=await api('/reduce-colors',body);json(`response-${spec.id}.json`,r);}
 if(r.status!==200){results.push({id:spec.id,status:r.status,error:r.result});if([401,402,429].includes(r.status))break;continue;}
 const serviceBytes=Buffer.from(r.result.images[0].base64.replace(/^data:[^,]*,/,''),'base64');write(`service-${spec.id}.png`,serviceBytes);
 const src=await decode(spec.input),service=await decode(serviceBytes);let oursColors;
 const started=performance.now();
 if(spec.target)oursColors=colors;else{const generated=await generatePaletteAsync(captureGeneratedSources([{original:src}],128));oursColors=generated.colors;if(oursColors.length>spec.count){const selected=await selectPaletteSubset(oursColors,spec.count,async function*(){yield {data:src.data,weight:1};},{alphaCut:128,metric:'oklab'});oursColors=selected.indices.map(i=>oursColors[i]);}}
 const matched=await quantizeAsync(src,oursColors,128,undefined,undefined,{metric:'oklab',dither:spec.dither??'none',ditherStrength:50,alphaMode:spec.alphaMode??'cut'});
 const oursBytes=Buffer.from(await palettePngBytesAsync({...matched,colors:oursColors}));write(`ours-${spec.id}.png`,oursBytes);
 const oursMs=performance.now()-started,ours=await decode(oursBytes);
 const record={id:spec.id,inputSha256:sha(spec.input),settings:{count:spec.count??null,target:spec.target?colors:null,dither:spec.dither??'none',nativeStrength:spec.dither?{service:5,ours:50}:null,oursAlpha:spec.alphaMode??'cut'},status:r.status,service:{ms:r.ms,usage:r.result.usage,reportedNColors:r.result.n_colors,metrics:metric(src,service,spec.target?colors:null)},ours:{nodeColdMs:oursMs,colors:oursColors,metrics:metric(src,ours,oursColors)},equalDimensions:src.width===service.width&&src.height===service.height&&src.width===ours.width&&src.height===ours.height};results.push(record);console.log(spec.id,JSON.stringify(record));
}
const invalidBody={images:[image(low)],target_palette:{colors,smart:true}};
const rejected=await api('/reduce-colors',invalidBody);
// Validation errors can echo the base64 input: preserve the contract detail only.
json('smart-reducer-validation.json',{status:rejected.status,ms:rejected.ms,errors:(rejected.result.detail??[]).map(({input,...e})=>e)});
json('comparison.json',{at:new Date().toISOString(),method:'Independent Sharp PNG decoding; current production generator/subset/matcher/save. Tiny Node timing is not browser/mobile/network performance parity. Native dither strengths are not calibrated equivalence.',sourceSha256:Object.fromEntries(['quantize.js','palette-generated.js','palette-limit.js','palette-dither.js','save.js'].map(n=>[n,sha(fs.readFileSync(path.join(dir,'../../src/lib',n)))])),results,newReportedGenerations:results.reduce((s,r)=>s+(r.service?.usage?.generations??0),0),smartValidationStatus:rejected.status});
const balance=await api('/balance');json('balance-after.json',{status:balance.status,credits:balance.result.credits,subscriptionGenerations:balance.result.subscription?.generations});console.log('Smart existing-image REST validation status',rejected.status,'reported generations',results.reduce((s,r)=>s+(r.service?.usage?.generations??0),0));
