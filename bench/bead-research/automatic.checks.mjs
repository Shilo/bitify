import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAutomatic } from './method-automatic.mjs';

const image = (width = 9, height = 9, colors = ['#eac89d', '#e3be95', '#24130c', '#ffffff', '#eda9b3']) =>
  ({ width, height, colors, labels: new Int32Array(width * height) });
const put = (input, label, points) => { for (const [x, y] of points) input.labels[y * input.width + x] = label; return input; };
const unchanged = (input, preset = 'strict') => assert.deepEqual(mergeAutomatic(input, { preset }).labels, input.labels);
const both = ['strict', 'balanced'];

test('automatic small interior shading merges with immutable labels/palette', () => {
  const input = put(image(), 1, [[3,3],[4,3]]), old = input.labels.slice(), palette = input.colors.slice();
  for (const preset of both) {
    const result = mergeAutomatic(input, { preset });
    assert.equal(result.labels.every(l => l === 0), true);
    assert.equal(result.decisions[0].reason, 'merged');
  }
  assert.deepEqual(input.labels, old); assert.deepEqual(input.colors, palette);
});

test('noise and a deliberate same-color highlight receive identical decisions', () => {
  const noise = put(image(), 1, [[4,4]]), highlight = put(image(), 1, [[4,4]]);
  for (const preset of both) {
    assert.deepEqual(mergeAutomatic(noise, { preset }), mergeAutomatic(highlight, { preset }));
    assert.equal(mergeAutomatic(highlight, { preset }).labels[40], 0);
  }
});

test('subtle interior blush is removed: automatic color/spatial rules cannot infer intent', () => {
  const input = put(image(9,9,['#f7dacb','#f0c2c0']), 1, [[3,4],[4,4]]);
  for (const preset of both) assert.equal(mergeAutomatic(input, { preset }).labels[39], 0);
});

test('high-contrast eyes, white glints, and thin dark line survive these fixtures', () => {
  const eye = put(image(), 2, [[3,4],[4,4]]);
  const glint = image(); glint.labels.fill(2); put(glint, 3, [[4,4]]);
  const line = put(image(), 2, [[3,3],[3,4],[3,5],[3,6]]);
  for (const preset of both) { unchanged(eye,preset); unchanged(glint,preset); unchanged(line,preset); }
});

test('long diagonal shade run is one 8-connected region exceeding four pixels', () => {
  const input = put(image(), 1, [[2,2],[3,3],[4,4],[5,5],[6,6]]);
  for (const preset of both) {
    unchanged(input,preset); assert.equal(mergeAutomatic(input,{preset}).decisions.length, 0);
  }
});

test('short low-contrast diagonal line is removed: connectivity is no semantic guarantee', () => {
  const input = put(image(), 1, [[3,3],[4,4],[5,5]]);
  for (const preset of both) assert.equal(mergeAutomatic(input,{preset}).labels.every(l=>l===0), true);
});

test('third high-contrast boundary label vetoes shading that would thicken an outline', () => {
  const input = put(image(),1,[[4,4]]); put(input,2,[[5,4]]);
  for (const preset of both) {
    unchanged(input,preset);
    assert.equal(mergeAutomatic(input,{preset}).decisions.find(d=>d.label===1).reason, 'third-color-edge-veto');
  }
});

test('transparency and image-edge contact preserve occupied silhouette', () => {
  const input = put(image(),1,[[0,4],[4,4]]); put(input,-1,[[5,5]]);
  for (const preset of both) {
    unchanged(input,preset);
    assert.equal(mergeAutomatic(input,{preset}).decisions.every(d=>d.reason==='border-or-transparency-veto'),true);
  }
});

test('an 8-pixel anchor is required even when a nearest color has majority contacts', () => {
  const input = image(5,5); input.labels.fill(-1);
  put(input,0,[[1,1],[2,1],[3,1],[1,2],[3,2],[1,3],[2,3]]); put(input,1,[[2,2]]); put(input,2,[[3,3]]);
  for (const preset of both) {
    unchanged(input,preset);
    assert.equal(mergeAutomatic(input,{preset}).decisions.find(d=>d.label===1).reason,'no-majority-anchor');
  }
});

test('anchor available only diagonally does not become a replacement', () => {
  const input = image(9,9); input.labels.fill(2);
  put(input,1,[[4,4]]); put(input,0,[[3,3],[2,3],[1,3],[1,2],[2,2],[3,2],[1,1],[2,1]]);
  for (const preset of both) assert.equal(mergeAutomatic(input,{preset}).labels[40],1);
});

test('candidate needs at least half edge contacts, regardless of nearest match', () => {
  const input = image(); input.labels.fill(2);
  for(let y=0;y<9;y++) for(let x=0;x<3;x++) input.labels[y*9+x]=0;
  put(input,1,[[3,4]]);
  for(const preset of both) assert.equal(mergeAutomatic(input,{preset}).labels[39],1);
});

test('near-equidistant 50/50 anchors abstain and are palette-order invariant', () => {
  const input = image(9,9,['#c0c0c0','#bebebe','#c2c2c2']);
  for(let p=0;p<input.labels.length;p++) input.labels[p]=p%9<4?1:2;
  put(input,0,[[4,4],[3,4]]);
  for(const preset of both) {
    assert.equal(mergeAutomatic(input,{preset}).decisions.find(d=>d.label===0).reason,'ambiguous-near-tie');
    unchanged(input,preset);
  }
});

test('palette permutations preserve output colors and alpha', () => {
  const input = put(image(),1,[[4,4]]); put(input,-1,[[0,0]]);
  const remap=[4,3,2,1,0], permuted={...input,colors:input.colors.slice().reverse(),labels:Int32Array.from(input.labels,l=>l<0?l:remap[l])};
  for(const preset of both) {
    const a=mergeAutomatic(input,{preset}).labels, b=mergeAutomatic(permuted,{preset}).labels;
    assert.deepEqual([...a].map(l=>input.colors[l]),[...b].map(l=>permuted.colors[l]));
  }
});

test('only original regions <=4 can change; repeated calls and inputs remain deterministic', () => {
  const input = put(image(),1,[[3,3],[4,3],[5,3],[3,4],[4,4]]); put(input,4,[[6,6]]);
  for(const preset of both) {
    const a=mergeAutomatic(input,{preset}), b=mergeAutomatic(input,{preset});
    assert.deepEqual(a,b);
    for(const p of [30,31,32,39,40]) assert.equal(a.labels[p],1);
    assert.equal(a.decisions.every(d=>d.pixels.length<=4),true);
  }
});

test('preset distance gates differ without other rule changes', () => {
  const input=put(image(9,9,['#dddddd','#bbbbbb']),1,[[4,4]]);
  assert.equal(mergeAutomatic(input,{preset:'strict'}).labels[40],1);
  assert.equal(mergeAutomatic(input,{preset:'balanced'}).labels[40],0);
});

test('malformed images and unsupported presets fail explicitly', () => {
  assert.throws(()=>mergeAutomatic({...image(),width:0}),/Invalid research image/);
  assert.throws(()=>mergeAutomatic({...image(),labels:new Int32Array([0])}),/Invalid research image/);
  assert.throws(()=>mergeAutomatic({...image(),colors:['blush']}),/Invalid research image/);
  assert.throws(()=>mergeAutomatic({...image(),labels:new Int32Array(81).fill(99)}),/Invalid research image/);
  assert.throws(()=>mergeAutomatic(image(),{preset:'aggressive'}),/Invalid automatic research preset/);
});
