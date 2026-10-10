import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze, mask, iconOf, colorize } from './bitify.js';

// The user's unmodified 16px AI source art: palette indices compress the fixture only;
// no quantization or grayscale preprocessing was performed.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/ai-inventory.json', import.meta.url)));
const decode = f => ({ width: f.w, height: f.h, data: Uint8ClampedArray.from([...Buffer.from(f.indices, 'base64')].flatMap(i => f.palette[i])) });
const sources = fixtures.map(decode);
const stressCases = JSON.parse(readFileSync(new URL('./fixtures/icon-opening-stress.json', import.meta.url)));
const image = (rows, palette, source = 'luma', cut = 128) => {
  const w = rows[0].length, h = rows.length, data = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) => [...row].forEach((v, x) => { if (palette[v]) data.set(palette[v], (y * w + x) * 4); }));
  return analyze({ width: w, height: h, data }, source, cut);
};
const light = [200, 200, 200, 255], dark = [60, 60, 60, 255];
const components = (m, w, h, value = 2) => {
  const seen = new Set(); let total = 0;
  for (let start = 0; start < m.length; start++) {
    if (m[start] !== value || seen.has(start)) continue;
    total++; const queue = [start]; seen.add(start);
    for (const p of queue) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = p % w + dx, y = Math.floor(p / w) + dy, q = y * w + x;
      if (x >= 0 && y >= 0 && x < w && y < h && m[q] === value && !seen.has(q)) { seen.add(q); queue.push(q); }
    }
  }
  return total;
};

describe('Icon structure', () => {
  it('keeps flat dark objects, thin shafts, source openings and isolated marks', () => {
    const img = image([' aaaa  a ', ' a  a    ', ' aaaa    ', '   a     ', '   a     '], { a: [15, 15, 15, 255] });
    for (const border of ['auto', 'keep', 'trim']) {
      const m = mask(img, 'icon', { border, detail: 100 });
      expect(m[7]).toBe(2);
      expect(m[3 * img.w + 3]).toBe(2);
      expect(m[4 * img.w + 3]).toBe(2);
      expect(m[1 * img.w + 2]).toBe(0);
      expect(components(m, img.w, img.h)).toBe(2);
    }
  });

  it('infers a near-black drawn border without treating a colored dark body as background', () => {
    const img = image(['kkkkkkk', 'kbbbbbk', 'kbbbbbk', 'kbbbbbk', 'kkkkkkk'], { k: [0, 0, 0, 255], b: [80, 35, 10, 255] });
    const auto = mask(img, 'icon', { detail: 0 }), keep = mask(img, 'icon', { detail: 0, border: 'keep' });
    expect(keep.every(v => v === 2)).toBe(true);
    expect(auto.filter(v => v === 1).length).toBeGreaterThan(0);
    for (let y = 1; y < 4; y++) for (let x = 1; x < 6; x++) expect(auto[y * 7 + x]).toBe(2);
    expect(components(auto, 7, 5)).toBe(1);
  });

  it('does not cut a smooth shading ramp or a single dark dot', () => {
    const ramp = image(Array(5).fill('abcde'), { a: [50, 25, 0, 255], b: [80, 40, 0, 255], c: [110, 55, 0, 255], d: [140, 70, 0, 255], e: [170, 85, 0, 255] });
    const dot = image(['aaaaa', 'aaaaa', 'aabaa', 'aaaaa', 'aaaaa'], { a: light, b: dark });
    for (const img of [ramp, dot]) expect(mask(img, 'icon', { detail: 100, border: 'keep' }).every(v => v === 2)).toBe(true);
  });

  it('rejects checker texture but cuts a supported short valley together', () => {
    const checker = image(['aaaaaaa', 'abababa', 'aababaa', 'abababa', 'aababaa', 'abababa', 'aaaaaaa'], { a: light, b: dark });
    expect(mask(checker, 'icon', { border: 'keep', detail: 100 }).every(v => v === 2)).toBe(true);
    const crease = image(['aaaaaaa', 'aaaaaaa', 'aabbbaa', 'aaaaaaa', 'aaaaaaa'], { a: light, b: dark });
    expect(mask(crease, 'icon', { detail: 0 }).every(v => v === 2)).toBe(true);
    const m = mask(crease, 'icon', { detail: 100 });
    expect([...m.slice(16, 19)]).toEqual([1, 1, 1]);
    expect(components(m, 7, 5)).toBe(1);
    for (let detail = 0; detail <= 100; detail++) {
      const cut = [...mask(crease, 'icon', { detail }).slice(16, 19)];
      expect(cut.every(v => v === cut[0])).toBe(true);
    }
  });

  it('finds an equal-brightness chromatic seam that grayscale removes', () => {
    const rows = Array(7).fill('aaabbbb');
    const color = image(rows, { a: [255, 0, 0, 255], b: [0, 0, 255, 255] }, 'green');
    const grey = image(rows, { a: [0, 0, 0, 255], b: [0, 0, 0, 255] }, 'green');
    expect(mask(color, 'icon', { detail: 100, border: 'keep' }).includes(1)).toBe(true);
    expect(mask(grey, 'icon', { detail: 100, border: 'keep' }).includes(1)).toBe(false);
  });

  it('respects alpha and caches outline modes independently', () => {
    const img = image(['ab'], { a: [50, 50, 50, 127], b: [50, 50, 50, 128] });
    expect([...mask(img, 'icon')]).toEqual([0, 2]);
    expect([...mask(image(['ab'], { a: [50, 50, 50, 127], b: [50, 50, 50, 128] }, 'luma', 60), 'icon')]).toEqual([2, 2]);
    expect(iconOf(img)).toBe(iconOf(img));
    expect(iconOf(img, 'keep')).not.toBe(iconOf(img));
    expect(mask(image(['  '], {}), 'icon').every(v => v === 0)).toBe(true);
  });
});

describe('all 65 supplied AI inventory items', () => {
  it('has monotonic Detail, never adds opaque support, and keeps each source component connected and nonempty', () => {
    expect(sources).toHaveLength(65);
    for (const [i, src] of sources.entries()) for (const border of ['auto', 'keep', 'trim']) {
      const img = analyze(src), base = mask(img, 'icon', { detail: 0, border }), n = base.filter(v => v === 2).length;
      const source = Uint8Array.from({ length: src.width * src.height }, (_, p) => src.data[p * 4 + 3] >= 128 ? 2 : 0);
      const expectedComponents = components(source, img.w, img.h);
      let previous = base;
      for (let detail = 0; detail <= 100; detail++) {
        const m = mask(img, 'icon', { detail, border });
        if (m.some((v, p) => (!source[p] && v !== 0) || (previous[p] === 1 && v === 2))) throw new Error(`${fixtures[i].id}: support/monotonicity at ${border}/${detail}`);
        if (!m.includes(2) || components(m, img.w, img.h) !== expectedComponents) throw new Error(`${fixtures[i].id}: area/connectivity at ${border}/${detail}`);
        if (border === 'trim' && m.filter(v => v === 2).length < Math.ceil(n * 0.75)) throw new Error(`${fixtures[i].id}: trim groove budget at ${detail}`);
        previous = m;
      }
    }
  });

  it('keeps the three helmet face openings and breastplate neck connected to outside transparency', () => {
    // Source-informed examples pin meaningful geometry, not a recognition score.
    const openings = [
      ['breastplate-1-1', [[6,3],[7,3],[8,3],[9,3]]],
      ['armor-1-1', [[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[6,10],[7,10],[8,10],[9,10],[7,11],[8,11],[7,12],[8,12]]],
      ['armor-1-2', [[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11]]],
      ['armor-1-3', [[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10]]],
    ];
    for (const [id, pixels] of openings) {
      const img = analyze(sources[fixtures.findIndex(f => f.id === id)]), m = mask(img, 'icon');
      const outside = new Set(), queue = [];
      for (let p = 0; p < m.length; p++) if (m[p] !== 2 && (p < img.w || p >= m.length - img.w || p % img.w === 0 || p % img.w === img.w - 1)) { outside.add(p); queue.push(p); }
      for (const p of queue) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const x = p % img.w + dx, y = Math.floor(p / img.w) + dy, q = y * img.w + x;
        if (x >= 0 && y >= 0 && x < img.w && y < img.h && m[q] !== 2 && !outside.has(q)) { outside.add(q); queue.push(q); }
      }
      for (const [x,y] of pixels) { expect(m[y * img.w + x], id).toBe(1); expect(outside.has(y * img.w + x), `${id}: ${x},${y}`).toBe(true); }
    }
  });

  it('has no isolated cuts, protects interior three-wide cores, and gives identical results under reflection and quarter turns', () => {
    for (const [i, src] of sources.entries()) for (const border of ['auto','keep']) {
      const img = analyze(src);
      for (const detail of [0,25,50,75,100]) {
        const m = mask(img, 'icon', {border,detail}), ink = Uint8Array.from(m, (_,p) => src.data[p*4+3] >= 128);
        const rim = ink.map((v,p) => v && (p % img.w === 0 || p % img.w === img.w-1 || p < img.w || p >= m.length-img.w || !ink[p-1] || !ink[p+1] || !ink[p-img.w] || !ink[p+img.w]));
        for (let p = 0; p < m.length; p++) if (m[p] === 1) {
          let cuts = 0;
          for (let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
            const x=p%img.w+dx,y=Math.floor(p/img.w)+dy;
            if ((dx||dy) && x>=0 && y>=0 && x<img.w && y<img.h && m[y*img.w+x]===1) cuts++;
          }
          const context = `${fixtures[i].id}: ${border}/detail=${detail}, pixel ${p}`;
          assert.ok(cuts > 0, `${context}: isolated cut`);
          if (!rim[p]) assert.ok(!((rim[p-1]&&rim[p+1])||(rim[p-img.w]&&rim[p+img.w])), `${context}: interior core cut`);
        }
        for (const turn of [false,true]) {
          const data = new Uint8ClampedArray(src.data.length), positions = [];
          for(let y=0;y<img.h;y++) for(let x=0;x<img.w;x++) {
            const q = turn ? x*img.w+img.w-1-y : y*img.w+img.w-1-x, p=y*img.w+x;
            positions[p]=q;data.set(src.data.subarray(p*4,p*4+4),q*4);
          }
          const other=mask(analyze({...src,data}),'icon',{border,detail});
          assert.deepEqual(positions.map(p=>other[p]), [...m], `${fixtures[i].id}: ${border}/detail=${detail}, ${turn ? 'quarter turn' : 'reflection'}`);
        }
      }
    }
  });

  it('has exact preview sampling and exports only the chosen ink plus binary transparency', () => {
    for (const [i, src] of sources.entries()) {
      const img = analyze(src), full = mask(img, 'icon');
      for (const [w, h] of [[7, 9], [1, 1], [16, 16]]) {
        const sampled = mask(img, 'icon', {}, w, h);
        const expected = Array.from({ length: w * h }, (_, p) => full[Math.floor((Math.floor(p / w) + 0.5) * img.h / h) * img.w + Math.floor((p % w + 0.5) * img.w / w)]);
        assert.deepEqual([...sampled], expected, `${fixtures[i].id}: preview ${w}x${h}`);
      }
      const px = colorize(full, null, '#12ab34');
      for (let p = 0; p < full.length; p++) assert.deepEqual([...px.slice(p * 4, p * 4 + 4)], full[p] === 2 ? [18, 171, 52, 255] : [0, 0, 0, 0], `${fixtures[i].id}: exported pixel ${p}`);
    }
  });

  it('judges a sheet component the same as the isolated item', () => {
    const data = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < 16; i++) for (let y = 0; y < 16; y++) {
      const src = sources[i + 1], at = ((Math.floor(i / 4) * 16 + y) * 64 + (i % 4) * 16) * 4;
      data.set(src.data.slice(y * 64, y * 64 + 64), at);
    }
    const sheet = mask(analyze({ width: 64, height: 64, data }), 'icon');
    for (let i = 0; i < 16; i++) {
      const item = mask(analyze(sources[i + 1]), 'icon');
      for (let y = 0; y < 16; y++) expect([...sheet.slice((Math.floor(i / 4) * 16 + y) * 64 + (i % 4) * 16, (Math.floor(i / 4) * 16 + y) * 64 + (i % 4) * 16 + 16)]).toEqual([...item.slice(y * 16, y * 16 + 16)]);
    }
  });
});

describe('Icon opening safeguards', () => {
  it('does not leave interior specks after refusing an opening, at any Detail setting', () => {
    for (const c of stressCases) {
      const img=analyze({width:16,height:16,data:Uint8ClampedArray.from(Buffer.from(c.rgba,'base64'))});
      for(const border of ['auto','keep']) for(let detail=0;detail<=100;detail++) {
        const m=mask(img,'icon',{border,detail});
        assert.equal(components(m,16,16), components(Uint8Array.from(m,(_,p)=>img.data[p*4+3]>=128?2:0),16,16), `sample ${c.sample}/${border}/${detail}: connectivity`);
        for(let p=0;p<m.length;p++)if(m[p]===1){
          let adjacent=0;
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const x=p%16+dx,y=Math.floor(p/16)+dy;
            if((dx||dy)&&x>=0&&y>=0&&x<16&&y<16&&m[y*16+x]===1)adjacent++;
          }
          assert.ok(adjacent > 0, `sample ${c.sample}/${border}/${detail}, pixel ${p}: isolated cut`);
        }
      }
    }
  });

  it('honors non-default alpha and brightness, rather than hardcoding the research threshold', () => {
    const src=sources[fixtures.findIndex(f=>f.id==='armor-1-2')];
    const faded={...src,data:src.data.slice()};
    for(let p=0;p<src.width*src.height;p++)if(faded.data[p*4+3])faded.data[p*4+3]=100;
    expect(mask(analyze(faded,'luma',128),'icon').every(v=>v===0)).toBe(true);
    expect([...mask(analyze(faded,'luma',60),'icon')]).toEqual([...mask(analyze(src),'icon')]);
    const darkened={...src,data:src.data.slice()};
    for(let i=0;i<darkened.data.length;i+=4)darkened.data[i]=0;
    const expected=mask(analyze(darkened,'red'),'icon');
    expect(expected.includes(1)).toBe(false);
  });
});
