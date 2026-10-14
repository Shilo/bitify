import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeNearest } from './method-nearest.mjs';

const colors = ['#e0b486', '#ecc79a', '#24130c', '#f7a0ac', '#ffffff'];
const image = (rows, palette = colors) => ({ width: rows[0].length, height: rows.length, labels: Int32Array.from(rows.flat()), colors: palette });
const defaults = { selected: new Set([0]), protected: new Set([2, 3, 4]) };

test('merges a selected shade into adjacent larger fill without mutating inputs', () => {
  const input = image([[1,1,1],[1,0,1],[1,1,1]]), original = input.labels.slice(), palette = input.colors.slice();
  const result = mergeNearest(input, defaults);
  assert.deepEqual([...result.labels], Array(9).fill(1));
  assert.deepEqual(input.labels, original);
  assert.deepEqual(input.colors, palette);
  assert.equal(result.decisions[0].reason, 'merged');
});

test('preserves alpha and protected eye, blush, and outline pixels exactly', () => {
  const input = image([[-1,2,2,2,-1],[2,1,1,1,2],[2,1,1,1,2],[2,3,0,4,2],[2,1,1,1,2],[-1,2,2,2,-1]]);
  const result = mergeNearest(input, defaults);
  assert.equal(result.labels[17], 1);
  for (let p=0;p<input.labels.length;p++) if (input.labels[p] !== 0) assert.equal(result.labels[p], input.labels[p]);
  assert.equal(result.labels.filter(l => l === 2).length, input.labels.filter(l => l === 2).length);
});

test('a protected pixel vetoes its entire selected-color region', () => {
  const input = image([[1,1,1,1],[1,0,0,1],[1,1,1,1]]), protectedPixels = new Uint8Array(12);
  protectedPixels[5] = 1;
  const result = mergeNearest(input, { ...defaults, protectedPixels });
  assert.deepEqual(result.labels, input.labels);
  assert.equal(result.decisions[0].reason, 'protected-region');
});

test('an explicitly protected selected color cannot be modified', () => {
  const input = image([[1,1,1],[1,0,1],[1,1,1]]);
  assert.deepEqual(mergeNearest(input, { ...defaults, protected: new Set([0]) }).labels, input.labels);
});

test('cannot absorb shading into a protected dark outline even when it is closest', () => {
  const input = image([[2,2,2],[2,0,2],[2,2,2]], ['#28160e','#ffffff','#24130c']);
  const result = mergeNearest(input, { selected: new Set([0]), protected: new Set([2]) });
  assert.deepEqual(result.labels, input.labels);
  assert.equal(result.decisions[0].reason, 'no-admissible-anchor');
});

test('protected diagonal eye or line stays at exactly the same width', () => {
  const input = image([[2,1,1,1,1],[1,2,1,1,1],[1,1,2,1,1],[1,1,1,2,1],[1,1,1,1,2]]);
  const result = mergeNearest(input, { selected: new Set([2]), protected: new Set([2]) });
  assert.deepEqual(result.labels, input.labels);
  assert.equal(result.decisions.length, 5); // 4-connectivity alone would see five isolated beads.
});

test('diagonal-only fill is not an adjacent anchor', () => {
  const input = image([[1,1,-1],[1,-1,-1],[-1,-1,0]]);
  const result = mergeNearest(input, { ...defaults, minimumAnchorSize: 3 });
  assert.deepEqual(result.labels, input.labels);
});

test('rejects unanchored small regions and anchors no larger than source region', () => {
  const small = image([[1,1,0,0,0,0]]);
  assert.deepEqual(mergeNearest(small, { ...defaults, minimumAnchorSize: 1 }).labels, small.labels);
  const belowThreshold = image([[1,1,0]]);
  assert.deepEqual(mergeNearest(belowThreshold, defaults).labels, belowThreshold.labels);
});

test('distance gate vetoes a large but perceptually unrelated fill', () => {
  const input = image([[1,1,1],[1,0,1],[1,1,1]], ['#e0b486','#00ffff']);
  const result = mergeNearest(input, { selected: new Set([0]), maxDistanceSquared: .0001 });
  assert.deepEqual(result.labels, input.labels);
  assert.equal(result.decisions[0].reason, 'color-distance-veto');
});

test('ambiguous similar candidates abstain rather than depending on palette order', () => {
  const input = image([[1,1,1,2,2,2],[1,1,0,2,2,2]], ['#e0b486','#ecc79a','#edc79a']);
  const result = mergeNearest(input, { selected: new Set([0]) });
  assert.deepEqual(result.labels, input.labels);
  assert.equal(result.decisions[0].reason, 'ambiguous-near-tie');
});

test('palette permutation gives identical output colors for nonambiguous candidates', () => {
  const input = image([[1,1,1,2,2,2],[1,1,0,2,2,2]], ['#e0b486','#ecc79a','#f0f0f0']);
  const remap = [2,0,1], permuted = { ...input, colors: [input.colors[1],input.colors[2],input.colors[0]], labels: Int32Array.from(input.labels, l => remap[l]) };
  const a = mergeNearest(input, { selected: new Set([0]) }), b = mergeNearest(permuted, { selected: new Set([2]) });
  assert.deepEqual([...a.labels].map(l => input.colors[l]), [...b.labels].map(l => permuted.colors[l]));
});

test('one-pass frozen labels never turn selected neighboring shades into an anchor', () => {
  const input = image([[1,1,1,1,1],[1,0,2,2,2],[1,1,1,1,1]], ['#e0b486','#ecc79a','#e1b587']);
  const result = mergeNearest(input, { selected: new Set([0,2]) });
  assert.equal(result.decisions.length, 2);
  assert.equal(result.decisions.every(d => d.replacement === 1), true);
  assert.equal(result.labels.every(l => l === 1), true);
});

test('selected shade reused as an intentional highlight is lost without explicit protection', () => {
  const input = image([[1,1,1],[1,0,1],[1,1,1]]);
  const automatic = mergeNearest(input, defaults);
  assert.equal(automatic.labels[4], 1); // This is the semantic failure case, not a preservation guarantee.
  const mask = new Uint8Array(9); mask[4] = 1;
  assert.deepEqual(mergeNearest(input, { ...defaults, protectedPixels: mask }).labels, input.labels);
});

test('rejects malformed image and option data', () => {
  assert.throws(() => mergeNearest({ width: 1, height: 1, labels: new Int32Array([99]), colors }), /Invalid research image/);
  const input = image([[0]]);
  assert.throws(() => mergeNearest(input, { selected: new Set([-1]) }), /Invalid nearest research options/);
  assert.throws(() => mergeNearest(input, { maxDistanceSquared: NaN }), /Invalid nearest research options/);
  assert.throws(() => mergeNearest(input, { protectedPixels: new Uint8Array(2) }), /Invalid nearest research options/);
});
