// Real Android rotation over LAN, without emulated viewport dimensions.
// adb forward tcp:9567 localabstract:chrome_devtools_remote
// node bench/style-rotation-qa.mjs dist lan=192.168.1.67 [baseline=1]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { STYLE_SETTINGS } from '../src/lib/settings.js';
import { STYLES } from '../src/lib/presets.js';

const options = Object.fromEntries(process.argv.slice(3).map(v => v.split('=')));
assert.ok(options.lan, 'Supply the computer LAN address');
const build = resolve(process.argv[2] ?? 'dist');
const output = resolve('.tmp/style-rotation-qa', options.baseline ? 'before' : 'after');
mkdirSync(output, { recursive: true });
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = pathname === '/fixture.png' ? resolve('src/assets/logo.png') : join(build, pathname === '/' ? 'index.html' : pathname);
  if (!(path.startsWith(build + sep) || path === resolve('src/assets/logo.png')) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise(r => server.listen(5198, '0.0.0.0', r));
const url = `http://${options.lan}:5198/`;
const port = options.port ?? 9567;
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' }).trim();
const originalRotation = adb('shell', 'wm', 'user-rotation');
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket, target, sequence = 0;
const pending = new Map(), errors = [], results = [];
const connect = async url => { const ws = new WebSocket(url); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); return ws; };
const send = (method, params = {}) => new Promise((r, j) => {
  const id = ++sequence, timer = setTimeout(() => { pending.delete(id); j(Error(method + ' timed out')); }, 15000);
  pending.set(id, m => { clearTimeout(timer); m.error ? j(Error(JSON.stringify(m.error))) : r(m.result); });
  socket.send(JSON.stringify({ id, method, params }));
});
const run = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const tap = async selector => {
  await run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest',inline:'nearest'})`);
  await pause(80);
  const point = await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(180);
};
const measure = () => run(`(()=>{
  const p=document.querySelector('.panel:not(.fit)'),r=p?.getBoundingClientRect(),media=matchMedia('(max-width:520px), (max-height:520px) and (orientation:landscape)').matches;
  const thr=p?.querySelector(':scope > .thr'), slider=thr?.querySelector('input[type=range]'), field=thr?.querySelector('.field');
  const controlsFit=!p||[...p.querySelectorAll('.thr,.field,.seg,.pick > .btn,.extra')].filter(e=>e.getBoundingClientRect().height).every(e=>{const b=e.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;});
  const controlRow=!slider||!field||Math.abs(slider.getBoundingClientRect().y+slider.getBoundingClientRect().height/2-field.getBoundingClientRect().y-field.getBoundingClientRect().height/2)<2;
  return {width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight,visualWidth:visualViewport.width,visualHeight:visualViewport.height,angle:screen.orientation.angle,media,panel:!!p,chips:!!p?.querySelector('.sets'),more:!!p?.querySelector('.extra'),count:p?.querySelectorAll('.chip:not(.reset)').length??0,selected:p?.querySelector('.chip[aria-pressed=true]')?.getAttribute('aria-label'),controlsFit,controlRow,events:window.__rotations};
})()`);
const check = async name => {
  const m = await measure(); results.push({ name, ...m }); console.log(JSON.stringify({ name, ...m, events: undefined }));
  if (!options.baseline && m.panel) {
    assert.equal(m.chips, m.media, name + ' chip mode agrees with CSS');
    assert.equal(m.more, !m.media, name + ' More only on roomy screens');
    assert.ok(m.controlsFit && m.controlRow, name + ' controls fit on one row');
  }
  if (!options.baseline) assert.equal(m.panel, !name.startsWith('closed-'), name + ' expected panel visibility');
  writeFileSync(join(output, name + '.png'), Buffer.from((await send('Page.captureScreenshot')).data, 'base64'));
};
const rotate = async (angle, name) => {
  adb('shell', 'wm', 'user-rotation', 'lock', String(angle));
  for (let i = 0; i < 40 && await run('screen.orientation.angle') !== angle * 90; i++) await pause(100);
  assert.equal(await run('screen.orientation.angle'), angle * 90, name + ' actual OS orientation changed');
  await pause(700); await check(name);
};
try {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ctl = await connect(version.webSocketDebuggerUrl);
  target = await new Promise(r => { ctl.onmessage = e => { const m = JSON.parse(e.data); if(m.id === 1) r(m.result.targetId); }; ctl.send(JSON.stringify({ id: 1, method: 'Target.createTarget', params: { url: 'about:blank' } })); }); ctl.close();
  socket = await connect(`ws://127.0.0.1:${port}/devtools/page/${target}`);
  socket.onmessage = e => { const m = JSON.parse(e.data); if(m.id){ pending.get(m.id)?.(m); pending.delete(m.id); } if(m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Page.bringToFront');
  adb('shell', 'wm', 'user-rotation', 'lock', '0'); await pause(500);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('bitify',JSON.stringify({first:'#222323',second:'#f0f6f0',style:'cutout',theme:'light'}));localStorage.setItem('bitify-welcomed','1');window.__rotations=[];const record=e=>__rotations.push({type:e.type,time:performance.now(),width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight,media:matchMedia('(max-width:520px), (max-height:520px) and (orientation:landscape)').matches});addEventListener('resize',record);addEventListener('orientationchange',record);matchMedia('(max-width:520px), (max-height:520px) and (orientation:landscape)').addEventListener('change',record);` });
  await send('Page.navigate', { url });
  for(let i=0;i<100&&!await run(`!!document.querySelector('.example-add')`);i++) await pause(100);
  assert.ok(await run(`!!document.querySelector('.example-add')`), 'Phone loads app over LAN');
  await run('document.fonts.ready'); await pause(300);
  console.log(JSON.stringify({ url, browser: version.Browser, package: version['Android-Package'], originalRotation }));
  await tap('button[aria-label="Style"]'); await check('initial-portrait');
  for(let round=0;round<3;round++) for(const angle of [1,0,3,0]) await rotate(angle, `open-${round}-${angle}`);
  // A closed panel must also reopen in the correct mode after rotation.
  await tap('button[aria-label="Style"]');
  for(const angle of [1,0,3,0]) { await rotate(angle, `closed-${angle}`); await tap('button[aria-label="Style"]'); await check(`reopened-${angle}`); await tap('button[aria-label="Style"]'); }
  await tap('button[aria-label="Style"]'); await tap('.pick > .btn');
  for(const angle of [1,0,3,0]) {
    await rotate(angle, `chooser-${angle}`);
    const fit=await run(`(()=>{const r=document.querySelector('.menu').getBoundingClientRect();return r.left>=-1&&r.right<=document.documentElement.clientWidth+1;})()`);
    if(!options.baseline) assert.ok(fit, 'Rotated chooser fits');
  }
  await tap('.preset:first-child');
  if(!options.baseline) {
    await tap('.chip[aria-label^="Brightness:"]'); await tap('.style-panel > .thr .seg button:nth-child(3)');
    for(const angle of [1,0]) { await rotate(angle, `selected-${angle}`); assert.ok((await measure()).selected.startsWith('Brightness:'), 'Selected chip survives rotation'); }
    assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).settings.cutout.source`), 'red');
    await tap('.chip.reset'); assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).settings.cutout.source`), 'luma');
    await run(`(async()=>{
      const blob=await(await fetch('/fixture.png')).blob(),dt=new DataTransfer();dt.items.add(new File([blob],'rotation.png',{type:'image/png'}));
      const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');ctx.fillStyle='rgba(220,220,220,.5)';ctx.fillRect(0,0,32,32);
      const soft=await new Promise(r=>c.toBlob(r));dt.items.add(new File([soft],'soft.png',{type:'image/png'}));
      const e=document.querySelector('input[type=file]');e.files=dt.files;e.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);await pause(250);
    assert.equal(await run(`document.querySelectorAll('.tiles .tile').length`),2);
    for(let style=0;style<STYLES.length;style++) {
      await tap('.pick > .btn');await tap(`.preset:nth-child(${style+1})`);
      await check(`style-${style}-portrait`);
      assert.equal((await measure()).count,STYLE_SETTINGS[STYLES[style][0]].length,'All settings available after choosing style');
      await rotate(1,`style-${style}-landscape`);await rotate(0,`style-${style}-returned`);
      assert.equal((await measure()).count,STYLE_SETTINGS[STYLES[style][0]].length,'All settings remain after rotation');
    }
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ checks: results.length, mismatches: results.filter(m=>m.panel&&m.media!==m.chips).length, moreOnCompact: results.filter(m=>m.panel&&m.media&&m.more).length }));
} finally {
  writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2));
  const rotation = originalRotation.match(/^lock\s+(\d)/);
  adb('shell','wm','user-rotation','lock',rotation?.[1] ?? '0');
  if(!rotation) adb('shell','wm','user-rotation','free');
  if(target) try { await fetch(`http://127.0.0.1:${port}/json/close/${target}`); } catch {}
  socket?.close(); server.close();
}
