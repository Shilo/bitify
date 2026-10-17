import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('bench/palette-change-guide');
const mime={'.html':'text/html','.png':'image/png','.json':'application/json','.mjs':'text/plain'};
createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));const rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error();const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(bytes);}catch{res.writeHead(404).end();}}).listen(5334,'127.0.0.1',()=>console.log('Change gallery http://127.0.0.1:5334/'));
