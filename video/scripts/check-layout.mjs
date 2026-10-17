import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {launchBrowser,work,shots,duration} from './project.mjs';
const browser=await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(work+'/film.html').href);await page.evaluate(()=>window.filmReady);
  const samples=[0,...shots.map(s=>(s.start+s.end)/2),45.8,46.8,49,52.99,9,28,9];
  for(const time of samples){
    await page.evaluate(t=>window.renderFrame(t),time);
    const issues=await page.evaluate(()=>{
      const scene=[...document.querySelectorAll('[data-scene]')].find(n=>n.style.zIndex==='2');
      const failures=[];
      for(const node of scene.querySelectorAll('h2,.cfs-description,.cfs-caption,.cfs-website,.cfs-repository,figcaption')){
        const b=node.getBoundingClientRect();
        if(b.left<0||b.top<0||b.right>1920.5||b.bottom>1040)failures.push('Text outside safe frame: '+node.textContent);
      }
      const caption=scene.querySelector('.cfs-caption'),desktop=scene.querySelector('.cfs-desktop');
      if(caption&&desktop){const c=caption.getBoundingClientRect(),d=desktop.getBoundingClientRect();if(c.top<d.bottom&&c.right>d.left&&c.left<d.right)failures.push('Caption overlaps desktop frame');}
      for(const node of scene.querySelectorAll('img'))if(!node.complete||!node.naturalWidth)failures.push('Unloaded image');
      return failures;
    });
    if(issues.length)errors.push(`${time}s: ${issues.join('; ')}`);
  }
  if(errors.length)throw Error(errors.join('\n'));
  writeFileSync(work+'/qa/layout.json',JSON.stringify({duration,samples,pageErrors:errors,safeTextBounds:true,captionClearance:true,reverseScrubbing:true},null,2));
  console.log('Layout passed: safe text bounds, caption clearance, loaded images and backward scrubbing.');
} finally {await browser.close();}
