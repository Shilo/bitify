// Local production-build QA server. No app instrumentation or extra app assets.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
const root=resolve(process.argv[2]||'.tmp/aseprite-instructions-dist');
const port=Number(process.argv[3]||5189);
const output=resolve('.tmp/aseprite-instructions-qa');mkdirSync(output,{recursive:true});
const requests=[];let stage='startup';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.webmanifest':'application/manifest+json'};
createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/__mark'){stage=url.searchParams.get('stage');res.end(stage);return;}
  if(url.pathname==='/__requests'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(requests));return;}
  if(url.pathname==='/__drop-qa.html'){res.setHeader('Content-Type','text/html');res.end(readFileSync(resolve('bench/aseprite-import-spike/drop-qa.html')));return;}
  if(url.pathname.startsWith('/__fixture/')){
    const name=url.pathname.slice('/__fixture/'.length);
    if(!['opaque-artwork.aseprite','opaque-palette.ase','alpha-palette.aseprite'].includes(name)){res.writeHead(404).end();return;}
    res.end(readFileSync(resolve('bench/aseprite-import-spike/fixtures',name)));return;
  }
  requests.push({stage,path:url.pathname,time:new Date().toISOString()});
  writeFileSync(resolve(output,port===5189?'codex-network.json':`codex-network-${port}.json`),JSON.stringify(requests,null,2)+'\n');
  const file=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}
  catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Production QA: http://127.0.0.1:${port}/`));
