// Offline app outputs; public palette metadata refresh only with --refresh.
import fs from 'node:fs/promises';
import path from 'node:path';
import { png, decode, sha } from '../palette-service-research/api-common.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { quantize, colorize } from '../../src/lib/quantize.js';
const dir=import.meta.dirname, refresh=process.argv.includes('--refresh');
const slugs=['mulfok32','zughy-32','dawnbringer-32'];
if(refresh){
  const list=await(await fetch('https://lospec.com/palette-list/load?colorNumberFilterType=exact&colorNumber=32&page=0&tag=&sortingType=downloads')).json();
  const groups={};
  for(const count of [2,4,8,16]) groups[count]=await(await fetch(`https://lospec.com/palette-list/load?colorNumberFilterType=exact&colorNumber=${count}&page=0&tag=&sortingType=downloads`)).json();
  const candidates=await Promise.all(slugs.map(async slug=>({slug,...await(await fetch(`https://lospec.com/palette-list/${slug}.json`)).json()})));
  const api=await(await fetch('https://api.pixellab.ai/v2/openapi.json')).json();
  const budgetSchema=api.components.schemas.ReduceColorsRequest;
  await fs.writeFile(path.join(dir,'public-evidence.json'),JSON.stringify({retrieved:new Date().toISOString(),list,groups,candidates,budgetSchema},null,2));
}
const evidence=JSON.parse(await fs.readFile(path.join(dir,'public-evidence.json'),'utf8'));
const palettes=[FULL_PRESETS.find(p=>p.id==='preset-edg32'),...evidence.candidates.map(p=>({id:p.slug,name:p.name,colors:p.colors.map(c=>'#'+c)}))];
const fixtures=['../palette-fitting-spike/sprite-source.png','../palette-fitting-spike/armor-source.png','../palette-fitting-spike/ramp-source.png','../claude-audit-2026-10-15/service/fixtures/knight-a.png'];
const results=[];let html='<!doctype html><meta charset="utf-8"><title>32-color curation comparison</title><style>body{background:#24292e;color:#eee;font:16px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:12px;border:1px solid #555;vertical-align:top}img{image-rendering:pixelated;max-width:220px;min-width:128px;height:180px;object-fit:contain;background:repeating-conic-gradient(#383e44 0 25%,#292e34 0 50%) 0/16px 16px}.swatches{display:flex;flex-wrap:wrap;width:210px}i{width:20px;height:20px}</style><h1>32-color curation</h1><p>Oklab, All, Cut128, dithering and cleanup Off. Different artistic targets; lower fidelity does not imply a broken palette.</p><table><tr><th>Original</th>'+palettes.map(p=>`<th>${p.name}<div class="swatches">${p.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</div></th>`).join('')+'</tr>';
for(let n=0;n<fixtures.length;n++){
 const source=await fs.readFile(path.resolve(dir,fixtures[n])),im=decode(source);await fs.writeFile(path.join(dir,`source-${n}.png`),source);html+=`<tr><td><img src="source-${n}.png"><br>${path.basename(fixtures[n])}</td>`;
 for(const p of palettes){const out=colorize(quantize(im,p.colors),p.colors),file=`${n}-${p.id}.png`,bytes=png(out.w,out.h,(x,y)=>out.data.subarray((y*out.w+x)*4,(y*out.w+x)*4+4));await fs.writeFile(path.join(dir,file),bytes);const used=new Set();let changed=0,visible=0;for(let i=0;i<im.data.length;i+=4)if(im.data[i+3]>=128){visible++;used.add(Buffer.from(out.data.subarray(i,i+3)).toString('hex'));if(out.data[i]!==im.data[i]||out.data[i+1]!==im.data[i+1]||out.data[i+2]!==im.data[i+2])changed++;}results.push({fixture:fixtures[n],sourceSha256:sha(source),palette:p.id,paletteCount:p.colors.length,used:used.size,changed,visible,output:file,sha256:sha(bytes)});html+=`<td><img src="${file}"><br>${used.size} used</td>`;}
 html+='</tr>';
}
const edg=new Set(palettes[0].colors.map(c=>c.toLowerCase()));
const overlap=palettes.slice(1).map(p=>({name:p.name,exactOverlapWithEndesga32:p.colors.filter(c=>edg.has(c.toLowerCase())).length}));
await fs.writeFile(path.join(dir,'results.json'),JSON.stringify({settings:{metric:'oklab',maxColors:'All',alphaCut:128,dither:'none',cleanup:false},overlap,results},null,2));await fs.writeFile(path.join(dir,'index.html'),html+'</table>');console.log(JSON.stringify({cases:results.length,overlap}));
