import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=import.meta.dirname;
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.webmanifest':'application/manifest+json'};
export const server=createServer((req,res)=>{try{const url=new URL(req.url,'http://x'),parts=url.pathname.split('/').filter(Boolean),variant=parts.shift();if(!['enabled','disabled','pruned','granular','slots'].includes(variant)){res.writeHead(404).end();return;}let relative=parts.join('/')||'index.html';const file=path.resolve(root,'dist-'+variant,relative);if(!file.startsWith(path.resolve(root,'dist-'+variant)+path.sep)){res.writeHead(403).end();return;}if(!existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(readFileSync(file));}catch(e){res.writeHead(500).end(e.message)}});
export const ready=new Promise(r=>server.listen(Number(process.env.COUNT_PERF_PORT)||5364,'127.0.0.1',r));
if(process.argv[1]===new URL(import.meta.url).pathname.replace(/^\/(.:)/,'$1')){await ready;console.log('Count A/B http://127.0.0.1:5364/enabled/ and /disabled/');}
