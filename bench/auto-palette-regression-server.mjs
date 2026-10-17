// Compare frozen builds differing only by the Auto reuse guard.
// node bench/auto-palette-regression-server.mjs <before-dir> <after-dir> [port]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
const roots = { before: resolve(process.argv[2]), after: resolve(process.argv[3]) };
const port = Number(process.argv[4] || 5383);
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif' };
function preload(kind, query) {
  return `<script>
const nativeStorage=window.localStorage,prefix='auto-regression-${kind}:';
Object.defineProperty(window,'localStorage',{value:{getItem:k=>nativeStorage.getItem(prefix+k),setItem:(k,v)=>nativeStorage.setItem(prefix+k,v),removeItem:k=>nativeStorage.removeItem(prefix+k)}});
localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'${query.has('preset') ? 'preset-pico8' : 'generated-32'}',maxColors:0,cleanup:false,alphaCut:128}));
localStorage.setItem('colorfetti-palettes-v1','{"version":1,"palettes":[]}');
const qa=window.__functional={jobs:0,starts:0,paints:0,terminated:0,hold:false,held:[],failNext:${query.has('fail')},downloads:[],errors:[]};
qa.release=()=>{qa.hold=false;for(const send of qa.held.splice(0))send();};
addEventListener('error',e=>qa.errors.push(e.message));
addEventListener('unhandledrejection',e=>qa.errors.push(String(e.reason)));
const put=CanvasRenderingContext2D.prototype.putImageData;
CanvasRenderingContext2D.prototype.putImageData=function(...args){const r=put.apply(this,args);if(this.canvas.matches('.tile .art canvas'))qa.paints++;return r;};
const NativeWorker=window.Worker;
window.Worker=class extends NativeWorker{
 constructor(url,options){super(url,options);this.generated=String(url).includes('palette-generated-worker');this.working=false;this.stopped=false;this.addEventListener('message',e=>{if(['result','error','done'].includes(e.data?.type))this.finish();});}
 finish(){if(this.working){qa.jobs--;this.working=false;}}
 terminate(){this.stopped=true;this.finish();qa.terminated++;return super.terminate();}
 postMessage(message,...rest){
  if(message.type==='start'&&!this.working){this.working=true;qa.jobs++;}
  if(this.generated&&message.type==='start'){
   qa.starts++;
   if(qa.failNext){qa.failNext=false;queueMicrotask(()=>this.onerror?.(new Event('error')));return;}
   if(qa.hold){qa.held.push(()=>{if(!this.stopped)super.postMessage(message,...rest);});return;}
  }
  return super.postMessage(message,...rest);
 }
};
${query.has('fallback') ? 'window.Worker=undefined;' : ''}
const blobs=new Map(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};
URL.revokeObjectURL=url=>{blobs.delete(url);return revoke(url);};
const anchorClick=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){const blob=blobs.get(this.href);if(this.download&&blob){const entry={name:this.download,type:blob.type,bytes:null};qa.downloads.push(entry);blob.arrayBuffer().then(b=>entry.bytes=new Uint8Array(b));return;}return anchorClick.call(this);};
</script>`;
}
createServer(async (req,res) => {
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='POST'&&url.pathname==='/report'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4e6)throw Error('Report too large');}
      const parsed=JSON.parse(body);await mkdir('.tmp/auto-functional',{recursive:true});
      await writeFile('.tmp/auto-functional/results.json',JSON.stringify(parsed,null,2));
      res.writeHead(200).end('saved');return;
    }
    let file,kind;
    if(url.pathname==='/qa')file=new URL('./auto-palette-regression.html',import.meta.url);
    else if(url.pathname==='/clip.gif')file=resolve('bench/claude-audit-2026-10-15/device/fixtures/walk.gif');
    else {
      const match=/^\/(before|after)\/(.*)$/.exec(decodeURIComponent(url.pathname));
      if(!match){res.writeHead(404).end();return;}
      kind=match[1];file=resolve(roots[kind],match[2]||'index.html');
      const inside=relative(roots[kind],file);if(inside.startsWith('..')||isAbsolute(inside)){res.writeHead(403).end();return;}
    }
    let bytes=await readFile(file);
    if(kind&&url.pathname===`/${kind}/`)bytes=bytes.toString().replace(/<script\s+type="module"/,preload(kind,url.searchParams)+'<script type="module"');
    res.writeHead(200,{'content-type':mime[extname(String(file))]||'text/html','cache-control':'no-store'}).end(bytes);
  }catch(error){res.writeHead(500).end(error.stack);}
}).listen(port,'127.0.0.1',()=>console.log(`Auto functional regression: http://127.0.0.1:${port}/qa`));
