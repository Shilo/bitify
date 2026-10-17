import { describe, it, expect, vi, afterEach } from 'vitest';
import { constrainView, zoomView, viewerNavigation } from './viewer-navigation.js';

const geometry = { width: 800, height: 600, imageWidth: 800, imageHeight: 400 };
const event = (pointerId, clientX, clientY, timeStamp = 0, extra = {}) => ({ pointerId, clientX, clientY, timeStamp, button: 0, isPrimary: pointerId === 1, ...extra });
function fixture(options) {
  const onclose = vi.fn(), onhold = vi.fn(), onchange = vi.fn();
  const navigation = viewerNavigation({ onclose, onhold, onchange, ...options }); navigation.resize(geometry);
  return { navigation, onclose, onhold, onchange };
}
afterEach(() => vi.useRealTimers());

describe('viewer geometry', () => {
  it('retains the image coordinate under the wheel/pinch anchor before a bound is reached', () => {
    const next = zoomView({ scale: 2, x: 30, y: -10 }, 3, { x: 60, y: 30 }, { x: 80, y: 50 }, geometry);
    expect((60 - 30) / 2).toBeCloseTo((80 - next.x) / next.scale);
    expect((30 + 10) / 2).toBeCloseTo((50 - next.y) / next.scale);
  });
  it('centers undersized axes and clamps oversized axes and zoom', () => {
    expect(constrainView({ scale: 0.01, x: 500, y: -500 }, geometry)).toEqual({ scale: .25, x: 0, y: -0 });
    expect(constrainView({ scale: 2, x: 9999, y: -9999 }, geometry)).toEqual({ scale: 2, x: 400, y: -100 });
    expect(constrainView({ scale: 100, x: 0, y: 0 }, geometry).scale).toBe(16);
  });
  it('keeps arbitrary pan and zoom sequences finite and within visible-image bounds', () => {
    let view = { scale: 1, x: 0, y: 0 };
    for (let i = 0; i < 500; i++) {
      view = zoomView(view, .01 + (i * 37 % 210) / 10, { x: i - 250, y: 300 - i }, { x: i * 7 - 1000, y: i * 3 - 600 }, geometry);
      expect(view.scale).toBeGreaterThanOrEqual(.25); expect(view.scale).toBeLessThanOrEqual(16);
      expect(Math.abs(view.x)).toBeLessThanOrEqual(Math.max(0, (800 * view.scale - 800) / 2));
      expect(Math.abs(view.y)).toBeLessThanOrEqual(Math.max(0, (400 * view.scale - 600) / 2));
    }
  });
});

describe('viewer gesture ownership', () => {
  it('closes on a quick stationary click, including when zoomed', () => {
    const { navigation: n, onclose } = fixture(); n.zoomBy(2);
    n.down(event(1, 300, 200)); n.up(event(1, 302, 202, 100)); expect(n.click()).toBe(true); expect(onclose).toHaveBeenCalledOnce();
  });
  it('pans both axes without dismissing, even after returning to the starting point', () => {
    const { navigation: n, onclose } = fixture(); n.zoomBy(3);
    n.down(event(1, 300, 200)); n.move(event(1, 380, 260)); expect(n.view.x).toBe(80); expect(n.view.y).toBe(60);
    n.move(event(1, 300, 200)); n.up(event(1, 300, 200, 100)); expect(n.click()).toBe(false); expect(onclose).not.toHaveBeenCalled();
  });
  it('checks the release position even without intermediate moves', () => {
    const { navigation: n } = fixture(); n.zoomBy(2); n.down(event(1, 300, 200)); n.up(event(1, 340, 240, 50)); expect(n.click()).toBe(false); expect(n.view.x).toBe(40);
  });
  for (const firstLift of [1, 2]) it(`pinches, then continues dragging with finger ${3 - firstLift}, without a jump or close`, () => {
    const { navigation: n } = fixture();
    n.down(event(1, 350, 300)); n.down(event(2, 450, 300));
    n.move(event(1, 300, 300)); n.move(event(2, 500, 300)); expect(n.view.scale).toBeCloseTo(2);
    n.up(event(firstLift, firstLift === 1 ? 300 : 500, 300, 100)); const before = n.view;
    n.move(event(3 - firstLift, firstLift === 1 ? 520 : 320, 320)); expect(n.view.x).toBeCloseTo(before.x + 20);
    n.up(event(3 - firstLift, firstLift === 1 ? 520 : 320, 320, 150)); expect(n.click()).toBe(false);
  });
  it('a second stationary finger prevents dismissal and comparison', () => {
    vi.useFakeTimers(); const { navigation: n, onhold } = fixture();
    n.down(event(1, 300, 200)); n.down(event(2, 400, 200)); vi.advanceTimersByTime(500);
    expect(onhold).not.toHaveBeenCalledWith(true);
    n.up(event(2, 400, 200, 50)); n.up(event(1, 300, 200, 100)); expect(n.click()).toBe(false);
  });
  it('hold compares and release restores; moving a held image starts pan and restores immediately', () => {
    vi.useFakeTimers(); const { navigation: n, onhold } = fixture(); n.zoomBy(2);
    n.down(event(1, 300, 200)); vi.advanceTimersByTime(450); expect(onhold).toHaveBeenLastCalledWith(true);
    n.move(event(1, 330, 220)); expect(onhold).toHaveBeenLastCalledWith(false);
    n.up(event(1, 330, 220, 500)); expect(n.click()).toBe(false);
  });
  it.each(['cancel', 'reset', 'resize'])('%s retires a pending tap and hold timer', operation => {
    vi.useFakeTimers(); const { navigation: n, onhold } = fixture(); n.down(event(1, 200, 200));
    n[operation](operation === 'resize' ? { ...geometry, width: 500 } : undefined);
    vi.advanceTimersByTime(500); n.up(event(1, 200, 200, 100)); expect(n.click()).toBe(false); expect(onhold).not.toHaveBeenCalledWith(true);
  });
  it('rejects secondary buttons, orphan fingers, and release over toolbar', () => {
    const { navigation: n } = fixture();
    n.down(event(1, 300, 200, 0, { button: 2 })); n.up(event(1, 300, 200, 50)); expect(n.click()).toBe(false);
    n.down(event(2, 300, 200)); n.up(event(2, 300, 200, 50)); expect(n.click()).toBe(false);
    n.down(event(1, 300, 200)); n.up(event(1, 300, 200, 50), false); expect(n.click()).toBe(false);
  });
  it('wheel/buttons invalidate pending taps; comparison shortcut gates close', () => {
    const { navigation: n } = fixture({ canClose: () => false });
    n.down(event(1, 300, 200)); n.up(event(1, 300, 200, 50)); expect(n.click()).toBe(false);
    const { navigation: other } = fixture(); other.down(event(1, 300, 200)); other.zoomBy(2); other.up(event(1, 300, 200, 50)); expect(other.click()).toBe(false);
  });
  it('resizing retains scale but clamps offsets; reset always restores Fit', () => {
    const { navigation: n } = fixture(); n.zoomBy(3); n.panBy(999, 999);
    n.resize({ width: 400, height: 800, imageWidth: 400, imageHeight: 200 }); expect(n.view).toEqual({ scale: 3, x: 400, y: 0 });
    n.reset(); expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
  });
});
