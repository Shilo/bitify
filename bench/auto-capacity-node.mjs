import fs from 'node:fs/promises';
import {runCapacity} from './auto-capacity-core.js';
const root=new URL('../.tmp/auto-capacity/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
const report=await runCapacity({manifest,readBytes:async url=>{
  const data=await fs.readFile(new URL(url.slice(1),root));return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
},status: text=>process.stdout.write(text+'\n')});
await fs.writeFile(new URL('node-results.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.records.map(r=>({cohort:r.cohort,count:r.count,colors:r.colors,
  generate:r.medianGenerationMs,convert:r.medianFirstFramesMs,error:r.error.meanSquaredOklab,
  cap:r.cap8WholeClipMs,cleanup:r.cleanupWholeClipMs})),null,2));
