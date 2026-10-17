// Internal text/link drags must not look like external artwork imports. Do not
// cancel dragstart: optimized native export drags must still leave the window.
const active = new WeakSet(), internalDrops = new WeakSet();
export const isInternalDrag = event => internalDrops.has(event)
  || active.has(event.currentTarget?.document || event.currentTarget?.ownerDocument || event.target?.ownerDocument);

export function trackInternalDrag(doc, started = () => {}) {
  const start = event => {
    active.add(doc); started();
    // A canceled native start has no dragend. Do not poison the next import.
    queueMicrotask(() => { if (event.defaultPrevented) active.delete(doc); });
  };
  const end = () => active.delete(doc);
  const drop = event => { if (active.has(doc)) internalDrops.add(event); end(); };
  // Capture sees drags even when a control or dialog stops propagation. Keep
  // identity across window blur, which is normal during an external native drop.
  const capture = { capture: true };
  doc.addEventListener('dragstart', start, capture);
  doc.addEventListener('dragend', end, capture);
  doc.addEventListener('drop', drop, capture);
  return () => {
    end(); doc.removeEventListener('dragstart', start, capture);
    doc.removeEventListener('dragend', end, capture); doc.removeEventListener('drop', drop, capture);
  };
}
