// Original research harness. Production files are imported for baselines only.
// Run: node bench/palette-algorithm-spikes/run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import os from 'node:os';
import { writeLabeledSheet } from './label-sheet.mjs';
import { quantize, colorize } from '../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';

const dir = path.dirname(fileURLToPath(import.meta.url)), outdir = path.join(dir, 'output');
fs.mkdirSync(outdir, { recursive: true });
const linear = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
const gamma = v => Math.round(255 * (v <= .0031308 ? 12.92 * Math.max(0, v) : 1.055 * Math.min(1, v) ** (1 / 2.4) - .055));
const parse = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
const hex = rgb => '#' + rgb.map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const lab = rgb => {
  const [r,g,b] = rgb, l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s];
};
const unlab = ([l,a,b]) => {
  const ll=(l+.3963377774*a+.2158037573*b)**3, mm=(l-.1055613458*a-.0638541728*b)**3, ss=(l-.0894841775*a-1.291485548*b)**3;
  return [gamma(4.0767416621*ll-3.3077115913*mm+.2309699292*ss),gamma(-1.2684380046*ll+2.6097574011*mm-.3413193965*ss),gamma(-.0041960863*ll-.7034186147*mm+1.707614701*ss)];
};
const dist=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
const nearest=(v,ps)=>{let i=0,d=Infinity;ps.forEach((p,j)=>{const dd=dist(v,p);if(dd<d){i=j;d=dd;}});return i;};
const image=(width,height,fn)=>{const data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const c=fn(x,y);data.set(c.length===4?c:[...c,255],4*(y*width+x));}return {width,height,data};};
const rgbAt=(im,i)=>Array.from(im.data.subarray(4*i,4*i+3));
const keyAt=(im,i)=>im.data[i*4]*65536+im.data[i*4+1]*256+im.data[i*4+2];

// Minimal standard PNG encoder: truecolor RGBA, filter 0, DEFLATE 9.
// Size is a consistent texture/compressibility proxy, not production indexed PNG size.
const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
function png(im){
  const chunk=(tag,data)=>{const t=Buffer.from(tag),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),data.length+8);return b;};
  const h=Buffer.alloc(13);h.writeUInt32BE(im.width);h.writeUInt32BE(im.height,4);h[8]=8;h[9]=6;
  const rows=Buffer.alloc(im.height*(im.width*4+1));for(let y=0;y<im.height;y++)Buffer.from(im.data.buffer,im.data.byteOffset+y*im.width*4,im.width*4).copy(rows,y*(im.width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const save=(name,im)=>fs.writeFileSync(path.join(outdir,name+'.png'),png(im));
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];

// Two original optional dither prototypes. Both preserve original exact palette
// RGB, classify alpha once, and never send diffusion error into invisible pixels.
// Ordered uses a best linear-light two-color mixture with a contrast penalty.
// Diffusion uses serpentine Floyd-Steinberg weights in linear RGB or Oklab.
function dither(im, colors, mode, strength=1){
  if(mode==='nearest')return colorize(quantize(im,colors),colors);
  const rgbs=colors.map(parse), linears=rgbs.map(c=>c.map(linear)), labs=linears.map(lab), exact=new Map(rgbs.map((c,i)=>[c[0]*65536+c[1]*256+c[2],i]));
  const {width:w,height:h}=im, output=image(w,h,()=>[0,0,0,0]);
  const error=new Float64Array(w*h*3), pairs=new Map();
  for(let y=0;y<h;y++)for(let ix=0;ix<w;ix++){
    const x=mode.startsWith('fs')&&y%2?w-1-ix:ix,i=y*w+x,at=i*4;
    if(im.data[at+3]<128)continue;
    const original=rgbAt(im,i), lin=original.map(linear), v=lab(lin), anchor=exact.get(keyAt(im,i));
    let winner=anchor;
    if(winner===undefined&&mode.startsWith('bayer')){
      let pair=pairs.get(keyAt(im,i));
      if(!pair){
        let best=Infinity;pair=[nearest(v,labs),nearest(v,labs),0];
        for(let a=0;a<colors.length;a++)for(let b=a;b<colors.length;b++){
          const delta=linears[b].map((v,c)=>v-linears[a][c]),den=dist(linears[a],linears[b]);
          let t=den?Math.max(0,Math.min(1,delta.reduce((s,v,c)=>s+v*(lin[c]-linears[a][c]),0)/den)):0;
          if(mode==='bayer-grid-aware')t=Math.round(t*16)/16;
          const mixture=linears[a].map((v,c)=>v+t*delta[c]);
          const cost=dist(lab(mixture),v)+.02*(mode==='bayer-grid-aware'?(1-t)*dist(labs[a],v)+t*dist(labs[b],v):t*(1-t)*dist(labs[a],labs[b]));
          if(cost<best){best=cost;pair=[a,b,t];}
        }
        pairs.set(keyAt(im,i),pair);
      }
      const chosen=(bayer[(y%4)*4+x%4]+.5)/16<pair[2]?pair[1]:pair[0];
      // strength 0 is exact baseline; intermediate strengths are a research approximation.
      winner=strength===0?nearest(v,labs):chosen;
    }else if(winner===undefined){
      const space=mode==='fs-oklab'?v:lin, adjusted=space.map((v,c)=>v+error[i*3+c]);
      winner=nearest(mode==='fs-oklab'?adjusted:lab(adjusted.map(v=>Math.max(0,Math.min(1,v)))),labs);
      const target=mode==='fs-oklab'?labs[winner]:linears[winner],delta=adjusted.map((v,c)=>(v-target[c])*strength),direction=y%2?-1:1;
      for(const [dx,dy,weight]of[[direction,0,7/16],[-direction,1,3/16],[0,1,5/16],[direction,1,1/16]]){
        const xx=x+dx, yy=y+dy, j=yy*w+xx;
        if(xx>=0&&xx<w&&yy<h&&im.data[j*4+3]>=128)for(let c=0;c<3;c++)error[j*3+c]+=delta[c]*weight;
      }
    }
    output.data.set([...rgbs[winner],255],at);
  }
  return output;
}

function metrics(source,result,colors){
  let count=0,error=0,exact=0,exactLoss=0,alphaMismatch=0,texture=0,flatPairs=0;const used=new Set(),palette=new Set(colors.map(c=>parseInt(c.slice(1),16)));
  for(let i=0;i<source.width*source.height;i++){
    if((source.data[i*4+3]>=128)!==(result.data[i*4+3]>=128))alphaMismatch++;
    if(source.data[i*4+3]<128)continue;
    const a=keyAt(source,i),b=keyAt(result,i);assert(palette.has(b),'outside target palette');used.add(b);count++;error+=dist(lab(rgbAt(source,i).map(linear)),lab(rgbAt(result,i).map(linear)));
    if(palette.has(a)){exact++;if(a!==b)exactLoss++;}
    if(i%source.width&&source.data[(i-1)*4+3]>=128&&a===keyAt(source,i-1)){flatPairs++;if(b!==keyAt(result,i-1))texture++;}
  }
  let blockError=0,blocks=0;
  for(let y=0;y<source.height;y+=4)for(let x=0;x<source.width;x+=4){
    let n=0;const a=[0,0,0],b=[0,0,0];
    for(let yy=y;yy<Math.min(y+4,source.height);yy++)for(let xx=x;xx<Math.min(x+4,source.width);xx++){const i=yy*source.width+xx;if(source.data[i*4+3]<128)continue;n++;for(let c=0;c<3;c++){a[c]+=linear(source.data[i*4+c]);b[c]+=linear(result.data[i*4+c]);}}
    if(n){blocks++;blockError+=dist(lab(a.map(v=>v/n)),lab(b.map(v=>v/n)));}
  }
  return {usedColors:used.size,pixelOklabMSE:error/count,block4OklabMSE:blockError/blocks,exactPixels:exact,exactLoss,alphaMismatch,flatHorizontalTexture:flatPairs?texture/flatPairs:0,pngBytes:png(result).length};
}
function timing(fn){fn();const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {medianMs:times[3],minMs:times[0],maxMs:times[6],runs:7};}

const pico=FULL_PRESETS.find(p=>p.id==='preset-pico8').colors, gray=FULL_PRESETS.find(p=>p.id==='preset-gray8').colors;
const fixtures={
  grayscale_ramp:image(128,64,(x,y)=>{const v=Math.round(x/127*255);return [v,v,v];}),
  color_ramps:image(128,64,(x,y)=>[Math.round(x/127*255),Math.round(y/63*255),Math.round((1-x/127)*180)]),
  flat_sprite:image(64,64,(x,y)=>{
    if(x<8||x>55||y<5||y>58||x>27&&x<36&&y>44)return [90,12,220,0];
    if(x===8||x===55||y===5||y===58)return [20,15,36];
    if(y===22&&(x===21||x===42))return [255,250,220];
    return y<27?[143,170,205]:x<32?[70,100,141]:[105,135,170];
  }),
  eight_color_ramps:image(128,64,(x,y)=>[Math.round(x/127*255),Math.round(y/63*255),Math.round((1-x/127)*180)]),
  exact_palette:image(64,64,(x,y)=>x<4||y<4?[5,8,15,0]:parse(pico[(Math.floor(x/8)+Math.floor(y/8)*8)%pico.length])),
  alpha_islands:image(128,64,(x,y)=>{if(x%24>=18||y%24>=18)return [255,0,200,x%24===18?127:0];const v=30+(x%24)*11;return [v,Math.round(v*.8),60, x%24===0?128:255];}),
};
const report={environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,date:'2026-10-14'},methodology:{timing:'Node synchronous median of 7 after one warmup, allocations included; not browser/device latency',quality:'Oklab point error and 4x4 linear-light block-average Oklab proxy; not perceptual study',encoding:'RGBA PNG filter 0 / zlib level9; not production indexed PNG'},dither:[],matching:[],generation:[],temporal:{},subset:[]};
const modes=['nearest','bayer-pair','bayer-grid-aware','fs-linear','fs-oklab'];
const comparison=[];
for(const [name,source]of Object.entries(fixtures)){
  const colors=name==='grayscale_ramp'?gray:name==='eight_color_ramps'?[0,1,3,5,7,9,12,14].map(i=>pico[i]):pico;save(name+'-source',source);
  const cells=[{label:name+' / source',im:source}];
  for(const mode of modes){const result=dither(source,colors,mode);const row={fixture:name,mode,...metrics(source,result,colors),...timing(()=>dither(source,colors,mode))};report.dither.push(row);save(name+'-'+mode,result);cells.push({label:mode,im:result});assert.equal(row.exactLoss,0);assert.equal(row.alphaMismatch,0);assert(row.usedColors<=colors.length);assert.deepEqual(dither(source,colors,mode,0).data,dither(source,colors,'nearest').data);}
  comparison.push(cells);
  for(const metric of ['oklab','rgb']){const result=colorize(quantize(source,colors,128,undefined,undefined,{metric}),colors);report.matching.push({fixture:name,metric,...metrics(source,result,colors),...timing(()=>quantize(source,colors,128,undefined,undefined,{metric}))});}
}

// A one-pixel input change must not contaminate a static background silently.
const t0=image(96,64,()=>[118,146,174]),t1=image(96,64,(x,y)=>x===0&&y===0?[250,190,90]:[118,146,174]);
for(const mode of modes){const a=dither(t0,pico,mode),b=dither(t1,pico,mode);let changedStatic=0;for(let i=1;i<96*64;i++)if(keyAt(a,i)!==keyAt(b,i))changedStatic++;report.temporal[mode]={unchangedSourcePixels:96*64-1,changedStaticPixels:changedStatic,rate:changedStatic/(96*64-1)};save('temporal-'+mode+'-before',a);save('temporal-'+mode+'-after',b);}

const chunks=frames=>async function*(){for(const frame of frames)yield {data:frame.im.data,weight:frame.weight};};
// Rare intentional accent vs area-weighted cap. A locked-accent prototype reserves
// one candidate then fits the remaining slot; no source semantics are inferred.
const rareColors=['#243447','#38618c','#669bbc','#ef233c'];
const rare=image(64,64,(x,y)=>x===31&&y===31?parse(rareColors[3]):parse(rareColors[Math.floor(x/22)]));
const rareFit=await selectPaletteSubset(rareColors,2,chunks([{im:rare,weight:1}]));
for(const [name,colors]of[['area-weighted',rareFit.indices.map(i=>rareColors[i])],['locked-accent',[rareColors[1],rareColors[3]]]]){const result=colorize(quantize(rare,colors),colors);report.subset.push({case:'rare-accent',name,colors,accentPreserved:keyAt(result,31*64+31)===parseInt(rareColors[3].slice(1),16),...metrics(rare,result,colors)});save('rare-accent-'+name,result);}
save('rare-accent-source',rare);

// Same source color gets different labels when independently fitting each frame.
const animColors=['#14213d','#5a7398','#a4b8d4','#fca311'];
const af0=image(64,64,(x,y)=>parse(animColors[x<30?0:x<60?1:3]));
const af1=image(64,64,(x,y)=>parse(animColors[x<30?2:x<60?1:3]));
const shared=await selectPaletteSubset(animColors,2,chunks([{im:af0,weight:100},{im:af1,weight:100}]));
const independent=[];for(const im of [af0,af1])independent.push(await selectPaletteSubset(animColors,2,chunks([{im,weight:100}])));
for(const name of ['shared','per-frame']){const outputs=[af0,af1].map((im,i)=>colorize(quantize(im,(name==='shared'?shared:independent[i]).indices.map(j=>animColors[j])),(name==='shared'?shared:independent[i]).indices.map(j=>animColors[j])));let n=0,total=0;for(let i=0;i<4096;i++)if(keyAt(af0,i)===keyAt(af1,i)){total++;if(keyAt(outputs[0],i)!==keyAt(outputs[1],i))n++;}report.subset.push({case:'animation-scope',name,indices:name==='shared'?shared.indices:independent.map(v=>v.indices),changedStaticPixels:n,unchangedSourcePixels:total});}

// Direct K prototype: exact weighted histogram, deterministic farthest-point
// seeds, 12 Oklab Lloyd iterations, RGB gamut clamp. Deliberately unbounded and
// synchronous for research; not a production replacement.
function directK(im,k){
  const hist=new Map();for(let i=0;i<im.width*im.height;i++)if(im.data[i*4+3]>=128){const key=keyAt(im,i);hist.set(key,(hist.get(key)??0)+1);}
  const entries=[...hist].sort((a,b)=>a[0]-b[0]).map(([key,weight])=>({key,weight,v:lab([key>>>16,key>>>8&255,key&255].map(linear))}));
  if(entries.length<=k)return entries.map(e=>'#'+e.key.toString(16).padStart(6,'0'));
  let centers=[entries.reduce((a,b)=>a.weight>=b.weight?a:b).v];
  while(centers.length<k){let best=entries[0],score=-1;for(const e of entries){const d=Math.min(...centers.map(c=>dist(c,e.v)))*e.weight;if(d>score){score=d;best=e;}}centers.push(best.v);}
  for(let pass=0;pass<12;pass++){const sums=centers.map(()=>[0,0,0,0]);for(const e of entries){const j=nearest(e.v,centers);for(let c=0;c<3;c++)sums[j][c]+=e.v[c]*e.weight;sums[j][3]+=e.weight;}centers=centers.map((v,j)=>sums[j][3]?sums[j].slice(0,3).map(n=>n/sums[j][3]):v);}
  return [...new Set(centers.map(v=>hex(unlab(v))))].sort();
}
for(const [name,im]of [['color_ramps',fixtures.color_ramps],['flat_sprite',fixtures.flat_sprite]]){
  const start=performance.now(),auto=await generatePaletteAsync(captureGeneratedSources([{original:im}]));const autoMs=performance.now()-start;
  for(const k of [4,8]){
    const t=performance.now(),fit=await selectPaletteSubset(auto.colors,k,chunks([{im,weight:1}])),cap=fit.indices.map(i=>auto.colors[i]),capMs=performance.now()-t;
    const t2=performance.now(),direct=directK(im,k),directMs=performance.now()-t2;
    for(const [method,colors,ms]of[['auto64-then-cap',cap,autoMs+capMs],['direct-k-prototype',direct,directMs]]){const result=colorize(quantize(im,colors),colors);report.generation.push({fixture:name,k,method,colors,preparationMs:ms,...metrics(im,result,colors)});save(name+'-'+method+'-'+k,result);}
  }
}

// Source-coordinate ordered pattern vs incorrect display-coordinate evaluation.
const original=fixtures.color_ramps,full=dither(original,pico,'bayer-pair');
const sampled=image(32,16,(x,y)=>rgbAt(original,Math.floor((y+.5)*4)*128+Math.floor((x+.5)*4)));
const wrong=dither(sampled,pico,'bayer-pair');
let previewDisagreements=0;for(let i=0;i<32*16;i++){const x=i%32,y=Math.floor(i/32),j=Math.floor((y+.5)*4)*128+Math.floor((x+.5)*4);if(keyAt(wrong,i)!==keyAt(full,j))previewDisagreements++;}
report.preview={sampledPixels:512,displayCoordinateDisagreements:previewDisagreements};

// Comparison sheet uses nearest-neighbor pixels; a self-contained SVG adds labels.
const scale=3,cw=128*scale,ch=64*scale,sheet=image(cw*(modes.length+1),ch*comparison.length,()=>[240,240,240,255]);
for(let row=0;row<comparison.length;row++)for(let col=0;col<modes.length+1;col++){const im=comparison[row][col].im;for(let y=0;y<im.height*scale;y++)for(let x=0;x<im.width*scale;x++){const si=(Math.floor(y/scale)*im.width+Math.floor(x/scale))*4,di=((row*ch+y)*sheet.width+col*cw+x)*4;if(im.data[si+3])sheet.data.set(im.data.subarray(si,si+4),di);else{const v=(Math.floor(x/12)+Math.floor(y/12))%2?220:245;sheet.data.set([v,v,v,255],di);}}}
save('contact-sheet',sheet);
fs.writeFileSync(path.join(outdir,'results.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outdir,'index.html'),`<!doctype html><meta charset="utf-8"><title>Palette algorithm experiments</title><style>body{font:16px system-ui;margin:24px;background:#fafafa}table{border-collapse:collapse}th,td{padding:12px;border:1px solid #ccc}img{image-rendering:pixelated;max-width:100%}td img{width:256px;max-width:none}</style><h1>Original synthetic algorithm experiments</h1><p>Columns: source, nearest, naive ordered pair, grid-aware ordered pair, linear-light diffusion, Oklab diffusion. Rows are independent test fixtures; dithering is optional texture, not guaranteed fidelity. The naive ordered variant fails the grayscale ramp and both ordered searches are too slow for production.</p><p><a href="contact-sheet-labeled.svg">Standalone labeled comparison sheet</a></p><table><tr><th>Fixture</th>${['source',...modes].map(m=>'<th>'+m+'</th>').join('')}</tr>${comparison.map((cells,row)=>'<tr><th>'+Object.keys(fixtures)[row]+'</th>'+cells.map((cell,col)=>'<td><img src="'+Object.keys(fixtures)[row]+'-'+(col===0?'source':modes[col-1])+'.png"></td>').join('')+'</tr>').join('')}</table><p><a href="results.json">Complete metrics</a></p>`);
writeLabeledSheet(outdir);
console.log(JSON.stringify({files:fs.readdirSync(outdir).length,dither:report.dither.map(r=>({fixture:r.fixture,mode:r.mode,point:r.pixelOklabMSE,block:r.block4OklabMSE,texture:r.flatHorizontalTexture,ms:r.medianMs})),temporal:report.temporal,subset:report.subset,generation:report.generation.map(r=>({fixture:r.fixture,k:r.k,method:r.method,error:r.pixelOklabMSE,ms:r.preparationMs})),preview:report.preview},null,2));
