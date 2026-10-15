// Injected receiver/HTTP guards only. No browser, clipboard access or native-delivery claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const report={kind:'injected receiver and isolated HTTP guards; not native clipboard evidence',checks:[]};
const source=fs.readFileSync('bench/palette-clipboard-receiver.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const nodes=Object.fromEntries(['target','status','receipt','image','device','case'].map(key=>[key,{textContent:'',value:key==='device'?'codex':'palette-keep'}]));
let handler;nodes.target.addEventListener=(type,fn)=>{assert.equal(type,'paste');handler=fn;};
const requests=[];
vm.runInNewContext(source,{document:{querySelector:s=>nodes[s.slice(1)]},Date,Uint8Array,Error,JSON,String,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),URL:{createObjectURL:()=> 'blob:owned',revokeObjectURL:()=>{}},
  fetch:async(url,options)=>{const response=defer();requests.push({url,data:JSON.parse(options.body),response});return response.promise;}});
const makeEvent=(bytes,gate=Promise.resolve(),size=bytes.length)=>{
  let active=true;const event={isTrusted:true,preventDefault(){},clipboardData:{get types(){assert(active,'Protected types read after dispatch');return ['image/png'];},get files(){assert(active,'Protected files read after dispatch');return [{type:'image/png',size,arrayBuffer:async()=>{await gate;return Uint8Array.from(bytes).buffer;}}];}}};
  return {event,expire(){active=false;}};
};
const tick=()=>new Promise(r=>setImmediate(r));
const firstGate=defer(),first=makeEvent([1,2,3],firstGate.promise),p1=handler(first.event);first.expire();
nodes.device.value='android';nodes.case.value='palette-cut';firstGate.resolve();await tick();
assert.equal(requests[0].data.device,'codex');assert.equal(requests[0].data.key,'palette-keep');assert.deepEqual(requests[0].data.types,['image/png']);
report.checks.push('Captures selection and protected native metadata before await');
const second=makeEvent([4,5,6]),p2=handler(second.event);second.expire();await tick();
requests[1].response.resolve({ok:true,json:async()=>({verification:{pass:true},marker:'newer'})});await p2;
requests[0].response.resolve({ok:true,json:async()=>({verification:{pass:false},marker:'older'})});await p1;
assert.match(nodes.receipt.textContent,/newer/);assert.match(nodes.status.textContent,/^PASS/);
report.checks.push('A slower previous completion cannot replace newer receipt or status');
const before=requests.length,oversize=makeEvent([],Promise.resolve(),1024*1024+1);await handler(oversize.event);assert.equal(requests.length,before);assert.match(nodes.status.textContent,/byte budget/);
await handler({isTrusted:false,preventDefault(){}});assert.equal(requests.length,before);assert.match(nodes.status.textContent,/Untrusted/);
report.checks.push('Oversize and untrusted injected events never POST');

const isolated=path.resolve('.tmp/independent-clipboard-receiver-'+Date.now());fs.mkdirSync(isolated,{recursive:true});
const child=spawn(process.execPath,['bench/palette-clipboard-server.mjs'],{env:{...process.env,PALETTE_CLIPBOARD_PORT:'0',PALETTE_CLIPBOARD_OUT:isolated},stdio:['ignore','pipe','pipe']});
try{
  const base=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Isolated server timed out')),15000);child.stdout.on('data',value=>{output+=value;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timeout);reject(Error('Isolated server exited '+code));});});
  const fixtureDir='bench/palette-clipboard-review/fixtures',manifest=JSON.parse(fs.readFileSync(path.join(fixtureDir,'manifest.json'),'utf8'));
  const owned=key=>fs.readFileSync(path.join(fixtureDir,manifest.fixtures.find(f=>f.key===key).expectedFile));
  const post=async(bytes,extra={})=>{const response=await fetch(base+'/paste',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({device:'codex',key:'palette-keep',trusted:true,mime:'image/png',types:['image/png'],pasteStartedAt:'injected-guard-only',base64:bytes.toString('base64'),...extra})});return {status:response.status,data:await response.json()};};
  const a=await post(owned('palette-keep')),b=await post(owned('palette-keep')),negative=await post(owned('palette-cut'));
  assert.equal(a.data.verification.pass,true);assert.equal(b.data.verification.pass,true);assert.equal(negative.data.verification.pass,false);
  assert.equal(new Set([a,b,negative].map(r=>r.data.attemptFile)).size,3);
  for(const receipt of [a,b,negative]){assert.equal(hash(fs.readFileSync(path.join(isolated,receipt.data.attemptFile))),receipt.data.sha256);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(isolated,receipt.data.attemptReceipt))),receipt.data);}
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(isolated,'codex-palette-keep-paste.json'))),negative.data);
  assert.equal(hash(fs.readFileSync(path.join(isolated,'codex-palette-keep-pasted.png'))),negative.data.sha256);
  assert.equal((await post(owned('palette-keep'),{trusted:false})).status,400);
  report.checks.push('Repeated owned HTTP attempts get distinct immutable PNG/JSON receipts; canonical alias follows latest completed request');
  report.checks.push('Decoded mismatch retained as FAIL; untrusted HTTP metadata rejected');
  report.isolatedDirectory=path.relative(process.cwd(),isolated);report.receiptCount=3;
}finally{child.kill();}
report.pass=true;fs.writeFileSync('bench/palette-clipboard-review/independent-receiver-guards.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
