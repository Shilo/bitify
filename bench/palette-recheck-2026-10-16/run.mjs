// Public Lospec metadata and retained licensed CC0 fixtures; no authenticated
// services, uploads, or Lospec example artwork.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { quantize, colorize } from '../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { sha } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname, require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const slugs=['endesga-32','mulfok32','zughy-32','dawnbringer-32','nanner-pancakes','aerugo','sheltzy32','downgraded-32'];
if(process.argv.includes('--refresh')){
 const listUrl='https://lospec.com/palette-list/load?colorNumberFilterType=exact&colorNumber=32&page=0&tag=&sortingType=downloads';
 const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);return r.json();};
 const list=await get(listUrl), palettes=[];
 for(const slug of slugs)palettes.push({slug,url:`https://lospec.com/palette-list/${slug}`,data:await get(`https://lospec.com/palette-list/${slug}.json`)});
 await fs.writeFile(path.join(dir,'public-evidence.json'),JSON.stringify({retrieved:new Date().toISOString(),listUrl,list: list.palettes.map(p=>({slug:p.slug,name:p.title,downloads:p.downloads,likes:p.likes,colors:p.colors,description:p.description})),totalCount:list.totalCount,palettes},null,2));
}
const evidence=JSON.parse(await fs.readFile(path.join(dir,'public-evidence.json'),'utf8'));
const palettes=evidence.palettes.map(p=>({id:p.slug,name:p.data.name,colors:p.data.colors.map(c=>'#'+c)}));
assert.deepEqual(FULL_PRESETS.find(p=>p.id==='preset-mulfok32').colors,palettes.find(p=>p.id==='mulfok32').colors);
const linear=v=>v<=10.31475?v/3294.6:((v/255+.055)/1.055)**2.4;
function lab(rgb){const [r,g,b]=rgb.map(linear), l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const rgb=c=>[1,3,5].map(at=>parseInt(c.slice(at,at+2),16)), dist=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
const stats=p=>{const labs=p.colors.map(c=>lab(rgb(c)));return{id:p.id,name:p.name,meanChroma:labs.reduce((n,[,a,b])=>n+Math.hypot(a,b),0)/32,lightnessRange:[Math.min(...labs.map(l=>l[0])),Math.max(...labs.map(l=>l[0]))],neutralColors:labs.filter(l=>Math.hypot(l[1],l[2])<.03).length};};
const setDistance=(a,b)=>{const la=a.colors.map(c=>lab(rgb(c))),lb=b.colors.map(c=>lab(rgb(c)));return Math.sqrt((la.reduce((n,l)=>n+Math.min(...lb.map(t=>dist(l,t))),0)+lb.reduce((n,l)=>n+Math.min(...la.map(t=>dist(l,t))),0))/64);};
const manifest=JSON.parse(await fs.readFile(path.join(dir,'../important-colors-review/manifest.json'),'utf8'));
const fixtures=manifest.files.filter(f=>f.source?.license==='CC0-1.0'&&['dungeon-wizard','dungeon-knight','dungeon-potion','dungeon-neutral-shield','town-water-bucket','platformer-rocket','platformer-heart','platformer-pilot'].includes(f.id)).map(f=>({...f,file:path.resolve(dir,'../important-colors-review',f.file)}));
fixtures.push({id:'owned-knight',file:path.resolve(dir,'../claude-audit-2026-10-15/service/fixtures/knight-a.png'),source:{note:'Owned synthetic sprite; original fixture manifest retained.'}},{id:'owned-hue-ramp',file:path.resolve(dir,'../claude-audit-2026-10-15/service/fixtures/hue-ramp.png'),source:{note:'Owned synthetic hue ramp; original fixture manifest retained.'}});
const rows=[],sources=[];let contact=[];const cw=150,ch=170;
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(let y=0;y<fixtures.length;y++){
 const f=fixtures[y],bytes=await fs.readFile(f.file);if(f.sha256)assert.equal(sha(bytes),f.sha256,'Fixture changed since licensed manifest');const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const image={data,width:info.width,height:info.height},sourceName=`${f.id}-source.png`;await fs.writeFile(path.join(dir,sourceName),bytes);
 sources.push({id:f.id,sha256:sha(bytes),width:info.width,height:info.height,source:f.source});
 const cells=[{name:f.id,bytes}];
 for(const p of palettes){
  const out=colorize(quantize(image,p.colors),p.colors),labs=p.colors.map(c=>lab(rgb(c))),allowed=new Set(p.colors),used=new Set();let visible=0,error=0,oracleMismatches=0;
  for(let i=0;i<data.length;i+=4){assert.equal(out.data[i+3],data[i+3]>=128?255:0);if(!out.data[i+3])continue;visible++;const color='#'+Buffer.from(out.data.subarray(i,i+3)).toString('hex');assert(allowed.has(color));used.add(color);const srcLab=lab([...data.subarray(i,i+3)]),outLab=lab([...out.data.subarray(i,i+3)]),e=dist(srcLab,outLab),nearest=Math.min(...labs.map(l=>dist(srcLab,l)));error+=e;if(e-nearest>1e-13)oracleMismatches++;}
  assert.equal(oracleMismatches,0);const output=`${f.id}-${p.id}.png`,encoded=await sharp(Buffer.from(out.data),{raw:{width:out.w,height:out.h,channels:4}}).png().toBuffer();await fs.writeFile(path.join(dir,output),encoded);
  rows.push({fixture:f.id,palette:p.id,used:used.size,visible,pointOklabMSE:error/visible,output,sha256:sha(encoded),oracleMismatches});cells.push({name:p.name,bytes:encoded,used:used.size});
 }
 for(let x=0;x<cells.length;x++){const c=cells[x],meta=await sharp(c.bytes).metadata(),scale=Math.max(1,Math.floor(Math.min((cw-12)/meta.width,(ch-60)/meta.height))),w=meta.width*scale,h=meta.height*scale;
  const label=Buffer.from(`<svg width="${cw}" height="55"><g font-family="Arial" fill="#eee" font-size="11"><text x="5" y="18">${esc(c.name)}</text><text x="5" y="36">${c.used?'Uses '+c.used+' colors':'Original'}</text></g></svg>`);contact.push({input:label,left:x*cw,top:y*ch},{input:await sharp(c.bytes).resize(w,h,{kernel:'nearest'}).flatten({background:'#34303c'}).png().toBuffer(),left:x*cw+Math.floor((cw-w)/2),top:y*ch+55});
 }
}
const pairs=[];for(let i=0;i<palettes.length;i++)for(let j=i+1;j<palettes.length;j++)pairs.push({a:palettes[i].id,b:palettes[j].id,symmetricNearestOklabRMS:setDistance(palettes[i],palettes[j])});
const target=palettes.find(p=>p.id==='mulfok32');const versusBuiltins=FULL_PRESETS.filter(p=>p.id!=='preset-mulfok32').map(p=>({id:p.id,exactShared:p.colors.filter(c=>target.colors.includes(c)).length,symmetricNearestOklabRMS:(()=>{const a=target.colors.map(c=>lab(rgb(c))),b=p.colors.map(c=>lab(rgb(c)));return Math.sqrt((a.reduce((n,l)=>n+Math.min(...b.map(t=>dist(l,t))),0)/a.length+b.reduce((n,l)=>n+Math.min(...a.map(t=>dist(l,t))),0)/b.length)/2);})()}));
await sharp({create:{width:cw*(palettes.length+1),height:ch*fixtures.length,channels:4,background:'#24202b'}}).composite(contact).png().toFile(path.join(dir,'comparison.png'));
await fs.writeFile(path.join(dir,'results.json'),JSON.stringify({method:'Oklab All Cut128; no dithering or cleanup; point error is fidelity only, not artistic quality',settings:{metric:'oklab',maxColors:'All',alphaCut:128,dither:'none',cleanup:false},retrieved:evidence.retrieved,canonicalBuiltinMatch:true,fixtures:sources,stats:palettes.map(stats),pairs,versusBuiltins,rows},null,2));
await fs.writeFile(path.join(dir,'index.html'),`<!doctype html><meta charset="utf-8"><title>32-color recheck</title><style>body{background:#24202b;color:#eee;font:16px system-ui}img{max-width:none;image-rendering:pixelated}</style><h1>32-color recheck</h1><p>Ten fixtures: eight licensed real sprites and two owned controls. Oklab, All, Cut128, dither/cleanup Off. Different palette treatments, not a single quality ranking.</p><img src="comparison.png" alt="Original and eight candidate palettes">`);
console.log(JSON.stringify({cases:rows.length,stats:palettes.map(stats),rank:evidence.list.map(p=>({name:p.name,likes:p.likes,downloads:p.downloads})),versusBuiltins},null,2));
