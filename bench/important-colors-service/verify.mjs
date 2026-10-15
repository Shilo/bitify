// Independent PNG, billing, recorded-input and no-secret checks; no paid operation.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {sha} from '../palette-service-research/api-common.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=import.meta.dirname,root=path.resolve(dir,'../..');
const read=f=>fs.readFileSync(path.resolve(root,f));
const json=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
const cases=json('cases.json'),results=json('results.json');
const decode=async bytes=>{const {data,info}=await sharp(bytes,{failOn:'error'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{data,info};};
let checks=0, pngs=0;
function assert(b,msg){if(!b)throw Error(msg);checks++;}
for(const c of cases){
 const row=results.cases.find(r=>r.id===c.id);assert(!!row,'Missing paired output '+c.id);
 let response;if(c.fresh){response=json('service/response-'+c.id+'.json');assert(response.status===200,'Not successful');}
 for(let i=0;i<c.inputs.length;i++){
  const input=read(c.inputs[i]),source=await decode(input);assert(sha(input)===row.inputs[i].pngSha256,'Input changed');
  if(response)assert(sha(input)===response.request.inputs[i].sha256,'Request source changed');
  for(const file of [c.service[i],...['oklab','rgb'].map(m=>'bench/important-colors-service/ours/'+c.id+'-'+m+'-'+i+'.png')]){
   const output=await decode(read(file));pngs++;assert(output.info.width===source.info.width&&output.info.height===source.info.height,'Dimensions changed '+file);
   for(let p=3;p<source.data.length;p+=4)assert(source.data[p]===output.data[p],'Alpha changed '+file);
  }
 }
 for(const f of [row.service,...row.ours.map(o=>o.frames)].flat()){
  assert(f.alphaChanges===0,'Changed alpha');if(c.count)assert(f.visibleRgb<=c.count,'Budget exceeded');if(c.target)assert(f.targetViolations===0,'Target violation');
 }
}
const before=json('service/balance-before.json'),after=json('service/balance-after.json');
const usage=cases.filter(c=>c.fresh).map(c=>json('service/response-'+c.id+'.json').usage);
const charged=usage.reduce((n,u)=>n+(u?.generations??0),0),delta=before.subscriptionGenerations-after.subscriptionGenerations;
assert(Math.abs(charged-.8)<1e-8,'Unexpected charged total');assert(Math.abs(charged-delta)<1e-6,'Balance mismatch');
let scanned=0;const secret=process.env.PIXELLAB_SECRET;
function scan(d){for(const entry of fs.readdirSync(d,{withFileTypes:true})){const file=path.join(d,entry.name);if(entry.isDirectory())scan(file);else{if(secret)assert(!fs.readFileSync(file).includes(Buffer.from(secret)),'Secret found in owned artifact');scanned++;}}}scan(dir);
const receipt={at:new Date().toISOString(),checks,pngs,scanned,secretValueMatches:0,successfulNewOperations:usage.length,chargedGenerations:charged,balanceDelta:delta,universalWinner:false};
fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
