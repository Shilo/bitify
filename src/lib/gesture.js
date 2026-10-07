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

// Says when the threshold slider is being dragged, which is when the wall draws drafts (see
// Tile.svelte). No DOM.
//
// A drag is moves made with a pointer pressed on the slider. It pauses once the slider has
// rested for `rest` milliseconds, so the image sharpens under a finger that has stopped, and
// goes on with the next move. It ends when the pointer lifts. Moves with no pointer pressed,
// as the arrow keys make, are single steps and never a drag.
//
// `report` is called with true or false each time that changes. `redrawn` returns a promise
// that settles once the wall has redrawn for a move. The rest is timed from then, not from
// the move: a device that takes longer than `rest` to redraw would otherwise be told the
// slider had rested while the finger was still moving, and redraw at full detail every time.
//
// There is one timer at most. Every move and `end` stop it before anything else, so none is
// left running once a drag has ended.
export function sliderDrag(report, redrawn, rest = 150) {
  let pressed = false, dragging = false, timer;
  const say = now => {
    if (now !== dragging) report((dragging = now));
  };
  return {
    press() {
      pressed = true;
    },
    async move() {
      clearTimeout(timer);
      say(pressed);
      if (!pressed) return;
      await redrawn();
      if (!pressed) return; // the drag ended while the wall was redrawing
      clearTimeout(timer); // a later move may have got here first
      timer = setTimeout(() => say(false), rest);
    },
    end() {
      pressed = false;
      clearTimeout(timer);
      say(false);
    },
  };
}
