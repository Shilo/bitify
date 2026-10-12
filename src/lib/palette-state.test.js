import { describe, expect, it } from 'vitest';
import { restorePaletteState, conversionSnapshot, fullPaletteImage } from './palette-state.js';
import { FULL_PRESETS, DEFAULT_FULL_PALETTE } from './palette-library.js';
import omggif from 'omggif';
import { fileBytes } from './save.js';

describe('independent palette state and export snapshots', () => {
  it('restores only valid family, palette identity and opacity; legacy remains the default', () => {
    expect(restorePaletteState('{}')).toEqual({ family: 'two-color', paletteId: DEFAULT_FULL_PALETTE.id, alphaCut: 128, metric: 'oklab', maxColors: 0, lastMaxColors: 16 });
    expect(restorePaletteState('{')).toEqual(restorePaletteState(null));
    expect(restorePaletteState(JSON.stringify({ family:'full-palette',paletteId:'deleted',alphaCut:0 }))).toEqual({ family:'full-palette',paletteId:DEFAULT_FULL_PALETTE.id,alphaCut:128,metric:'oklab',maxColors:0,lastMaxColors:16 });
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
