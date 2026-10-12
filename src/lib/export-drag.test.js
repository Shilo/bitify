import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExportDrag, exportDragArt, EXPORT_DRAG_TYPE } from './export-drag.js';

const pending = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function dragEvent() {
  const strings = new Map(), files = [];
  const transfer = {
    items: { clear: vi.fn(() => { strings.clear(); files.length = 0; }), add: vi.fn(file => { files.push(file); return file; }) },
    setData: vi.fn((type, value) => strings.set(type, value)),
    get types() { return [...strings.keys(), ...(files.length ? ['Files'] : [])]; },
    dropEffect: 'none', strings, files,
  };
  return { dataTransfer: transfer, preventDefault: vi.fn() };
}
function fixture(prepareOverride, options = {}) {
  let item = { id: 1, name: 'full.png', original: {} }, key = 'a';
  const prepare = vi.fn(prepareOverride ?? (async () => ({ file: new File(['encoded-full-size'], 'full-1bit.png', { type: 'image/png' }), url: 'blob:full', width: 4096, height: 2048, sha256: 'hash' })));
  const notify = vi.fn(), changed = vi.fn(), log = vi.fn(), revoke = vi.fn();
  const controller = createExportDrag({ request: candidate => item && candidate.id === item.id ? { item, key, snapshot: { key } } : null,
    prepare, notify, changed, log, revoke, ...options });
  return { controller, prepare, notify, changed, log, revoke, item, change: value => { key = value; }, replace: () => { item = { ...item, original: {} }; }, remove: () => { item = null; } };
}
const controllers = [];
const track = f => { controllers.push(f.controller); return f; };
beforeEach(() => vi.useFakeTimers());
afterEach(() => { controllers.splice(0).forEach(c => c.destroy()); vi.useRealTimers(); vi.unstubAllGlobals(); });
const prepared = async f => { f.controller.hover(f.item); await vi.advanceTimersByTimeAsync(180); };

describe('full-export drag controller', () => {
  it('blocks an unprepared drag, then transfers only the ready export and native download URL', async () => {
    const f = track(fixture()), missing = dragEvent();
    expect(f.controller.start(missing, f.item)).toBe(false); expect(missing.preventDefault).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(180);
    const event = dragEvent(); expect(f.controller.start(event, f.item)).toBe(true);
    expect(event.dataTransfer.files[0].size).toBe(17);
    expect(event.dataTransfer.strings.get('DownloadURL')).toBe('image/png:full-1bit.png:blob:full');
    expect(event.dataTransfer.types).toEqual(['DownloadURL', EXPORT_DRAG_TYPE, 'Files']);
    expect(event.dataTransfer.effectAllowed).toBe('copy');
    expect(f.log).toHaveBeenCalledWith('drag-start', expect.objectContaining({ width: 4096, height: 2048, sha256: 'hash' }));
  });
  it('checks current settings synchronously even before refresh has run', async () => {
    const f = track(fixture()); await prepared(f); f.change('b');
    const event = dragEvent(); expect(f.controller.start(event, f.item)).toBe(false);
    expect(event.dataTransfer.files).toHaveLength(0); expect(event.preventDefault).toHaveBeenCalled();
  });
  it('rejects changed source identity even when the settings and image ID match', async () => {
    const f = track(fixture()); await prepared(f); f.replace();
    expect(f.controller.start(dragEvent(), f.item)).toBe(false);
  });
  it('rejects a removed image', async () => {
    const f = track(fixture()); await prepared(f); f.remove();
    expect(f.controller.start(dragEvent(), f.item)).toBe(false);
  });
  it('discards a late old export and serializes preparation of the latest request', async () => {
    const old = pending(), f = track(fixture(() => old.promise));
    f.controller.hover(f.item); await vi.advanceTimersByTimeAsync(180); f.change('b'); f.controller.refresh();
    await vi.advanceTimersByTimeAsync(1000); expect(f.prepare).toHaveBeenCalledTimes(1);
    old.resolve({ file: new File(['old'], 'old.png'), url: 'blob:old' });
    await vi.advanceTimersByTimeAsync(0); expect(f.revoke).toHaveBeenCalledWith('blob:old');
    f.prepare.mockImplementation(async () => ({ file: new File(['new'], 'new.png', { type: 'image/png' }), url: 'blob:new' }));
    await vi.advanceTimersByTimeAsync(180);
    const event = dragEvent(); expect(f.controller.start(event, f.item)).toBe(true);
    expect(event.dataTransfer.files[0].name).toBe('new.png');
  });
  it('debounces repeated settings edits into one latest preparation', async () => {
    const f = track(fixture()); f.controller.hover(f.item);
    for (let i = 0; i < 10; i++) { await vi.advanceTimersByTimeAsync(100); f.change(String(i)); f.controller.refresh(); }
    expect(f.prepare).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(180);
    expect(f.prepare).toHaveBeenCalledTimes(1); expect(f.prepare.mock.calls[0][0].key).toBe('9');
  });
  it('does not prepare after the mouse leaves, and reuses a valid ready export', async () => {
    const f = track(fixture()); f.controller.hover(f.item); f.controller.leave(f.item);
    await vi.advanceTimersByTimeAsync(200); expect(f.prepare).not.toHaveBeenCalled();
    await prepared(f); f.controller.leave(f.item); f.controller.hover(f.item); await vi.advanceTimersByTimeAsync(180);
    expect(f.prepare).toHaveBeenCalledTimes(1);
  });
  it('does not release the active URL on settings changes and retains it for native consumers after dragend', async () => {
    const f = track(fixture()); await prepared(f); const event = dragEvent(); f.controller.start(event, f.item);
    f.change('b'); f.controller.refresh(); expect(f.revoke).not.toHaveBeenCalled();
    f.controller.leave(f.item); f.controller.end(event); await vi.advanceTimersByTimeAsync(59999);
    expect(f.revoke).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(1);
    expect(f.revoke).toHaveBeenCalledExactlyOnceWith('blob:full');
  });
  it('reuses a completed drag export without reencoding, but eviction respects its grace period', async () => {
    const f = track(fixture()); await prepared(f); const event = dragEvent(); f.controller.start(event, f.item); f.controller.end(event);
    await vi.advanceTimersByTimeAsync(180); expect(f.prepare).toHaveBeenCalledTimes(1);
    f.controller.leave(f.item); f.change('b'); f.controller.refresh();
    expect(f.revoke).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(60000);
    expect(f.revoke).toHaveBeenCalledExactlyOnceWith('blob:full');
  });
  it('supports isolated file/native-url compatibility probes without preview text or HTML', async () => {
    const f = track(fixture()); await prepared(f);
    const file = dragEvent(); expect(f.controller.start(file, f.item, 'file')).toBe(true);
    expect(file.dataTransfer.types).toEqual([EXPORT_DRAG_TYPE, 'Files']); f.controller.end(file);
    const url = dragEvent(); expect(f.controller.start(url, f.item, 'download-url')).toBe(true);
    expect(url.dataTransfer.types).toEqual(['DownloadURL', EXPORT_DRAG_TYPE]); expect(url.dataTransfer.files).toHaveLength(0);
  });
  it('fails closed when the browser cannot add a File, clearing the partial payload', async () => {
    const f = track(fixture()); await prepared(f); const event = dragEvent(); event.dataTransfer.items.add.mockReturnValue(null);
    expect(f.controller.start(event, f.item)).toBe(false); expect(event.preventDefault).toHaveBeenCalled();
    expect(event.dataTransfer.types).toEqual([]);
  });
  it('logs an export failure without opening Save recovery or retrying forever', async () => {
    const error = Object.assign(new Error('GIF palette limit'), { code: 'PALETTE_GIF_LIMIT' });
    const f = track(fixture(async () => { throw error; })); await prepared(f); await vi.advanceTimersByTimeAsync(1000);
    expect(f.prepare).toHaveBeenCalledTimes(1); expect(f.notify).toHaveBeenCalledTimes(1);
    expect(f.log).toHaveBeenCalledWith('prepare-error', expect.objectContaining({ code: 'PALETTE_GIF_LIMIT' }));
  });
  it('recognizes self drops through the outgoing state and marker', async () => {
    const f = track(fixture()); expect(f.controller.isOwn({ types: ['Files'] })).toBe(false);
    expect(f.controller.isOwn({ types: [EXPORT_DRAG_TYPE] })).toBe(true);
    await prepared(f); const event = dragEvent(); f.controller.start(event, f.item);
    expect(f.controller.isOwn({ types: [] })).toBe(true); f.controller.end(event);
    expect(f.controller.isOwn({ types: [] })).toBe(false);
  });
  it('releases an in-flight result arriving after teardown and never publishes it', async () => {
    const job = pending(), f = track(fixture(() => job.promise));
    f.controller.hover(f.item); await vi.advanceTimersByTimeAsync(180); f.controller.destroy();
    job.resolve({ file: new File(['late'], 'late.png'), url: 'blob:late' }); await vi.advanceTimersByTimeAsync(0);
    expect(f.revoke).toHaveBeenCalledExactlyOnceWith('blob:late');
    expect(f.log.mock.calls.some(([event]) => event === 'ready')).toBe(false);
  });
  it('teardown releases each active or cached URL exactly once', async () => {
    const f = track(fixture()); await prepared(f); f.controller.start(dragEvent(), f.item); f.controller.destroy(); f.controller.destroy();
    expect(f.revoke).toHaveBeenCalledExactlyOnceWith('blob:full');
  });
  it('blocks new drags while eight evicted exports are still retained, then allows them after grace', async () => {
    const f = track(fixture(async asked => ({ file: new File([asked.key], 'full.png', { type: 'image/png' }), url: `blob:${asked.key}` })));
    await prepared(f);
    for (let i = 0; i < 8; i++) {
      const event = dragEvent(); expect(f.controller.start(event, f.item)).toBe(true); f.controller.end(event);
      f.change(String(i)); f.controller.refresh(); await vi.advanceTimersByTimeAsync(180);
    }
    const blocked = dragEvent(); expect(f.controller.start(blocked, f.item)).toBe(false);
    expect(f.log).toHaveBeenCalledWith('drag-blocked', expect.objectContaining({ reason: 'native-grace-capacity' }));
    await vi.advanceTimersByTimeAsync(60000); expect(f.controller.start(dragEvent(), f.item)).toBe(true);
  });
  it('switching hovered images during an export discards A and prepares B sequentially', async () => {
    const a = { id: 1, name: 'A.png' }, b = { id: 2, name: 'B.png' }, job = pending(), revoke = vi.fn();
    const prepare = vi.fn(asked => asked.item === a ? job.promise : Promise.resolve({ file: new File(['B'], 'B.png'), url: 'blob:B' }));
    const controller = createExportDrag({ request: item => ({ item, key: 'same-settings', snapshot: {} }), prepare, notify: vi.fn(), revoke });
    controllers.push(controller); controller.hover(a); await vi.advanceTimersByTimeAsync(180); controller.hover(b);
    expect(prepare).toHaveBeenCalledTimes(1); job.resolve({ file: new File(['A'], 'A.png'), url: 'blob:A' });
    await vi.advanceTimersByTimeAsync(180); expect(revoke).toHaveBeenCalledWith('blob:A'); expect(prepare).toHaveBeenCalledTimes(2);
    const event = dragEvent(); expect(controller.start(event, b)).toBe(true); expect(event.dataTransfer.files[0].name).toBe('B.png');
  });
  it('cancels even when the browser refuses both clearing and constructing the drag payload', async () => {
    const f = track(fixture()); await prepared(f); const event = dragEvent();
    event.dataTransfer.items.clear.mockImplementation(() => { throw new Error('read-only drag data'); });
    expect(f.controller.start(event, f.item)).toBe(false); expect(event.preventDefault).toHaveBeenCalled();
  });
});

describe('mouse-only image drag action', () => {
  beforeEach(() => vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  function nodeStub() {
    const handlers = new Map();
    return { handlers, addEventListener: (type, handler) => handlers.set(type, handler), removeEventListener: type => handlers.delete(type), removeAttribute: vi.fn() };
  }
  it('leaves touch and pen unarmed, arms a primary mouse press, and clears comparison at dragstart', () => {
    const node = nodeStub(), controller = { hover: vi.fn(), leave: vi.fn(), start: vi.fn(), end: vi.fn() }, cancel = vi.fn(), item = { id: 1 };
    const action = exportDragArt(node, { controller, item, mode: 'combined', cancel });
    for (const pointerType of ['touch', 'pen']) {
      node.handlers.get('pointerdown')({ pointerType, button: 0 }); const event = dragEvent(); node.handlers.get('dragstart')(event);
      expect(event.preventDefault).toHaveBeenCalled(); expect(node.draggable).toBe(false);
    }
    expect(controller.start).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    node.handlers.get('pointerdown')({ pointerType: 'mouse', button: 0 }); expect(node.draggable).toBe(true);
    const event = dragEvent(); node.handlers.get('dragstart')(event);
    expect(controller.start).toHaveBeenCalledWith(event, item, 'combined'); expect(cancel).toHaveBeenCalled();
    action.destroy(); expect(node.handlers.size).toBe(0);
  });
  it('does not change draggable attributes or cancel existing gestures when the prototype is disabled', () => {
    const node = nodeStub(), action = exportDragArt(node);
    node.handlers.get('pointerdown')({ pointerType: 'mouse', button: 0 }); node.handlers.get('dragstart')(dragEvent());
    expect(node.draggable).toBeUndefined(); action.destroy();
  });
  it('rejects mouse-shaped events on a mobile capability and never prepares an export', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const node = nodeStub(), controller = { hover: vi.fn(), leave: vi.fn(), start: vi.fn() }, cancel = vi.fn();
    const action = exportDragArt(node, { controller, item: { id: 1 }, cancel });
    node.handlers.get('pointerenter')({ pointerType: 'mouse' }); node.handlers.get('pointerdown')({ pointerType: 'mouse', button: 0 });
    const event = dragEvent(); node.handlers.get('dragstart')(event);
    expect(node.draggable).toBe(false); expect(event.preventDefault).toHaveBeenCalled();
    expect(controller.hover).not.toHaveBeenCalled(); expect(controller.start).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled(); action.destroy();
  });
  it('disarms after mouse release/cancel, touch/pen takeover, and loss of desktop capability', () => {
    let change; const media = { matches: true, addEventListener: (_, fn) => { change = fn; }, removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', () => media);
    const node = nodeStub(), controller = { hover: vi.fn(), leave: vi.fn(), start: vi.fn(), end: vi.fn() }, cancel = vi.fn();
    const action = exportDragArt(node, { controller, item: { id: 1 }, cancel });
    for (const type of ['pointerup', 'pointercancel', 'dragend']) {
      node.handlers.get('pointerdown')({ pointerType: 'mouse', button: 0 }); expect(node.draggable).toBe(true);
      node.handlers.get(type)({}); expect(node.draggable).toBe(false);
    }
    for (const pointerType of ['touch', 'pen']) {
      node.handlers.get('pointerdown')({ pointerType: 'mouse', button: 0 }); node.handlers.get('pointerdown')({ pointerType, button: 0 });
      const event = dragEvent(); node.handlers.get('dragstart')(event); expect(event.preventDefault).toHaveBeenCalled(); expect(node.draggable).toBe(false);
    }
    node.handlers.get('pointerdown')({ pointerType: 'mouse', button: 0 }); media.matches = false; change();
    expect(node.draggable).toBe(false); expect(controller.leave).toHaveBeenCalled();
    expect(controller.start).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled(); action.destroy(); expect(media.removeEventListener).toHaveBeenCalledWith('change', change);
  });
});
