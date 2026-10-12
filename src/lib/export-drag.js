// No preview/canvas encoder participates in this path.
export const EXPORT_DRAG_TYPE = 'application/x-bitify-export';
// Mobile browsers can report a fine pointer when a mouse is connected.
export function isMobileExportDevice() {
  return navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
const same = (a, b) => !!a && !!b && a.item === b.item && a.key === b.key;

export function createExportDrag({ request, prepare, notify, changed = () => {}, log = () => {},
  delay = 180, grace = 60000, revoke = url => URL.revokeObjectURL(url) }) {
  let desired = null, ready = null, running = null, timer, active = null, disposed = false;
  const retired = new Map();
  const observers = new Set();
  const release = record => { if (record?.url) revoke(record.url); };
  function retire(record) {
    const remaining = (record.until ?? 0) - Date.now();
    if (remaining <= 0) { release(record); return; }
    record.request = null; // Only the file/URL need the native-consumer grace.
    const timeout = setTimeout(() => { retired.delete(record); release(record); }, remaining);
    retired.set(record, timeout);
  }
  const publish = state => {
    changed({ state, name: ready?.file.name ?? desired?.name ?? '' });
    for (const observer of observers) observer();
  };
  function discardReady() {
    if (ready && ready !== active) retire(ready);
    ready = null;
  }
  function valid(record) { return same(record?.request, record && request(record.request.item)); }
  function schedule() {
    clearTimeout(timer);
    if (disposed || running || active || !desired) return;
    const asked = request(desired);
    if (!asked) { desired = null; publish('idle'); return; }
    if (ready && same(ready.request, asked)) { publish('ready'); return; }
    discardReady(); publish('preparing');
    timer = setTimeout(() => run(), delay);
  }
  async function run() {
    timer = undefined;
    if (disposed || running || active || !desired) return;
    const asked = request(desired);
    if (!asked) return;
    running = asked;
    log('prepare-start', { name: asked.item.name, settings: asked.snapshot });
    try {
      // prepare starts synchronously: App's reread must precede its first await.
      const result = await prepare(asked);
      const record = { ...result, request: asked };
      if (disposed || !desired || !same(asked, request(desired))) {
        release(record); log('prepare-discarded', { name: asked.item.name });
      } else {
        discardReady(); ready = record;
        log('ready', { name: record.file.name, type: record.file.type, bytes: record.file.size,
          width: record.width, height: record.height, sha256: record.sha256, settings: asked.snapshot });
        publish('ready');
      }
    } catch (error) {
      log('prepare-error', { name: asked.item.name, code: error.code ?? '', message: error.message });
      if (!disposed && desired && same(asked, request(desired))) {
        desired = null; publish('error');
        notify('Could not prepare drag export. Use Save for details.');
      }
    } finally {
      running = null;
      if (!disposed && desired && !ready) schedule();
    }
  }
  return {
    readyFor(item) { return !disposed && same(ready?.request, request(item)) ? ready : null; },
    subscribe(observer) { observers.add(observer); observer(); return () => observers.delete(observer); },
    hover(item) { if (disposed) return; desired = item; schedule(); },
    cancelHover() { desired = null; clearTimeout(timer); if (!active) publish(ready ? 'ready' : 'idle'); },
    leave(item) { if (desired?.id === item.id) { desired = null; clearTimeout(timer); if (!active) publish(ready ? 'ready' : 'idle'); } },
    refresh() {
      if (disposed) return;
      if (ready && !valid(ready)) { discardReady(); log('invalidated'); publish('idle'); }
      schedule();
    },
    start(event, item, mode = 'combined', source) {
      const asked = request(item);
      if (disposed || active || !event.dataTransfer || !same(ready?.request, asked)) {
        event.preventDefault(); log('drag-blocked', { name: item.name, reason: 'missing-or-stale' });
        if (!disposed) { notify('Preparing full export—wait, then drag again.'); desired = item; schedule(); }
        return false;
      }
      if (retired.size >= 8) {
        event.preventDefault(); log('drag-blocked', { name: item.name, reason: 'native-grace-capacity' });
        notify('Previous drags are still being retained. Wait a minute or use Save.'); return false;
      }
      const transfer = event.dataTransfer;
      try {
        if (mode === 'native' || mode === 'native-only') {
          // The browser must originate the drag from THIS decoded export image.
          // Size/type alone cannot distinguish an old export from the current one.
          const image = source?.image;
          if (source?.record !== ready || !source.decoded || event.target !== image
            || image.src !== ready.url || !image.complete || image.naturalWidth !== ready.width
            || image.naturalHeight !== ready.height || transfer.files.length !== 1
            || transfer.files[0].size !== ready.file.size || transfer.files[0].type !== ready.file.type) {
            throw new Error('Native image is missing, undecoded or stale');
          }
          // clearData removes strings while retaining Chromium's native image bytes.
          // items.clear/add(File) destroys that native representation on Windows.
          transfer.clearData();
        } else transfer.items.clear();
        transfer.effectAllowed = 'copy';
        if (mode !== 'download-url' && mode !== 'native' && mode !== 'native-only') {
          if (!transfer.items.add(ready.file)) throw new Error('Browser rejected the file payload');
        }
        if (mode !== 'file' && mode !== 'native-only') transfer.setData('DownloadURL', `${ready.file.type}:${ready.file.name}:${ready.url}`);
        transfer.setData(EXPORT_DRAG_TYPE, '1');
        active = ready;
        log('drag-start', { name: active.file.name, type: active.file.type, bytes: active.file.size,
          sha256: active.sha256, width: active.width, height: active.height,
          settings: asked.snapshot, mode, trusted: event.isTrusted === true, types: Array.from(transfer.types) });
        publish('dragging');
        return true;
      } catch (error) {
        event.preventDefault();
        try { transfer.items.clear(); } catch { /* The native drag is already canceled. */ }
        log('drag-error', { message: error.message }); notify('This browser could not start the file drag. Use Save.');
        return false;
      }
    },
    end(event) {
      if (!active) return;
      log('drag-end', { dropEffect: event.dataTransfer?.dropEffect ?? 'unknown' });
      // A native consumer may still be reading after dragend. Blur is never cleanup.
      const record = active;
      active = null;
      record.until = Date.now() + grace;
      if (ready !== record) retire(record);
      else if (!valid(record)) discardReady();
      publish('idle'); schedule();
    },
    isOwn(transfer) { return !!active || Array.from(transfer?.types ?? []).includes(EXPORT_DRAG_TYPE); },
    destroy() {
      disposed = true; desired = null; clearTimeout(timer);
      const records = new Set([ready, active, ...retired.keys()]);
      for (const timeout of retired.values()) clearTimeout(timeout);
      for (const record of records) release(record);
      retired.clear(); ready = active = null;
      observers.clear();
    },
  };
}

export function exportDragArt(node, options) {
  let armed = false;
  let source, unsubscribe, controller;
  const nativeMode = () => options?.mode === 'native' || options?.mode === 'native-only';
  function removeSource() { if (source) { source.image.draggable = false; source.image.remove(); } source = undefined; }
  function syncSource() {
    // Native dragend must still reach its source after settings change mid-drag.
    if (source?.dragging) return;
    const record = nativeMode() ? options?.controller?.readyFor(options.item) : null;
    if (source?.record === record) return;
    removeSource();
    if (!record) return;
    const image = node.ownerDocument.createElement('img');
    image.className = 'export-drag-image'; image.alt = ''; image.draggable = false;
    const current = { record, image, decoded: false };
    source = current;
    image.addEventListener('dragend', end);
    image.src = record.url; node.appendChild(image);
    image.decode().then(() => {
      if (source !== current || options?.controller?.readyFor(options.item) !== record) return;
      current.decoded = true;
      image.draggable = armed && capability();
    }).catch(() => { if (source === current) removeSource(); });
  }
  function connect() {
    if (controller !== options?.controller) {
      unsubscribe?.(); controller = options?.controller;
      unsubscribe = controller?.subscribe(syncSource);
    }
    syncSource();
  }
  let desktop, view;
  const disarm = () => { armed = false; if (source) source.image.draggable = false; if (options?.controller) node.draggable = false; };
  const capabilityChanged = () => { if (!desktop.matches) { disarm(); options?.controller?.leave(options.item); } };
  function capability() {
    if (!desktop && options?.controller) {
      desktop = matchMedia('(hover: hover) and (pointer: fine)');
      desktop.addEventListener('change', capabilityChanged);
      view = node.ownerDocument?.defaultView;
      view?.addEventListener('pointerup', disarm);
      view?.addEventListener('pointercancel', disarm);
      view?.addEventListener('blur', disarm);
    }
    return desktop?.matches === true && !isMobileExportDevice();
  }
  function mouse(event) { return event.pointerType === 'mouse' && event.isPrimary !== false && capability(); }
  const enter = event => {
    if (options?.controller && mouse(event)) options.controller.hover(options.item);
    else if (options?.controller) { disarm(); options.controller.leave(options.item); }
  };
  // Keep a pressed mouse armed across the edge until native drag reaches its
  // threshold. Window release/cancel also clears presses ending outside the art.
  const leave = () => options?.controller?.leave(options.item);
  const down = event => {
    armed = !!options?.controller && mouse(event) && event.button === 0 && !event.defaultPrevented;
    if (options?.controller) node.draggable = armed && !nativeMode();
    if (source) source.image.draggable = armed && source.decoded && capability();
    if (armed) options.controller.hover(options.item);
    else options?.controller?.leave(options.item);
  };
  const start = event => {
    if (!options?.controller) return;
    if (!armed || !capability() || event.defaultPrevented) { disarm(); event.preventDefault(); return; }
    options.cancel();
    if (nativeMode()) { if (options.controller.start(event, options.item, options.mode, source)) source.dragging = true; }
    else options.controller.start(event, options.item, options.mode);
  };
  const end = event => { if (source) source.dragging = false; disarm(); options?.controller?.end(event); syncSource(); };
  const listeners = { pointerenter: enter, pointerleave: leave, pointerdown: down, pointerup: disarm, pointercancel: disarm, dragstart: start, dragend: end };
  for (const [type, handler] of Object.entries(listeners)) node.addEventListener(type, handler);
  connect();
  return {
    update(value) { disarm(); options = value; connect(); if (!options?.controller) node.removeAttribute('draggable'); },
    destroy() {
      disarm(); leave(); unsubscribe?.(); removeSource(); desktop?.removeEventListener('change', capabilityChanged);
      for (const type of ['pointerup', 'pointercancel', 'blur']) view?.removeEventListener(type, disarm);
      for (const [type, handler] of Object.entries(listeners)) node.removeEventListener(type, handler);
    },
  };
}

export async function exportFingerprint(file) {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
