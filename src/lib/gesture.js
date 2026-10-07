// Turns the stream of wheel events from a mouse or a trackpad into single steps. No DOM.
//
// A notched mouse wheel sends one large move per notch. A trackpad sends many small ones, and
// keeps sending them, fading, for up to a second after the fingers have lifted. `wheelSteps`
// returns a function to call with every move, in pixels, and its time in milliseconds. It
// returns 1 or -1 when the moves so far add up to a step, and 0 otherwise.
//
// `distance` is how far the wheel has to move for a step, `pause` the least time between two
// steps, and `gap` the silence that ends a gesture. They are the knobs to turn if a device
// feels too eager or too slow.
// ponytail: the fading tail is recognised by size alone (under half the gesture's largest
// move), so slowing right down without lifting also stops the steps. Compare each move with
// the few before it if that ever matters.
export function wheelSteps({ distance = 50, pause = 180, gap = 150 } = {}) {
  let sum = 0, peak = 0, went = false, last = -Infinity, stepped = -Infinity;
  return (delta, now) => {
    if (now - last > gap) { sum = 0; peak = 0; went = false; } // a new gesture
    last = now;
    peak = Math.max(peak, Math.abs(delta));
    if (now - stepped < pause) return 0; // however fast the wheel spins
    if (went && Math.abs(delta) < peak / 2) return 0; // the fading tail of a flick that has had its step
    if (sum * delta < 0) sum = 0; // turned round
    sum += delta;
    if (Math.abs(sum) < distance) return 0;
    sum = 0;
    went = true;
    stepped = now;
    return Math.sign(delta);
  };
}
