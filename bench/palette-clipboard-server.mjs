// Loopback-only actual clipboard receiver. Never reads the pre-existing clipboard.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const repo=resolve('.'),dist=resolve('dist'),out=resolve(process.env.PALETTE_CLIPBOARD_OUT??'bench/palette-clipboard-review'),port=Number(process.env.PALETTE_CLIPBOARD_PORT??5297);
mkdirSync(out,{recursive:true});
const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.png':'image/png','.gif':'image/gif','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
let attemptSequence=0;const latestCompleted=new Map();
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/paste'){
    let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>2e6)throw Error('Paste receipt too large');body+=chunk;}
    const data=JSON.parse(body);if(!['codex','android'].includes(data.device)||!['palette-keep','palette-cut','onebit','gif-frame0'].includes(data.key))throw Error('Unknown owned test case');
    if(data.trusted!==true||data.mime!=='image/png')throw Error('Expected trusted native PNG paste');
    const bytes=Buffer.from(data.base64,'base64');if(!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw Error('Clipboard did not contain PNG');
    const sequence=++attemptSequence,recordedAt=new Date().toISOString(),sha256=createHash('sha256').update(bytes).digest('hex'),base=data.device+'-'+data.key;
    const attemptId=base+'-attempt-'+recordedAt.replace(/[:.]/g,'-')+'-'+sha256.slice(0,12)+'-'+randomUUID().slice(0,8),attemptFile=attemptId+'.png',attemptReceipt=attemptId+'.json',file=base+'-pasted.png';
    // Preserve every bounded owned attempt, including mismatches, without
    // overwriting the evidence used to diagnose an earlier transfer.
    writeFileSync(resolve(out,attemptFile),bytes,{flag:'wx'});
    const {verifyClipboardPng}=await import('./palette-clipboard-fixtures.mjs');
    let verification;try{verification={pass:true,...await verifyClipboardPng(bytes,data.key)};}catch(error){verification={pass:false,error:error.message};}
    const canonicalUpdated=sequence>(latestCompleted.get(base)??0),record={device:data.device,key:data.key,trusted:true,mime:data.mime,clipboardTypes:data.types,pasteStartedAt:typeof data.pasteStartedAt==='string'?data.pasteStartedAt.slice(0,64):undefined,file,attemptFile,attemptReceipt,canonicalUpdated,bytes:bytes.length,sha256,verification,recordedAt};
    const serialized=JSON.stringify(record,null,2)+'\n';writeFileSync(resolve(out,attemptReceipt),serialized,{flag:'wx'});
    // Canonical aliases remain available to existing diagnostic scripts. A slow
    // older verifier cannot overwrite a newer completed attempt for this case.
    if(canonicalUpdated){latestCompleted.set(base,sequence);writeFileSync(resolve(out,file),bytes);writeFileSync(resolve(out,base+'-paste.json'),serialized);}
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(record));return;
  }
  let file;
  if(url.pathname==='/')file=resolve('bench/palette-clipboard-receiver.html');
  else if(url.pathname==='/carrier')file=resolve('bench/palette-clipboard-carrier-spike.html');
  else if(url.pathname.startsWith('/app/')){file=resolve(dist,url.pathname.slice(5)||'index.html');if(!file.startsWith(dist+sep))throw Error('Invalid app route');}
  else if(/^\/fixtures\/[a-z0-9-]+\.(png|gif|json)$/.test(url.pathname))file=resolve(out,'fixtures',url.pathname.slice(10));
  else throw Error('Unknown route');
  res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(readFileSync(file));
}catch(error){res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:error.message}));}});
server.listen(port,'127.0.0.1',()=>console.log('Actual clipboard receiver http://127.0.0.1:'+server.address().port+'/'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
