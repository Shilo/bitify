// Does the app give memory back? Adds photos, uses every control, removes them, collects
// garbage and measures what is still held, several times over. A leak shows as a number that
// keeps climbing from one round to the next.
//   node leak.mjs <dist dir> [rounds] [photos per round]
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const [dist, ROUNDS = 6, PHOTOS = 3] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif' };
const server = createServer((req, res) => {
  const path = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = 9400 + Math.floor(Math.random() * 500);
const edge = spawn(process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bitify-bench-'))}`, '--no-first-run', '--window-size=412,915', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Opens the connection to the page, trying again if the browser, still starting, does not answer.
async function opened(url) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const socket = new WebSocket(url);
    const ok = await new Promise(done => { socket.onopen = () => done(true); socket.onerror = () => done(false); setTimeout(() => done(false), 4000); });
    if (ok) return socket;
    try { socket.close(); } catch {}
    if (process.env.TRACE) console.error('the browser did not answer, trying again');
  }
  throw new Error('could not connect to the browser');
}
let target;
for (let i = 0; i < 75 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = await opened(target.webSocketDebuggerUrl);
let seq = 0;
const waiting = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise((r, fail) => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); if (process.env.TRACE) console.error('>', method); setTimeout(() => waiting.has(id) && fail(new Error('no answer to ' + method)), 240000); });
const run = async fn => {
  const m = await send('Runtime.evaluate', { expression: `(${fn})()`, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails.exception ?? m.result.exceptionDetails));
  return m.result.result.value;
};
// Waits until the app itself is on the page. A fixed wait is not enough when the browser is slow
// to start: a script begun in the blank page is dropped when the app arrives, and never answers.
const appReady = async () => {
  for (let i = 0; i < 300; i++) {
    const m = await send('Runtime.evaluate', { expression: "location.protocol === 'http:' && document.readyState === 'complete' && !!document.querySelector('input[type=file]')", returnByValue: true });
    if (m.result?.result?.value === true) return sleep(300);
    await sleep(100);
  }
  throw new Error('the app did not load');
};
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  localStorage.setItem('bitify', JSON.stringify({ first: '#222323', second: '#f0f6f0', style: 'cutout', threshold: null }));
  window.__urls = 0; const make = URL.createObjectURL, drop = URL.revokeObjectURL;
  URL.createObjectURL = b => { __urls++; return make.call(URL, b); }; URL.revokeObjectURL = u => { __urls--; return drop.call(URL, u); };
  const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (!this.download) click.call(this); };
` });
await send('Page.navigate', { url: `http://localhost:${server.address().port}/` });
await appReady();
await run(`async () => {
  const w = 2048, h = 1536, c = new OffscreenCanvas(w, h), ctx = c.getContext('2d'), id = ctx.createImageData(w, h), data = id.data;
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, v = y / h, blob = Math.sin(u * 9) * Math.cos(v * 7) * 60 + 128, g = (rnd() - 0.5) * 30;
    data[i] = blob + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g; data[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  window.__blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  window.__wait = ms => new Promise(r => setTimeout(r, ms));
  window.__key = (k, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === ' ' ? 'Space' : k, bubbles: true }));
}`);

// What the page holds once garbage is collected: script objects, the memory behind typed arrays
// (where the images are), and the page's elements and listeners.
async function held() {
  for (let i = 0; i < 3; i++) { await send('HeapProfiler.collectGarbage'); await sleep(150); }
  const heap = (await send('Runtime.getHeapUsage')).result, dom = (await send('Memory.getDOMCounters')).result;
  const mb = v => +(v / 2 ** 20).toFixed(1);
  return { scriptMB: mb(heap.usedSize), arraysMB: mb(heap.backingStorageSize ?? 0), nodes: dom.nodes, listeners: dom.jsEventListeners, links: await run(`() => __urls`), canvases: await run(`() => document.querySelectorAll('canvas').length`) };
}
await send('HeapProfiler.enable');
const rows = [['start', await held()]];
for (let round = 1; round <= ROUNDS; round++) {
  await run(`async () => {
    const input = document.querySelector('input[type=file]'), dt = new DataTransfer();
    for (let i = 0; i < ${PHOTOS}; i++) dt.items.add(new File([__blob], i + 'photo.jpg', { type: 'image/jpeg' }));
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    for (let i = 0; i < 200 && document.querySelectorAll('.tiles .tile canvas').length < ${PHOTOS}; i++) await __wait(50);
    await __wait(200);
    // every style, a palette, compare, the slider with a drag and a release, the palette panel, share, save one and all
    for (let i = 0; i < 9; i++) { __key('ArrowDown'); await __wait(40); }
    __key('ArrowRight'); await __wait(40); __key(' '); await __wait(60); __key(' ', 'keyup'); await __wait(40);
    document.querySelector('.dock button[aria-label="Style"]').click(); await __wait(80);
    const slider = document.querySelector('#threshold');
    slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    for (let v = 60; v < 200; v += 10) { slider.value = v; slider.dispatchEvent(new Event('input', { bubbles: true })); await __wait(20); }
    slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true })); await __wait(60);
    document.querySelector('.dock button[aria-label="Palette"]').click(); await __wait(80);
    document.querySelector('.dock button[aria-label="Palette"]').click(); await __wait(40);
    document.querySelector('.tiles .tile .ib.touch')?.click(); await __wait(60);        // the Share sheet
    document.querySelector('dialog.sheet[open] .btn:nth-of-type(2)')?.click(); await __wait(300); // Download from it
    document.querySelector('dialog[open]')?.close();
    document.querySelector('.dock .btn.primary').click(); await __wait(1500);            // Download all
    document.querySelector('.tiles .tile .acts .ib:last-child').click(); await __wait(60); // remove one
    document.querySelector('.bar button[aria-label="Remove all"]')?.click(); await __wait(200);
  }`);
  await sleep(10500); // saved files are let go ten seconds after they are offered
  rows.push([`after round ${round}`, await held()]);
}
const cols = Object.keys(rows[0][1]);
console.log(['', ...cols].map((c, i) => (i ? c.padStart(10) : c.padEnd(15))).join(''));
for (const [name, r] of rows) console.log(name.padEnd(15) + cols.map(c => String(r[c]).padStart(10)).join(''));
ws.close(); edge.kill(); server.close(); process.exit(0);
