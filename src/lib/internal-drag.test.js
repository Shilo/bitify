import { describe, expect, it, vi } from 'vitest';
import { isInternalDrag, trackInternalDrag } from './internal-drag.js';

function fixture() {
  const doc = new EventTarget(), node = { ownerDocument: doc }, started = vi.fn(), stop = trackInternalDrag(doc, started);
  function emit(type, cancel = false) { const event = new Event(type, { cancelable: true }); if (cancel) event.preventDefault(); doc.dispatchEvent(event); return event; }
  return { doc, node, started, stop, emit, hover: () => isInternalDrag({ target: node }) };
}
describe('internal drag identity', () => {
  it('external drags stay external; native internal start remains uncanceled', () => {
    const f = fixture(); expect(f.hover()).toBe(false);
    const start = f.emit('dragstart'); expect(start.defaultPrevented).toBe(false); expect(f.hover()).toBe(true); expect(f.started).toHaveBeenCalledOnce();
    f.emit('dragend'); expect(f.hover()).toBe(false); f.stop();
  });
  it('marks an internal drop before clearing active drag for the next external import', () => {
    const f = fixture(); f.emit('dragstart'); const drop = f.emit('drop');
    expect(isInternalDrag(drop)).toBe(true); expect(f.hover()).toBe(false); expect(isInternalDrag(f.emit('drop'))).toBe(false); f.stop();
  });
  it('keeps native export identity across window blur and isolates documents', () => {
    const f = fixture(), other = fixture(); f.emit('dragstart'); f.emit('blur');
    expect(f.hover()).toBe(true); expect(other.hover()).toBe(false); f.stop(); other.stop();
  });
  it('does not retain canceled starts with no native dragend', async () => {
    const f = fixture(); f.emit('dragstart', true); await Promise.resolve(); expect(f.hover()).toBe(false); f.stop();
  });
  it('removes listeners and any active drag on teardown', () => {
    const f = fixture(); f.emit('dragstart'); f.stop(); expect(f.hover()).toBe(false); f.emit('dragstart'); expect(f.hover()).toBe(false);
  });
});
