// Loopback-only built-app acceptance. No production source transforms.
// node bench/auto-palette-continuity-server.mjs <build-directory> [port]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
const root = resolve(process.argv[2] || 'dist'), port = Number(process.argv[3] || 5286);
const qa = new URL('./auto-palette-continuity.html', import.meta.url);
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif' };
const preload = `<script>
localStorage.setItem('colorfetti', JSON.stringify({family:'full-palette',paletteId:'preset-pico8',maxColors:0,cleanup:false,alphaCut:128}));
window.__continuity = {paints:0,generations:0,failNextGeneration:false,errors:[]};
addEventListener('error', e => __continuity.errors.push(e.message));
addEventListener('unhandledrejection', e => __continuity.errors.push(String(e.reason)));
const put = CanvasRenderingContext2D.prototype.putImageData;
CanvasRenderingContext2D.prototype.putImageData = function(...args) {
  const result = put.apply(this,args);
  if(this.canvas.matches('.tile .art canvas')) __continuity.paints++;
  return result;
};
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
  constructor(url,options) { super(url,options); this.generated=String(url).includes('palette-generated-worker'); }
  postMessage(message,...rest) {
    if(this.generated && message.type==='start') {
      __continuity.generations++;
      if(__continuity.failNextGeneration) {
        __continuity.failNextGeneration=false;
        queueMicrotask(()=>this.onerror?.(new Event('error'))); return;
      }
    }
    return super.postMessage(message,...rest);
  }
};
</script>`;
createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if(req.method === 'POST' && url.pathname === '/report') {
      let body=''; for await(const chunk of req) {body+=chunk; if(body.length>1e6) throw Error('Report too large');}
      const report=JSON.parse(body); await mkdir('.tmp/auto-flicker',{recursive:true});
      const variant=['default','cap','cleanup','combined'].includes(report.mode)?report.mode:'default';
      await writeFile(`.tmp/auto-flicker/report-${port}-${variant}${report.phone?'-phone':''}.json`, JSON.stringify(report,null,2));
      res.writeHead(200).end('saved'); return;
    }
    let file;
    if(url.pathname === '/qa') file = qa;
    else if(url.pathname.startsWith('/app/')) {
      file=resolve(root, '.'+decodeURIComponent(url.pathname.slice(4)), url.pathname.endsWith('/')?'index.html':'');
      const part=relative(root,file); if(part.startsWith('..') || isAbsolute(part)) {res.writeHead(403).end();return;}
    } else if(url.pathname === '/clip.gif') file=resolve('bench/claude-audit-2026-10-15/device/fixtures/walk.gif');
    else {res.writeHead(404).end();return;}
    let body=await readFile(file);
    if(url.pathname === '/app/') {
      const modes = {default:{},cap:{maxColors:4},cleanup:{cleanup:true},combined:{maxColors:4,cleanup:true,dither:'4x4',ditherStrength:50,alphaMode:'keep'}};
      const settings={family:'full-palette',paletteId:'preset-pico8',maxColors:0,cleanup:false,alphaCut:128,...modes[url.searchParams.get('mode') || 'default']};
      body=body.toString().replace(/<script\s+type="module"/,preload.replace(/JSON.stringify\(\{family:.*?\}\)/,JSON.stringify(JSON.stringify(settings)))+'<script type="module"');
    }
    res.writeHead(200, {'content-type':types[extname(String(file))] || 'text/html', 'cache-control':'no-store'}).end(body);
  } catch(e) {res.writeHead(500).end(e.message);}
}).listen(port,'127.0.0.1',()=>console.log(`Auto continuity QA: http://127.0.0.1:${port}/qa (${root})`));
