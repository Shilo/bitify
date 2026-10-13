import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animationVisibility } from './animation-visibility.js';

let observers, actions;
beforeEach(() => {
  observers = []; actions = [];
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn();
    constructor(deliver, options) { this.deliver = deliver; this.options = options; observers.push(this); }
  });
});
afterEach(() => {
  actions.forEach(action => action.destroy());
  vi.unstubAllGlobals();
});
function watch(node, change) {
  const action = animationVisibility(node, change);
  actions.push(action); return action;
}
function measurement(node, isIntersecting, intersectionRatio) {
  return { target: node, isIntersecting, intersectionRatio };
}

describe('shared animation visibility', () => {
  it('paints immediately, shares one observer and dispatches only the measured surface', () => {
    const a = {}, b = {}, first = vi.fn(), second = vi.fn();
    watch(a, first); watch(b, second);
    expect(first.mock.calls).toEqual([[true]]);
    expect(second.mock.calls).toEqual([[true]]);
    expect(observers).toHaveLength(1);
    expect(observers[0].options.threshold).toEqual([0, Number.EPSILON]);
    observers[0].deliver([measurement(a, false, 0)]);
    expect(first.mock.calls).toEqual([[true], [false]]);
    expect(second.mock.calls).toEqual([[true]]);
    observers[0].deliver([measurement(a, true, 0.001)]);
    expect(first).toHaveBeenLastCalledWith(true);
  });
  it('does not animate when touching the viewport edge without visible area', () => {
    const node = {}, change = vi.fn(); watch(node, change);
    observers[0].deliver([measurement(node, true, 0), measurement(node, false, 1)]);
    expect(change.mock.calls).toEqual([[true], [false], [false]]);
  });
  it('stills and browsers without IntersectionObserver keep initial playback', () => {
    watch({}, undefined);
    expect(observers).toHaveLength(0);
    vi.stubGlobal('IntersectionObserver', undefined);
    const change = vi.fn(); watch({}, change);
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(observers).toHaveLength(0);
  });
  it('a failed observer constructor preserves playback', () => {
    vi.stubGlobal('IntersectionObserver', class { constructor() { throw new Error('Unavailable'); } });
    const change = vi.fn(); watch({}, change);
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('unobserves removed surfaces, rejects late entries and disconnects only the last consumer', () => {
    const a = {}, b = {}, first = vi.fn(), second = vi.fn();
    const one = watch(a, first), two = watch(b, second), shared = observers[0];
    one.destroy();
    expect(shared.unobserve).toHaveBeenCalledWith(a);
    expect(shared.disconnect).not.toHaveBeenCalled();
    shared.deliver([measurement(a, false, 0), measurement(b, false, 0)]);
    expect(first).toHaveBeenCalledExactlyOnceWith(true);
    expect(second).toHaveBeenLastCalledWith(false);
    two.destroy(); two.destroy();
    expect(shared.disconnect).toHaveBeenCalledTimes(1);
    watch({}, vi.fn());
    expect(observers).toHaveLength(2);
  });
  it('rejects a disconnected observer callback even when a node is observed again', () => {
    const node = {}, first = vi.fn(), second = vi.fn(), action = watch(node, first);
    const old = observers[0];
    action.destroy();
    watch(node, second);
    old.deliver([measurement(node, false, 0)]);
    expect(second).toHaveBeenCalledExactlyOnceWith(true);
    observers[1].deliver([measurement(node, false, 0)]);
    expect(second).toHaveBeenLastCalledWith(false);
  });
  it('animation-to-still and still-to-animation updates restore visibility without retaining observers', () => {
    const node = {}, first = vi.fn(), second = vi.fn(), action = watch(node, first);
    observers[0].deliver([measurement(node, false, 0)]);
    action.update(undefined);
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    action.update(second);
    expect(second).toHaveBeenCalledExactlyOnceWith(true);
    expect(observers).toHaveLength(2);
    action.update(second);
    expect(observers[1].observe).toHaveBeenCalledTimes(1);
    observers[1].deliver([measurement(node, true, 0.5)]);
    expect(first.mock.calls).toEqual([[true], [false]]);
    expect(second).toHaveBeenLastCalledWith(true);
  });
});
