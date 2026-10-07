import { describe, it, expect } from 'vitest';
import { wheelSteps } from './gesture.js';

// Feeds [delta, time] moves to a fresh stepper and returns the steps that came out.
const run = moves => {
  const step = wheelSteps();
  return moves.map(([delta, now]) => step(delta, now)).filter(Boolean);
};

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
