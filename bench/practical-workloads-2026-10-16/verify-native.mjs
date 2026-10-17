// Codex/Android native output verifier, independent of browser canvas readback.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decode,nearest,compare,contract,sha} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
const [id,file,receipt]=process.argv.slice(2);if(!id||!file)throw Error('Usage: node verify-native.mjs fixture-id native-file [receipt.json]');
const manifest=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8')),record=manifest.records.find(r=>r.id===id);assert(record);
const source=await decode(await readFile(new URL(record.file,import.meta.url))),bytes=await readFile(file),actual=await decode(bytes),colors=FULL_PRESETS.find(p=>p.id==='preset-res64').colors;
assert.equal(actual.w,source.w);assert.equal(actual.h,source.h);assert.equal(actual.frames.length,source.frames.length);if(source.frames.length>1){assert.deepEqual(actual.delay,source.delay);assert.equal(actual.loop,source.loop);}
let rgbMismatch=0,alphaMismatch=0;for(let f=0;f<source.frames.length;f++){const e=compare(actual.frames[f],nearest(source.frames[f],colors).data);rgbMismatch+=e.rgbMismatch;alphaMismatch+=e.alphaMismatch;const ct=contract(actual.frames[f],source.frames[f],colors);assert.equal(ct.offPalette,0);assert.equal(ct.alphaWrong,0);}assert.equal(rgbMismatch,0);assert.equal(alphaMismatch,0);
const result={fixture:id,width:actual.w,height:actual.h,frames:actual.frames.length,delay:actual.delay,loop:actual.loop,rgbMismatch,alphaMismatch,sha256:sha(bytes),oracle:'independent scalar Oklab nearest, Sharp PNG/GIF decode, native bytes; hidden alpha0 RGB ignored'};console.log(JSON.stringify(result,null,2));if(receipt)await writeFile(receipt,JSON.stringify(result,null,2)+'\n');
