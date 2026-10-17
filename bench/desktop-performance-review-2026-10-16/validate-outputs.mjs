// Outside-browser deterministic reference uses committed production modules,
// not app state/canvases. Native phone Save has a separate scalar oracle.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {sharp} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
import {getLimitedPalette} from '../../src/lib/palette-limit-client.js';
import {prepareCleanupAsync,applyCleanup} from '../../src/lib/palette-cleanup.js';
const side=+(process.argv.find(s=>s.startsWith('--side='))?.split('=')[1]||1024);
if(![896,1024].includes(side))throw Error('Expected supported896or1024fixture');
const decoded=await sharp(new URL(`entropy-${side}.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const source={width:decoded.info.width,height:decoded.info.height,data:new Uint8ClampedArray(decoded.data)},palette=preparePalette(FULL_PRESETS.find(p=>p.id==='preset-res64').colors),expected=[];
for(const[label,metric,dither,cap,cleanup]of[['initial','oklab','none',0,false],['RGB','rgb','none',0,false],['dither','rgb','4x4',0,false],['cap8Cleanup','rgb','4x4',8,true]]){
 const selected=cap?await getLimitedPalette({original:source},palette,128,metric,cap):palette;
 const q=quantize(source,selected,128,undefined,undefined,{metric,dither,ditherStrength:50});if(cleanup)applyCleanup(q,await prepareCleanupAsync([source],selected.colors,128,metric));
 expected.push({label,width:side,height:side,sha:createHash('sha256').update(colorize(q,selected).data).digest('hex')});
}
const report={source:`Node committed production-core references outside browser, exact${side}source; covers final render selection and catches stale/draft sampling, not independent algorithm accuracy`,expected,checks:[]};
for(const file of process.argv.slice(2).filter(s=>!s.startsWith('--'))){
 const receipt=JSON.parse(await readFile(file,'utf8'));const runs=receipt.runs||receipt.workflows||[];for(const run of runs){if(run.kind!=='large'||run.error)continue;for(const e of expected){const got=run.hashes.find(x=>x.label===e.label);report.checks.push({file,label:e.label,pass:JSON.stringify(got)===JSON.stringify(e),got});}}
}
await writeFile(new URL(side===1024?'output-validation.json':'output-validation-896.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.checks.length||report.checks.some(c=>!c.pass))process.exitCode=1;
