import { describe, expect, it } from 'vitest';
import { restorePaletteState, conversionSnapshot, fullPaletteImage } from './palette-state.js';
import { FULL_PRESETS } from './palette-library.js';

describe('independent palette state and export snapshots', () => {
  it('restores only valid family, palette identity and opacity; legacy remains the default', () => {
    expect(restorePaletteState('{}')).toEqual({ family: 'two-color', paletteId: FULL_PRESETS[0].id, alphaCut: 128 });
    expect(restorePaletteState('{')).toEqual(restorePaletteState(null));
    expect(restorePaletteState(JSON.stringify({ family:'full-palette',paletteId:'deleted',alphaCut:0 }))).toEqual({ family:'full-palette',paletteId:FULL_PRESETS[0].id,alphaCut:128 });
    expect(restorePaletteState(JSON.stringify({family:'full-palette',paletteId:'user-a',alphaCut:1}),[{id:'user-a'}]).paletteId).toBe('user-a');
  });
  it('owns ordered colors and settings rather than live palette/library state', async () => {
    const palette={name:'Saved',colors:['#ff0000','#00ff00']};
    const asked=conversionSnapshot({family:'full-palette',palette,alphaCut:128});
    palette.colors.reverse(); palette.name='Changed';
    const original={width:2,height:1,data:Uint8ClampedArray.of(255,0,0,255,0,255,0,0)};
    const image=await fullPaletteImage({name:'fixture.png',original},asked);
    expect(image.colors).toEqual(['#ff0000','#00ff00']); expect([...image.indices]).toEqual([0,256]);
    expect(asked.name).toBe('Saved');
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
});
