// Independent Sharp check of actual native desktop/phone downloads. No app modules.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import crypto from 'node:crypto';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=import.meta.dirname,root=path.resolve(dir,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const decode=async file=>{const bytes=fs.readFileSync(file),{data,info}=await sharp(bytes,{failOn:'error'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{data,info,bytes};};
export async function verifyNative(phoneFile,{count,draftColors}={}){
 const source=await decode(path.join(root,'bench/claude-audit-2026-10-15/service/fixtures/knight-a.png'));
 const desktop=await decode(path.join(dir,'codex-knight-k8.png')),phone=await decode(phoneFile);
 let alphaWrong=0,visibleMismatch=0;const used=new Set(),allowed=new Set();
 for(let p=0;p<source.data.length;p+=4){if(source.data[p+3])allowed.add('#'+source.data.subarray(p,p+3).toString('hex'));if(source.data[p+3]!==phone.data[p+3])alphaWrong++;if(phone.data[p+3])used.add('#'+phone.data.subarray(p,p+3).toString('hex'));if(desktop.data[p+3]!==phone.data[p+3]||(phone.data[p+3]&&[0,1,2].some(k=>desktop.data[p+k]!==phone.data[p+k])))visibleMismatch++;}
 const colors=[...used].sort(),targetWrong=colors.filter(c=>!allowed.has(c)),dims=phone.info.width===24&&phone.info.height===24;
 const receipt={at:new Date().toISOString(),method:'Actual built-app Save on desktop and Android, independently decoded with Sharp. Native equality is cross-device evidence, not an independent algorithm oracle.',phone:{file:path.relative(root,phoneFile).replaceAll('\\','/'),pngSha256:sha(phone.bytes),width:phone.info.width,height:phone.info.height,bytes:phone.bytes.length},desktop:{file:'bench/important-colors-validation/codex-knight-k8.png',pngSha256:sha(desktop.bytes),bytes:desktop.bytes.length},alphaWrong,visibleMismatch,usedColors:colors,count,draftColors,pngBytesEqual:phone.bytes.equals(desktop.bytes),pass:dims&&alphaWrong===0&&visibleMismatch===0&&used.size===8&&targetWrong.length===0&&(count===undefined||count===8)&&(draftColors===undefined||JSON.stringify(colors)===JSON.stringify([...draftColors].sort()))};
 fs.writeFileSync(path.join(dir,'native-check.json'),JSON.stringify(receipt,null,2)+'\n');if(!receipt.pass)throw Error('Native built-app verification failed: '+JSON.stringify(receipt));return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')))console.log(JSON.stringify(await verifyNative(path.join(dir,'android-knight-k8.png')),null,2));
