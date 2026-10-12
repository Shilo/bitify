import { describe, it, expect, vi, afterEach } from 'vitest';
import { wheelSteps, sliderDrag, pausedCommit } from './gesture.js';

// Feeds [delta, time] moves to a fresh stepper and returns the steps that came out.
const run = moves => {
  const step = wheelSteps();
  return moves.map(([delta, now]) => step(delta, now)).filter(Boolean);
};

describe('paused expensive-setting commits', () => {
  afterEach(() => vi.useRealTimers());
  const setup = () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    return { commit, slider: pausedCommit(commit) };
  };
  it('commits after 200ms of rest while preserving the captured context', () => {
    const {commit, slider} = setup(), palette = {};
    slider.schedule(8, palette);
    vi.advanceTimersByTime(199); expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(commit).toHaveBeenCalledExactlyOnceWith(8, palette);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('coalesces rapid movement into the latest value with one timer', () => {
    const {commit, slider} = setup();
    for (let value = 2; value <= 64; value++) {
      slider.schedule(value, 'palette');
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(50);
    }
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150); expect(commit).toHaveBeenCalledExactlyOnceWith(64, 'palette');
  });
  it('flushes immediately and never repeats after release/change', () => {
    const {commit, slider} = setup();
    slider.schedule(16, 'palette'); slider.flush(); slider.flush();
    vi.advanceTimersByTime(1000);
    expect(commit).toHaveBeenCalledExactlyOnceWith(16, 'palette');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('allows further movement after a pause without repeating the paused value', () => {
    const {commit, slider} = setup();
    slider.schedule(8, 'palette'); vi.advanceTimersByTime(200);
    slider.schedule(12, 'palette'); slider.flush();
    vi.advanceTimersByTime(200);
    expect(commit.mock.calls).toEqual([[8,'palette'],[12,'palette']]);
  });
  it('discards pending work when closing, switching, canceling, All or Reset', () => {
    const {commit, slider} = setup();
    slider.schedule(4, 'old palette'); slider.cancel(); slider.flush();
    vi.advanceTimersByTime(200); expect(commit).not.toHaveBeenCalled();
    slider.schedule(32, 'new palette'); vi.advanceTimersByTime(200);
    expect(commit).toHaveBeenCalledExactlyOnceWith(32, 'new palette');
  });
  it('does not discard a new gesture scheduled by the callback', () => {
    vi.useFakeTimers();
    const values = [], slider = pausedCommit(value => {
      values.push(value);
      if (value === 2) slider.schedule(3, 'next');
    });
    slider.schedule(2, 'first'); slider.flush(); vi.advanceTimersByTime(200);
    expect(values).toEqual([2,3]); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('wheelSteps', () => {
  it('takes one step per notch of a mouse wheel, in its direction', () => {
    expect(run([[100, 0], [100, 400], [-100, 800]])).toEqual([1, 1, -1]);
  });

  it('adds up the small moves of a trackpad', () => {
    expect(run([[12, 0], [12, 16], [12, 32], [12, 48]])).toEqual([]);
    expect(run([[12, 0], [12, 16], [12, 32], [12, 48], [12, 64]])).toEqual([1]);
  });

  it('starts again from nothing when the direction turns round', () => {
    expect(run([[40, 0], [-40, 16], [40, 32]])).toEqual([]);
  });

  it('forgets a move that was not finished once the wheel has gone quiet', () => {
    expect(run([[40, 0], [40, 500]])).toEqual([]);
  });

  it('never steps faster than one step per pause, however fast the wheel spins', () => {
    const spin = Array.from({ length: 26 }, (_, i) => [100, i * 20]); // half a second of notches
    expect(run(spin)).toEqual([1, 1, 1]); // at 0, 180 and 360 ms
  });

  it('takes one step for a trackpad flick, not one for every stretch of its fading tail', () => {
    const fingers = [10, 25, 40, 50, 40].map((delta, i) => [delta, i * 16]);
    const tail = Array.from({ length: 60 }, (_, i) => [40 * 0.93 ** (i + 1), 80 + i * 16]);
    expect(run([...fingers, ...tail])).toEqual([1]);
  });

  it('steps again for a second flick', () => {
    const flick = at => [10, 25, 40, 50, 40].map((delta, i) => [delta, at + i * 16]);
    expect(run([...flick(0), ...flick(600)])).toEqual([1, 1]);
  });
});

describe('sliderDrag', () => {
  // `says` collects what the drag reports; `redrawn` stands for the wall redrawing after a move.
  function setup(redrawn = () => Promise.resolve()) {
    vi.useFakeTimers();
    const says = [], drag = sliderDrag(now => says.push(now), redrawn, 150);
    return { says, drag };
  }
  afterEach(() => vi.useRealTimers());

  it('is a drag from the first move with a pointer pressed until the pointer lifts', async () => {
    const { says, drag } = setup();
    drag.press();
    expect(says).toEqual([]); // pressing alone changes nothing
    await drag.move();
    await drag.move();
    expect(says).toEqual([true]);
    drag.end();
    expect(says).toEqual([true, false]);
  });

  it('is never a drag without a pointer pressed, as with the arrow keys', async () => {
    const { says, drag } = setup();
    await drag.move();
    drag.end();
    await drag.move();
    vi.advanceTimersByTime(1000);
    expect(says).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses when the slider rests under the pointer, and goes on with the next move', async () => {
    const { says, drag } = setup();
    drag.press();
    await drag.move();
    vi.advanceTimersByTime(149);
    expect(says).toEqual([true]);
    vi.advanceTimersByTime(1);
    expect(says).toEqual([true, false]); // rested: the wall sharpens, the pointer still down
    await drag.move();
    expect(says).toEqual([true, false, true]);
  });

  it('starts the rest again at every move, with never more than one timer', async () => {
    const { says, drag } = setup();
    drag.press();
    for (let i = 0; i < 20; i++) {
      await drag.move();
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(100); // always short of the rest
    }
    expect(says).toEqual([true]);
  });

  it('leaves no timer behind when the drag ends, and reports nothing afterwards', async () => {
    const { says, drag } = setup();
    drag.press();
    await drag.move();
    drag.end();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(says).toEqual([true, false]);
    drag.end(); // ending twice, as release and the final value both do, says nothing more
    expect(says).toEqual([true, false]);
  });

  it('times the rest from the end of the redraw, so a slow redraw does not end the drag', async () => {
    let done;
    const { says, drag } = setup(() => new Promise(resolve => (done = resolve)));
    drag.press();
    const moving = drag.move();
    vi.advanceTimersByTime(5000); // the redraw takes far longer than the rest
    expect(says).toEqual([true]);
    expect(vi.getTimerCount()).toBe(0);
    done();
    await moving;
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(150);
    expect(says).toEqual([true, false]);
  });

  it('starts no timer if the drag ended while the wall was redrawing', async () => {
    let done;
    const { says, drag } = setup(() => new Promise(resolve => (done = resolve)));
    drag.press();
    const moving = drag.move();
    drag.end();
    done();
    await moving;
    expect(vi.getTimerCount()).toBe(0);
    expect(says).toEqual([true, false]);
  });

  it('keeps one timer when moves overlap their redraws', async () => {
    const waiting = [];
    const { says, drag } = setup(() => new Promise(resolve => waiting.push(resolve)));
    drag.press();
    const first = drag.move(), second = drag.move();
    waiting[0](); await first;
    waiting[1](); await second;
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(150);
    expect(says).toEqual([true, false]);
  });
});
