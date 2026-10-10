import { describe, it, expect } from 'vitest';
import { imageGesture } from './image-gesture.js';
const event = (timeStamp, extra = {}) => ({ pointerId: 1, clientX: 20, clientY: 30, timeStamp, button: 0, isPrimary: true, ...extra });
describe('image viewer activation', () => {
  it('opens a quick stationary press once', () => {
    const gesture = imageGesture(); gesture.press(event(0));
    expect(gesture.release(event(100))).toBe(true);
    expect(gesture.release(event(110))).toBe(false);
  });
  it('keeps hold-to-compare from opening the viewer', () => {
    const gesture = imageGesture(); gesture.press(event(0));
    expect(gesture.canHold()).toBe(true);
    expect(gesture.release(event(150))).toBe(false);
  });
  it('does not reopen after a drag returns to its starting point', () => {
    const gesture = imageGesture(); gesture.press(event(0));
    gesture.move(event(20, { clientY: 45 }));
    gesture.move(event(40));
    expect(gesture.canHold()).toBe(false);
    expect(gesture.release(event(60))).toBe(false);
  });
  it('rejects cancelled, secondary and non-primary input', () => {
    const gesture = imageGesture(); gesture.press(event(0)); gesture.cancel();
    expect(gesture.release(event(100))).toBe(false);
    for (const extra of [{ button: 2 }, { isPrimary: false }]) {
      gesture.press(event(0, extra)); expect(gesture.canHold()).toBe(false); expect(gesture.release(event(90, extra))).toBe(false);
    }
  });
  it('does not open from an unrelated pointer', () => {
    const gesture = imageGesture(); gesture.press(event(0));
    expect(gesture.release(event(80, { pointerId: 2 }))).toBe(false);
  });
});
