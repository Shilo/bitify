import { describe, expect, it, vi } from 'vitest';
import { restorePaletteState, conversionSnapshot, fullPaletteImage } from './palette-state.js';
import { FULL_PRESETS, DEFAULT_FULL_PALETTE } from './palette-library.js';
import omggif from 'omggif';
import { fileBytes } from './save.js';
import { quantize } from './quantize.js';
import { prepareCleanupAsync, applyCleanup } from './palette-cleanup.js';
import { captureGeneratedSources } from './palette-generated-sources.js';

describe('independent palette state and export snapshots', () => {
  it('cancels a hover subscriber without canceling an independent generated export', async () => {
    const original = { width: 1, height: 1, data: Uint8ClampedArray.of(0, 0, 0, 255) };
    const item = { name: 'test.gif', original, frames: [{ original, delay: 100 }, { original, delay: 100 }] };
    const asked = { colors: [], generated: captureGeneratedSources([item]), metric: 'rgb', alphaCut: 128, maxColors: 0, cleanup: true };
    const controller = new AbortController();
    const hover = fullPaletteImage(item, asked, { signal: controller.signal });
    const saved = fullPaletteImage(item, asked);
    controller.abort();
    await expect(hover).rejects.toMatchObject({ name: 'AbortError' });
    const result = await saved;
    expect([...(await result.getFrame(1)).indices]).toEqual([0]);
    const replayController = new AbortController();
    const replay = await fullPaletteImage(item, asked, { signal: replayController.signal });
    replayController.abort();
    await expect(replay.getFrame(0)).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('restores the generated source identity without persisting generated colors', () => {
    expect(restorePaletteState(JSON.stringify({family:'full-palette',paletteId:'generated-32'})).paletteId).toBe('generated-32');
  });
  it('captures whole-wall generation and deferred limiter/cleanup sources before yielding', async () => {
    const black={width:1,height:1,data:Uint8ClampedArray.of(0,0,0,255)},white={width:1,height:1,data:Uint8ClampedArray.of(255,255,255,255)};
    const red={width:1,height:1,data:Uint8ClampedArray.of(255,0,0,255)};
    for(const metric of ['rgb','oklab']) for(const cleanup of [false,true]) {
      const item={name:'before.gif',original:black,frames:[{original:black,delay:40},{original:white,delay:90}],loop:3};
      const assets=[item,...[red,{width:1,height:1,data:Uint8ClampedArray.of(0,255,0,255)}].map(original=>({original}))];
      const generated=captureGeneratedSources(assets),asked={colors:[],generated,alphaCut:128,maxColors:2,metric,cleanup};
      const promise=fullPaletteImage(item,asked);
      asked.generated=captureGeneratedSources([{original:red}]); item.original=red;item.frames=[{original:red,delay:10}];item.name='after.gif';item.loop=7;
      const result=await promise;
      expect(result).toMatchObject({name:'before.gif',loop:3,frameCount:2,metric,cleanup});
      expect(result.colors).toHaveLength(2);expect(result.colors).toContain('#000000');expect(result.colors).toContain('#ffffff');
      expect((await result.getFrame(0)).delay).toBe(40);expect((await result.getFrame(1)).delay).toBe(90);
      expect((await result.getFrame(0)).indices[0]).not.toBe((await result.getFrame(1)).indices[0]);
    }
  });
  it('rejects an empty generated source explicitly instead of inventing a fallback color', async () => {
    const original={width:1,height:1,data:Uint8ClampedArray.of(1,2,3,0)};
    await expect(fullPaletteImage({original,name:'empty.png'},{colors:[],generated:captureGeneratedSources([{original}]),metric:'oklab',alphaCut:128,maxColors:0})).rejects.toThrow('No visible colors');
  });
  const pico = FULL_PRESETS.find(p => p.id === 'preset-pico8');
  const cleanupSource = (middle = '#053452') => {
    const colors = Array(25).fill('#07050c'); colors[12] = middle;
    return { width: 5, height: 5, data: Uint8ClampedArray.from(colors.flatMap(hex => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255])) };
  };
  it('restores cleanup only for the explicit boolean and owns it separately from legacy', () => {
    expect(restorePaletteState(JSON.stringify({cleanup:true})).cleanup).toBe(true);
    for(const cleanup of [false,null,0,1,'true',[],{}]) expect(restorePaletteState(JSON.stringify({cleanup})).cleanup).toBe(false);
    const ui={family:'full-palette',palette:DEFAULT_FULL_PALETTE,alphaCut:128,cleanup:true};
    const asked=conversionSnapshot(ui); ui.cleanup=false;
    expect(asked.cleanup).toBe(true); expect(Object.isFrozen(asked)).toBe(true);
    expect(conversionSnapshot({family:'two-color',set:{},cleanup:true})).not.toHaveProperty('cleanup');
  });
  it('Off preserves every nearest result and never constructs a cleanup worker', async () => {
    const worker = vi.fn(); vi.stubGlobal('Worker',worker);
    try {
      const original=cleanupSource(), item={name:'eye.png',original};
      for(const metric of ['oklab','rgb']) {
        const asked=conversionSnapshot({family:'full-palette',palette:DEFAULT_FULL_PALETTE,alphaCut:128,metric,cleanup:false});
        const result=await fullPaletteImage(item,asked);
        expect(result.indices).toEqual(quantize(original,asked.colors,128,undefined,undefined,{metric}).indices);
      }
      expect(worker).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it('uses full-resolution cleanup with the selected subset and unchanged alpha', async () => {
    const original=cleanupSource(); original.data[3]=0;
    const item={name:'eye.png',original};
    for(const maxColors of [0,2,8]) for(const metric of ['oklab','rgb']) {
      const asked=conversionSnapshot({family:'full-palette',palette:DEFAULT_FULL_PALETTE,alphaCut:128,metric,maxColors,cleanup:true});
      const result=await fullPaletteImage(item,asked);
      const baseline=quantize(original,result.colors,128,undefined,undefined,{metric});
      const expected=applyCleanup(baseline,await prepareCleanupAsync([original],result.colors,128,metric));
      expect(result.indices).toEqual(expected.indices); expect(result.used).toEqual(expected.used);
      expect(result.indices[0]).toBe(256); expect(result.hasTransparency).toBe(true);
      expect([...result.used].reduce((n,v)=>n+v,0)).toBeLessThanOrEqual(maxColors||DEFAULT_FULL_PALETTE.colors.length);
    }
  });
  it('first-frame Copy shares the whole-animation guard and GIF retains source delays and loop', async () => {
    const first=cleanupSource(), second=cleanupSource('#07050c');
    const item={name:'guard.gif',original:first,frames:[{original:first,delay:40},{original:second,delay:90}],loop:3};
    const asked=conversionSnapshot({family:'full-palette',palette:pico,alphaCut:128,cleanup:true});
    const exported=await fullPaletteImage(item,asked), copy=await fullPaletteImage(item,asked,{still:true});
    expect(copy.indices[12]).toBe(1); expect((await exported.getFrame(0)).indices[12]).toBe(1); expect((await exported.getFrame(1)).indices[12]).toBe(0);
    expect(copy.indices).toEqual((await exported.getFrame(0)).indices);
    const bytes=await fileBytes(exported), reader=new omggif.GifReader(bytes);
    expect(reader.numFrames()).toBe(2); expect(reader.loopCount()).toBe(3);
    for(let i=0;i<2;i++) {
      const rgba=new Uint8Array(100); reader.decodeAndBlitFrameRGBA(i,rgba);
      expect([...rgba.slice(48,52)]).toEqual(i===0?[29,43,83,255]:[0,0,0,255]);
      expect(reader.frameInfo(i).delay*10).toBe(item.frames[i].delay);
    }
  });
  it('captures cleanup and every source reference before asynchronous preparation', async () => {
    const first=cleanupSource(), second=cleanupSource('#07050c'), item={name:'before.gif',original:first,frames:[{original:first,delay:40},{original:second,delay:90}],loop:3};
    const asked={colors:[...pico.colors],alphaCut:128,metric:'oklab',maxColors:0,cleanup:true};
    const pending=fullPaletteImage(item,asked);
    asked.cleanup=false; asked.colors.reverse(); item.original=second; item.frames[1]={original:first,delay:10}; item.name='after.gif'; item.loop=7;
    const result=await pending;
    expect(result).toMatchObject({name:'before.gif',cleanup:true,loop:3});
    expect((await result.getFrame(0)).indices[12]).toBe(1); expect((await result.getFrame(1)).indices[12]).toBe(0); expect((await result.getFrame(1)).delay).toBe(90);
  });
  it('starts fresh visits in Generated while retaining legacy and explicit saved choices', () => {
    const fresh = { family: 'full-palette', paletteId: 'generated-32', alphaCut: 128, metric: 'oklab', maxColors: 0, lastMaxColors: 16, cleanup: false };
    for (const text of [null, undefined, '', '{', 'null', '[]', 'true', '3', '"invalid"']) expect(restorePaletteState(text)).toEqual(fresh);
    expect(restorePaletteState('{}')).toEqual({ family: 'two-color', paletteId: DEFAULT_FULL_PALETTE.id, alphaCut: 128, metric: 'oklab', maxColors: 0, lastMaxColors: 16, cleanup: false });
    expect(restorePaletteState(JSON.stringify({ first:'#222323', second:'#f0f6f0', style:'lines' }))).toMatchObject({ family:'two-color', paletteId:DEFAULT_FULL_PALETTE.id });
    expect(restorePaletteState(JSON.stringify({ family:'two-color', paletteId:'preset-pico8', metric:'rgb', maxColors:8, cleanup:true }))).toMatchObject({ family:'two-color', paletteId:'preset-pico8', metric:'rgb', maxColors:8, cleanup:true });
    expect(restorePaletteState(JSON.stringify({ family:'full-palette',paletteId:'deleted',alphaCut:0 }))).toEqual({ family:'full-palette',paletteId:DEFAULT_FULL_PALETTE.id,alphaCut:128,metric:'oklab',maxColors:0,lastMaxColors:16,cleanup:false });
    expect(restorePaletteState(JSON.stringify({family:'full-palette',paletteId:'user-a',alphaCut:1}),[{id:'user-a'}]).paletteId).toBe('user-a');
    for (const palette of FULL_PRESETS) expect(restorePaletteState(JSON.stringify({family:'full-palette',paletteId:palette.id})).paletteId).toBe(palette.id);
  });
  it('restores explicit valid matching choices and defaults absent or malformed metadata to Oklab', () => {
    for (const metric of ['oklab', 'rgb']) expect(restorePaletteState(JSON.stringify({ metric })).metric).toBe(metric);
    for (const metric of [null, '', 'RGB', 'linear-rgb', 'lab', 1, {}, []]) expect(restorePaletteState(JSON.stringify({ family: 'full-palette', metric })).metric).toBe('oklab');
    for (const text of [null, '{', '{}', '[]', 'true', '42']) expect(restorePaletteState(text).metric).toBe('oklab');
  });
  it('owns ordered colors and settings rather than live palette/library state', async () => {
    const palette={name:'Saved',colors:['#ff0000','#00ff00']};
    const asked=conversionSnapshot({family:'full-palette',palette,alphaCut:128});
    palette.colors.reverse(); palette.name='Changed';
    const original={width:2,height:1,data:Uint8ClampedArray.of(255,0,0,255,0,255,0,0)};
    const image=await fullPaletteImage({name:'fixture.png',original},asked);
    expect(image.colors).toEqual(['#ff0000','#00ff00']); expect([...image.indices]).toEqual([0,256]);
    expect(asked.name).toBe('Saved');
    expect(asked.metric).toBe('oklab'); expect(image.metric).toBe('oklab');
    const set={alpha:128}; const legacy=conversionSnapshot({family:'two-color',first:'#000000',second:null,style:'solid',set});set.alpha=255;
    expect(legacy.set.alpha).toBe(128);expect(legacy.second).toBe(null);
  });
  it('replays animation frames without retaining converted frames, preserving delay and loop', async () => {
    const first={width:1,height:1,data:Uint8ClampedArray.of(0,0,0,255)},second={width:1,height:1,data:Uint8ClampedArray.of(255,255,255,255)};
    const item={name:'a.gif',original:first,frames:[{original:first,delay:40},{original:second,delay:80}],loop:3};
    const asked=conversionSnapshot({family:'full-palette',palette:{name:'Mono',colors:['#000000','#ffffff']},alphaCut:128});
    const image=await fullPaletteImage(item,asked); expect(image.frameCount).toBe(2);expect(image.loop).toBe(3);
    expect([...((await image.getFrame(1)).indices)]).toEqual([1]);expect((await image.getFrame(0)).delay).toBe(40);
    expect((await fullPaletteImage(item,asked,{still:true})).indices.length).toBe(1);
  });
  it('captures the selected metric for immutable still and every deferred animation export', async () => {
    const original={width:2,height:1,data:Uint8ClampedArray.of(100,100,100,255,255,255,255,0)};
    const item={name:'metric.gif',original,frames:[{original,delay:40},{original,delay:80}],loop:3};
    const ui={family:'full-palette',palette:{name:'Mono',colors:['#000000','#ffffff']},alphaCut:128,metric:'rgb'};
    const asked=conversionSnapshot(ui); ui.metric='oklab'; ui.palette.colors.reverse();
    expect(Object.isFrozen(asked)).toBe(true); expect(() => { asked.metric='oklab'; }).toThrow();
    const animation=await fullPaletteImage(item,asked); expect(animation.metric).toBe('rgb'); expect(animation.loop).toBe(3);
    expect([...(await animation.getFrame(0)).indices]).toEqual([0,256]); expect([...(await animation.getFrame(1)).indices]).toEqual([0,256]);
    expect((await animation.getFrame(0)).delay).toBe(40); expect((await animation.getFrame(1)).delay).toBe(80);
    const still=await fullPaletteImage(item,asked,{still:true}); expect(still.metric).toBe('rgb'); expect([...still.indices]).toEqual([0,256]);
    const perceptual=await fullPaletteImage(item,conversionSnapshot({family:'full-palette',palette:{name:'Mono',colors:['#000000','#ffffff']},alphaCut:128,metric:'oklab'}),{still:true});
    expect([...perceptual.indices]).toEqual([1,256]);
  });
  it('owns scalar metric and alpha values before deferred frames even for a mutable caller', async () => {
    const original={width:1,height:1,data:Uint8ClampedArray.of(100,100,100,128)},asked={colors:['#000000','#ffffff'],alphaCut:128,metric:'rgb'};
    const image=await fullPaletteImage({name:'a.gif',original,frames:[{original,delay:80}],loop:0},asked);
    asked.metric='oklab'; asked.alphaCut=255; asked.colors.reverse();
    expect(image.colors).toEqual(['#000000','#ffffff']); expect(image.metric).toBe('rgb'); expect([...(await image.getFrame(0)).indices]).toEqual([0]);
  });
  it('rejects invalid metric snapshots rather than silently exporting a different match', async () => {
    expect(() => conversionSnapshot({family:'full-palette',palette:{name:'Mono',colors:['#000000']},alphaCut:128,metric:'invalid'})).toThrow('Matching metric');
    const original={width:1,height:1,data:Uint8ClampedArray.of(0,0,0,255)};
    await expect(fullPaletteImage({name:'a.png',original},{colors:['#000000'],alphaCut:128,metric:'invalid'})).rejects.toThrow('Matching metric');
  });
  it('restores a global cap and remembered nonzero cap independently of the family', () => {
    for (const family of ['two-color', 'full-palette']) {
      for (const maxColors of [0, 2, 16, 256]) expect(restorePaletteState(JSON.stringify({family,maxColors,lastMaxColors:7}))).toMatchObject({family,maxColors,lastMaxColors:7});
      for (const value of [-1,257,1.5,'16',null,{},[]]) expect(restorePaletteState(JSON.stringify({family,maxColors:value,lastMaxColors:value}))).toMatchObject({maxColors:0,lastMaxColors:16});
      expect(restorePaletteState(JSON.stringify({family,maxColors:16,lastMaxColors:0}))).toMatchObject({maxColors:16,lastMaxColors:16});
    }
    expect(restorePaletteState(JSON.stringify({maxColors:0,lastMaxColors:256})).lastMaxColors).toBe(256);
  });
  it('raises previous one-color preferences to two without changing All or palette identity', () => {
    const library = [{id:'one',colors:['#123456']}];
    for (const family of ['two-color','full-palette']) {
      expect(restorePaletteState(JSON.stringify({family,paletteId:'one',maxColors:1,lastMaxColors:1}),library))
        .toMatchObject({family,paletteId:'one',maxColors:2,lastMaxColors:2});
      expect(restorePaletteState(JSON.stringify({family,maxColors:0,lastMaxColors:1})))
        .toMatchObject({maxColors:0,lastMaxColors:2});
    }
  });
  it('owns a validated cap at the export gesture without adding it to legacy settings', () => {
    const ui={family:'full-palette',palette:{name:'Mono',colors:['#000000','#ffffff']},metric:'rgb',alphaCut:128,maxColors:1};
    const asked=conversionSnapshot(ui); ui.maxColors=0;
    expect(asked.maxColors).toBe(1); expect(() => { asked.maxColors=2; }).toThrow();
    for(const maxColors of [-1,257,1.5,'1',null]) expect(()=>conversionSnapshot({...ui,maxColors})).toThrow('Max colors');
    expect(conversionSnapshot({family:'two-color',set:{},maxColors:-10})).not.toHaveProperty('maxColors');
  });
  it('selects from the full source and keeps output indices aligned to the subset', async () => {
    const original={width:5,height:1,data:Uint8ClampedArray.of(255,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255,255,255,255,0)};
    const colors=['#ff0000','#000000','#ffffff'];
    const item={name:'full-source.png',original};
    const asked=conversionSnapshot({family:'full-palette',palette:{name:'Source',colors},metric:'rgb',alphaCut:128,maxColors:1});
    const result=await fullPaletteImage(item,asked);
    expect(result.colors).toEqual(['#000000']); expect([...result.indices]).toEqual([0,0,0,0,256]);
    for(const maxColors of [0,3,256]) {
      const all=await fullPaletteImage(item,{...asked,maxColors});
      expect(all.colors).toEqual(colors); expect([...all.indices]).toEqual([0,1,1,1,256]);
    }
    expect([...original.data]).toEqual([255,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255,255,255,255,0]);
  });
  it('uses one duration-weighted full-animation subset for Save and first-frame Copy', async () => {
    const black={width:2,height:1,data:Uint8ClampedArray.of(0,0,0,255,0,0,0,0)};
    const white={width:2,height:1,data:Uint8ClampedArray.of(255,255,255,255,255,255,255,0)};
    const makeItem=split=>({name:'weighted.gif',original:black,frames:split
      ? [{original:black,delay:10},{original:white,delay:50},{original:white,delay:50}]
      : [{original:black,delay:10},{original:white,delay:100}],loop:2});
    const asked=conversionSnapshot({family:'full-palette',palette:{name:'Mono',colors:['#000000','#ffffff']},metric:'rgb',alphaCut:128,maxColors:1});
    for(const item of [makeItem(false),makeItem(true)]) {
      const animation=await fullPaletteImage(item,asked),copy=await fullPaletteImage(item,asked,{still:true});
      expect(animation.colors).toEqual(['#ffffff']); expect(copy.colors).toEqual(animation.colors);
      expect(animation.loop).toBe(2); expect([...copy.indices]).toEqual([0,256]);
      for(let i=0;i<item.frames.length;i++) {
        const frame=await animation.getFrame(i); expect([...frame.indices]).toEqual([0,256]); expect(frame.delay).toBe(item.frames[i].delay);
      }
    }
  });
  it('captures preferences and deferred source references before subset preparation awaits', async () => {
    const black={width:1,height:1,data:Uint8ClampedArray.of(0,0,0,255)},white={width:1,height:1,data:Uint8ClampedArray.of(255,255,255,128)};
    const item={name:'before.gif',original:black,frames:[{original:black,delay:10},{original:white,delay:100}],loop:4};
    const asked={colors:['#000000','#ffffff'],alphaCut:128,metric:'rgb',maxColors:1};
    const promise=fullPaletteImage(item,asked);
    asked.metric='oklab'; asked.alphaCut=255; asked.maxColors=0; asked.colors.reverse();
    item.name='after.gif'; item.loop=7; item.original=white; item.frames[1]={original:black,delay:500};
    const animation=await promise;
    expect(animation).toMatchObject({name:'before.gif',metric:'rgb',maxColors:1,loop:4,frameCount:2,colors:['#ffffff']});
    expect([...(await animation.getFrame(1)).indices]).toEqual([0]); expect((await animation.getFrame(1)).delay).toBe(100);
  });
  it('keeps an all-transparent source exportable and rejects invalid caller caps', async () => {
    const original={width:1,height:1,data:Uint8ClampedArray.of(10,20,30,0)},item={name:'empty.png',original};
    const asked={colors:['#ffffff','#000000'],alphaCut:128,metric:'rgb',maxColors:1};
    const image=await fullPaletteImage(item,asked);
    expect(image.colors).toHaveLength(1); expect(asked.colors).toContain(image.colors[0]); expect([...image.indices]).toEqual([256]);
    await expect(fullPaletteImage(item,{...asked,maxColors:257})).rejects.toThrow('Max colors');
  });
  it('encodes a limited GIF with the selected shared RGB and unchanged source timing', async () => {
    const black={width:2,height:1,data:Uint8ClampedArray.of(0,0,0,255,0,0,0,0)};
    const white={width:2,height:1,data:Uint8ClampedArray.of(255,255,255,255,255,255,255,0)};
    const item={name:'limited.gif',original:black,frames:[{original:black,delay:40},{original:white,delay:100}],loop:3};
    const asked=conversionSnapshot({family:'full-palette',palette:{name:'Mono',colors:['#000000','#ffffff']},metric:'rgb',alphaCut:128,maxColors:1});
    const bytes=await fileBytes(await fullPaletteImage(item,asked));
    const reader=new omggif.GifReader(bytes);
    expect(reader.numFrames()).toBe(2); expect(reader.loopCount()).toBe(3);
    for(let i=0;i<2;i++) {
      const rgba=new Uint8Array(8); reader.decodeAndBlitFrameRGBA(i,rgba);
      expect([...rgba]).toEqual([255,255,255,255,0,0,0,0]);
      expect(reader.frameInfo(i).delay*10).toBe(item.frames[i].delay);
    }
  });
});
