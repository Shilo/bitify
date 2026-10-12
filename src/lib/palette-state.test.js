import { describe, expect, it } from 'vitest';
import { restorePaletteState, conversionSnapshot, fullPaletteImage } from './palette-state.js';
import { FULL_PRESETS, DEFAULT_FULL_PALETTE } from './palette-library.js';

describe('independent palette state and export snapshots', () => {
  it('restores only valid family, palette identity and opacity; legacy remains the default', () => {
    expect(restorePaletteState('{}')).toEqual({ family: 'two-color', paletteId: DEFAULT_FULL_PALETTE.id, alphaCut: 128, metric: 'oklab' });
    expect(restorePaletteState('{')).toEqual(restorePaletteState(null));
    expect(restorePaletteState(JSON.stringify({ family:'full-palette',paletteId:'deleted',alphaCut:0 }))).toEqual({ family:'full-palette',paletteId:DEFAULT_FULL_PALETTE.id,alphaCut:128,metric:'oklab' });
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
});
