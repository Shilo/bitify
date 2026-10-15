// Independent diagnostic server: owned fixtures only, no uploads or clipboard.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),dir=path.join(root,'bench'),prefix='png-precision-validation-';
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>PNG corpus validation</title><style>body{font:14px system-ui;margin:16px}button{min-height:44px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>PNG corpus validation</h1><button id="run">Run independent PNG corpus</button><p id="status">Owned fixtures; metadata-only huge image is never decoded.</p><pre id="out"></pre><script type="module" src="/probe.mjs"></script>`;
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/dependencies'){
  const files=['src/lib/image-decode.js','src/lib/quantize.js','bench/'+prefix+'probe.mjs','bench/'+prefix+'fixtures/manifest.json'],hashes={};
  for(const file of files)hashes[file]=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
  res.setHeader('content-type','application/json');res.end(JSON.stringify(hashes));return;
 }
 if(req.method==='POST'&&url.pathname==='/report'){
  let data='';for await(const chunk of req){data+=chunk;if(data.length>2e6)throw Error('Report limit');}
  const value=JSON.parse(data),device=['android','codex','edge'].includes(value.device)?value.device:'unknown';
  await fs.writeFile(path.join(dir,prefix+device+'-corpus.json'),JSON.stringify(value,null,2)+'\n');res.end('saved');return;
 }
 if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end(html);return;}
 let filename;
 if(url.pathname==='/probe.mjs')filename=path.join(dir,prefix+'probe.mjs');
 else if(/^\/fixtures\/[a-z0-9.-]+$/.test(url.pathname))filename=path.join(dir,prefix+'fixtures',path.basename(url.pathname));
 else if(/^\/engine\/[a-z0-9.-]+\.js$/.test(url.pathname))filename=path.join(root,'src/lib',path.basename(url.pathname));
 if(!filename){res.writeHead(404);res.end();return;}
 res.setHeader('cache-control','no-store');res.setHeader('content-type',filename.endsWith('.js')||filename.endsWith('.mjs')?'text/javascript':filename.endsWith('.json')?'application/json':'application/octet-stream');res.end(await fs.readFile(filename));
}catch(error){res.writeHead(500);res.end(error.message);}}).listen(5300,'127.0.0.1',()=>console.log('Independent PNG validation http://127.0.0.1:5300/'));
