// Shared Svelte action for hover, keyboard focus and touch holds. Global listeners are shared
// across every control and tile; only the active tooltip handles movement and dismissal.
let active, count = 0, nextId = 0, touchInput = false, removeGlobal;
const listen = (target, type, handler, options) => {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
};
function globalListeners() {
  const hide = () => active?.hide();
  const off = [
    listen(window, 'pointerdown', e => {
      if (active?.containsTip(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation(); // clicking a tooltip must not close its panel or dialog
        return;
      }
      touchInput = e.pointerType === 'touch';
      hide();
    }, true),
    listen(window, 'pointermove', e => active?.move(e), { passive: true }),
    listen(window, 'pointerup', e => active?.release(e), { passive: false }),
    listen(window, 'pointercancel', e => active?.cancel(e)),
    listen(window, 'keydown', e => {
      touchInput = false;
      if (e.key !== 'Escape' || !active?.visible()) return;
      hide();
      e.preventDefault();
      e.stopImmediatePropagation(); // first dismiss the tooltip, then its panel or dialog
    }, true),
    listen(document, 'scroll', hide, true),
    listen(window, 'resize', hide),
    listen(window, 'blur', hide),
  ];
  if (window.visualViewport) {
    off.push(listen(window.visualViewport, 'resize', hide), listen(window.visualViewport, 'scroll', hide));
  }
  return () => off.forEach(remove => remove());
}

export function tooltip(node, text) {
  if (!count++) removeGlobal = globalListeners();
  const tip = document.createElement('div');
  tip.id = `tooltip-${++nextId}`;
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = text;
  tip.hidden = true;
  // A popover lives above clipping/scrolling containers and modal dialogs. Keeping it inside
  // its dialog also keeps it in that dialog's accessible, non-inert subtree.
  const dialog = node.closest('dialog');
  const topLayer = typeof tip.showPopover === 'function';
  if (topLayer) tip.setAttribute('popover', 'manual');
  (dialog ?? document.body).append(tip);
  node.setAttribute('data-tooltip', '');
  const described = node.matches('label') ? node.querySelector('input') ?? node : node;
  const descriptions = () => (described.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  described.setAttribute('aria-describedby', [...descriptions(), tip.id].join(' '));

  let timer, leaveTimer, press, suppressClick = false;
  const control = { hide, move, release, cancel, visible: () => !tip.hidden, containsTip: target => tip.contains(target) };
  const activate = () => {
    if (active !== control) active?.hide();
    active = control;
  };
  function hide() {
    clearTimeout(timer);
    clearTimeout(leaveTimer);
    if (press) suppressClick = true;
    press = null;
    if (topLayer && tip.matches(':popover-open')) tip.hidePopover();
    tip.hidden = true;
    if (active === control) active = null;
  }
  function position() {
    const view = window.visualViewport;
    const left = view?.offsetLeft ?? 0, top = view?.offsetTop ?? 0;
    const right = left + (view?.width ?? innerWidth), bottom = top + (view?.height ?? innerHeight);
    tip.style.maxWidth = `${Math.min(240, right - left - 16)}px`;
    const rect = node.getBoundingClientRect(), box = tip.getBoundingClientRect();
    const x = Math.max(left + 8, Math.min(rect.left + (rect.width - box.width) / 2, right - box.width - 8));
    const y = rect.top - box.height - 8 >= top + 8 ? rect.top - box.height - 8 : rect.bottom + 8;
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(top + 8, Math.min(y, bottom - box.height - 8))}px`;
  }
  function show() {
    clearTimeout(timer);
    clearTimeout(leaveTimer);
    if (!text || (dialog && !dialog.open)) return hide();
    activate();
    tip.hidden = false;
    if (topLayer && !tip.matches(':popover-open')) tip.showPopover();
    position();
  }
  function move(e) {
    if (press?.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) >= 8) hide();
  }
  function release(e) {
    if (press?.id !== e.pointerId) return;
    clearTimeout(timer);
    press = null;
    if (suppressClick) e.preventDefault(); // the held tooltip stays readable after release
    else hide();
  }
  function cancel(e) { if (press?.id === e.pointerId) hide(); }
  const leave = e => {
    if (e.pointerType !== 'mouse' || press || touchInput) return;
    if (node.contains(e.relatedTarget) || tip.contains(e.relatedTarget)) return;
    clearTimeout(timer);
    leaveTimer = setTimeout(hide, 100); // allow crossing the gap into the tooltip
  };
  const cleanup = [
    listen(node, 'pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      touchInput = false;
      activate();
      clearTimeout(timer);
      clearTimeout(leaveTimer);
      timer = setTimeout(show, 350);
    }),
    listen(node, 'pointerleave', leave),
    listen(tip, 'pointerenter', () => clearTimeout(leaveTimer)),
    listen(tip, 'pointerleave', leave),
    listen(node, 'focusin', e => { if (!touchInput && e.target.matches(':focus-visible')) show(); }),
    listen(node, 'focusout', e => { if (!node.contains(e.relatedTarget) && !touchInput) hide(); }),
    listen(node, 'pointerdown', e => {
      touchInput = e.pointerType === 'touch';
      suppressClick = false;
      if (!touchInput || !e.isPrimary) return;
      activate();
      press = { id: e.pointerId, x: e.clientX, y: e.clientY };
      timer = setTimeout(() => { suppressClick = true; show(); }, 500);
    }),
    listen(node, 'click', e => {
      if (!suppressClick) return hide();
      e.preventDefault();
      e.stopImmediatePropagation(); // suppress buttons, links and forwarded color-input clicks
    }, true),
    listen(node, 'keydown', () => { suppressClick = false; }),
    listen(node, 'contextmenu', e => { if (touchInput) e.preventDefault(); }),
    // Hovering the tooltip must not activate a dialog's "any click closes" behavior.
    listen(tip, 'click', e => { e.preventDefault(); e.stopPropagation(); }),
  ];
  if (dialog) cleanup.push(listen(dialog, 'close', hide));
  return {
    update(value) {
      text = value;
      tip.textContent = text;
      if (!text) hide();
      else if (!tip.hidden) position();
    },
    destroy() {
      hide();
      cleanup.forEach(remove => remove());
      const remaining = descriptions().filter(id => id !== tip.id);
      if (remaining.length) described.setAttribute('aria-describedby', remaining.join(' '));
      else described.removeAttribute('aria-describedby');
      node.removeAttribute('data-tooltip');
      tip.remove();
      if (!--count) { removeGlobal(); touchInput = false; }
    },
  };
}
