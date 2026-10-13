// Actual-build fault injection, limited to this loopback diagnostic origin.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
const dist = resolve('dist'), out = resolve('.tmp/onebit-recovery/failure-results');
const port = Number(process.argv[2] ?? 5285);
const html = new URL('./palette-failure-qa.html', import.meta.url);
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.gif':'image/gif', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
const preload = `<script>
localStorage.setItem('bitify',JSON.stringify({family:'full-palette',paletteId:'preset-edg32',maxColors:0,cleanup:false,alphaCut:128,metric:'oklab'}));
const q=window.__failureQA={failLimit:0,failCleanup:0,starts:{limit:0,cleanup:0},errors:[],resizeWarnings:[],exports:[],copies:0};
window.addEventListener('error',e=>(e.message.startsWith('ResizeObserver loop')?q.resizeWarnings:q.errors).push({message:e.message,at:performance.now()}));window.addEventListener('unhandledrejection',e=>q.errors.push(String(e.reason)));
const W=window.Worker;window.Worker=class extends W{
 constructor(url,opts){super(url,opts);this.stage=String(url).includes('palette-limit-worker')?'limit':String(url).includes('palette-cleanup-worker')?'cleanup':null;}
 postMessage(message,...args){if(this.stage&&message.type==='start'){
  q.starts[this.stage]++;const key=this.stage==='limit'?'failLimit':'failCleanup';
  if(q[key]>0){q[key]--;setTimeout(()=>this.onmessageerror?.({}),20);return;}
 }return super.postMessage(message,...args);}
};
const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith('blob:')){q.exports.push({name:this.download,href:this.href});return;}return click.call(this);};
Object.defineProperty(navigator.clipboard,'write',{value:async()=>{q.copies++;},configurable:true});
</script>`;
const server = createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');let file;
  if(req.method==='POST'&&url.pathname==='/results'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>1e6)throw Error('Results too large');}
   const data=JSON.parse(body);await mkdir(out,{recursive:true});
   const label=/Android/.test(data.userAgent)?'phone':'desktop';
   await writeFile(resolve(out,`${label}.json`),JSON.stringify(data,null,2));res.writeHead(200).end('saved');return;
  }
  if(url.pathname==='/qa')file=html;
  else if(url.pathname.startsWith('/app/')){
   file=resolve(dist,url.pathname.slice(5)||'index.html');const part=relative(dist,file);
   if(part.startsWith('..')||isAbsolute(part)){res.writeHead(403).end();return;}
  }else{res.writeHead(404).end();return;}
  let bytes=await readFile(file);if(url.pathname==='/app/')bytes=Buffer.from(bytes.toString().replace(/<script\s+type="module"/,preload+'<script type="module"'));
  res.writeHead(200,{'content-type':types[extname(file instanceof URL?file.pathname:file)]??'application/octet-stream','cache-control':'no-store'}).end(bytes);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500).end(e.message);}
});
server.listen(port,'127.0.0.1',()=>console.log(`Palette recovery QA http://127.0.0.1:${port}/qa`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close());
