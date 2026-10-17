import http from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
// Snapshot the built JS/CSS and harness so concurrent HMR/builds cannot change a
// gesture sequence halfway through. No browser automation endpoint is exposed.
const files=new Map();
function collect(root,prefix=''){for(const entry of readdirSync(root,{withFileTypes:true})){const name=prefix+'/'+entry.name;if(entry.isDirectory())collect(join(root,entry.name),name);else if(!name.endsWith('.mp4'))files.set(name,readFileSync(join(root,entry.name)));}}
collect('dist');
for(const path of ['bench/viewer-navigation-qa.html','bench/viewer-navigation-evidence/landmarks.png','bench/viewer-navigation-evidence/large-clip.gif','bench/claude-audit-2026-10-15/device/fixtures/walk.gif'])files.set('/'+path,readFileSync(path));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.json':'application/json'};
const port=Number(process.argv[2]||5294);
http.createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;const key=path==='/'?'/index.html':path;const file=files.get(key);if(!file){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[extname(key)]||'application/octet-stream','Cache-Control':'no-store'});res.end(file);}).listen(port,'127.0.0.1',()=>console.log(`Fixed preview build: http://127.0.0.1:${port}/`));
