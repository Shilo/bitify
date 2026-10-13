// Actual-build acceptance: node bench/live-reanalysis-qa-server.mjs [port=5286]
// Serve .tmp/reanalysis/site/{base,candidate}; no production source transforms.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync, crc32 } from 'node:zlib';
import { unzipSync } from 'fflate';

const root = resolve('.tmp/reanalysis'), sites = resolve(root, 'site');
const fixtures = resolve('.tmp/auto64-ui-20261012/build/fixtures'), output = resolve(root, 'results');
const qa = fileURLToPath(new URL('./live-reanalysis-qa.html', import.meta.url));
const port = Number(process.argv[2] ?? 5286);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif', '.json':'application/json', '.webmanifest':'application/manifest+json' };
function inside(base, path) {
  const file = resolve(base, path), part = relative(base, file);
  if (part.startsWith('..') || isAbsolute(part)) throw new Error('Path outside test root.');
  return file;
}
function preload(seed) {
  const green = seed !== 'luma';
  return `<script>
localStorage.setItem('bitify', JSON.stringify({family:'two-color',paletteId:'preset-pico8',style:'cutout',none:0,first:'#222323',second:'#f0f6f0',settings:{cutout:{threshold:null,seams:null,rim:true,source:'luma',alpha:128},solid:{threshold:null,source:${JSON.stringify(green?'green':'luma')},alpha:128}}}));
const q = window.__reanalysisQA = {exports:[],errors:[],warnings:[],long:[],paints:0,hold:false,queued:[],rafGapMax:0,lastRaf:0,observed:PerformanceObserver.supportedEntryTypes.includes('longtask')};
window.addEventListener('error', e => {const entry={message:e.message,source:e.filename,line:e.lineno,stack:e.error?.stack};if(e.message==='ResizeObserver loop completed with undelivered notifications.' && e.lineno===0)q.warnings.push(entry);else q.errors.push(entry);});
window.addEventListener('unhandledrejection', e => q.errors.push({message:e.reason?.message || String(e.reason),stack:e.reason?.stack}));
if(q.observed){q.observer=new PerformanceObserver(list=>q.long.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));q.observer.observe({type:'longtask'});}
const NativeChannel=window.MessageChannel;
window.MessageChannel=class extends NativeChannel{constructor(){super();const send=this.port2.postMessage.bind(this.port2);this.port2.postMessage=(...args)=>{if(q.failNextPost){q.failNextPost=false;q.injectedFailures=(q.injectedFailures||0)+1;throw Error('Injected one-shot reanalysis scheduling failure');}if(q.hold)q.queued.push(()=>send(...args));else send(...args);};}};
q.release=()=>{q.hold=false;for(const send of q.queued.splice(0))send();};
const put=CanvasRenderingContext2D.prototype.putImageData;
CanvasRenderingContext2D.prototype.putImageData=function(...args){const result=put.apply(this,args);if(this.canvas.matches('.grid .tile .art canvas'))q.paints++;return result;};
const raf=at=>{if(q.lastRaf)q.rafGapMax=Math.max(q.rafGapMax,at-q.lastRaf);q.lastRaf=at;requestAnimationFrame(raf);};requestAnimationFrame(raf);
const click=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(this.download && this.href.startsWith('blob:')){q.exports.push({at:performance.now(),name:this.download,href:this.href});return;}return click.call(this);};
</script>`;
}
async function manifest(build) {
  const dir = resolve(sites, build), html = await readFile(resolve(dir, 'index.html'), 'utf8');
  const entry = html.match(/<script\s+type="module"[^>]*src="([^"]+)"/)?.[1];
  if (!entry) throw new Error(`${build}: missing module entry.`);
  return { entry, indexSha256: sha(html), entrySha256: sha(await readFile(inside(dir, entry))) };
}
const noise = new Map();
async function photo(index, w) {
  const key = `${w}-${index}`;
  if (noise.has(key)) return noise.get(key);
  const rows = Buffer.alloc((w * 4 + 1) * w); let state = index + 1;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const at = y * (w * 4 + 1) + 1 + x * 4;
    rows[at] = w === 2048 ? x * 255 / w : (x * 255 / w + (state >>> 16 & 31)) & 255;
    rows[at + 1] = w === 2048 ? y * 255 / w : (y * 255 / w + (state >>> 8 & 31)) & 255;
    rows[at + 2] = w === 2048 ? (x + y) & 255 : state >>> 20 & 255; rows[at + 3] = 255;
  }
  const chunk = (type, bytes) => {
    const result = Buffer.alloc(12 + bytes.length); result.writeUInt32BE(bytes.length); result.write(type, 4); bytes.copy(result, 8);
    result.writeUInt32BE(crc32(result.subarray(4, 8 + bytes.length)), 8 + bytes.length); return result;
  };
  const head = Buffer.alloc(13); head.writeUInt32BE(w); head.writeUInt32BE(w, 4); head.set([8, 6, 0, 0, 0], 8);
  const bytes = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR', head),chunk('IDAT', deflateSync(rows, {level:1})),chunk('IEND', Buffer.alloc(0))]);
  await mkdir(resolve(output, 'sources'), { recursive:true });
  await writeFile(resolve(output, 'sources', `noise${w}-${index}.png`), bytes);
  noise.set(key, bytes); return bytes;
}
async function body(req, limit) {
  let size = 0; const parts = [];
  for await (const part of req) { size += part.length; if (size > limit) throw new Error('Test upload exceeds size limit.'); parts.push(part); }
  return Buffer.concat(parts);
}
function identity(bytes, name) {
  const result = { name, size:bytes.length, sha256:sha(bytes) };
  if (name.endsWith('.zip')) result.entries = Object.fromEntries(Object.entries(unzipSync(bytes)).sort(([a],[b])=>a.localeCompare(b)).map(([name,data])=>[name,{size:data.length,sha256:sha(data)}]));
  return result;
}
const server = createServer(async (req,res) => {
  const send = (status, data, type='application/json') => res.writeHead(status, {'content-type':type,'cache-control':'no-store'}).end(type==='application/json' ? JSON.stringify(data) : data);
  try {
    const url = new URL(req.url, 'http://localhost'), path = decodeURIComponent(url.pathname);
    if (req.method === 'POST') {
      // Result destinations are fixed below the diagnostic root; no supplied filename is used as a path.
      const match = path.match(/^\/(capture|results)\/([a-zA-Z0-9-]{1,80})(?:\/([a-zA-Z0-9-]{1,40})\/(base|candidate)\/([0-9]{1,2}))?$/);
      if (!match) return send(404,{error:'Invalid test destination.'});
      const [,kind,run,scenario,build,iteration] = match, dir = inside(output, run);
      await mkdir(dir, {recursive:true});
      if (kind === 'results' && !scenario) {
        const data = JSON.parse((await body(req, 2 * 1024 * 1024)).toString());
        await writeFile(resolve(dir, 'results.json'), JSON.stringify(data,null,2));
        return send(200,{saved:relative(root,resolve(dir,'results.json'))});
      }
      if (kind !== 'capture' || !scenario) return send(400,{error:'Missing capture identity.'});
      const name = String(req.headers['x-export-name'] ?? ''), ext = extname(name);
      if (!['.png','.gif','.zip'].includes(ext)) return send(400,{error:'Unknown export kind.'});
      const bytes = await body(req, 64 * 1024 * 1024), result = identity(bytes,name);
      const file = resolve(dir,`${scenario}-${build}-${iteration}${ext}`); await writeFile(file,bytes);
      return send(200,{...result,saved:relative(root,file)});
    }
    if (path === '/qa' || path === '/qa/') return send(200,await readFile(qa),'text/html');
    if (path === '/manifest') return send(200,{base:await manifest('base'),candidate:await manifest('candidate')});
    const noiseMatch = path.match(/^\/noise\/(1024|2048)\/([0-9]|1[01])\.png$/);
    if (noiseMatch) return send(200,await photo(Number(noiseMatch[2]),Number(noiseMatch[1])),'image/png');
    if (/^\/fixtures\/(a\d{3}\.gif|dungeon\.gif|building[1-6]\.png)$/.test(path)) return send(200,await readFile(inside(fixtures,path.slice(10))),mime[extname(path)]);
    const match = path.match(/^\/(base|candidate)\/(.*)$/);
    if (!match) return send(404,{error:'Use /qa.'});
    const [,build,tail] = match, file = inside(resolve(sites,build),tail || 'index.html'); let bytes = await readFile(file);
    if (!tail || tail === 'index.html') bytes = Buffer.from(bytes.toString().replace(/<script\s+type="module"/,preload(url.searchParams.get('seed'))+'<script type="module"'));
    return send(200,bytes,mime[extname(file)] ?? 'application/octet-stream');
  } catch(error) { return send(error.code==='ENOENT'?404:500,{error:error.message}); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Actual-build live reanalysis QA: http://127.0.0.1:${port}/qa\nBuilds: ${sites}\nCaptures: ${output}`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close());
