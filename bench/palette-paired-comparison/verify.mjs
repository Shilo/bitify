// Offline evidence audit; never contacts a service or starts a browser.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { decode, sha } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname,report=JSON.parse(fs.readFileSync(path.join(dir,'results.json')));
for(const[file,hash]of Object.entries(report.engineSha256))assert.equal(sha(fs.readFileSync(path.resolve(dir,'../../src/lib',file))),hash,`Engine changed since replay: ${file}`);
let serviceFiles=0,applicationFiles=0,applicationPixels=0;
for(const row of report.cases){
 const sources=row.inputFiles.map((file,i)=>{const bytes=fs.readFileSync(path.resolve(dir,file));assert.equal(sha(bytes),row.inputPngSha256[i],`Source changed: ${file}`);return decode(bytes);});
 for(let i=0;i<row.service.files.length;i++){
  const bytes=fs.readFileSync(path.resolve(dir,row.service.files[i])),decoded=decode(bytes);
  assert.equal(sha(decoded.data),row.service.metrics[i].rgbaSha256);assert.equal(bytes.length,row.service.metrics[i].nativePngBytes);serviceFiles++;
 }
 for(const variant of row.ours)for(let i=0;i<variant.files.length;i++){
  const bytes=fs.readFileSync(path.join(dir,variant.files[i])),decoded=decode(bytes),source=sources[i],target=new Set(variant.colors.map(c=>parseInt(c.slice(1),16)));
  assert.equal(sha(decoded.data),variant.metrics[i].rgbaSha256);assert.equal(bytes.length,variant.metrics[i].nativePngBytes);
  assert.equal(decoded.width,source.width);assert.equal(decoded.height,source.height);
  for(let p=0;p<decoded.data.length;p+=4){
   assert.equal(decoded.data[p+3],source.data[p+3]>=128?255:0,'Binary alpha classification');
   if(!decoded.data[p+3])continue;
   const original=source.data[p]<<16|source.data[p+1]<<8|source.data[p+2],actual=decoded.data[p]<<16|decoded.data[p+1]<<8|decoded.data[p+2];
   assert(target.has(actual),'Output RGB outside active target');
   if(target.has(original))assert.equal(actual,original,'Exact active RGB changed');
  }
  applicationFiles++;applicationPixels+=decoded.width*decoded.height;
 }
}
assert.equal(report.cases.length,37);assert.equal(serviceFiles,41);assert.equal(applicationFiles,115);
assert.equal(report.billing.newCalls,12);assert.equal(report.billing.newFailures,0);assert(Math.abs(report.billing.newGenerations-1.2)<1e-12);
const result={passed:true,cases:report.cases.length,serviceFiles,applicationFiles,applicationPixels,engineHashes:Object.keys(report.engineSha256).length,checks:['source PNG hashes','native decoded output hashes and byte counts','production engine hashes','output dimensions','binary source-alpha classification','active target RGB membership','exact active RGB preservation','response billing totals']};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
