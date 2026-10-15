import {describe,it,expect} from 'vitest';
import {normalizeAlphaMode,effectiveAlphaCut} from './palette-alpha.js';
import {quantize,quantizeAsync,quantizePreviewAsync,colorize} from './quantize.js';
import {conversionSnapshot,restorePaletteState,fullPaletteImage} from './palette-state.js';
import {createAnimationCache} from './palette-animation-cache.js';
import {prepareCleanupAsync,applyCleanupAsync} from './palette-cleanup.js';
import {FULL_PRESETS} from './palette-library.js';
import {captureGeneratedSources} from './palette-generated-sources.js';

const palette={name:'Target',colors:['#000000','#ffffff','#f04010','#3050a0']};
const source=(w=37,h=19)=>({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?[0,1,64,127,128,192,254,255][Math.floor(i/4)%8]:(Math.floor(i/4)*37+i%4*23)&255)});

describe('palette source opacity policy',()=>{
 it('normalizes and snapshots exact Keep, retaining Cut128 for fresh/malformed settings',()=>{
  for(const value of [undefined,null,'','KEEP','preserve',true,1,{}])expect(normalizeAlphaMode(value)).toBe('cut');
  expect(normalizeAlphaMode('keep')).toBe('keep');expect(effectiveAlphaCut('keep',192)).toBe(1);expect(effectiveAlphaCut('cut',192)).toBe(192);
  for(const alphaMode of ['cut','keep'])expect(restorePaletteState(JSON.stringify({alphaMode})).alphaMode).toBe(alphaMode);
  const ui={family:'full-palette',palette,alphaCut:192,alphaMode:'keep'},snapshot=conversionSnapshot(ui);ui.alphaMode='cut';ui.alphaCut=1;
  expect(snapshot).toMatchObject({alphaMode:'keep',alphaCut:192});expect(Object.isFrozen(snapshot)).toBe(true);
 });
 it.each(['none','2x2','4x4','8x8'])('%s copies source alpha from identical full/preview coordinates without compositing RGB',async dither=>{
  const original=source(),before=original.data.slice();
  for(const metric of ['oklab','rgb']){
   const options={alphaMode:'keep',metric,dither,ditherStrength:50};
   const full=quantize(original,palette.colors,192,undefined,undefined,options),small=await quantizePreviewAsync(original,palette.colors,192,11,7,options);
   expect(await quantizeAsync(original,palette.colors,192,undefined,undefined,options)).toEqual(full);
   for(let i=0;i<full.indices.length;i++){const alpha=original.data[i*4+3];expect(full.alpha[i]).toBe(alpha);expect(full.indices[i]===256).toBe(alpha===0);}
   const rgba=colorize(small,palette.colors);
   for(let y=0;y<7;y++)for(let x=0;x<11;x++){const i=y*11+x,p=Math.floor((y+.5)*19/7)*37+Math.floor((x+.5)*37/11);expect(small.alpha[i]).toBe(full.alpha[p]);expect(small.indices[i]).toBe(full.indices[p]);expect(rgba.data[i*4+3]).toBe(full.alpha[p]);}
   // Alpha does not affect color assignment for the same uncomposited source RGB.
   const flat={width:4,height:1,data:Uint8ClampedArray.of(240,64,16,1,240,64,16,64,240,64,16,128,240,64,16,255)};
   expect([...quantize(flat,palette.colors,192,undefined,undefined,options).indices]).toEqual([2,2,2,2]);
  }
  expect(original.data).toEqual(before);
 });
 it('Cut remains byte-identical and allocates no alpha buffer; partial alpha alone is not an empty pixel',()=>{
  const original=source();expect(quantize(original,palette.colors)).toEqual(quantize(original,palette.colors,128,undefined,undefined,{alphaMode:'cut'}));
  expect(quantize(original,palette.colors).alpha).toBeUndefined();
  const partial={width:1,height:1,data:Uint8ClampedArray.of(240,64,16,1)};
  expect(quantize(partial,palette.colors,255,undefined,undefined,{alphaMode:'keep'})).toMatchObject({hasTransparency:false,alpha:Uint8Array.of(1)});
 });
 it('Cleanup changes RGB labels while preserving Keep alpha and sampled coordinates',async()=>{
  const original={width:11,height:7,data:Uint8ClampedArray.from({length:11*7*4},(_,i)=>i%4===3?64:0)},colors=FULL_PRESETS.find(p=>p.id==='preset-pico8').colors,dot=3*11+4;
  original.data[3]=0;original.data.set([8,12,22,1],dot*4);
  expect(quantize(original,colors,128,undefined,undefined,{alphaMode:'keep'}).indices[dot]).toBe(1);
  const clean=await prepareCleanupAsync([original],colors,1);expect(clean.hasChanges).toBe(true);
  const full=await applyCleanupAsync(quantize(original,colors,128,undefined,undefined,{alphaMode:'keep',dither:'4x4'}),clean);
  const small=await applyCleanupAsync(quantize(original,colors,128,4,3,{alphaMode:'keep',dither:'4x4'}),clean);
  expect(full.indices[dot]).toBe(0);expect(full.alpha[dot]).toBe(1);expect(full.hasTransparency).toBe(true);expect(small.hasTransparency).toBe(false);
  for(let y=0;y<3;y++)for(let x=0;x<4;x++){const i=y*4+x,p=Math.floor((y+.5)*7/3)*11+Math.floor((x+.5)*11/4);expect(small.alpha[i]).toBe(original.data[p*4+3]);expect(small.indices[i]).toBe(full.indices[p]);}
 });
 it('generated Keep colors include low-alpha RGB without alpha-weighting their frequency',async()=>{
  const original={width:2,height:1,data:Uint8ClampedArray.of(240,64,16,1,48,80,160,255)},item={name:'f.png',original};
  const generated=captureGeneratedSources([item],1),asked=conversionSnapshot({family:'full-palette',palette:{name:'Auto',colors:[]},generated,alphaMode:'keep',alphaCut:128});
  const result=await fullPaletteImage(item,asked);expect(new Set(result.colors)).toEqual(new Set(['#f04010','#3050a0']));expect(result.alpha).toEqual(Uint8Array.of(1,255));
 });
 it('captured export mode includes low-alpha source RGB in subset preparation and cleanup',async()=>{
  const original={width:3,height:1,data:Uint8ClampedArray.of(240,64,16,1,48,80,160,64,0,0,0,255)};
  const asked=conversionSnapshot({family:'full-palette',palette,alphaMode:'keep',alphaCut:192,maxColors:2,cleanup:true,dither:'4x4'});
  const pending=fullPaletteImage({name:'f.png',original},asked);const result=await pending;
  expect(result.alpha).toEqual(Uint8Array.of(1,64,255));expect([...result.indices].every(i=>i<2)).toBe(true);expect(result.alphaMode).toBe('keep');
 });
 it('separates cache policy and reserves exactly one extra byte per Keep sample',async()=>{
  const a=source(2,1),args={sources:[a,a],palette,width:2,height:1,alphaCut:128,metric:'oklab'},cache=createAnimationCache(1044);
  const cut=cache.acquire(args),keep=cache.acquire({...args,alphaMode:'keep'});expect(cache.stats()).toEqual({bytes:1044,clips:2});
  const value=await keep.getFrame(0,()=>quantize(a,palette.colors,128,2,1,{alphaMode:'keep'}));expect(value.alpha.byteLength).toBe(2);
  await expect(keep.getFrame(1,()=>quantize(a,palette.colors))).rejects.toThrow('alpha policy');
  cut.release();keep.release();expect(cache.stats().bytes).toBe(0);
 });
 it('cancels queued Keep work before reading source bytes or allocating results',async()=>{
  let reads=0;const original={width:1,height:1,get data(){reads++;return Uint8ClampedArray.of(0,0,0,1);}},controller=new AbortController();
  const pending=quantizePreviewAsync(original,palette.colors,128,undefined,undefined,{alphaMode:'keep',signal:controller.signal});controller.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(reads).toBe(0);
 });
});
