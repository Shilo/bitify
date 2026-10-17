import { IMAGE_HOLD_MS } from './image-gesture.js';

export const MIN_VIEWER_ZOOM = 0.25;
export const MAX_VIEWER_ZOOM = 16;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Coordinates are CSS pixels relative to the viewport center; scale 1 is Fit.
export function constrainView(view, geometry) {
  const scale = clamp(view.scale, MIN_VIEWER_ZOOM, MAX_VIEWER_ZOOM);
  const limitX = Math.max(0, (geometry.imageWidth * scale - geometry.width) / 2);
  const limitY = Math.max(0, (geometry.imageHeight * scale - geometry.height) / 2);
  return { scale, x: clamp(view.x, -limitX, limitX), y: clamp(view.y, -limitY, limitY) };
}

export function zoomView(view, scale, from, to, geometry) {
  scale = clamp(scale, MIN_VIEWER_ZOOM, MAX_VIEWER_ZOOM);
  const ratio = scale / view.scale;
  return constrainView({ scale, x: to.x - (from.x - view.x) * ratio, y: to.y - (from.y - view.y) * ratio }, geometry);
}

// All fingers in a sequence share dismissal ownership. Lifting one finger after
// a pinch rebases the remaining drag, but can never arm a new tap.
export function viewerNavigation({ onchange = () => {}, onhold = () => {}, onclose = () => {}, canClose = () => true } = {}) {
  let geometry = { width: 1, height: 1, imageWidth: 1, imageHeight: 1 };
  let view = { scale: 1, x: 0, y: 0 };
  const pointers = new Map();
  let tap, previous, ready = false, holdTimer, node;
  const publish = () => onchange({ ...view, dragging: pointers.size > 0 && !tap });
  const stopHold = () => { clearTimeout(holdTimer); onhold(false); };
  const sample = () => {
    const [a, b] = [...pointers.values()];
    if (!a) return null;
    return b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) } : { ...a, distance: 0 };
  };
  const relative = point => ({ x: point.x - geometry.width / 2, y: point.y - geometry.height / 2 });
  const api = {
    get view() { return { ...view }; },
    get active() { return pointers.size > 0; },
    get canHold() { return !!tap; },
    resize(next) {
      if (Object.keys(next).every(key => next[key] === geometry[key])) return;
      api.cancel(); geometry = next; view = constrainView(view, geometry); publish();
    },
    down(e) {
      ready = false;
      if ((e.button ?? 0) !== 0) { api.cancel(); return false; }
      if (!pointers.size) {
        tap = e.isPrimary !== false ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp } : null;
        if (tap) holdTimer = setTimeout(() => { if (tap) onhold(true); }, IMAGE_HOLD_MS);
      } else { tap = null; stopHold(); }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); previous = sample(); publish(); return true;
    },
    move(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) { tap = null; stopHold(); }
      const next = sample();
      if (!tap && previous) {
        const ratio = previous.distance > 0 && next.distance > 0 ? next.distance / previous.distance : 1;
        view = zoomView(view, view.scale * ratio, relative(previous), relative(next), geometry);
      }
      previous = next; publish();
    },
    up(e, overArt = true) {
      if (!pointers.has(e.pointerId)) return;
      api.move(e);
      ready = !!tap && tap.id === e.pointerId && overArt && e.timeStamp >= tap.at && e.timeStamp - tap.at < IMAGE_HOLD_MS;
      tap = null; stopHold(); pointers.delete(e.pointerId); previous = sample(); publish();
    },
    click(keyboard = false) {
      const close = !pointers.size && (keyboard || ready) && canClose(); ready = false;
      if (close) onclose(); return close;
    },
    cancel() {
      tap = null; ready = false; previous = null; stopHold();
      const ids = [...pointers.keys()]; pointers.clear();
      for (const id of ids) if (node?.hasPointerCapture(id)) node.releasePointerCapture(id);
      publish();
    },
    zoomBy(factor, point = { x: geometry.width / 2, y: geometry.height / 2 }) {
      tap = null; ready = false; stopHold();
      view = zoomView(view, view.scale * factor, relative(point), relative(point), geometry); publish();
    },
    panBy(x, y) { tap = null; ready = false; stopHold(); view = constrainView({ ...view, x: view.x + x, y: view.y + y }, geometry); publish(); },
    reset() { api.cancel(); view = { scale: 1, x: 0, y: 0 }; publish(); },
    attach(element, initial) {
      node = element; api.resize(initial);
      const art = e => !!e.target.closest('.viewer-art');
      const point = e => { const r = node.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const overArt = e => !!node.ownerDocument.elementFromPoint(e.clientX, e.clientY)?.closest('.viewer-art');
      const down = e => {
        if (!art(e)) { if (api.active) api.cancel(); return; }
        e.stopPropagation();
        const p = point(e);
        if (api.down({ ...p, clientX: p.x, clientY: p.y, pointerId: e.pointerId, button: e.button, isPrimary: e.isPrimary, timeStamp: e.timeStamp })) node.setPointerCapture(e.pointerId);
      };
      const move = e => {
        if (!pointers.has(e.pointerId)) return;
        e.stopPropagation(); const p = point(e); api.move({ pointerId: e.pointerId, clientX: p.x, clientY: p.y });
      };
      const up = e => {
        if (!pointers.has(e.pointerId)) return;
        e.stopPropagation(); const p = point(e);
        api.up({ pointerId: e.pointerId, clientX: p.x, clientY: p.y, timeStamp: e.timeStamp }, overArt(e));
        if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
      };
      const cancel = e => { if (!e || pointers.has(e.pointerId)) api.cancel(); };
      const click = e => {
        // Captured pointer clicks target the dialog. Controls remain ordinary buttons.
        if (e.target.closest('.viewer-workspace,.viewer-zoom,.viewer-toast')) return;
        e.stopPropagation(); api.click(e.detail === 0);
      };
      const wheel = e => {
        if (!art(e)) return;
        e.preventDefault(); e.stopPropagation();
        const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? geometry.height : 1);
        api.zoomBy(Math.exp(-clamp(delta, -240, 240) * 0.0025), point(e));
      };
      const keydown = e => {
        if (!node.open || node.ownerDocument.querySelector('dialog.palette-import-modal[open]') || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
        // Tile reserves Enter for its own activation callback. Preview owns the
        // close action instead; adding Tile's callback would add its Add caption.
        if (e.key === 'Enter' && e.target.closest('.viewer-art .art') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault(); e.stopPropagation();
          if (!e.repeat) api.click(true);
          return;
        }
        if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault(); e.stopPropagation();
          if (e.key === '0') api.reset();
          else if (e.key.startsWith('Arrow')) api.panBy(e.key === 'ArrowLeft' ? 48 : e.key === 'ArrowRight' ? -48 : 0, e.key === 'ArrowUp' ? 48 : e.key === 'ArrowDown' ? -48 : 0);
          else api.zoomBy(e.key === '-' ? 1 / 1.25 : 1.25);
        }
      };
      const drag = e => { if (art(e)) { e.preventDefault(); api.cancel(); } };
      const hidden = () => { if (document.hidden) api.cancel(); };
      const events = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel], ['lostpointercapture', cancel], ['click', click], ['dragstart', drag]];
      for (const [name, fn] of events) node.addEventListener(name, fn, true);
      node.addEventListener('wheel', wheel, { passive: false });
      window.addEventListener('keydown', keydown, true); window.addEventListener('blur', api.cancel); document.addEventListener('visibilitychange', hidden);
      return { update: api.resize, destroy() {
        api.cancel();
        for (const [name, fn] of events) node.removeEventListener(name, fn, true);
        node.removeEventListener('wheel', wheel); window.removeEventListener('keydown', keydown, true); window.removeEventListener('blur', api.cancel); document.removeEventListener('visibilitychange', hidden); node = null;
      } };
    },
  };
  return api;
}
