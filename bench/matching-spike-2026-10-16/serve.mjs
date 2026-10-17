// Local research viewer. Allows only this spike and the production lib modules.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),prefix='/bench/matching-spike-2026-10-16/';
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='POST'&&url.pathname==='/receipt'){
      let data='';for await(const chunk of req){data+=chunk;if(data.length>1024*1024)throw Error('Receipt too large');}
      JSON.parse(data);await fs.writeFile(path.join(root,prefix,'output/browser-receipt.json'),data);res.end('Saved browser receipt');return;
    }
    if(url.pathname==='/'){res.writeHead(302,{Location:prefix+'review.html'+url.search}).end();return;}
    const name=decodeURIComponent(url.pathname);
    if(!(name.startsWith(prefix)||/^\/src\/lib\/[a-z0-9-]+\.js$/.test(name)))throw Error('Outside research paths');
    const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep))throw Error('Outside root');
    const data=await fs.readFile(target);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(target)]??'application/octet-stream');res.end(data);
  }catch(e){res.writeHead(404).end(String(e.message));}
}).listen(5371,'127.0.0.1',()=>console.log('Research viewer http://127.0.0.1:5371/'));
