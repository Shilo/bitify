// A click can be retargeted to <dialog> when a selection starts in its input
// and ends on the backdrop. Dismiss only a complete backdrop pointer gesture.
export function backdropDismiss(node, dismiss = () => node.close()) {
  const doc = node.ownerDocument, view = doc.defaultView;
  let press = null, ready = false;
  const clear = () => { press = null; ready = false; };
  function backdrop(event, hitTest = false) {
    if (node.classList.contains('glass-modal-overlay')) {
      const target = hitTest ? doc.elementFromPoint(event.clientX, event.clientY) : event.target;
      return target === node;
    }
    const rect = node.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom;
  }
  function down(event) {
    clear();
    if (node.open && event.isPrimary !== false && event.button === 0 && backdrop(event)) {
      press = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }
  function up(event) {
    ready = !!press && event.isPrimary !== false && event.button === 0 && event.pointerId === press.id
      && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8 && backdrop(event, true);
    press = null;
  }
  function click(event) {
    const close = node.open && ready && backdrop(event);
    clear();
    if (close) dismiss();
  }
  const blur = event => { if (event.target === view) clear(); };
  const listeners = [[view, 'pointerdown', down], [view, 'pointerup', up], [view, 'pointercancel', clear],
    [view, 'blur', blur], [node, 'click', click], [node, 'close', clear], [node, 'cancel', clear]];
  const capture = { capture: true };
  for (const [target, type, listener] of listeners) target.addEventListener(type, listener, capture);
  return {
    update(value) { dismiss = value || (() => node.close()); },
    destroy() { clear(); for (const [target, type, listener] of listeners) target.removeEventListener(type, listener, capture); },
  };
}
