// Independent acceptance oracle. Deliberately does not call the app's colorize,
// Oklab, Bayer or export-table helpers to construct expected pixels.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { quantize, quantizeAsync } from '../../../src/lib/quantize.js';
import { palettePngBytes, palettePngBytesAsync } from '../../../src/lib/save.js';
import { encodePaletteGif } from '../../../src/lib/gif.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const baseRef='f08d4d3f6e3df771d17524f00f1bba2e492c4ec0';
const baseSource=execFileSync('git',['show',`${baseRef}:src/lib/quantize.js`],{encoding:'utf8'});
const baseline=await import('data:text/javascript;base64,'+Buffer.from(baseSource.replace("'./palette-library.js'",JSON.stringify(new URL('../../../src/lib/palette-library.js',import.meta.url).href))).toString('base64'));
const linear = v => v <= 10.31475 ? v / 3294.6 : ((v / 255 + .055) / 1.055) ** 2.4;
const lab = ([r,g,b]) => {
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
};
const distance = (a,b) => a.reduce((n,x,i) => n+(x-b[i])**2,0);
const matrices = {2:[[0,2],[3,1]],4:[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]],8:[[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]]};
let seed = 0x570a3e;
const byte = () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24; };
function oracle(pixel, colors, options, x, y) {
  const [r,g,b,alpha] = pixel;
  if(alpha < (options.alphaMode==='keep'?1:options.cut)) return 256;
  const exact = colors.findIndex(c => c[0]===r&&c[1]===g&&c[2]===b);
  if(exact>=0) return exact;
  const source=[r,g,b], sourceLight=source.map(linear), sourceLab=lab(sourceLight);
  const lights=colors.map(c=>c.map(linear)), labs=lights.map(lab);
  const ordered=colors.map((c,i)=>({i,d:distance(options.metric==='rgb'?source:sourceLab,options.metric==='rgb'?c:labs[i])})).sort((a,b)=>a.d-b.d||a.i-b.i);
  const nearest=ordered[0].i;
  if(options.dither==='none'||options.strength===0||colors.length===1)return nearest;
  const side=Number(options.dither[0]), cells=side*side, candidates=ordered.slice(0,4).map(c=>c.i);
  const target=lights[nearest].map((v,i)=>v+(sourceLight[i]-v)*options.strength/100), targetLab=lab(target);
  const point=candidates.map(i=>distance(sourceLab,labs[i]));
  let best=distance(targetLab,labs[nearest])+.03*point[0], aBest=nearest,bBest=nearest,occupancy=0;
  for(let a=0;a<candidates.length-1;a++)for(let b=a+1;b<candidates.length;b++){
    const ai=candidates[a],bi=candidates[b],vector=lights[bi].map((v,i)=>v-lights[ai][i]);
    const projection=target.reduce((n,v,i)=>n+(v-lights[ai][i])*vector[i],0)/distance(lights[ai],lights[bi]);
    const middle=Math.min(cells-1,Math.max(1,Math.round(projection*cells)));
    for(let weight=Math.max(1,middle-1);weight<=Math.min(cells-1,middle+1);weight++){
      const t=weight/cells,mix=lab(lights[ai].map((v,i)=>v+t*vector[i]));
      const error=distance(targetLab,mix)+.03*(point[a]*(1-t)+point[b]*t);
      if(error<best){best=error;aBest=ai;bBest=bi;occupancy=weight;}
    }
  }
  return matrices[side][y%side][x%side]<occupancy?bBest:aBest;
}
const report={seed:'0x570a3e',baseRef,baselineChecks:0,cases:0,pixels:0,oraclePixels:0,pngRoundTrips:0,gifRejectionChecks:0,sourceHashes:[],failures:[]};
const start=performance.now();
for(const size of [1,2,8,64,256]){
 const colors=Array.from({length:size},(_,i)=>[(i*47+3)&255,(i*83+23)&255,(i*137+71)&255]);
 const hex=colors.map(c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''));
 const width=37,height=23,data=Uint8ClampedArray.from({length:width*height*4},(_,i)=>i%4===3?[0,1,64,127,128,254,255][Math.floor(i/4)%7]:byte());
 for(let i=0;i<Math.min(size,width*height);i++)data.set([...colors[i],255],i*4);
 const source={width,height,data},before=createHash('sha256').update(data).digest('hex');
 for(const metric of ['oklab','rgb'])for(const cut of [1,128,255]){
  const reference=baseline.quantize(source,hex,cut,undefined,undefined,{metric});
  assert.deepEqual(quantize(source,hex,cut,undefined,undefined,{metric}),reference);report.baselineChecks++;
  for(const dither of ['2x2','4x4','8x8']){
   assert.deepEqual(quantize(source,hex,cut,undefined,undefined,{metric,dither,ditherStrength:0}),reference);report.baselineChecks++;
  }
 }
 for(const metric of ['oklab','rgb'])for(const alphaMode of ['cut','keep'])for(const dither of ['none','2x2','4x4','8x8']){
  const options={metric,alphaMode,dither,ditherStrength:73}, expectedOptions={...options,strength:73,cut:128};
  const actual=quantize(source,hex,128,undefined,undefined,options);
  assert.deepEqual(await quantizeAsync(source,hex,128,undefined,undefined,{...options,chunkPixels:128}),actual);
  const rgba=Buffer.alloc(width*height*4);
  for(let p=0;p<width*height;p++){
   const index=actual.indices[p],alpha=data[p*4+3];
   assert.equal(index===256,alpha<(alphaMode==='keep'?1:128));
   if(index!==256){assert(index<size);rgba.set([...colors[index],alphaMode==='keep'?alpha:255],p*4);}
   if(p<96||p%41===0){assert.equal(index,oracle([...data.slice(p*4,p*4+4)],colors,expectedOptions,p%width,Math.floor(p/width)));report.oraclePixels++;}
  }
  const image={...actual,colors:hex};
  const sync=palettePngBytes(image),asyncBytes=await palettePngBytesAsync(image);
  assert.deepEqual(sync,asyncBytes);
  const decoded=await sharp(sync).ensureAlpha().raw().toBuffer();
  // Indexed PNG transparency retains its table RGB. Invisible RGB is unspecified.
  for(let p=0;p<width*height;p++)if(decoded[p*4+3]===0)decoded.fill(0,p*4,p*4+3);
  assert.deepEqual(decoded,rgba);report.pngRoundTrips++;
  const mw=11,mh=7,small=quantize(source,hex,128,mw,mh,options);
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
   const target=y*mw+x,p=Math.floor((y+.5)*height/mh)*width+Math.floor((x+.5)*width/mw);
   assert.equal(small.indices[target],actual.indices[p]);
   if(alphaMode==='keep')assert.equal(small.alpha[target],data[p*4+3]);
  }
  report.cases++;report.pixels+=width*height;
 }
 assert.equal(createHash('sha256').update(data).digest('hex'),before);report.sourceHashes.push(before);
}
// Keep GIF rejects a partial pixel both during preflight and if replay changes.
const base={w:1,h:1,colors:['#123456'],frameCount:2};
const frame=alpha=>({w:1,h:1,indices:Uint16Array.of(0),alpha:Uint8Array.of(alpha),delay:50});
await assert.rejects(encodePaletteGif({...base,getFrame:async()=>frame(127)}),e=>e.code==='PALETTE_GIF_ALPHA');report.gifRejectionChecks++;
let calls=0;
await assert.rejects(encodePaletteGif({...base,getFrame:async()=>frame(++calls>2?127:255)}),e=>e.code==='PALETTE_GIF_ALPHA');report.gifRejectionChecks++;
// An inconsistent zero alpha/color index must never silently become an opaque PNG.
assert.throws(()=>palettePngBytes({w:1,h:1,colors:['#123456'],indices:Uint16Array.of(0),alpha:Uint8Array.of(0)}),/alpha/);
await assert.rejects(palettePngBytesAsync({w:1,h:1,colors:['#123456'],indices:Uint16Array.of(256),alpha:Uint8Array.of(255)}),/alpha/);
report.elapsedMs=Math.round(performance.now()-start);
await writeFile(new URL('independent-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
