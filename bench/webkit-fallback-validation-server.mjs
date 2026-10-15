// Separate native-fallback diagnostic host; no clipboard or production writes.
import http from 'node:http';
import fs from 'node:fs/promises';
import sync from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=process.cwd(),bench=path.join(root,'bench'),prefix='webkit-fallback-validation-',stress=path.join(bench,prefix+'stress');await fs.mkdir(stress,{recursive:true});
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const hash=b=>createHash('sha256').update(b).digest('hex');
const pixels=Buffer.alloc(1024*1024*4);for(let p=0;p<pixels.length;p+=4)pixels.set([(p>>2)%251,Math.floor(p/4096)%251,(p*17)%256,[0,1,64,127,128,192,254,255][(p>>2)%8]],p);
await fs.writeFile(path.join(stress,'one-mp.rgba'),pixels);const png=await sharp(pixels,{raw:{width:1024,height:1024,channels:4}}).png().toBuffer();await fs.writeFile(path.join(stress,'one-mp.png'),png);await fs.writeFile(path.join(stress,'manifest.json'),JSON.stringify({width:1024,height:1024,file:'one-mp.png',rgbaFile:'one-mp.rgba',pngSha256:hash(png),rgbaSha256:hash(pixels)}));
const helper=()=>sync.existsSync(path.join(root,'src/lib/png-webgl-fallback.js'))?'src/lib/png-webgl-fallback.js':'bench/webkit-fallback-candidate-gl.mjs';
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Native PNG fallback validation</title><style>body{font:14px system-ui;margin:16px}button{min-height:44px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Native PNG fallback validation</h1><button id="run">Run native fallback validation</button><p id="status">Owned fixtures only; no clipboard.</p><pre id="out"></pre><script type="module" src="/probe.mjs"></script>';
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');res.setHeader('cache-control','no-store');
if(req.method==='POST'&&u.pathname==='/report'){let text='';for await(const b of req){text+=b;if(text.length>2e6)throw Error('Report limit');}const value=JSON.parse(text);if(!['codex','android','webkit'].includes(value.device))throw Error('Unknown device');await fs.writeFile(path.join(bench,prefix+value.device+'-native.json'),JSON.stringify(value,null,2)+'\n');res.end('saved');return;}
if(u.pathname==='/'){res.setHeader('content-type','text/html');res.end(html);return;}
if(u.pathname==='/dependencies'){const paths=[helper(),'bench/webkit-fallback-candidate-stream-reader.mjs','src/lib/image-decode.js','src/lib/quantize.js','bench/'+prefix+'probe.mjs','bench/png-precision-validation-fixtures/manifest.json','bench/png-import-precision-review/fixtures/manifest.json','bench/'+prefix+'stress/manifest.json'],hashes={};for(const p of paths)hashes[p]=hash(await fs.readFile(path.join(root,p)));res.setHeader('content-type','application/json');res.end(JSON.stringify({helperPath:helper(),hashes}));return;}
let filename;if(u.pathname==='/probe.mjs')filename=path.join(bench,prefix+'probe.mjs');else if(u.pathname==='/engine/png-webgl-fallback.js')filename=path.join(root,helper());else if(u.pathname==='/engine/webkit-fallback-candidate-stream-reader.mjs')filename=path.join(bench,'webkit-fallback-candidate-stream-reader.mjs');else if(/^\/(?:engine|src\/lib)\/[a-z0-9.-]+\.js$/.test(u.pathname))filename=path.join(root,'src/lib',path.basename(u.pathname));
else if(/^\/(?:corpus|frozen|stress)\/[a-z0-9.-]+$/.test(u.pathname)){const group=u.pathname.split('/')[1];filename=path.join(group==='corpus'?path.join(bench,'png-precision-validation-fixtures'):group==='frozen'?path.join(bench,'png-import-precision-review/fixtures'):stress,path.basename(u.pathname));}
if(!filename){res.writeHead(404);res.end();return;}res.setHeader('content-type',/\.m?js$/.test(filename)?'text/javascript':filename.endsWith('.json')?'application/json':'application/octet-stream');res.end(await fs.readFile(filename));
}catch(error){res.writeHead(500);res.end(error.message);}}).listen(5303,'127.0.0.1',()=>console.log('Native fallback validation http://127.0.0.1:5303/?device=codex'));
