// Platform-failure injection only; this is NOT native clipboard delivery proof.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {copyOne} from '../../src/lib/save.js';
const outcomes=[];
for(const scenario of ['missing-clipboard','missing-item','item-constructor-throws','write-throws']){
 const unhandled=[];const listener=error=>unhandled.push(error.message);process.on('unhandledRejection',listener);
 let rejectImage;const png=new Promise((_,reject)=>{rejectImage=reject;});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:scenario==='missing-clipboard'?{}:{clipboard:{write(){throw new DOMException('Refused synchronously.','NotAllowedError');}}}});
 if(scenario==='missing-item')delete globalThis.ClipboardItem;
 else globalThis.ClipboardItem=class{constructor(){if(scenario==='item-constructor-throws')throw new TypeError('Unsupported clipboard item.');}};
 let copyError;try{await copyOne(png);}catch(error){copyError={name:error.name,message:error.message};}
 rejectImage(new Error('Owned encoder rejected after platform failure.'));await new Promise(r=>setTimeout(r,20));process.removeListener('unhandledRejection',listener);
 outcomes.push({scenario,copyRejected:!!copyError,copyError,unhandledImageRejections:unhandled});
}
const source=fs.readFileSync(new URL('../../src/lib/save.js',import.meta.url)),report={scope:'Injected missing/refused platform APIs and a later PNG promise rejection; no OS clipboard API or private contents accessed.',saveModuleSha256:createHash('sha256').update(source).digest('hex'),outcomes,completedAt:new Date().toISOString()};
fs.writeFileSync(new URL('./independent-failure-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
