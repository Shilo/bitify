import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {decode,sha} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const manifest=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8')),records=[];
for(const r of manifest.records){const bytes=await readFile(new URL(r.file,import.meta.url));assert.equal(sha(bytes),r.sha256,r.id+' frozen hash');const d=await decode(bytes);assert.equal(d.w,r.width);assert.equal(d.h,r.height);assert.equal(d.frames.length,r.frames);if(r.frames>1){assert.deepEqual(d.delay,r.delay);assert.equal(d.loop,r.loop);}records.push({id:r.id,sha256:r.sha256,width:d.w,height:d.h,frames:d.frames.length,pass:true});}
assert.equal(records.length,13);await writeFile(new URL('cohort-selfcheck.json',import.meta.url),JSON.stringify({pass:true,records},null,2)+'\n');console.log('PASS frozen hashes and decoded dimensions/timing of all13fixtures');
