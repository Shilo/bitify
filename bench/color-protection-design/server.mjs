import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=import.meta.dirname;
const types={'.html':'text/html; charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{
  try{
    const name=new URL(req.url,'http://127.0.0.1').pathname;
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
    const bytes=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found')}
}).listen(5310,'127.0.0.1',()=>console.log('Design-only mockups: http://127.0.0.1:5310'));
