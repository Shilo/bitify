// Manual acceptance harness for the actual built app, without source transforms.
// node bench/palette-preview-reuse-server.mjs dist 5281
// Open http://127.0.0.1:5281/qa in a foreground desktop browser and Run checks.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(process.argv[2] ?? 'dist'), port = Number(process.argv[3] ?? 5281);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Choose a valid port.');
const qa = fileURLToPath(new URL('./palette-preview-reuse-qa.html', import.meta.url));
const preload = paletteId => `<script>
localStorage.setItem('colorfetti', JSON.stringify({ family:'full-palette', paletteId:'${paletteId}', metric:'oklab', maxColors:0, cleanup:false, alphaCut:128 }));
const qa = window.__previewReuseQA = { channels:0, wallPaints:0, byName:{}, errors:[] };
window.addEventListener('error', event => qa.errors.push({ kind:'error', message:event.message || String(event.error),
  source:event.filename || '', line:event.lineno || 0, column:event.colno || 0, stack:event.error?.stack || '' }));
window.addEventListener('unhandledrejection', event => qa.errors.push({ kind:'unhandledrejection', message:event.reason?.message || String(event.reason),
  source:'', line:0, column:0, stack:event.reason?.stack || '' }));
const NativeChannel = window.MessageChannel;
window.MessageChannel = class extends NativeChannel { constructor() { super(); qa.channels++; } };
const put = CanvasRenderingContext2D.prototype.putImageData;
CanvasRenderingContext2D.prototype.putImageData = function(...args) {
  const result = put.apply(this, args);
  if (this.canvas.matches('.grid .tile .art canvas')) {
    qa.wallPaints++;
    const name = this.canvas.closest('.tile').querySelector('.caption-preview')?.getAttribute('aria-label');
    if (name) qa.byName[name] = (qa.byName[name] ?? 0) + 1;
  }
  return result;
};
</script>`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), path = decodeURIComponent(url.pathname);
    let file;
    if (path === '/qa' || path === '/qa/') file = qa;
    else if (path.startsWith('/app/')) {
      file = resolve(dist, '.' + path.slice(4), path.endsWith('/') ? 'index.html' : '');
      const inside = relative(dist, file);
      if (inside.startsWith('..') || isAbsolute(inside)) { res.writeHead(403).end(); return; }
    } else { res.writeHead(404).end('Use /qa.'); return; }
    let body = await readFile(file);
    if (path === '/app/' || path === '/app/index.html') {
      const html = body.toString();
      if (!/<script\s+type="module"/.test(html)) throw new Error('Build has no module entry; run npm run build first.');
      const paletteId = url.searchParams.get('palette') === 'pico8' ? 'preset-pico8' : 'preset-edg32';
      body = html.replace(/<script\s+type="module"/, preload(paletteId) + '<script type="module"');
    }
    res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message); }
});
server.listen(port, '127.0.0.1', () => console.log(`Preview reuse QA: http://127.0.0.1:${port}/qa\nBuild: ${dist}\nTest-only storage and counters apply only to this local origin.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
