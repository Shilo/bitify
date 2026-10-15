// Local preset selection study. No service calls, vendor code or uploads.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
import {quantizeAsync} from '../../src/lib/quantize.js';
import {selectPaletteSubset} from '../../src/lib/palette-limit.js';
import {palettePngBytesAsync} from '../../src/lib/save.js';
const dir=import.meta.dirname;fs.mkdirSync(dir,{recursive:true});
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require(process.env.SHARP_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const read=f=>fs.readFileSync(path.resolve(dir,f));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function decode(bytes){const {data,info}=await sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});return{width:info.width,height:info.height,data};}
const candidate=JSON.parse(read('../palette-preset-spike/endesga-8.json'));
const slso=JSON.parse(read('../palette-preset-spike/slso8.json'));
const existing=id=>FULL_PRESETS.find(p=>p.id===id).colors;
const palettes=[
 {id:'edg8',name:'ENDESGA8',group:8,colors:candidate.colors.map(c=>'#'+c),credit:candidate.author,source:'https://lospec.com/palette-list/endesga-8'},
 {id:'slso8',name:'SLSO8 alternative',group:8,colors:slso.colors.map(c=>'#'+c),credit:slso.author,source:'https://lospec.com/palette-list/slso8'},
 {id:'pico-cap8',name:'PICO-8 capped8',group:8,colors:existing('preset-pico8'),cap:8},
 {id:'gray8',name:'Grayscale8',group:8,colors:existing('preset-gray8')},
 {id:'mono',name:'Black & white',group:2,colors:['#000000','#ffffff'],credit:'Opaque sRGB black and white'},
 {id:'glow',name:'Glow',group:2,colors:existing('preset-glow')},
 {id:'paper',name:'Paper',group:2,colors:existing('preset-paper')},
 {id:'gray-cap2',name:'Grayscale8 capped2',group:2,colors:existing('preset-gray8'),cap:2},
];
for(const [id,colors]of [['preset-edg8',palettes[0].colors],['preset-mono',palettes[4].colors]]){
 const builtin=FULL_PRESETS.find(p=>p.id===id);if(builtin)assert.deepEqual(builtin.colors,colors,'Builtin differs from evaluated candidate');
}
const fixtures=[['items64','../icon-research/general-source.png'],['armor16','../icon-research/breastplate-source.png'],['material-synthetic','../palette-preset-spike/output/material-sprite-source.png'],['ramp-synthetic','../palette-preset-spike/output/chromatic-ramp-source.png']];
const linear=n=>n<=.04045*255?n/255/12.92:((n/255+.055)/1.055)**2.4;
function lab(r,g,b){r=linear(r);g=linear(g);b=linear(b);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const rgbAt=(im,p)=>im.data[p]<<16|im.data[p+1]<<8|im.data[p+2];
const results={engineSha256:Object.fromEntries(['quantize.js','palette-dither.js','palette-limit.js','save.js','palette-library.js'].map(f=>[f,hash(fs.readFileSync(path.resolve(dir,'../../src/lib',f)))])),method:'Four unresized native sources, Oklab, alpha cut128, CleanupOff, targetAll or stated preselected cap; Off and4x4 strength50; no paid calls',palettes,fixtures:[],rows:[]};
for(const[id,file]of fixtures){
 const bytes=read(file),source=await decode(bytes);fs.writeFileSync(path.join(dir,id+'-source.png'),bytes);results.fixtures.push({id,file,width:source.width,height:source.height,sha256:hash(bytes)});
 for(const palette of palettes){let colors=palette.colors;
  if(palette.cap){const fit=await selectPaletteSubset(colors,palette.cap,async function*(){yield{data:source.data,weight:1};});colors=fit.indices.map(i=>colors[i]);}
  const allowed=new Set(colors.map(c=>parseInt(c.slice(1),16)));
  for(const dither of ['none','4x4']){
   const quantized=await quantizeAsync(source,colors,128,undefined,undefined,{metric:'oklab',dither,ditherStrength:50});
   const encoded=await palettePngBytesAsync({...quantized,colors}),output=await decode(encoded),outFile=`${id}-${palette.id}-${dither}.png`;fs.writeFileSync(path.join(dir,outFile),encoded);
   let visible=0,error=0,exact=0;const used=new Set();
   for(let p=0;p<source.data.length;p+=4){assert.equal(output.data[p+3],source.data[p+3]>=128?255:0);if(!output.data[p+3])continue;visible++;const sourceRgb=rgbAt(source,p),outRgb=rgbAt(output,p);assert(allowed.has(outRgb));used.add(outRgb);if(allowed.has(sourceRgb)){exact++;assert.equal(outRgb,sourceRgb);}const a=lab(source.data[p],source.data[p+1],source.data[p+2]),b=lab(output.data[p],output.data[p+1],output.data[p+2]);error+=a.reduce((n,v,i)=>n+(v-b[i])**2,0);}
   const row={fixture:id,palette:palette.id,dither,ditherStrength:50,colors,usedColors:used.size,visiblePixels:visible,pointOklabMSE:error/visible,paletteMembership:true,alphaClassificationPreserved:true,exactActiveRgbPreserved:true,exactActivePixels:exact,file:outFile,pngBytes:encoded.length};
   if(id==='material-synthetic'){const positions={skin:38*128+15,cloth:38*128+43,wood:38*128+71,metal:38*128+99,outline:8*128+8,accent:20*128+24};row.roleProbes=Object.fromEntries(Object.entries(positions).map(([name,p])=>[name,'#'+rgbAt(output,p*4).toString(16).padStart(6,'0')]));row.distinctRoleProbes=new Set(Object.values(row.roleProbes)).size;}
   results.rows.push(row);
  }
 }
}
fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
let html='<!doctype html><meta charset="utf-8"><title>Curated palette selection study</title><style>body{font:16px system-ui;background:#fffdf9;margin:24px}section{margin:36px 0}article{display:flex;gap:12px;overflow:auto}figure{margin:0;min-width:220px}img{image-rendering:pixelated;background:#dedbd5}.large{width:192px;height:160px;object-fit:contain}.native{display:block;max-width:128px}</style><h1>Palette selection: native pixels and enlarged previews</h1><p>All sources retain their native resolution. Dither50 means4×4 at50%, not a calibrated artist-quality rating. More texture can damage small details. Every conversion passed alpha, target membership and exact-active-RGB checks.</p>';
for(const group of [8,2])for(const dither of ['none','4x4']){
 const selected=palettes.filter(p=>p.group===group),cw=230,ch=220,overlays=[];
 for(let y=0;y<fixtures.length;y++){
  const id=fixtures[y][0],cells=[{name:'Original '+id,file:id+'-source.png'},...selected.map(p=>{const r=results.rows.find(r=>r.fixture===id&&r.palette===p.id&&r.dither===dither);return{name:p.name,file:r.file,used:r.usedColors};})];
  html+=`<section><h2>${id} · ${group}-color group · ${dither==='none'?'Off':'4×4 /50%'}</h2><article>`;
  for(let x=0;x<cells.length;x++){
   const cell=cells[x],bytes=read(cell.file),im=await decode(bytes),scale=Math.max(1,Math.floor(Math.min((cw-20)/im.width,(ch-55)/im.height))),w=im.width*scale,h=im.height*scale;
   html+=`<figure><figcaption>${escape(cell.name)}${cell.used?' · used'+cell.used:''}</figcaption><img class="native" src="data:image/png;base64,${bytes.toString('base64')}"><img class="large" src="data:image/png;base64,${bytes.toString('base64')}"></figure>`;
   const label=`<svg width="${cw}" height="45"><g font-family="Arial" fill="#24202b" font-size="12"><text x="8" y="18">${escape(cell.name)}</text><text x="8" y="36">${cell.used?'Used '+cell.used+' colors':''}</text></g></svg>`;
   overlays.push({input:Buffer.from(label),left:x*cw,top:y*ch});overlays.push({input:await sharp(bytes).resize(w,h,{kernel:'nearest'}).flatten({background:'#dedbd5'}).png().toBuffer(),left:x*cw+Math.floor((cw-w)/2),top:y*ch+50+Math.floor((ch-55-h)/2)});
  }
  html+='</article></section>';
 }
 await sharp({create:{width:cw*5,height:ch*fixtures.length,channels:4,background:'#fffdf9'}}).composite(overlays).png().toFile(path.join(dir,`group${group}-${dither}.png`));
}
fs.writeFileSync(path.join(dir,'index.html'),html);console.log(JSON.stringify({conversions:results.rows.length,assertions:'allpassed',summary:results.rows.filter(r=>['edg8','mono'].includes(r.palette)).map(r=>({fixture:r.fixture,palette:r.palette,dither:r.dither,used:r.usedColors,point:r.pointOklabMSE,roles:r.distinctRoleProbes}))},null,2));
