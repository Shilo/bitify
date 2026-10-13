import { describe, it, expect } from 'vitest';
import { paletteFailureInputs as inputs, paletteFailureRegistry } from './palette-failure.js';

describe('palette failure ownership', () => {
  const palette = { size: 32 }, a = {}, b = {};
  const context = { family: 'full-palette', palette, alphaCut: 128, metric: 'oklab', maxColors: 8, cleanup: true };
  const signature = item => inputs(item, palette, 128, 'oklab', 8);
  it('keeps two failures separate and ignores unrelated wall additions', () => {
    const r = paletteFailureRegistry();
    r.begin('wall-a', 'limit', signature(a), 1); r.settle('wall-a', 'limit', 1, Error('a'));
    r.begin('wall-b', 'limit', signature(b), 2); r.settle('wall-b', 'limit', 2, Error('b'));
    expect(r.current([a, b, {}], context)).toHaveLength(2);
    r.begin('wall-a', 'limit', signature(a), 3);
    expect(r.current([a, b], context)).toHaveLength(2); // retry pending stays blocked
    r.settle('wall-a', 'limit', 3);
    expect(r.current([a, b], context).map(f => f.inputs.item)).toEqual([b]);
  });
  it('rejects stale completion and stale failure', () => {
    const r = paletteFailureRegistry();
    r.begin('wall', 'limit', signature(a), 1); r.begin('wall', 'limit', signature(a), 2);
    expect(r.settle('wall', 'limit', 1, Error('old'))).toBe(false);
    r.settle('wall', 'limit', 2, Error('current'));
    expect(r.settle('wall', 'limit', 1)).toBe(false);
    expect(r.current([a], context)).toHaveLength(1);
  });
  it('viewer recovery and teardown cannot clear wall failure', () => {
    const r = paletteFailureRegistry();
    r.begin('wall', 'limit', signature(a), 1); r.settle('wall', 'limit', 1, Error('wall'));
    r.begin('viewer', 'limit', signature(a), 2); r.settle('viewer', 'limit', 2);
    r.remove('viewer');
    expect(r.current([a], context)).toHaveLength(1);
  });
  it('cleanup changes do not hide limiter failure; stage bypasses do', () => {
    const r = paletteFailureRegistry();
    r.begin('wall', 'limit', signature(a), 1); r.settle('wall', 'limit', 1, Error('limit'));
    expect(r.current([a], { ...context, cleanup: false })).toHaveLength(1);
    expect(r.current([a], { ...context, maxColors: 0 })).toHaveLength(0);
    expect(r.current([a], { ...context, family: 'two-color' })).toHaveLength(0);
    expect(r.current([a], { ...context, palette: { size: 32 } })).toHaveLength(0);
    expect(r.current([], context)).toHaveLength(0);
  });
  it('cleanup remains failed while identical limiter inputs retry', () => {
    const r = paletteFailureRegistry();
    r.begin('wall', 'cleanup', signature(a), 1); r.settle('wall', 'cleanup', 1, Error('cleanup'));
    r.begin('wall', 'limit', signature(a), 2);
    expect(r.current([a], context)).toHaveLength(1);
    r.begin('wall', 'cleanup', signature(a), 3);
    expect(r.current([a], context)).toHaveLength(1);
    r.settle('wall', 'cleanup', 3);
    expect(r.current([a], context)).toHaveLength(0);
  });
  it('a replaced source and disposed owner cannot affect another owner', () => {
    const r = paletteFailureRegistry(), replacement = {};
    r.begin('old', 'limit', signature(a), 1); r.settle('old', 'limit', 1, Error('old'));
    expect(r.current([replacement], context)).toHaveLength(0);
    r.begin('new', 'limit', signature(replacement), 2); r.settle('new', 'limit', 2, Error('new'));
    r.remove('old');
    expect(r.settle('old', 'limit', 1)).toBe(false);
    expect(r.current([replacement], context)).toHaveLength(1);
  });
  it('healthy reports do not invalidate failure-derived export state', () => {
    const r = paletteFailureRegistry();
    expect(r.begin('healthy', 'limit', signature(a), 1)).toBe(false);
    expect(r.settle('healthy', 'limit', 1)).toBe(false);
    expect(r.clear('healthy', 'limit')).toBe(false);
    expect(r.remove('healthy')).toBe(false);
  });
});
