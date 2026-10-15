// Explicitly authorized five-job gap fill. Never called by the offline runner.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, decode, metrics } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname;
const specs=[['sprite',16,'../palette-paired-comparison/input-sprite.png'],...[2,4,8,16].map(k=>['armor',k,'../palette-paired-comparison/input-armor.png'])];
const file=path.join(dir,'native-gap-results.json');
const results=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];
assert(process.argv.includes('--live'),'Pass --live for the explicitly authorized gap-fill matrix');
assert(process.env.PIXELLAB_SECRET,'Missing PIXELLAB_SECRET');
assert(results.length<=5);
for(const [name,k,input] of specs){
 const id=`${name}-generated${k}`; if(results.some(r=>r.id===id)){assert(results.find(r=>r.id===id).status===200,'Earlier failure: inspect before any retry');continue;}
 const bytes=fs.readFileSync(path.resolve(dir,input)),started=performance.now();
 const r=await fetch('https://api.pixellab.ai/v2/reduce-colors',{method:'POST',headers:{Authorization:`Bearer ${process.env.PIXELLAB_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify({images:[{base64:bytes.toString('base64')}],num_colors:k}),signal:AbortSignal.timeout(120000)});
 const body=await r.json();
 const record={id,status:r.status,ms:Math.round(performance.now()-started),request:{num_colors:k},input,inputPngSha256:sha(bytes),inputRgbaSha256:sha(decode(bytes).data),endpoint:'https://api.pixellab.ai/v2/reduce-colors',recordedAt:new Date().toISOString()};
 if(r.status===200){
  record.usage=body.usage;record.reportedColors=body.n_colors;record.outputs=[];record.outputMetrics=[];
  assert.equal(body.images.length,1);
  for(const [i,image] of body.images.entries()){const png=Buffer.from(image.base64.replace(/^data:[^,]*,/,''),'base64'),name=`native-${id}-${i}.png`;fs.writeFileSync(path.join(dir,name),png);record.outputs.push(name);record.outputMetrics.push({...metrics(decode(png)),pngSha256:sha(png)});}
 }
 results.push(record);fs.writeFileSync(file,JSON.stringify(results,null,2)+'\n');
 console.log(id,r.status,record.ms+'ms');
 assert.equal(r.status,200,'Stop on any unexpected service status; response body intentionally omitted');
 assert.equal(record.usage?.type,'generations');assert.equal(record.usage.generations,.1,'Stop on unexpected reported usage');
}
