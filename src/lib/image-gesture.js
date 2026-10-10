// A quick stationary press opens the image. Holding compares; dragging belongs
// to scrolling/swiping. One pointer owns a sequence, so multitouch never opens.
export const IMAGE_HOLD_MS = 150;
export function imageGesture() {
  let start;
  return {
    press(e) { start = e.isPrimary !== false && (e.button ?? 0) === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp, moved: false } : null; },
    move(e) { if (start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) start.moved = true; },
    canHold() { return !!start && !start.moved; },
    release(e) {
      const open = !!start && e.pointerId === start.id && !start.moved && e.timeStamp >= start.at && e.timeStamp - start.at < IMAGE_HOLD_MS;
      start = null;
      return open;
    },
    cancel() { start = null; },
  };
}
