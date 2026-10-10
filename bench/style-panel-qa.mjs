// Production layout audit: npm run build && node bench/style-panel-qa.mjs [baseline]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { STYLE_SETTINGS } from '../src/lib/settings.js';
import { STYLES } from '../src/lib/presets.js';

const baseline = process.argv.includes('baseline');
const flows = process.argv.includes('flows');
const small = process.argv.includes('small');
const pixel8 = process.argv.includes('pixel8');
const build = resolve('dist');
const output = resolve('.tmp/style-panel-qa', baseline ? 'before' : pixel8 ? 'pixel8' : flows ? 'flows' : small ? 'small' : 'after');
mkdirSync(output, { recursive: true });
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname === '/fixture.png' ? resolve('src/assets/logo.png') : join(build, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!(path.startsWith(build + sep) || path === resolve('src/assets/logo.png')) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const port = 9800 + Math.floor(Math.random() * 100);
const browser = spawn(process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bitify-style-'))}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket, sequence = 0;
const pending = new Map(), errors = [], results = [];
const connect = async url => { const ws = new WebSocket(url); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); return ws; };
const send = (method, params = {}) => new Promise((r, j) => {
  const id = ++sequence, timer = setTimeout(() => j(Error(method + ' timed out')), 15000);
  pending.set(id, m => { clearTimeout(timer); m.error ? j(Error(JSON.stringify(m.error))) : r(m.result); });
  socket.send(JSON.stringify({ id, method, params }));
});
const run = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
// Reduced-motion layout checks need one rendered frame after Svelte updates.
const click = async selector => { await run(`document.querySelector(${JSON.stringify(selector)}).click()`); await pause(20); };
const measure = () => run(`(() => {
  const panel=document.querySelector('.panel:not(.fit)'), rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
  const p=rect(panel), selectors=['.pick > .btn','.setbox','.thr','.extra'];
  const controls=Object.fromEntries(selectors.map(s=>[s,panel.querySelector(s==='.thr'?':scope > .thr':s)]).filter(([,e])=>e&&e.getBoundingClientRect().height).map(([s,e])=>[s,rect(e)]));
  const pick=controls['.pick > .btn'], thr=controls['.thr'], extra=controls['.extra'];
  const row=!thr||!extra||Math.abs(extra.y+extra.h/2-thr.y-thr.h/2)<2;
  const overflow=[...panel.querySelectorAll('.thr,.field,.extra,.pick > .btn,.seg')].filter(e=>e.getBoundingClientRect().height).some(e=>{const r=rect(e);return r.x<p.x-1||r.right>p.right+1;});
  const slider=panel.querySelector('.thr input[type=range]');
  const field=panel.querySelector('.thr .field'), aligned=!slider||!field||Math.abs(slider.getBoundingClientRect().y+slider.getBoundingClientRect().height/2-field.getBoundingClientRect().y-field.getBoundingClientRect().height/2)<2;
  const ownRow=!!thr&&Math.abs(pick.y+pick.h/2-thr.y-thr.h/2)>2;
  const name=panel.querySelector('#style-name'),text=name.getBoundingClientRect();
  const fullSelector=getComputedStyle(name).display!=='none'&&text.width>0&&text.left>=pick.x&&text.right<=pick.right;
  const selected=panel.querySelector('.chip[aria-pressed="true"]')?.getAttribute('aria-label')?.split(':')[0];
  const control=panel.querySelector(':scope > .thr input[type=range], :scope > .thr .seg')?.getAttribute('aria-label');
  const count=panel.querySelectorAll(':scope > .thr').length;
  return {p,controls,row:!!row&&aligned,ownRow,fullSelector,overflow,slider:slider?rect(slider).w:null,chips:!!panel.querySelector('.setbox'),more:!!extra, viewport:innerWidth,selected,control,count,density:devicePixelRatio};
})()`);
try {
  let version;
  for(let i=0;i<100;i++){try{version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();break;}catch{await pause(100);}}
  assert.ok(version, 'Browser available');
  let target;
  // Fresh pages avoid a headless Edge compositor stall after repeated mobile
  // metric overrides. Live breakpoint transitions are exercised separately below.
  const openPage=async()=>{
    socket?.close();
    if(target)await fetch(`http://127.0.0.1:${port}/json/close/${target}`);
    const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();target=page.id;
    socket=await connect(page.webSocketDebuggerUrl);
    socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('bitify',JSON.stringify({first:'#222323',second:'#f0f6f0',style:'cutout',theme:'light'}));localStorage.setItem('bitify-welcomed','1');`});
  };
  // Actual Pixel 8 Pro Brave content viewports captured in the rotation audit,
  // plus the 1008x2244 screenshot's full display at the captured DPR of 2.25.
  const sizes=pixel8?[[448,819],[947,364],[448,997],[997,448]]:flows?[[412,915]]:small?[[280,653],[375,812]]:[[280,653],[320,568],[360,640],[375,812],[393,852],[412,915],[448,780],[519,800],[520,800],[521,800],[600,800],[700,900],[768,1024],[800,1000],[801,1000],[1024,768],[1280,720],[1440,900],[1920,1080],[2560,1440],[480,320],[520,360],[568,320],[667,375],[915,412],[1024,520],[1024,521]];
  for(const touch of flows||pixel8?[true]:[false,true]) {
    for(const [width,height] of sizes) {
      await openPage();
      await send('Emulation.setTouchEmulationEnabled',{enabled:touch});
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:pixel8?2.25:touch?2:1,mobile:touch,screenOrientation:{type:width>height?'landscapePrimary':'portraitPrimary',angle:width>height?90:0}});
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      await send('Page.navigate',{url});
      for(let i=0;i<100&&!await run(`!!document.querySelector('.example-add')`);i++)await pause(50);
      await run('document.fonts.ready');await pause(100);
      await run(`document.querySelector('.help[open]')?.close()`);
      await click('button[aria-label="Style"]');
      const initial=await measure();
      if(pixel8)assert.equal(initial.density,2.25,'Captured Pixel density');
      const label=`${touch?'touch':'mouse'}-${width}x${height}`;
      if ([320,412,521,768,1440,915].includes(width)) writeFileSync(join(output,`${label}.png`),Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
      if(!baseline){
        assert.ok(!initial.overflow,label+' overflow');assert.ok(initial.row,label+' main strip wrapped');
        const compact=width<=520||(height<=520&&width>height);
        assert.equal(initial.chips,compact,label+' compact chips');assert.equal(initial.more,!compact,label+' More only on roomy screens');
        assert.equal(initial.ownRow,width<=520,label+' selected control row');
        await run(`(async()=>{
          const blob=await(await fetch('/fixture.png')).blob(),dt=new DataTransfer();
          dt.items.add(new File([blob],'layout.png',{type:'image/png'}));
          const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');
          for(let x=0;x<32;x++){ctx.fillStyle='rgba('+[200+x,200+x,200+x,.5].join(',')+')';ctx.fillRect(x,0,1,32);}
          const soft=await new Promise(r=>c.toBlob(r));dt.items.add(new File([soft],'soft.png',{type:'image/png'}));
          const e=document.querySelector('input[type=file]');e.files=dt.files;e.dispatchEvent(new Event('change',{bubbles:true}));
        })()`);
        await pause(150);
        assert.equal(await run(`document.querySelectorAll('.tiles .tile').length`),2);
        await run(`document.documentElement.dataset.theme=${JSON.stringify(touch?'dark':'light')}`);
        const loaded=await measure();assert.ok(loaded.row&&!loaded.overflow,label+' loaded/range fit');
        assert.ok(loaded.slider>=24,label+' usable slider');
        if([320,412,521,768,1440,915].includes(width))writeFileSync(join(output,`${label}-loaded.png`),Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
        if(width===412){const y=Math.max(0,loaded.p.y-40);writeFileSync(join(output,`${label}-popup.png`),Buffer.from((await send('Page.captureScreenshot',{clip:{x:0,y,width,height:height-y,scale:1}})).data,'base64'));}
        await run(`(()=>{const e=document.querySelector('.style-panel > .thr .tnum');e.value='123';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        assert.equal(await run(`document.querySelector('.style-panel > .thr .field button').getAttribute('aria-pressed')`),'false');
        await click('.style-panel > .thr .field button');
        assert.equal(await run(`document.querySelector('.style-panel > .thr .field button').getAttribute('aria-pressed')`),'true');
      }
      await click('.pick > .btn');
      const chooser=await run(`(()=>{const e=document.querySelector('.menu'),r=e.getBoundingClientRect();return {count:e.querySelectorAll('.preset').length,left:r.left,right:r.right,top:r.top};})()`);
      assert.equal(chooser.count,11);assert.ok(chooser.left>=-1&&chooser.right<=width+1,label+' chooser horizontal fit');
      for(let style=0;style<11;style++){
        if(style)await click('.pick > .btn');
        await click(`.preset:nth-child(${style+1})`);
        const m=await measure();
        results.push({label,style,...m});
        if(!baseline){
          assert.ok(!m.overflow,label+' style '+style+' overflow');assert.ok(m.row,label+' style '+style+' wrapped');
          const compact=width<=520||(height<=520&&width>height);
          assert.equal(m.chips,compact,label+' style '+style+' compact mode');assert.equal(m.more,!compact,label+' style '+style+' More');
          if(compact){
            const count=await run(`document.querySelectorAll('.sets .chip:not(.reset)').length`);
            assert.equal(count,STYLE_SETTINGS[STYLES[style][0]].length,label+' all settings immediately available');
            for(let i=0;i<count;i++){
              await click(`.sets .chip:nth-child(${i+1})`);
              const selected=await measure();assert.ok(!selected.overflow&&selected.row,label+' compact control '+style+'/'+i+' fit');
              assert.equal(selected.count,1,label+' exactly one selected control');
              assert.equal(selected.control,selected.selected,label+' selected chip controls the matching setting');
            }
          } else if(m.ownRow) assert.ok(m.fullSelector,label+' full selector on its own row');
        }
        if(await run(`!!document.querySelector('.extra')`)){
          await click('.extra');
          const adv=await measure();if(!baseline)assert.ok(!adv.overflow,label+' advanced '+style+' overflow');
          await click('.extra');
        }
      }
      console.log(JSON.stringify({label,row:initial.row,chips:initial.chips,height:initial.p.h,slider:initial.slider}));
    }
  }
  if(!baseline){
    if(pixel8){
      await click('.pick > .btn');await click('.preset:first-child');
      await click('.chip[aria-label^="Brightness:"]');
      for(const [width,height,angle]of [[448,819,0],[947,364,90],[448,819,0],[947,364,270],[448,819,0]]){
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2.25,mobile:true,screenOrientation:{type:angle===270?'landscapeSecondary':angle?'landscapePrimary':'portraitPrimary',angle}});await pause(250);
        const m=await measure();assert.equal(m.viewport,width,'Rotation settled viewport');
        assert.ok(m.chips&&!m.more&&m.row&&!m.overflow,'Pixel rotation retains compact layout');
        assert.equal(m.count,1,'Pixel rotation retains one control');assert.equal(m.control,'Brightness','Pixel rotation preserves selected setting');
        results.push({label:`pixel-rotation-${angle}`, ...m});
      }
    }
    // Native mouse input is reliable in headless Edge; real touch is checked by
    // bench/theme-qa.mjs on Android rather than synthesized after live resizing.
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    const nativeTap=async selector=>{
      await run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest',inline:'nearest'})`);await pause(100);
      const point=await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await pause(250);
    };
    const escape=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(80);};
    await send('Emulation.setDeviceMetricsOverride',{width:412,height:915,deviceScaleFactor:2,mobile:false});await pause(120);
    await nativeTap('.pick > .btn');await nativeTap('.preset:first-child');
    await nativeTap('.chip[aria-label^="Threshold:"]');
    await run(`(()=>{const e=document.querySelector('.style-panel > .thr .tnum');e.value='123';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await pause(80);
    assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).settings.cutout.threshold`),123);
    await nativeTap('.chip[aria-label^="Brightness:"]');await nativeTap('.style-panel > .thr .seg button:nth-child(3)');
    assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).settings.cutout.source`),'red');
    await nativeTap('.chip.reset');
    assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).settings.cutout.threshold`),null);
    assert.equal(await run(`JSON.parse(localStorage.getItem('bitify')).settings.cutout.source`),'luma');
    // Resize with the panel still open, crossing both compact-mode boundaries.
    for(const [width,height]of [[320,568],[520,800],[521,800],[915,412],[1024,520],[1024,521],[1920,1080],[412,915]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});await pause(250);
      const m=await measure();assert.ok(m.row&&!m.overflow,`open-tray resize ${width}x${height}`);
      const resizeState=await run(`({width:innerWidth,height:innerHeight,media:matchMedia('(max-width:520px), (max-height:520px) and (orientation:landscape)').matches,compact:!!document.querySelector('.style-panel.compact'),more:!!document.querySelector('.extra'),adv:!!document.querySelector('.adv')})`);
      assert.equal(resizeState.compact,width<=520||(height<=520&&width>height),JSON.stringify({requested:[width,height],...resizeState}));
      assert.equal(resizeState.more,!resizeState.compact,'More follows breakpoint during live resize');
      if(resizeState.more&&!resizeState.adv) await nativeTap('.extra');
      if(resizeState.more){
        assert.ok(await run(`!!document.querySelector('.adv')`),'Roomy advanced tray stays open across mode changes');
        const labels=await run(`({column:parseFloat(document.querySelector('.dock').style.getPropertyValue('--setting-label-width')),longest:Math.max(...[...document.querySelectorAll('.setting-label')].map(e=>e.getBoundingClientRect().width))})`);
        assert.ok(labels.column>=labels.longest,'Advanced labels measured after returning from compact mode');
      }
      if(width===412)writeFileSync(join(output,'touch-412x915-advanced.png'),Buffer.from((await send('Page.captureScreenshot')).data,'base64'));
    }
    await nativeTap('.pick > .btn');
    for(const [width,height]of [[320,568],[521,800],[915,412],[1920,1080],[412,915]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});await pause(250);
      const menu=await run(`(()=>{const r=document.querySelector('.menu').getBoundingClientRect();return {left:r.left,right:r.right};})()`);
      assert.ok(menu.left>=-1&&menu.right<=width+1,'open-chooser resize');
    }
    await escape();assert.ok(await run(`!!document.querySelector('.panel')&&!document.querySelector('.menu')`),'Escape closes chooser first');
    await escape();assert.ok(await run(`!document.querySelector('.panel')`),'Escape closes panel next');
    await nativeTap('button[aria-label="Style"]');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:4,y:4,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:4,y:4,button:'left',clickCount:1});await pause(100);
    assert.ok(await run(`!document.querySelector('.panel')`),'Outside tap closes panel');
    await nativeTap('.file-clear');await nativeTap('.reset-modal[open] .glass-modal__action--danger');
    assert.ok(await run(`!!document.querySelector('.example-add')&&!document.querySelector('.file-tools.has-images')`),'Removed fixtures return to empty example');
    await nativeTap('button[aria-label="Style"]');await nativeTap('.pick > .btn');await nativeTap('.preset:last-child');
    for(const [width,height]of [[320,568],[521,800],[915,412],[1920,1080]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});await pause(250);
      const bare=await measure();assert.ok(!bare.overflow,'Shape without opacity fits');
      assert.ok(await run(`!!document.querySelector('.style-panel.bare')&&!document.querySelector('.extra')&&!document.querySelector('.thr')`),'Shape hides unavailable settings');
      assert.ok(bare.fullSelector,'Selector alone shows full width and text');
    }
    console.log('PASS: native pointer, manual/Auto, per-style persistence, Reset, open-tray/chooser resizing, Escape and outside dismissal');
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(JSON.stringify({checks:results.length,wrapped:results.filter(r=>!r.row&&r.controls['.thr']).length,overflow:results.filter(r=>r.overflow).length,browser:version.Browser}));
} finally {
  writeFileSync(join(output,'results.json'),JSON.stringify(results,null,2));
  if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch{}}
  socket?.close();browser.kill();server.close();
}
