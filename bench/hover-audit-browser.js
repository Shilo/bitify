// Browser-only QA runner; never imported by the application.
const wait=ms=>new Promise(r=>setTimeout(r,ms));const results=[];
const button=(name)=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===name||b.textContent.trim()===name);
async function click(name){const b=button(name);if(!b)throw Error('Missing '+name);b.click();await wait(60);}
const style=e=>{let s=getComputedStyle(e);return [s.backgroundColor,s.backgroundImage,s.boxShadow,s.color,s.transform,s.borderColor,s.outlineStyle,s.outlineWidth].join('|');};
async function probe(stage){await wait(220);const es=[...document.querySelectorAll('button')];const before=es.map(style);document.querySelectorAll('*').forEach(e=>e.setAttribute('data-hover-probe',''));await wait(220);const errors=es.filter((e,i)=>before[i]!==style(e));document.querySelectorAll('[data-hover-probe]').forEach(e=>e.removeAttribute('data-hover-probe'));if(errors.length)throw Error(stage+': '+errors.map(e=>e.getAttribute('aria-label')||e.textContent).join(','));results.push(stage+' '+es.length+' buttons PASS');document.querySelector('#hover-results').textContent=results.join('\n');}
try {
 await wait(350);document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 for(const theme of ['dark','light']){
 document.documentElement.dataset.theme=theme;
 await probe(theme+' initial');
 await click('Palette');await probe(theme+' palettes');
 await click('Mono');await click('Transparent outlines and dark areas');await probe(theme+' selected palette/transparency');
 await click('Palette');await click('Style');
 document.querySelector('.pick > button').click();await wait(60);await probe(theme+' style thumbnails');
 await click('Cutout');await probe(theme+' Auto/settings');
 const rim=[...document.querySelectorAll('.chip')].find(b=>b.getAttribute('aria-label')?.startsWith('Rim:'));if(rim){rim.click();await wait(60);await probe(theme+' Rim toggles');}
 await click('Style');await click('More');await probe(theme+' More');await click('Help');await probe(theme+' Help');await click('Got it');
 await click('More');await click('Reset settings');await probe(theme+' reset confirmation');document.querySelector('.reset-modal[open]').close();
 }
 const data=await (await fetch('/src/assets/logo.png')).blob();const dt=new DataTransfer();dt.items.add(new File([data],'hover-test.png',{type:'image/png'}));window.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));await wait(150);
 await probe('imported file actions');document.querySelector('.tile-share').click();await wait(60);await probe('image action sheet');document.querySelector('.sheet[open]').close();document.querySelector('.tile .caption-preview').click();await wait(60);await probe('Preview');document.querySelector('.viewer-compare').click();await wait(60);await probe('Preview local conversion');document.querySelector('.viewer-close').click();
 results.push('ALL CHECKS PASSED');document.querySelector('#hover-results').textContent=results.join('\n');
} catch(e){document.querySelector('#hover-results').textContent=results.join('\n')+'\nFAIL '+e.message;console.error(e);}
