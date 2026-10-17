import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import sharp from 'sharp';
import { project, work, assets, repo, shots, duration } from './project.mjs';
const url=path=>relative(work,path).replaceAll('\\','/');
const metadata=JSON.parse(readFileSync(assets+'/captures/metadata.json','utf8'));
const filmAssets={logo:url(repo+'/src/assets/logo-dark.svg'),original:url(assets+'/town.png'),'palette-result':url(assets+'/palette-result.png'),'onebit-result':url(assets+'/onebit-solid.png')};
const wanted=new Set(shots.flatMap(s=>[s.desktop,s.phone,...(s.frames||[]),...(s.phoneFrames||[])].filter(Boolean)));
for(const name of wanted){
  const item=metadata[name];if(!item)throw Error('Missing capture metadata: '+name);
  filmAssets[name]=url(assets+'/captures/'+name+'.png');
}
for(const s of shots.filter(s=>s.kind==='feature'))for(const name of s.frames){
  const item=metadata[name],p=item.panels?.[0],dpr=item.dpr||2;
  if(!p)throw Error('Missing focus rectangle: '+name);
  const left=Math.max(0,Math.floor(p.x*dpr)-6),top=Math.max(0,Math.floor(p.y*dpr)-6);
  const width=Math.min(item.viewport.width*dpr-left,Math.ceil(p.width*dpr)+12),height=Math.min(item.viewport.height*dpr-top,Math.ceil(p.height*dpr)+12);
  const target=work+'/assets/focus-'+name+'.png';
  await sharp(assets+'/captures/'+name+'.png').extract({left,top,width,height}).png().toFile(target);
  filmAssets['focus-'+name]=url(target);
  if(['dither','opacity','style'].includes(name.split('-')[0]) && item.detail){
    const b=item.detail;
    const left=Math.max(0,Math.floor(b.x*dpr)),top=Math.max(0,Math.floor(b.y*dpr));
    const target=work+'/assets/detail-'+name+'.png';
    await sharp(assets+'/captures/'+name+'.png').extract({left,top,width:Math.min(item.viewport.width*dpr-left,Math.floor(b.width*dpr)),height:Math.min(item.viewport.height*dpr-top,Math.floor(b.height*dpr))}).png().toFile(target);
    filmAssets['detail-'+name]=url(target);
  }
}
if(shots[0].start!==0||duration>60||shots.some((s,i)=>s.end<=s.start||(i&&s.start!==shots[i-1].end)))throw Error('Expected continuous storyboard, no longer than one minute.');
let expected=1;
for(const s of shots){
  const desktop=s.frames||[s.desktop],phone=s.phoneFrames||[s.phone];
  if(desktop.length!==phone.length||(s.frames&&s.frames.length!==s.captions.length))throw Error('Mismatched screens/captions: '+s.name);
  if(s.wallCount!==undefined){
    if(s.wallCount!==expected)throw Error('Wall counts must alternate 1/2: '+s.name);expected=3-expected;
  }
  for(let i=0;i<desktop.length;i++){
    const d=metadata[desktop[i]],m=metadata[phone[i]];
    if(!d||!m)throw Error('Missing screen: '+s.name);
    if(s.wallCount!==undefined&&(d.imageNames.length!==s.wallCount||m.imageNames.length!==s.wallCount))throw Error('Wrong visible wall count: '+s.name);
    if(d.imageNames.some(n=>m.imageNames.includes(n)))throw Error('Desktop and mobile must show different artwork: '+s.name);
  }
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const image=(attr,key,alt)=>`<img ${attr}="${esc(key)}" alt="${esc(alt)}">`;
const brand=`<div class="cfs-bookend-copy"><div class="cfs-bookend-brand">${image('data-asset','logo','')}<h2>Colorfetti</h2></div><p class="cfs-slogan">Throw your pixels<br>a palette party.</p><p class="cfs-purpose">Recolor images and animations.</p><div class="cfs-website">shilo.github.io/colorfetti</div><div class="cfs-repository">github.com/Shilo/colorfetti</div></div>`;
const scenes=shots.map((s,i)=>{
  let body,cls='cfs-view';
  if(s.kind==='intro'||s.kind==='outro'){
    cls+=' cfs-bookend'+(s.kind==='outro'?' cfs-end':'');
    body=brand+`<div class="cfs-desktop">${image('data-asset',s.desktop,'Colorfetti desktop with '+s.wallCount+' images')}</div><div class="cfs-phone">${image('data-asset',s.phone,'Colorfetti mobile with different artwork')}</div>`;
  } else {
    const results=s.kind==='results';if(results)cls+=' cfs-results';else cls+=' cfs-'+s.frames[0].split('-')[0];
    body=`<div class="cfs-eyebrow">${results?'THE RESULTS':`<span class="cfs-step">${String(s.step).padStart(2,'0')}</span>${esc(s.name.toUpperCase())}`}</div><h2>${esc(s.headline).replaceAll('\n','<br>')}</h2>`;
    if(s.description)body+=`<p class="cfs-description">${esc(s.description)}</p>`;
    body+=`<div class="cfs-desktop${results?' cfs-inspection':''}">${image('data-screen',i,'Real desktop app capture')}</div><div class="cfs-phone${results?' cfs-inspection':''}">${image('data-phone',i,'Real mobile capture with different artwork')}</div>`;
    if(!results)body+=`<div class="cfs-focus${filmAssets['detail-'+s.frames[0]]?' cfs-has-detail':''}">${image('data-focus',i,'Enlarged actual app control')}</div>`;
    if(!results && filmAssets['detail-'+s.frames[0]])body+=`<div class="cfs-detail">${image('data-detail',i,'Enlarged actual output pixels')}</div>`;
    body+=`<p class="cfs-caption${results?' cfs-inspection':''}" data-caption="${i}"></p>`;
    if(results)body+=`<div class="cfs-triptych">${[['original','Original','Kenney · Tiny Town'],['palette-result','Palette','PICO-8 · 8 colors'],['onebit-result','1-bit','Black & white']].map(([key,title,label])=>`<figure><div>${image('data-asset',key,title+' — identical Town crop')}</div><figcaption>${title}<span>${label}</span></figcaption></figure>`).join('')}</div>`;
  }
  return `<section class="${cls}" data-scene="${i}" aria-label="${esc(s.name)}">${body}</section>`;
}).join('\n');
const runtime=readFileSync(project+'/runtime.js','utf8');
const template=readFileSync(project+'/composition.html','utf8');
const film=template.replace('<!-- FILM_SCENES -->',scenes).replace('<!-- FILM_RUNTIME -->','<script>window.filmAssets='+JSON.stringify(filmAssets)+';window.filmShots='+JSON.stringify(shots)+';'+runtime+'</script>');
writeFileSync(work+'/film.html',film);
writeFileSync(work+'/qa/storyboard-validation.json',JSON.stringify({duration,scenes:shots.length,alternatingWalls:shots.filter(s=>s.wallCount!==undefined).map(s=>({name:s.name,count:s.wallCount})),differentArtworkOnEveryPair:true},null,2));
console.log(`Built ${shots.length} scenes / ${duration}s; verified alternating wall counts and different artwork on every paired screen.`);
