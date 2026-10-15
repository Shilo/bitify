// PAID: explicitly listed fresh cases only; at most eight. No retries after a retained response.
// Credentials are environment-only. Requests retain hashes/settings, never base64 or auth headers.
import fs from 'node:fs';
import path from 'node:path';
import { api, sha } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname,root=path.resolve(dir,'../..');
const read=file=>fs.readFileSync(path.resolve(root,file));
const cases=JSON.parse(fs.readFileSync(path.join(dir,'cases.json'))).filter(c=>c.fresh);
if(cases.length>8)throw Error('Initial billed-operation ceiling exceeded');
fs.mkdirSync(path.join(dir,'service'),{recursive:true});
const save=(name,v)=>fs.writeFileSync(path.join(dir,'service',name),JSON.stringify(v,null,2)+'\n');
const balance=async()=>{const r=await api('/balance');return{at:new Date().toISOString(),status:r.status,credits:r.result.credits,subscriptionGenerations:r.result.subscription?.generations};};
if(!fs.existsSync(path.join(dir,'service','balance-before.json')))save('balance-before.json',await balance());
for(const c of cases){
 const name='response-'+c.id+'.json';if(fs.existsSync(path.join(dir,'service',name))){console.log('Retained',c.id);continue;}
 const body={images:c.inputs.map(file=>({base64:read(file).toString('base64')})),dithering:'none',...(c.count?{num_colors:c.count}:{}),...(c.target?{palette_image:{base64:read(c.target).toString('base64')}}:{})};
 const result=await api('/reduce-colors',body);
 const record={at:new Date().toISOString(),surface:'REST POST /v2/reduce-colors',request:{inputs:c.inputs.map(file=>({file,sha256:sha(read(file))})),num_colors:c.count??null,palette_image:c.target?{file:c.target,sha256:sha(read(c.target))}:null,dithering:'none'},status:result.status,ms:result.ms,usage:result.result.usage??null,n_colors:result.result.n_colors??null,outputs:[]};
 if(result.status===200){
  for(let i=0;i<result.result.images.length;i++){const bytes=Buffer.from(result.result.images[i].base64.replace(/^data:[^,]*,/,''),'base64'),file=path.resolve(root,c.service[i]);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);record.outputs.push({file:c.service[i],sha256:sha(bytes),bytes:bytes.length});}
 }else{record.error='Service returned non-success; full echoed response intentionally omitted';}
 save(name,record);console.log(c.id,result.status,result.ms,JSON.stringify(record.usage));
 if(result.status!==200)throw Error('Stop after non-success; no automatic paid retry');
}
save('balance-after.json',await balance());
