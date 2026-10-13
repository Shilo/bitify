// One observer tracks animated surfaces; stills register nothing. The action
// reports visible until the browser has a measurement (or cannot observe).
let observer;
const listeners = new Map();

export function animationVisibility(node, onchange) {
  let listener;
  function stop() {
    if (!listener) return;
    listeners.delete(node);
    observer?.unobserve(node);
    listener = undefined;
    if (!listeners.size) { observer?.disconnect(); observer = undefined; }
  }
  function update(next) {
    if (next === listener) return;
    stop();
    next?.(true);
    if (!next || typeof IntersectionObserver !== 'function') return;
    if (!observer) {
      try {
        const created = new IntersectionObserver(entries => {
          if (observer !== created) return;
          for (const entry of entries) {
            listeners.get(entry.target)?.(entry.isIntersecting && entry.intersectionRatio > 0);
          }
        // At an edge, isIntersecting can be true with ratio 0. A second threshold
        // requests a new entry when that edge becomes actual visible area.
        }, { threshold: [0, Number.EPSILON] });
        observer = created;
      } catch { return; } // Visibility is an optimization, never required to play.
    }
    listener = next;
    listeners.set(node, listener);
    observer.observe(node);
  }
  update(onchange);
  return { update, destroy: stop };
}
