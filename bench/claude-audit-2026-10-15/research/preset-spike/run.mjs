// Original synthetic preset experiment; no outside artwork or production changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { quantize, colorize } from '../../../../src/lib/quantize.js';
import { selectPaletteSubset } from '../../../../src/lib/palette-limit.js';
import { FULL_PRESETS } from '../../../../src/lib/palette-library.js';

const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.join(dir,'output');fs.mkdirSync(out,{recursive:true});
const parse=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const key=(data,i)=>data[i*4]*65536+data[i*4+1]*256+data[i*4+2];
const hex=n=>'#'+n.toString(16).padStart(6,'0');
const lin=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function lab(rgb){const[r,g,b]=rgb.map(lin),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const sq=(a,b)=>a.reduce((n,v,i)=>n+(v-b[i])**2,0);
function image(w,h,fn){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(fn(x,y),4*(y*w+x));return{width:w,height:h,data};}
const roles={skin:['#9c5b43','#cc906a','#edc59a'],cloth:['#263e70','#4569ab','#8eaee1'],wood:['#513525','#80563a','#b28758'],metal:['#40454d','#7c8794','#bdc9ce']};
const roleProbes={},shadeProbes={};
const sprite=image(128,80,(x,y)=>{
  if(x<8||x>119||y<8||y>71)return[222,0,255,0];
  if(x===8||x===119||y===8||y===71)return[...parse('#171b27'),255];
  if(y===20&&(x===24||x===88))return[...parse('#ed324b'),255];
  const role=Object.keys(roles)[Math.min(3,Math.floor((x-9)/28))],shade=Math.min(2,Math.floor((y-9)/21));
  return[...parse(roles[role][shade]),255];
});
for(const [i,role]of Object.keys(roles).entries()){
  roleProbes[role]=(38*128+15+i*28);shadeProbes[role]=[15,38,60].map(y=>y*128+15+i*28);
}
roleProbes.outline=8*128+8;roleProbes.accent=20*128+24;
const ramp=image(128,64,(x,y)=>[Math.round(x/127*255),Math.round(y/63*255),Math.round((1-x/127)*190),255]);
const palettes=[];
for(const slug of ['endesga-8','slso8']){const j=JSON.parse(fs.readFileSync(path.join(dir,slug+'.json'),'utf8'));assert.equal(j.colors.length,8);palettes.push({id:slug,name:j.name,author:j.author,source:'https://lospec.com/palette-list/'+slug,colors:j.colors.map(c=>'#'+c.toLowerCase())});}
for(const[id,name]of[['preset-gray8','Grayscale 8'],['preset-pico8','PICO-8 capped 8']]){const p=FULL_PRESETS.find(p=>p.id===id);assert(p);palettes.push({id,name,source:'Colorfetti existing preset',colors:p.colors});}
function crc(bytes){let c=0xffffffff;for(const n of bytes){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function png(im){const chunk=(tag,b)=>{const t=Buffer.from(tag),a=Buffer.alloc(b.length+12);a.writeUInt32BE(b.length);t.copy(a,4);b.copy(a,8);a.writeUInt32BE(crc(Buffer.concat([t,b])),b.length+8);return a;};const h=Buffer.alloc(13);h.writeUInt32BE(im.width);h.writeUInt32BE(im.height,4);h[8]=8;h[9]=6;const rows=Buffer.alloc(im.height*(1+im.width*4));for(let y=0;y<im.height;y++)Buffer.from(im.data.buffer,im.data.byteOffset+y*im.width*4,im.width*4).copy(rows,y*(1+im.width*4)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
const save=(n,im)=>fs.writeFileSync(path.join(out,n+'.png'),png(im));
const report={date:'2026-10-14',environment:{node:process.version,platform:process.platform},method:'Original synthetic flat region sprite and chromatic ramp; current Oklab nearest, cap 8, alpha cut128, no cleanup/dither. Source files preserve primary swatch order/author. Oklab point score favors selected matching objective; no human preference or performance study.',palettes,rows:[]};
const cells=[];
for(const[name,im]of[['material-sprite',sprite],['chromatic-ramp',ramp]]){
  save(name+'-source',im);const row=[{name:'Source',im}];
  for(const p of palettes){
    const chunks=async function*(){yield{data:im.data,weight:1};};
    const fit=await selectPaletteSubset(p.colors,8,chunks),colors=fit.indices.map(i=>p.colors[i]);
    const result=colorize(quantize(im,colors),colors),allowed=new Set(colors.map(c=>parseInt(c.slice(1),16))),used=new Set();let error=0,visible=0,alphaMismatch=0;
    for(let i=0;i<im.width*im.height;i++){
      if((im.data[i*4+3]>=128)!==(result.data[i*4+3]>=128))alphaMismatch++;
      if(im.data[i*4+3]<128)continue;visible++;const k=key(result.data,i);assert(allowed.has(k));used.add(k);error+=sq(lab(Array.from(im.data.subarray(i*4,i*4+3))),lab(Array.from(result.data.subarray(i*4,i*4+3))));
    }
    const measured={fixture:name,palette:p.id,selectedColors:colors,usedColors:used.size,pointOklabMSE:error/visible,paletteMembership:true,alphaMismatch};
    if(name==='material-sprite'){
      measured.roleMidtoneProbes=Object.fromEntries(Object.entries(roleProbes).map(([r,i])=>[r,hex(key(result.data,i))]));
      measured.distinctRoleMidtones=new Set(Object.values(measured.roleMidtoneProbes)).size;
      measured.shadeSteps=Object.fromEntries(Object.entries(shadeProbes).map(([r,is])=>[r,is.map(i=>hex(key(result.data,i)))]));
      measured.uniqueShadeSteps=Object.fromEntries(Object.entries(measured.shadeSteps).map(([r,cs])=>[r,new Set(cs).size]));
      measured.roleCollisions=[];const pairs=Object.entries(measured.roleMidtoneProbes);for(let a=0;a<pairs.length;a++)for(let b=a+1;b<pairs.length;b++)if(pairs[a][1]===pairs[b][1])measured.roleCollisions.push([pairs[a][0],pairs[b][0]]);
    }
    assert(used.size<=8);assert.equal(alphaMismatch,0);report.rows.push(measured);save(name+'-'+p.id,result);row.push({name:p.name,im:result});
  }cells.push(row);
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><title>Original preset comparison</title><style>body{font:16px system-ui;margin:20px;background:#fafafa}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #ccc}img{width:256px;image-rendering:pixelated;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0/16px 16px}.swatch{display:inline-block;width:20px;height:20px}</style><h1>Original synthetic preset comparison</h1><p>Native 128px sources shown at2x. Nearest Oklab, cap8, no dither/cleanup. Role probes are constructed labels, not inferred materials. <a href="results.json">Measured results</a></p><table>'+cells.map((row,i)=>'<tr><th>'+['Material sprite','Chromatic ramp'][i]+'</th>'+row.map(c=>'<td>'+escape(c.name)+'<br><img src="data:image/png;base64,'+png(c.im).toString('base64')+'"></td>').join('')+'</tr>').join('')+'</table><h2>Palette provenance</h2>'+palettes.map(p=>'<p>'+escape(p.name)+' · '+escape(p.author??'existing app preset')+' '+p.colors.map(c=>'<span class="swatch" style="background:'+c+'"></span>').join('')+'</p>').join(''));
const svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1490" height="420"><rect width="100%" height="100%" fill="#fff"/><style>text{font:16px sans-serif}image{image-rendering:pixelated}</style>'];
for(let r=0;r<cells.length;r++)for(let c=0;c<cells[r].length;c++){const cell=cells[r][c],x=20+c*294,y=30+r*200;svg.push('<text x="'+x+'" y="'+y+'">'+escape(cell.name)+'</text><image x="'+x+'" y="'+(y+10)+'" width="256" height="160" href="data:image/png;base64,'+png(cell.im).toString('base64')+'"/>');}svg.push('</svg>');fs.writeFileSync(path.join(out,'comparison.svg'),svg.join(''));
console.log(JSON.stringify(report.rows,null,2));
