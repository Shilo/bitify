import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),out=fileURLToPath(new URL('./',import.meta.url));
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='POST'&&url.pathname==='/report'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>2*1024*1024)throw new Error('Report too large');}
      const {device,report}=JSON.parse(body),file=`browser-${String(device).replace(/[^a-z0-9-]/gi,'').slice(0,32)}.json`;
      await fs.writeFile(path.join(out,file),JSON.stringify(report,null,2)+'\n');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:file}));return;
    }
    const requested=url.pathname==='/'?'/bench/keep-alpha-weighting-spike/browser-harness.html':decodeURIComponent(url.pathname),file=path.resolve(root,'.'+requested);
    const allowedResearch=new Set(['/bench/keep-alpha-weighting-spike/browser-harness.html','/bench/keep-alpha-weighting-spike/browser-harness.js','/bench/keep-alpha-weighting-spike/palette-generated.candidate.js','/bench/keep-alpha-weighting-spike/palette-limit.candidate.js']);
    if(!allowedResearch.has(requested)&&!/^\/src\/lib\/[a-z0-9-]+\.js$/.test(requested)){res.writeHead(403).end();return;}
    const relative=path.relative(root,file);
    if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)){res.writeHead(403).end();return;}
    const bytes=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);
  }catch(error){res.writeHead(404).end(String(error.message));}
}).listen(5302,'127.0.0.1',()=>console.log('Keep weighting research http://127.0.0.1:5302/'));
