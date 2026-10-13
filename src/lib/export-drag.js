// No preview/canvas encoder participates in this path.
export const EXPORT_DRAG_TYPE = 'application/x-bitify-export';
// Mobile browsers can report a fine pointer when a mouse is connected.
export function isMobileExportDevice() {
  return navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
const same = (a, b) => !!a && !!b && a.item === b.item && a.key === b.key;

export function createExportDrag({ request, prepare, notify,
  delay = 180, grace = 60000, revoke = url => URL.revokeObjectURL(url) }) {
  let desired = null, ready = null, running = null, timer, leaveTimer, active = null, disposed = false;
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
  const publish = () => {
    for (const observer of observers) observer();
  };
  function discardReady() {
    if (ready && ready !== active) retire(ready);
    ready = null;
  }
  function valid(record) { return same(record?.request, record && request(record.request.item)); }
  function schedule() {
    clearTimeout(timer);
    clearTimeout(leaveTimer); leaveTimer = undefined;
    if (running && !same(running.asked, desired && request(desired))) running.controller.abort();
    if (disposed || running || active || !desired) return;
    const asked = request(desired);
    if (!asked) { desired = null; publish(); return; }
    if (ready && same(ready.request, asked)) { publish(); return; }
    discardReady(); publish();
    timer = setTimeout(() => run(), delay);
  }
  async function run() {
    timer = undefined;
    if (disposed || running || active || !desired) return;
    const asked = request(desired);
    if (!asked) return;
    const controller = new AbortController();
    const operation = { asked, controller };
    running = operation;
    try {
      // prepare starts synchronously: App's reread must precede its first await.
      // Module imports cannot be canceled. Free the hover queue immediately on
      // abort, while releasing any file URL an obsolete preparation returns later.
      const result = await new Promise((resolve, reject) => {
        const signal = controller.signal;
        const cancel = () => { signal.removeEventListener('abort', cancel); reject(new DOMException('The drag preparation was canceled.', 'AbortError')); };
        signal.addEventListener('abort', cancel, { once: true });
        try {
          Promise.resolve(prepare(asked, { signal })).then(result => {
            signal.removeEventListener('abort', cancel);
            if (signal.aborted) release(result);
            else resolve(result);
          }, error => { signal.removeEventListener('abort', cancel); reject(error); });
        } catch (error) { signal.removeEventListener('abort', cancel); reject(error); }
      });
      const record = { ...result, request: asked };
      if (controller.signal.aborted || disposed || !desired || !same(asked, request(desired))) {
        release(record);
      } else {
        discardReady(); ready = record;
        publish();
      }
    } catch {
      if (!controller.signal.aborted && !disposed && desired && same(asked, request(desired))) {
        desired = null; publish();
        notify('Could not prepare drag export. Use Save for details.');
      }
    } finally {
      if (running === operation) running = null;
      if (!disposed && desired && !ready) schedule();
    }
  }
  return {
    readyFor(item) { return !disposed && ready && same(ready.request, request(item)) ? ready : null; },
    subscribe(observer) { observers.add(observer); observer(); return () => observers.delete(observer); },
    hover(item) { if (disposed) return; desired = item; schedule(); },
    cancelHover() { desired = null; clearTimeout(timer); clearTimeout(leaveTimer); leaveTimer = undefined; running?.controller.abort(); if (!active) publish(); },
    leave(item) {
      if (desired?.id !== item.id) return;
      desired = null; clearTimeout(timer);
      // Brief mouse exits can return to this same in-flight request. Queued
      // work stops at once; settings, another hover and explicit cancel still
      // invalidate immediately. Completion while away retains its discard rule.
      const operation = running;
      clearTimeout(leaveTimer);
      if (operation) leaveTimer = setTimeout(() => {
        leaveTimer = undefined;
        if (running === operation && !desired) operation.controller.abort();
      }, delay);
      if (!active) publish();
    },
    refresh() {
      if (disposed) return;
      if (ready && !valid(ready)) { discardReady(); publish(); }
      schedule();
    },
    start(event, item, source) {
      const asked = request(item);
      if (disposed || active || !event.dataTransfer || !same(ready?.request, asked)) {
        event.preventDefault();
        if (!disposed) { notify('Preparing full export—wait, then drag again.'); desired = item; schedule(); }
        return false;
      }
      if (retired.size >= 8) {
        event.preventDefault();
        notify('Previous drags are still being retained. Wait a minute or use Save.'); return false;
      }
      const transfer = event.dataTransfer;
      try {
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
        transfer.effectAllowed = 'copy';
        transfer.setData('DownloadURL', `${ready.file.type}:${ready.file.name}:${ready.url}`);
        transfer.setData(EXPORT_DRAG_TYPE, '1');
        active = ready;
        publish();
        return true;
      } catch {
        event.preventDefault();
        try { transfer.items.clear(); } catch { /* The native drag is already canceled. */ }
        notify('This browser could not start the file drag. Use Save.');
        return false;
      }
    },
    end() {
      if (!active) return;
      // A native consumer may still be reading after dragend. Blur is never cleanup.
      const record = active;
      active = null;
      record.until = Date.now() + grace;
      if (ready !== record) retire(record);
      else if (!valid(record)) discardReady();
      publish(); schedule();
    },
    isOwn(transfer) { return !!active || Array.from(transfer?.types ?? []).includes(EXPORT_DRAG_TYPE); },
    destroy() {
      disposed = true; desired = null; clearTimeout(timer); clearTimeout(leaveTimer); leaveTimer = undefined;
      running?.controller.abort();
      const records = new Set([ready, active, ...retired.keys()]);
      for (const timeout of retired.values()) clearTimeout(timeout);
      for (const record of records) release(record);
      retired.clear(); ready = active = null;
      observers.clear();
    },
  };
}

export function exportDragArt(node, options) {
  let armed = false, destroyed = false;
  let source, unsubscribe, controller;
  function removeSource() { if (source) { source.image.draggable = false; source.image.remove(); } source = undefined; }
  function syncSource() {
    if (destroyed) return;
    // Native dragend must still reach its source after settings change mid-drag.
    if (source?.dragging) return;
    const record = options?.controller?.readyFor(options.item);
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
    if (options?.controller) node.draggable = false;
    if (source) source.image.draggable = armed && source.decoded && capability();
    if (armed) options.controller.hover(options.item);
    else options?.controller?.leave(options.item);
  };
  const start = event => {
    if (!options?.controller) return;
    if (!armed || !capability() || event.defaultPrevented) { disarm(); event.preventDefault(); return; }
    options.cancel();
    if (options.controller.start(event, options.item, source)) source.dragging = true;
  };
  const end = () => { if (source) source.dragging = false; disarm(); options?.controller?.end(); syncSource(); };
  const listeners = { pointerenter: enter, pointerleave: leave, pointerdown: down, pointerup: disarm, pointercancel: disarm, dragstart: start, dragend: end };
  for (const [type, handler] of Object.entries(listeners)) node.addEventListener(type, handler);
  connect();
  return {
    update(value) { disarm(); options = value; connect(); if (!options?.controller) node.removeAttribute('draggable'); },
    destroy() {
      destroyed = true;
      disarm(); leave(); unsubscribe?.(); removeSource(); desktop?.removeEventListener('change', capabilityChanged);
      for (const type of ['pointerup', 'pointercancel', 'blur']) view?.removeEventListener(type, disarm);
      for (const [type, handler] of Object.entries(listeners)) node.removeEventListener(type, handler);
    },
  };
}
