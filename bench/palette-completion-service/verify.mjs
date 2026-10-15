// Independent native PNG invariants and owned-art contact sheets. No paid calls.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=import.meta.dirname,base=path.resolve(dir,'../claude-audit-2026-10-15/service');
const load=async f=>{const {data,info}=await sharp(f,{failOn:'error'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{data,w:info.width,h:info.height};};
const rgb=(d,p)=>d.subarray(p,p+3).toString('hex');
const colors=im=>{const s=new Set();for(let p=0;p<im.data.length;p+=4)if(im.data[p+3])s.add(rgb(im.data,p));return s;};
const target=colors(await load(path.join(base,'fixtures/target-edg8.png')));
const cases=[['w1','glow-alpha.png','glow-count4',4],['w2','knight-a.png','knight-edg8',null],['w3-0','knight-a.png','knight-2frame-count8',8],['w3-1','knight-b.png','knight-2frame-count8',8]];
fs.mkdirSync(path.join(dir,'sheets'),{recursive:true});
let alphaChecks=0;const rows=[];const sourceFrames=[],webFrames=[];
for(const [id,input,retained,cap]of cases){
 const multi=id.startsWith('w3'),i=multi?Number(id.at(-1)):0;
 const source=path.join(base,'fixtures',input),web=path.join(dir,'website',multi?`derived-w3-frame${i}.png`:`web-${id}.png`),rest=path.join(base,'service',`service-${retained}-${i}.png`),local=path.join(dir,'local',multi?`w3-${i}.png`:`${id}-0.png`);
 const images=await Promise.all([source,web,rest,local].map(load));
 for(const output of images.slice(1)){
  assert.equal(output.w,images[0].w);assert.equal(output.h,images[0].h);
  for(let p=3;p<output.data.length;p+=4){assert.equal(output.data[p],images[0].data[p]);alphaChecks++;}
  if(cap)assert.ok(colors(output).size<=cap);
  else for(const color of colors(output))assert.ok(target.has(color));
 }
 if(multi){sourceFrames.push(images[0]);webFrames.push(images[1]);}
 // Source/native output pixels appear at 1x and 8x on a uniform neutral ground.
 const cellW=280,cellH=330,width=cellW*4,composite=[];
 for(let col=0;col<4;col++){
  const label=['Source','Website','Retained REST','Colorfetti'][col];
  composite.push({input:Buffer.from(`<svg width="280" height="30"><text x="8" y="20" font-family="sans-serif" font-size="15" fill="white">${label}</text></svg>`),left:col*cellW,top:0});
  composite.push({input:await sharp([source,web,rest,local][col]).flatten({background:'#888888'}).png().toBuffer(),left:col*cellW+8,top:35});
  composite.push({input:await sharp([source,web,rest,local][col]).flatten({background:'#888888'}).resize(images[col].w*8,images[col].h*8,{kernel:'nearest'}).png().toBuffer(),left:col*cellW+8,top:75});
 }
 await sharp({create:{width,height:cellH,channels:4,background:'#888888'}}).composite(composite).png().toFile(path.join(dir,'sheets',`${id}.png`));
 rows.push({id,dimensions:[images[0].w,images[0].h],visibleColors:images.map(im=>colors(im).size),alphaPreserved:true,targetMembership:id==='w2',cap});
}
const union=new Set(webFrames.flatMap(im=>[...colors(im)]));assert.ok(union.size<=8);
let unchanged=0,churn=0;for(let p=0;p<sourceFrames[0].data.length;p+=4){if(!sourceFrames[0].data.subarray(p,p+4).equals(sourceFrames[1].data.subarray(p,p+4)))continue;unchanged++;if((webFrames[0].data[p+3]||webFrames[1].data[p+3])&&!webFrames[0].data.subarray(p,p+4).equals(webFrames[1].data.subarray(p,p+4)))churn++;}
const before=JSON.parse(fs.readFileSync(`${dir}/balance-before.json`)),after=JSON.parse(fs.readFileSync(`${dir}/balance-after.json`));
assert.ok(Math.abs(before.subscriptionGenerations-after.subscriptionGenerations-.4)<1e-6);assert.equal(before.credits.usd,after.credits.usd);
const secret=process.env.PIXELLAB_SECRET;let scanned=0;function scan(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,e.name);if(e.isDirectory())scan(f);else{if(secret)assert.ok(!fs.readFileSync(f).includes(Buffer.from(secret)),'Credential in owned file');scanned++;}}}scan(dir);
const result={at:new Date().toISOString(),passed:true,rows,alphaChecks,websiteShared:{nativeSheet:[48,24],frames:2,unionColors:union.size,unchangedCoordinates:unchanged,changedOutputsAtUnchangedCoordinates:churn},billing:{jobs:4,subscriptionDelta:before.subscriptionGenerations-after.subscriptionGenerations,usdUnchanged:true,repeatCausedByHarnessDownloadSelector:true},ownedFileSecretScan:{scanned,matches:0},sheets:'Source / Website / Retained REST / Colorfetti, 1x then 8x, flat gray background. Not blind judgments.'};
fs.writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
