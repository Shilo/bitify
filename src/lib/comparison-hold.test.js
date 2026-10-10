import { describe, it, expect } from 'vitest';
import { comparisonHold } from './comparison-hold.js';

describe('independent temporary comparison inputs', () => {
  it('keeps a pointer hold when focused Space is released', () => {
    const hold = comparisonHold();
    expect(hold.set('pointer', true)).toBe(true);
    expect(hold.set('keyboard', true)).toBe(true);
    expect(hold.set('keyboard', false)).toBe(true);
    expect(hold.set('pointer', false)).toBe(false);
  });
  it('keeps focused Space while a pointer is pressed, released or moved away', () => {
    const hold = comparisonHold(); hold.set('keyboard', true);
    expect(hold.set('pointer', false)).toBe(true);
    expect(hold.set('pointer', true)).toBe(true);
    expect(hold.set('pointer', false)).toBe(true);
    expect(hold.set('keyboard', false)).toBe(false);
  });
  it('makes repeated keydowns idempotent and blocks activation during any hold', () => {
    const hold = comparisonHold();
    expect(hold.active()).toBe(false);
    hold.set('keyboard', true); hold.set('keyboard', true);
    expect(hold.active()).toBe(true);
    hold.set('keyboard', false);
    expect(hold.active()).toBe(false);
  });
  it('clears all sources on focus loss, cancellation or destruction', () => {
    const hold = comparisonHold(); hold.set('pointer', true); hold.set('keyboard', true);
    expect(hold.clear()).toBe(false);
    expect(hold.active()).toBe(false);
    expect(hold.set('pointer', true)).toBe(true);
    expect(hold.set('pointer', false)).toBe(false);
  });
});
