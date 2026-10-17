// Test-only instrumentation loaded before the unmodified production bundle.
// It deliberately retains listener records for auditing, so it is not a heap test.
(() => {
  localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-pico8', metric: 'rgb', theme: 'dark' }));
  const totals = { timers: 0, refinementTimers: 0, holdTimers: 0, timerFires: 0, rafRequests: 0, rafFires: 0, viewerPaints: 0, wallPaints: 0, viewerRects: 0, longTasks: 0 };
  const pending = new Map(), listeners = [], rafs = new Set();
  const original = { setTimeout: window.setTimeout, clearTimeout: window.clearTimeout, raf: window.requestAnimationFrame, caf: window.cancelAnimationFrame, add: EventTarget.prototype.addEventListener, remove: EventTarget.prototype.removeEventListener, put: CanvasRenderingContext2D.prototype.putImageData, rect: Element.prototype.getBoundingClientRect };
  const probe = window.__viewerPerf = { stage: 'startup', snapshot() {
    return { ...totals, pendingRefinement: [...pending.values()].filter(d => d === 180).length, pendingHolds: [...pending.values()].filter(d => d === 450).length, pendingRaf: rafs.size, liveViewerListeners: listeners.filter(l => l.active && l.viewer && (!(l.target instanceof Element) || l.target.isConnected)).length, detachedElementListeners: listeners.filter(l => l.active && l.viewer && l.target instanceof Element && !l.target.isConnected).length };
  }, activeListeners() { return listeners.filter(l => l.active && l.viewer).map(l => ({ type: l.type, capture: l.capture, target: l.target === window ? 'window' : l.target === document ? 'document' : l.target.tagName+'.'+l.target.className, callback: l.callback?.name, connected: l.target instanceof Element ? l.target.isConnected : true })); } };
  window.setTimeout = function(callback, delay, ...args) {
    if (typeof callback !== 'function') return original.setTimeout.call(window, callback, delay, ...args);
    totals.timers++; if (delay === 180) totals.refinementTimers++; if (delay === 450) totals.holdTimers++;
    const id = original.setTimeout.call(window, () => { pending.delete(id); totals.timerFires++; callback(...args); }, delay);
    pending.set(id, delay); return id;
  };
  window.clearTimeout = function(id) { pending.delete(id); return original.clearTimeout.call(window, id); };
  window.requestAnimationFrame = function(callback) { totals.rafRequests++; const id = original.raf.call(window, now => { rafs.delete(id); totals.rafFires++; callback(now); }); rafs.add(id); return id; };
  window.cancelAnimationFrame = function(id) { rafs.delete(id); return original.caf.call(window, id); };
  const capture = options => typeof options === 'object' ? !!options?.capture : !!options;
  const types = new Set(['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','click','dragstart','wheel','keydown','keyup','blur','visibilitychange','focusin']);
  EventTarget.prototype.addEventListener = function(type, callback, options) {
    const captured = capture(options);
    if (!listeners.some(l => l.active && l.target === this && l.type === type && l.callback === callback && l.capture === captured)) {
      const viewer = types.has(type) && (this instanceof Element && !!this.closest('.image-viewer') || probe.stage === 'opening' && (this === window || this === document));
      listeners.push({ target: this, type, callback, capture: captured, viewer, active: true });
    }
    return original.add.call(this, type, callback, options);
  };
  EventTarget.prototype.removeEventListener = function(type, callback, options) {
    const record = listeners.find(l => l.active && l.target === this && l.type === type && l.callback === callback && l.capture === capture(options));
    if (record) record.active = false;
    return original.remove.call(this, type, callback, options);
  };
  CanvasRenderingContext2D.prototype.putImageData = function(...args) { if (this.canvas.closest('.viewer-tile')) totals.viewerPaints++; else totals.wallPaints++; return original.put.apply(this, args); };
  Element.prototype.getBoundingClientRect = function(...args) { if (this.matches('.image-viewer')) totals.viewerRects++; return original.rect.apply(this, args); };
  try { new PerformanceObserver(entries => { totals.longTasks += entries.getEntries().length; }).observe({ type: 'longtask', buffered: false }); } catch { /* Optional browser metric. */ }
})();
