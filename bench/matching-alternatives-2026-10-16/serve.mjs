// Loopback research viewer. Dependencies remain isolated from the product build.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=process.cwd(),prefix='/bench/matching-alternatives-2026-10-16/';
const allow=[prefix,'/bench/matching-spike-2026-10-16/engine.js','/.tmp/matching-alternatives/node_modules/colorjs.io/src/','/.tmp/matching-alternatives/node_modules/@material/material-color-utilities/'];
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/'&&req.method==='GET'){res.writeHead(302,{Location:prefix+'review.html'+url.search}).end();return;}
 if(req.method==='POST'&&url.pathname==='/receipt'){let text='';for await(const chunk of req){text+=chunk;if(text.length>2e6)throw Error('Receipt too large');}JSON.parse(text);await fs.writeFile(path.join(root,'.'+prefix,'output/browser-receipt.json'),text);res.end('Browser receipt saved');return;}
 const name=decodeURIComponent(url.pathname);if(!allow.some(p=>name.startsWith(p))&&!/^\/src\/lib\/[a-z0-9-]+\.js$/.test(name))throw Error('Outside research paths');
 const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep))throw Error('Outside root');const bytes=await fs.readFile(target);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(bytes);
}catch(e){res.writeHead(404).end(e.message);}}).listen(5372,'127.0.0.1',()=>console.log('Alternative matching http://127.0.0.1:5372/'));
