// Drives a production build of the app in a real Edge window (or headless with HEADLESS=1),
// with the CPU slowed down as a stand-in for a phone, and times what a person would feel.
//   node live.mjs <dist dir> [key=value ...]
//   keys: w h (image size), cpu (slowdown), style, steps (slider moves), count (images added),
//         profile (phone | tablet | desktop), kind (photo | sprite | gif)
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const dist = process.argv[2];
const o = { w: 4000, h: 3000, cpu: 4, style: 'cutout', steps: 20, count: 1, profile: 'phone', kind: 'photo', ...Object.fromEntries(process.argv.slice(3).map(a => a.split('='))) };
const PROFILES = { phone: [412, 915, 2.625, true], tablet: [820, 1180, 2, true], desktop: [1440, 900, 1, false] };
// DEVICE=<port> drives Chrome on a real phone instead: the local port that adb forwards to the
// phone's Chrome (adb forward tcp:<port> localabstract:chrome_devtools_remote). The page is
// served from this machine through `adb reverse`, and the phone's own screen, processor and
// graphics do the work. `cpu` above 1 still slows the phone's processor further.
const DEVICE = process.env.DEVICE;
if (DEVICE) o.profile = 'device';
const [vw, vh, dpr, mobile] = PROFILES[o.profile] ?? [0, 0, 0, true];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const path = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise(r => server.listen(DEVICE ? 5199 : 0, '127.0.0.1', r));
const url = dist.startsWith('http') ? dist : `http://localhost:${server.address().port}/`;
if (DEVICE) execFileSync('adb', ['reverse', 'tcp:5199', 'tcp:5199']);

const PORT = DEVICE ?? 9400 + Math.floor(Math.random() * 500);
const edge = DEVICE ? { kill() {} } : spawn(process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  ...(process.env.HEADLESS ? ['--headless=new'] : []),
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bitify-bench-'))}`,
  '--no-first-run', '--no-default-browser-check', '--disable-features=CalculateNativeWinOcclusion,msEdgeWelcomePage',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  `--window-size=${Math.min(vw + 40, 1500)},${Math.min(vh + 140, 1000)}`, 'about:blank',
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
const quit = async code => { try { ws?.close(); } catch {} edge.kill(); if (DEVICE && target) await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {}); server.close(); process.exit(code); };
setTimeout(() => { console.log(JSON.stringify({ ...o, error: 'timed out' })); quit(1); }, +(process.env.LIMIT ?? 240) * 1000);

let target, ws;
// on the phone, a tab of our own, so that none of the person's tabs is touched
if (DEVICE) {
  const browser = new WebSocket((await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl);
  await new Promise(r => (browser.onopen = r));
  const made = new Promise(r => (browser.onmessage = e => r(JSON.parse(e.data).result.targetId)));
  browser.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: 'about:blank' } }));
  const id = await made;
  browser.close();
  target = { id, webSocketDebuggerUrl: `ws://127.0.0.1:${PORT}/devtools/page/${id}` };
}
for (let i = 0; i < 75 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {}
}
ws = await opened(target.webSocketDebuggerUrl);
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
if (!DEVICE) await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: dpr, mobile });
if (mobile && !DEVICE) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
// Runs before the app: the settings, and hooks that note every draw to a canvas on the page.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  localStorage.setItem('bitify', JSON.stringify({ first: '#222323', second: '#f0f6f0', style: '${o.style}', threshold: null }));
  window.__paints = [];
  const note = (proto, name) => { const was = proto[name]; proto[name] = function (...a) { const r = was.apply(this, a); if (this.canvas.isConnected) __paints.push(performance.now()); return r; }; };
  note(CanvasRenderingContext2D.prototype, 'putImageData'); note(CanvasRenderingContext2D.prototype, 'drawImage');
  // every screen frame, so the longest freeze and the frame rate can be read off afterwards
  window.__frames = []; (function tick(t) { __frames.push(performance.now()); requestAnimationFrame(tick); })();
  const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r)));
  window.__frame = frame;
  // Resolves once something was drawn after 'since' and then nothing more for a while. Gives the ms to the last draw.
  window.__settle = async (since, quiet = 350) => {
    for (;;) {
      await frame();
      const after = __paints.filter(t => t >= since);
      if (after.length && performance.now() - after.at(-1) > quiet) { await frame(); return after.at(-1) - since; }
      if (performance.now() - since > 200000) return -1;
    }
  };
  // The frames since 'since': how many, the longest gap between two, and the time lost to gaps over 50ms.
  window.__smooth = since => { const f = __frames.filter(t => t >= since), gaps = f.slice(1).map((t, i) => t - f[i]); return { frames: f.length, worst: Math.max(0, ...gaps), stuck: gaps.filter(g => g > 50).reduce((a, b) => a + b, 0) }; };
  // Saving: note the file instead of downloading it.
  window.__saved = null;
  const make = URL.createObjectURL; URL.createObjectURL = blob => { __saved = { at: performance.now(), bytes: blob.size, type: blob.type, blob }; return make.call(URL, blob); };
  const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (!this.download) click.call(this); };
` });
const trace = step => process.env.TRACE && console.error(step);
await send('Page.navigate', { url });
trace('page opened');
await appReady();

// The test image, made before the CPU is slowed. A photo is smooth shapes with grain; a sprite
// is a small flat-colored figure on an empty background; a gif is 24 frames of the photo moving.
await run(`async () => {
  const w = ${o.w}, h = ${o.h}, kind = '${o.kind}', c = new OffscreenCanvas(w, h), ctx = c.getContext('2d'), id = ctx.createImageData(w, h), data = id.data;
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, v = y / h, blob = Math.sin(u * 9) * Math.cos(v * 7) * 60 + 128, shape = ((x >> 6) + (y >> 6)) % 3 === 0 ? 50 : 0, g = kind === 'photo' ? (rnd() - 0.5) * 30 : 0;
    data[i] = blob + shape + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g;
    data[i + 3] = kind !== 'photo' && Math.hypot(u - 0.5, v - 0.5) > 0.45 ? 0 : 255;
    if (kind !== 'photo') { data[i] &= 0xc0; data[i + 1] &= 0xc0; data[i + 2] &= 0xc0; }
  }
  ctx.putImageData(id, 0, 0);
  const type = kind === 'photo' ? 'image/jpeg' : 'image/png';
  window.__file = new File([await c.convertToBlob({ type, quality: 0.9 })], 'test.' + type.slice(6), { type });
}`);
await send('Emulation.setCPUThrottlingRate', { rate: +o.cpu });

const out = { build: dist.split(/[\\/]/).at(-1), ...o };
const r1 = v => Math.round(v);

// 1. add the image (or several copies of it)
// BUSY=name saves two screenshots taken while the image is being read, to see the busy message and whether its spinner has turned
// On a phone the screen itself is photographed through adb, as the browser cannot hand over a screenshot while the page is busy.
const snap = async name => writeFileSync(`${name}.png`, DEVICE ? execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }) : Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
if (process.env.BUSY) (async () => { await sleep(+(process.env.BUSY_AT ?? 500)); await snap(process.env.BUSY + '-1'); await sleep(330); await snap(process.env.BUSY + '-2'); })();
const loaded = await run(`async () => {
  const t = performance.now(), input = document.querySelector('input[type=file]'), dt = new DataTransfer();
  for (let i = 0; i < ${o.count}; i++) dt.items.add(new File([__file], i + __file.name, { type: __file.type }));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  const first = await new Promise(async r => { for (;;) { await __frame(); const p = __paints.find(x => x >= t); if (p) return r(p - t); } });
  const all = await __settle(t), c = document.querySelector('.tile canvas');
  return { first, all, ...__smooth(t), canvas: c.width + 'x' + c.height, tiles: document.querySelectorAll('.tiles .tile').length };
}`);
Object.assign(out, { firstImage: r1(loaded.first), loaded: r1(loaded.all), loadFreeze: r1(loaded.worst), canvas: loaded.canvas, tiles: loaded.tiles });

// 2. change the style and back, the palette, and hold Space to compare
const key = (k, type = 'keydown') => `window.dispatchEvent(new KeyboardEvent('${type}', { key: '${k}', code: '${k === ' ' ? 'Space' : k}', bubbles: true }))`;
const press = async (k, type) => r1(await run(`async () => { const t = performance.now(); ${key(k, type)}; return __settle(t); }`));
trace('image added');
out.nextStyle = await press('ArrowDown');
out.backStyle = await press('ArrowUp');
out.palette = await press('ArrowRight');
out.compare = await press(' ');
await press(' ', 'keyup');

// 3. drag the threshold slider, one move per screen frame as a finger does
await run(`async () => { document.querySelector('.dock button[aria-label="Style"]').click(); await __frame(); await __frame(); }`);
if (process.env.PROFILE) { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start'); }
// The drag is made with real input, a finger on the phone and tablet screens and the mouse on the
// desktop one, so the browser itself produces the pointer, input and change events in their true order.
trace('styles, palette and compare done');
const bar = await run(`() => { const r = document.querySelector('#threshold').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; }`);
const at = i => ({ x: Math.round(bar.x + bar.w * (0.2 + (0.5 * i) / o.steps)), y: Math.round(bar.y) });
const point = (type, p) => mobile
  ? send('Input.dispatchTouchEvent', { type: { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[type], touchPoints: type === 'up' ? [] : [p] })
  : send('Input.dispatchMouseEvent', { type: { down: 'mousePressed', move: 'mouseMoved', up: 'mouseReleased' }[type], ...p, button: 'left', buttons: type === 'up' ? 0 : 1, clickCount: 1 });
const began = await run(`() => {
  __paints.length = 0; window.__events = {}; window.__moves = [];
  // when each move reaches the page, noted before the app handles it
  addEventListener('input', () => __moves.push(performance.now()), true);
  const slider = document.querySelector('#threshold');
  for (const e of ['pointerdown', 'input', 'pointerup', 'pointercancel', 'change']) slider.addEventListener(e, () => (__events[e] = (__events[e] ?? 0) + 1));
  return performance.now();
}`);
await point('down', at(0));
for (let i = 1; i <= o.steps; i++) { await point('move', at(i)); await run(`() => new Promise(r => requestAnimationFrame(r))`); }
trace('moves sent');
const drag = await run(`async () => {
  const t = ${began}, dragged = performance.now() - t, smooth = __smooth(t), c = document.querySelector('.tile canvas');
  // how long after each move the image was redrawn
  // every tile is redrawn for a move, so a move is done at the last draw before the next move arrives
  const waits = __moves.map((m, i) => __paints.findLast(p => p >= m && p < (__moves[i + 1] ?? Infinity)) - m).filter(w => w >= 0).sort((a, b) => a - b);
  return { dragged, ...smooth, waits, during: c.width + 'x' + c.height, threshold: document.querySelector('#threshold').value };
}`);
const shot = async name => process.env.SHOTS && writeFileSync(`${process.env.SHOTS}-${name}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
await shot('dragging');
// The finger stops but stays down: the image should sharpen. Then it moves on: a draft again.
// And a file saved while a draft is on screen must still be the whole image.
const size = `(() => { const c = document.querySelector('.tile canvas'); return c.width + 'x' + c.height; })()`;
await sleep(600);
out.afterRest = await run(`() => ${size}`);
await point('move', at(o.steps + 1));
await run(`() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)))`);
out.afterMovingOn = await run(`() => ${size}`);
out.savedDuringDrag = await run(`async () => {
  __saved = null; document.querySelector('.dock .btn.primary').click();
  for (let i = 0; i < 2000 && !__saved; i++) await new Promise(r => setTimeout(r, 25));
  if (!__saved || __saved.type !== 'image/png') return __saved ? __saved.type : 'nothing';
  const v = new DataView(await __saved.blob.arrayBuffer());
  return v.getUint32(16) + 'x' + v.getUint32(20); // the PNG's own width and height
}`);
// letting go
trace('rest and save during drag done');
const lifted = await run(`() => { __paints.length = 0; return performance.now(); }`);
await point('up', at(o.steps));
const released = await run(`async () => {
  // a tile that was not drafted has nothing to redraw on release, so do not wait long for a draw
  const t = ${lifted}; await __frame(); await __frame();
  const ms = __paints.length ? await __settle(t, 250) : 0, c = document.querySelector('.tile canvas');
  return { ms, after: c.width + 'x' + c.height, events: __events };
}`);
await shot('released');
// then the same threshold for every build, typed in, so that the saved files compare
await run(`async () => {
  const slider = document.querySelector('#threshold'), t = performance.now();
  slider.value = 128; slider.dispatchEvent(new Event('input', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true }));
  await __settle(t, 250);
}`);
out.events = Object.entries(released.events).map(([e, n]) => `${e} ${n}`).join(', ');
if (process.env.PROFILE) {
  const { profile } = (await send('Profiler.stop')).result, self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n]));
  profile.samples.forEach((id, i) => { const f = byId.get(id).callFrame, name = `${f.functionName || '(anonymous)'} ${f.url.split('/').at(-1).split('?')[0]}:${f.lineNumber + 1}`; self.set(name, (self.get(name) ?? 0) + dt[i] / 1000); });
  out.profile = [...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([n, ms]) => `${Math.round(ms)}ms ${n}`);
}
Object.assign(out, { whileDragging: drag.during, release: r1(released.ms), afterRelease: released.after });
// perMove: the usual time from a move reaching the page to the image being redrawn; slowestMove: the longest
Object.assign(out, { moves: drag.waits.length, perMove: +(drag.waits[drag.waits.length >> 1] ?? -1).toFixed(1), slowestMove: r1(drag.waits.at(-1) ?? -1), dragFreeze: r1(drag.worst) });

trace('released');
// 4. download (the file is noted, not written)
const saved = await run(`async () => {
  __saved = null; const t = performance.now();
  document.querySelector('.dock .btn.primary').click();
  for (let i = 0; i < 4000 && !__saved; i++) await new Promise(r => setTimeout(r, 25));
  if (!__saved) return { ms: -1 };
  const v = __saved.type === 'image/png' ? new DataView(await __saved.blob.arrayBuffer()) : null;
  return { ms: __saved.at - t, kb: __saved.bytes / 1024, type: __saved.type, size: v ? v.getUint32(16) + 'x' + v.getUint32(20) : '' };
}`);
Object.assign(out, { save: r1(saved.ms), saveKB: r1(saved.kb), saveType: saved.type, savedSize: saved.size });
out.heapMB = r1(await run(`() => performance.memory.usedJSHeapSize / 2 ** 20`));
console.log(JSON.stringify(out));
quit(0);
