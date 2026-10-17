import assert from 'node:assert/strict';
import { viewerNavigation } from '../../src/lib/viewer-navigation.js';

// Test source navigation lifecycle and event work deterministically. This is not
// a native Pointer Events emulator or a CPU/heap benchmark.
class Surface {
  listeners = new Map();
  addEventListener(name, callback, options) {
    const key = `${name}:${!!(typeof options === 'object' ? options.capture : options)}`;
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(callback);
  }
  removeEventListener(name, callback, options) {
    const key = `${name}:${!!(typeof options === 'object' ? options.capture : options)}`;
    this.listeners.get(key)?.delete(callback);
  }
  get count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
  fire(name, event) {
    for (const [key, listeners] of this.listeners) if (key.startsWith(`${name}:`)) {
      for (const listener of [...listeners]) listener(event);
    }
  }
}
const saved = Object.fromEntries(['window', 'document', 'setTimeout', 'clearTimeout'].map(key => [key, globalThis[key]]));
const fakeWindow = new Surface(), fakeDocument = new Surface();
const art = { closest: selector => selector.includes('.viewer-art') ? art : null };
fakeDocument.hidden = false;
fakeDocument.querySelector = () => null;
fakeDocument.elementFromPoint = () => art;
const timers = new Map();
let nextTimer = 0, scheduled = 0, cleared = 0;
globalThis.window = fakeWindow; globalThis.document = fakeDocument;
globalThis.setTimeout = callback => { timers.set(++nextTimer, callback); scheduled++; return nextTimer; };
globalThis.clearTimeout = id => { if (timers.delete(id)) cleared++; };
const geometry = { width: 800, height: 600, imageWidth: 800, imageHeight: 600 };
const event = (x = 300, y = 300, timeStamp = 0) => ({ pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: x, clientY: y, timeStamp, target: art, stopPropagation() {}, preventDefault() {} });
let assertions = 0;
try {
  let publications = 0, rectangles = 0, closes = 0;
  const node = new Surface(), captures = new Set();
  node.open = true; node.ownerDocument = fakeDocument;
  node.getBoundingClientRect = () => { rectangles++; return { left: 0, top: 0 }; };
  node.setPointerCapture = id => captures.add(id);
  node.hasPointerCapture = id => captures.has(id);
  node.releasePointerCapture = id => { captures.delete(id); node.fire('lostpointercapture', { pointerId: id }); };
  const navigation = viewerNavigation({ onchange() { publications++; }, onclose() { closes++; } });
  const action = navigation.attach(node, geometry);
  const baseline = { publications, rectangles, timers: timers.size };
  for (let i = 0; i < 10000; i++) node.fire('pointermove', event(i, i));
  assert.equal(publications, baseline.publications); assert.equal(rectangles, baseline.rectangles); assert.equal(timers.size, baseline.timers); assertions += 3;
  const initialPublications = publications;
  node.fire('pointerdown', event());
  for (let i = 0; i < 100; i++) node.fire('pointermove', event());
  node.fire('pointerup', event(300, 300, 100)); node.fire('click', { target: art, detail: 1, stopPropagation() {} });
  const stationaryPublications = publications - initialPublications;
  assert.equal(closes, 1); assert.equal(captures.size, 0); assert.equal(timers.size, 0); assertions += 3;
  const beforeClamp = publications;
  node.fire('pointerdown', event());
  for (let i = 0; i < 100; i++) node.fire('pointermove', event(330 + i, 330 + i));
  node.fire('pointerup', event(429, 429, 100));
  const clampedDragPublications = publications - beforeClamp;
  assert.deepEqual(navigation.view, { scale: 1, x: 0, y: 0 }); assertions++;
  const beforeNoops = publications;
  for (let i = 0; i < 100; i++) { navigation.cancel(); navigation.panBy(10, 10); }
  const noOpPublications = publications - beforeNoops;
  action.destroy();
  assert.equal(node.count + fakeWindow.count + fakeDocument.count, 0); assert.equal(timers.size, 0); assertions += 2;
  const stopped = publications, readCount = rectangles;
  for (let i = 0; i < 10000; i++) { node.fire('pointermove', event(i, i)); fakeWindow.fire('blur', {}); }
  assert.equal(publications, stopped); assert.equal(rectangles, readCount); assertions += 2;
  for (let i = 0; i < 100; i++) {
    const current = viewerNavigation(), mounted = current.attach(node, geometry);
    node.fire('pointerdown', event()); mounted.destroy();
    assert.equal(node.count + fakeWindow.count + fakeDocument.count, 0);
    assert.equal(timers.size, 0); assert.equal(captures.size, 0); assert.equal(current.active, false); assertions += 4;
  }
  const deduped = process.argv.includes('--expect-deduped');
  if (deduped) {
    assert.equal(stationaryPublications, 0, 'stationary input should not invalidate unchanged view');
    assert.equal(clampedDragPublications, 2, 'a clamped drag only changes dragging at start/end');
    assert.equal(noOpPublications, 0, 'redundant cancellation and constrained pan should not publish'); assertions += 3;
    const changes = [];
    const transitions = viewerNavigation({ onchange(next) { changes.push(next); } });
    transitions.resize(geometry); changes.length = 0;
    transitions.down(event());
    transitions.down({ ...event(400), pointerId: 2, isPrimary: false });
    assert.equal(changes.length, 1); assert.equal(changes.at(-1).dragging, true); assertions += 2;
    transitions.up({ ...event(400, 300, 100), pointerId: 2 });
    assert.equal(changes.length, 1, 'remaining pinch finger still owns unchanged dragging view'); assertions++;
    transitions.up(event(300, 300, 100));
    assert.equal(changes.length, 2); assert.equal(changes.at(-1).dragging, false); assertions += 2;
    transitions.zoomBy(16); changes.length = 0;
    transitions.down(event()); transitions.zoomBy(2);
    assert.equal(changes.length, 1, 'capped zoom still disqualifies active tap and changes dragging');
    assert.equal(changes.at(-1).scale, 16); assert.equal(changes.at(-1).dragging, true); assertions += 3;
    transitions.cancel();
    assert.equal(changes.length, 2); assert.equal(changes.at(-1).dragging, false);
    assert.equal(transitions.click(), false); assert.equal(transitions.active, false); assertions += 4;
    assert.equal(timers.size, 0); assertions++;
  }
  console.log(JSON.stringify({ assertions, pass: true, hoverEvents: 10000, closedEvents: 20000, repeatedMounts: 100, stationaryPublications, clampedDragPublications, noOpPublications, scheduledHoldTimers: scheduled, canceledHoldTimers: cleared, timersRemaining: timers.size, listenersRemaining: node.count + fakeWindow.count + fakeDocument.count, checksDeduplication: deduped }));
} finally {
  for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
}
