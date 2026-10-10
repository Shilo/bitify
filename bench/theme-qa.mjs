// Production-browser regression check, including Android auto-darkening.
// npm run build && node bench/theme-qa.mjs dist profile=phone system=dark
// DEVICE=9555 node bench/theme-qa.mjs dist (forward the Android browser socket first)
// baseline=1 expects an unfixed build to reproduce the repainting bug.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const build = resolve(process.argv[2] ?? 'dist');
const options = { profile: 'phone', system: 'dark', ...Object.fromEntries(process.argv.slice(3).map(v => v.split('='))) };
const device = process.env.DEVICE;
const output = resolve('bench/theme-qa', `${device ? 'device-' + device : options.profile}-${options.system}-${options.baseline ? 'baseline' : 'fixed'}`);
mkdirSync(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const path = pathname === '/qa-image.png' ? resolve('src/assets/logo.png') : join(build, pathname.replace(/^\//, '').replace(/\/$/, '/index.html') || 'index.html');
  if (!(path.startsWith(build + sep) || path === resolve('src/assets/logo.png')) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise(r => server.listen(device ? 5199 : 0, '127.0.0.1', r));
const pageUrl = `http://localhost:${server.address().port}/`;
const port = device ?? 9600 + Math.floor(Math.random() * 300);
let browser, page, socket;
const pause = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const pending = new Map();
let sequence = 0;
const connect = async url => {
  const ws = new WebSocket(url);
  await new Promise((r, reject) => { ws.onopen = r; ws.onerror = reject; });
  return ws;
};
const send = (method, params = {}) => new Promise((r, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(Error('Timed out: ' + method)); }, 15000);
  pending.set(id, message => { clearTimeout(timer); message.error ? reject(Error(JSON.stringify(message.error))) : r(message.result); });
  socket.send(JSON.stringify({ id, method, params }));
});
const run = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const ready = async () => {
  for (let i = 0; i < 100; i++) {
    if (await run(`location.href === ${JSON.stringify(pageUrl)} && document.readyState === 'complete' && !!document.querySelector('.example-add')`)) {
      await run('document.fonts.ready'); await pause(350); return;
    }
    await pause(100);
  }
  throw Error('App did not load');
};
const click = async (selector, text) => {
  if (options.trace) console.log('tap', selector, text ?? '');
  const point = await run(`(() => { const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>${text ? `e.textContent.trim() === ${JSON.stringify(text)}` : 'true'}); if(!e) throw Error('Missing button'); const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (device) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
  }
  await pause(250);
};
const switchTheme = async theme => {
  if (await run('document.documentElement.dataset.theme') === theme) return;
  await click('button[aria-label="More"]');
  await click('.more button', `${theme === 'light' ? 'Light' : 'Dark'} mode`);
  assert.equal(await run('document.documentElement.dataset.theme'), theme);
};
const scenes = [];
const savedHashes = [];
const saveHash = async () => {
  await run(`(() => {
    window.__themeSave = null;
    if (window.__themeSaveHook) return;
    window.__themeSaveHook = true;
    const make = URL.createObjectURL;
    URL.createObjectURL = function(blob) { if(blob.type === 'image/png') window.__themeSave = blob; return make.call(this,blob); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() { if(!this.download) click.call(this); };
  })()`);
  await click('.export-action');
  for (let i=0;i<100 && !await run('!!window.__themeSave');i++) await pause(50);
  const bytes = await run(`(async () => {if(!window.__themeSave) throw Error('Save did not finish');return Array.from(new Uint8Array(await window.__themeSave.arrayBuffer()));})()`);
  const hash = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  savedHashes.push(hash);
  assert.equal(hash, savedHashes[0], 'Theme/auto-darkening altered saved PNG bytes');
};
const capture = async name => {
  await run('document.activeElement?.blur()');
  for (let i=0;i<100 && await run(`!!document.querySelector('.glass-toast.is-visible:not([hidden])')`);i++) await pause(50);
  await pause(250);
  const theme = await run('document.documentElement.dataset.theme');
  if (!options.baseline) {
    assert.equal(await run(`getComputedStyle(document.documentElement).colorScheme.split(' ').sort().join(' ')`), `${theme} only`, name);
    assert.equal(await run(`document.querySelector('meta[name=color-scheme]').content`), `only ${theme}`, name);
  }
  // Compare actual painted pixels. Computed styles alone miss this bug.
  const hashes = [];
  for (const enabled of [false, true]) {
    // Chromium deliberately ignores author opt-outs in FORCE_DARK_ONLY mode
    // (force dark + light preference). Android auto-dark uses a dark preference.
    await send('Emulation.setAutoDarkModeOverride', { enabled: options.system === 'dark' && enabled });
    await pause(300);
    const shot = Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
    writeFileSync(join(output, `${theme}-${name}-${enabled ? 'auto' : 'normal'}.png`), shot);
    hashes.push(createHash('sha256').update(shot).digest('hex'));
  }
  const equal = hashes[0] === hashes[1];
  scenes.push({ theme, name, equal, autoDarkCompared: options.system === 'dark' });
  if (!options.baseline) assert.ok(equal, `${theme} ${name}: auto-darkening changed the screenshot`);
  console.log(`${theme} ${name}: ${equal ? 'identical pixels' : 'AUTO-DARK REPAINT REPRODUCED'}`);
};

try {
  if (device) {
    execFileSync('adb', ['reverse', 'tcp:5199', 'tcp:5199']);
    execFileSync('adb', ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  } else browser = spawn(process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bitify-theme-'))}`,
    '--no-first-run', '--no-default-browser-check', '--disable-features=msEdgeWelcomePage', 'about:blank',
  ], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 80; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await pause(100); }
  }
  if (!version) throw Error('Browser debugging port unavailable');
  const control = await connect(version.webSocketDebuggerUrl);
  page = await new Promise(r => {
    control.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m.result.targetId); };
    control.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: 'about:blank' } }));
  });
  control.close();
  socket = await connect(`ws://127.0.0.1:${port}/devtools/page/${page}`);
  socket.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.bringToFront');
  if (!device) {
    const [width, height] = options.profile === 'desktop' ? [1440, 900] : options.profile === 'landscape' ? [915, 412] : [412, 915];
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: options.profile !== 'desktop' });
    await send('Emulation.setTouchEmulationEnabled', { enabled: options.profile !== 'desktop' });
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: options.system }, { name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-reduced-transparency', value: options.transparency ?? 'no-preference' }] });
  await send('Emulation.setAutoDarkModeOverride', { enabled: options.system === 'dark' });
  const seed = await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('bitify',JSON.stringify({first:'#222323',second:'#f0f6f0',style:'solid',theme:'light'}));` });
  await send('Page.navigate', { url: pageUrl }); await ready();
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seed.identifier });
  console.log(JSON.stringify({ browser: version.Browser, package: version['Android-Package'], options, initialScheme: await run('getComputedStyle(document.documentElement).colorScheme') }));
  // Static imported art permits exact screenshot comparisons; an animated GIF does not.
  await run(`(async () => {const blob=await (await fetch('/qa-image.png')).blob();const dt=new DataTransfer();dt.items.add(new File([blob],'theme-test.png',{type:'image/png'}));const e=document.querySelector('input[type=file]');e.files=dt.files;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(500);
  assert.equal(await run(`document.querySelectorAll('.tiles .tile').length`), 1);
  for (const theme of ['light', 'dark', 'light']) {
    await switchTheme(theme);
    await capture('canvas');
    await saveHash();
    await click('button[aria-label="Style"]'); await capture('style-settings');
    await click('.pick > button'); await capture('style-chooser');
    await click('.preset', 'Solid');
    await click('button[aria-label="Style"]');
    await click('button[aria-label="Palette"]'); await capture('palette');
    await click('button[aria-label="Palette"]');
    await click('button[aria-label="More"]'); await capture('more');
    await click('.more button', 'Help'); await capture('help');
    await click('.help button', 'Got it');
    await click('button[aria-label="More"]'); await click('.more button', 'Reset settings'); await capture('reset');
    await click('.reset-modal[open] button', 'Cancel');
    if (await run(`!!document.querySelector('.tile-share')?.getBoundingClientRect().width`)) {
      await click('.tile-share'); await capture('image-actions'); await click('.sheet button', 'Cancel');
    }
    const mainConversion = await run(`document.querySelector('.workspace-tools .view-toggle').getAttribute('aria-pressed')`);
    await click('.caption-preview'); await capture('preview');
    await click('.viewer-compare'); await capture('preview-original');
    await click('.viewer-close');
    assert.equal(await run(`document.querySelector('.workspace-tools .view-toggle').getAttribute('aria-pressed')`), mainConversion, 'Preview changed global conversion');
  }
  // The explicit light choice survives reload on a dark system.
  await send('Page.reload'); await ready();
  assert.equal(await run('document.documentElement.dataset.theme'), 'light');
  if (!options.baseline) assert.equal(await run(`getComputedStyle(document.documentElement).colorScheme.split(' ').sort().join(' ')`), 'light only');
  // Returning to the system theme resumes following subsequent system changes.
  await switchTheme(options.system);
  assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).theme`), undefined);
  const opposite = options.system === 'dark' ? 'light' : 'dark';
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: opposite }] });
  await pause(250);
  assert.equal(await run('document.documentElement.dataset.theme'), opposite);
  if (!options.baseline) {
    assert.equal(await run(`getComputedStyle(document.documentElement).colorScheme.split(' ').sort().join(' ')`), `${opposite} only`);
    assert.equal(await run(`document.querySelector('meta[name=color-scheme]').content`), `only ${opposite}`);
  }
  // Also exercise a persisted dark override while the system prefers light.
  await send('Emulation.setAutoDarkModeOverride', { enabled: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await pause(250);
  await switchTheme('dark');
  assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).theme`), 'dark');
  await send('Page.reload'); await ready();
  assert.equal(await run('document.documentElement.dataset.theme'), 'dark');
  if (!options.baseline) {
    assert.equal(await run(`getComputedStyle(document.documentElement).colorScheme.split(' ').sort().join(' ')`), 'dark only');
    assert.equal(await run(`document.querySelector('meta[name=color-scheme]').content`), 'only dark');
  }
  // Author-managed themes must continue to permit forced-colors accessibility.
  await send('Emulation.setAutoDarkModeOverride', { enabled: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-color-scheme', value: 'light' }] });
  await pause(300);
  assert.equal(await run(`getComputedStyle(document.documentElement).forcedColorAdjust`), 'auto');
  assert.equal(await run(`getComputedStyle(document.documentElement).backgroundImage`), 'none', 'Forced-colors did not remove the checker gradient');
  writeFileSync(join(output, 'forced-colors.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  assert.deepEqual(errors, []);
  if (options.baseline) assert.ok(scenes.some(s => !s.equal), 'Baseline did not reproduce the bug');
  writeFileSync(join(output, 'results.json'), JSON.stringify({ version, options, scenes, errors, savedHashes, persistenceAndSystemFollowing: 'PASS', forcedColors: 'PASS' }, null, 2));
  console.log(`PASS: ${scenes.length} scenes, identical saved PNGs, isolated Preview, saved theme reload, system following, forced colors, no runtime exceptions`);
} finally {
  if (!device && socket?.readyState === WebSocket.OPEN) {
    try { await send('Browser.close'); } catch {}
  }
  socket?.close();
  if (device && page) await fetch(`http://127.0.0.1:${port}/json/close/${page}`).catch(() => {});
  browser?.kill();
  server.close();
}
