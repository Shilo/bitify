import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const roots={5332:path.resolve('.tmp/palette-change-guide/baseline/dist'),5333:path.resolve('dist')};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
for(const [port,root] of Object.entries(roots)) createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(302,{location:'/colorfetti/'}).end();return;}if(!url.pathname.startsWith('/colorfetti/'))throw Error();const file=path.resolve(root,decodeURIComponent(url.pathname.slice(12))||'index.html');const rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error();const data=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(data);}catch{res.writeHead(404).end();}}).listen(Number(port),'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/colorfetti/`));
