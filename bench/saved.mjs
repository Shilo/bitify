// Are saved and copied files exactly what they were before the performance work, in every
// style, and also when they are made while a rough draft is on screen? Saves and copies the
// same photo in the old build and the new one, decodes each file, and compares every pixel.
//   node saved.mjs <old dist dir> <new dist dir>
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const STYLES = (process.env.STYLES ?? 'cutout,solid,lines,checker,hatch,bayer,noise,atkinson,silhouette').split(',');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif' };
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

// One style in one build, in a browser of its own: a headless browser that has stopped answering stays stopped.
async function session(dist, style) {
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
  let target;
  for (let i = 0; i < 100 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  const ws = await opened(target.webSocketDebuggerUrl);
  let seq = 0;
  const waiting = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r, fail) => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); if (process.env.TRACE) console.error('>', method); setTimeout(() => waiting.has(id) && fail(new Error('no answer to ' + method)), 100000); });
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
  let hook;
  const quit = () => { try { ws.close(); } catch {} edge.kill(); server.close(); };
  try {
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // one script at a time: a second one declaring the same names would fail and leave the first style in place
    if (hook) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: hook });
    hook = (await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      localStorage.setItem('bitify', JSON.stringify({ first: '#3f291e', second: '#fdca55', style: '${style}', threshold: null }));
      window.__saved = null; window.__copied = null;
      const make = URL.createObjectURL; URL.createObjectURL = blob => { __saved = blob; return make.call(URL, blob); };
      const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (!this.download) click.call(this); };
      // the clipboard is not written; the image it was given is kept instead
      Object.defineProperty(navigator, 'clipboard', { value: { write: async items => { __copied = await items[0].getType('image/png'); } } });
    ` })).result.identifier;
    await send('Page.navigate', { url: `http://localhost:${server.address().port}/` });
    await appReady();
    // a 2000 by 1500 picture with shaded shapes, grain and a see-through corner, kept exact as a PNG
    await run(`async () => {
      const w = 2000, h = 1500, c = new OffscreenCanvas(w, h), ctx = c.getContext('2d'), id = ctx.createImageData(w, h), data = id.data;
      let s = 4242; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
        const u = x / w, v = y / h, blob = Math.sin(u * 9) * Math.cos(v * 7) * 70 + 128, shape = ((x >> 5) + (y >> 5)) % 3 === 0 ? 45 : 0, g = (rnd() - 0.5) * 24;
        data[i] = blob + shape + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g; data[i + 3] = x + y < 500 ? 0 : 255;
      }
      ctx.putImageData(id, 0, 0);
      const input = document.querySelector('input[type=file]'), dt = new DataTransfer();
      dt.items.add(new File([await c.convertToBlob({ type: 'image/png' })], 'photo.png', { type: 'image/png' }));
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 400 && !document.querySelector('.tiles .tile canvas'); i++) await new Promise(r => setTimeout(r, 50));
      await new Promise(r => setTimeout(r, 300));
      // decodes a saved or copied file and sums up every pixel of it
      window.__sum = async blob => {
        const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        const cv = new OffscreenCanvas(bmp.width, bmp.height), cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(bmp, 0, 0);
        const px = cx.getImageData(0, 0, bmp.width, bmp.height).data; let hash = 2166136261;
        for (let i = 0; i < px.length; i++) hash = Math.imul(hash ^ px[i], 16777619);
        return bmp.width + 'x' + bmp.height + ':' + (hash >>> 0).toString(16);
      };
      window.__get = async press => { __saved = null; __copied = null; press(); for (let i = 0; i < 1200 && !__saved && !__copied; i++) await new Promise(r => setTimeout(r, 25)); return __sum(__saved ?? __copied); };
      window.__save = () => __get(() => document.querySelector('.dock .btn.primary').click());
      window.__copy = () => __get(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })));
    }`);
    const r = { style: await run(`() => JSON.parse(localStorage.getItem('bitify')).style`) };
    r.savedAtAuto = await run(`() => __save()`);
    r.copiedAtAuto = await run(`() => __copy()`);
    // now with the processor slowed and a finger moving the slider and not letting go, which is when the new build draws drafts
    await send('Emulation.setCPUThrottlingRate', { rate: 6 });
    r.tileWhileDragging = await run(`async () => {
      document.querySelector('.dock button[aria-label="Style"]').click(); await new Promise(r => setTimeout(r, 200));
      const slider = document.querySelector('#threshold');
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      for (const v of [70, 80, 90, 97]) { slider.value = v; slider.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 40)); }
      const c = document.querySelector('.tiles .tile canvas'); return c.width + 'x' + c.height;
    }`);
    // the drag is kept alive with a move just before each, so the draft is on screen when the file is made
    const nudge = `(() => { const s = document.querySelector('#threshold'); s.value = 97; s.dispatchEvent(new Event('input', { bubbles: true })); })()`;
    r.savedInDrag = await run(`() => { ${nudge}; return __save(); }`);
    r.copiedInDrag = await run(`() => { ${nudge}; return __copy(); }`);
    console.error(dist, style, JSON.stringify(r));
    return r;
  } finally {
    quit();
  }
}

async function measure(dist) {
  const results = {};
  for (const style of STYLES) {
    for (let attempt = 1; ; attempt++) {
      try { results[style] = await session(dist, style); break; } catch (e) { if (attempt === 4) throw e; console.error(dist, style, 'did not finish, trying again:', String(e).slice(0, 80)); }
    }
  }
  return results;
}

const [oldDist, newDist] = process.argv.slice(2);
const was = await measure(oldDist), now = await measure(newDist);
let wrong = 0;
console.log('style       tile while dragging (old, new)   saved   copied   saved in drag   copied in drag');
for (const style of STYLES) {
  if (was[style].style !== style || now[style].style !== style) { wrong++; console.log('  the page was not in this style'); }
  const same = k => { const ok = was[style][k] === now[style][k] && now[style][k].startsWith('2000x1500:'); wrong += !ok; return ok ? 'same' : 'DIFFERENT'; };
  console.log(style.padEnd(11), `${was[style].tileWhileDragging}, ${now[style].tileWhileDragging}`.padEnd(32), same('savedAtAuto').padEnd(7), same('copiedAtAuto').padEnd(8), same('savedInDrag').padEnd(15), same('copiedInDrag'));
  if (now[style].savedAtAuto !== now[style].copiedAtAuto || now[style].savedInDrag !== now[style].copiedInDrag) { wrong++; console.log('  the copied image differs from the saved one'); }
}
console.log(wrong ? `${wrong} DIFFERENCES` : 'Every saved and copied file is 2000 by 1500 and identical, pixel for pixel, to the old build\'s.');
process.exit(wrong ? 1 : 0);
