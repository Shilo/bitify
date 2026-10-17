// Independent regression for the benchmark's repeated init-script installation.
// This tests the test harness, not app code or device performance.
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { writeFile } from 'node:fs/promises';
import { instrumentation } from '../practical-workloads-2026-10-16/workflows.mjs';

function check(source) {
  const counters = { rafLoops: 0, observers: 0 };
  class Context {
    constructor() { this.canvas = { closest: () => true }; }
    putImageData() {}
  }
  const environment = {
    CanvasRenderingContext2D: Context,
    PerformanceObserver: class {
      constructor() { counters.observers++; }
      observe() {}
    },
    requestAnimationFrame: () => { counters.rafLoops++; },
    performance: { now: () => 0 },
  };
  runInNewContext(`const install = (${source}); install(); install(); new CanvasRenderingContext2D().putImageData();`, environment);
  return { ...counters, writesPerNativePaint: environment.__practical.writes };
}

const fixed = check(instrumentation.toString());
const prior = check(instrumentation.toString().replace('if(globalThis.__practical)return;', ''));
assert.deepEqual(prior, { rafLoops: 2, observers: 2, writesPerNativePaint: 2 });
assert.deepEqual(fixed, { rafLoops: 1, observers: 1, writesPerNativePaint: 1 });
await writeFile(new URL('instrumentation-check.json', import.meta.url), JSON.stringify({
  scope: 'Mocked harness-installation check; no app or device timing claim', prior, fixed,
}, null, 2) + '\n');
console.log(JSON.stringify({ prior, fixed }));
