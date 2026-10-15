import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sha } from '../palette-service-research/api-common.mjs';
const require=createRequire(import.meta.url),sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=import.meta.dirname,read=n=>fs.readFileSync(path.join(dir,n)),report=JSON.parse(read('comparison.json'));
const decode=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data,w:info.width,h:info.height};};
const checked=[];
for(const record of report.results){
 const src=await decode(read(`input-${record.id}.png`)),service=await decode(read(`service-${record.id}.png`)),ours=await decode(read(`ours-${record.id}.png`));
 if(record.inputSha256!==sha(read(`input-${record.id}.png`)))throw Error('input hash changed');
 let visibleDiff=0,alphaDiff=0;for(let p=0;p<src.data.length;p+=4){alphaDiff+=service.data[p+3]!==ours.data[p+3];if(service.data[p+3]&&ours.data[p+3]&&![0,1,2].every(c=>service.data[p+c]===ours.data[p+c]))visibleDiff++;}
 for(const [name,out]of [['service',service],['ours',ours]]){
  if(out.w!==src.w||out.h!==src.h)throw Error('dimensions changed');
  if(sha(out.data)!==record[name].metrics.rgbaSha256)throw Error('decoded hash changed');
  const used=new Set();for(let p=0;p<out.data.length;p+=4){if(out.data[p+3]!==src.data[p+3])throw Error('alpha changed');if(out.data[p+3])used.add('#'+out.data.subarray(p,p+3).toString('hex'));}
  if(used.size!==record[name].metrics.visibleRgbCount)throw Error('used count mismatch');
  if(record.settings.target&&[...used].some(c=>!record.settings.target.includes(c)))throw Error('outside fixed target');
 }
 checked.push({id:record.id,pixels:src.w*src.h,alphaDifferencesBetweenOutputs:alphaDiff,visibleRgbDifferencesBetweenOutputs:visibleDiff,sourcePngSha256:sha(read(`input-${record.id}.png`)),servicePngSha256:sha(read(`service-${record.id}.png`)),oursPngSha256:sha(read(`ours-${record.id}.png`))});
}
if(report.newReportedGenerations!==.4)throw Error('unexpected reported cost');
const result={passed:true,method:'Fresh independent Sharp decode; raw hashes, dimensions, alpha, count, fixed target membership; no perceptual winner inferred.',checked};fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2)+'\n');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
fs.writeFileSync(path.join(dir,'comparison.html'),`<!doctype html><meta name="viewport" content="width=device-width"><title>Fresh palette service comparison</title><style>body{font:16px system-ui;background:#f5f3ee;color:#222}section{margin:24px 0}article{display:flex;gap:24px;flex-wrap:wrap}figure{margin:0}img{width:256px;height:256px;object-fit:contain;image-rendering:pixelated;background:repeating-conic-gradient(#bbb 0% 25%,#eee 0% 50%) 50%/16px 16px}</style><h1>Owned source / PixelLab / Colorfetti</h1><p>Native default dither strengths differ; these are not calibrated. Inspect at source pixel scale as well as enlarged. Keep alpha is selected for partial opacity.</p>${checked.map(c=>`<section><h2>${esc(c.id)}</h2><article>${[['input','Source'],['service','PixelLab'],['ours','Colorfetti']].map(([prefix,label])=>`<figure><figcaption>${label}</figcaption><img src="${prefix}-${c.id}.png"></figure>`).join('')}</article></section>`).join('')}`);
console.log(JSON.stringify(result));
