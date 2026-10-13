// Research only: measure existing single-frame preparation, independently of worker round trips.
import { analyze, unify } from '../src/lib/bitify.js';
import { decodeImageFile } from '../src/lib/image-decode.js';
import { yieldTask } from '../src/lib/quantize.js';

export async function runImportProfile() {
  const report = { experiment: 'single-frame-import-analysis', started: new Date().toISOString(), userAgent: navigator.userAgent, records: [] };
  const manifest = await (await fetch('/qa-stress-fixtures.json')).json();
  const fixtures = manifest.files.filter(f => f.kind === 'still').slice(0, 40);
  const originals = [];
  for (const fixture of fixtures) {
    const blob = await (await fetch(fixture.url)).blob();
    originals.push({ name: fixture.id, original: await decodeImageFile(blob) });
  }
  for (const size of [4096, 8192, 16384]) {
    for (const thin of [false, true]) {
      const width = thin ? 1 : 128, height = size / width;
      const data = Uint8ClampedArray.from({ length: size * 4 }, (_, i) => i % 4 === 3 ? [0, 64, 128, 200, 255][Math.floor(i / 4) % 5] : i * 61 % 256);
      originals.push({ name: `synthetic-${size}-${thin ? 'thin' : 'square'}`, original: { width, height, data } });
    }
  }
  for (const { name, original } of originals) {
    if (original.width * original.height > 16384) continue;
    const timings = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      for (const source of ['luma', 'value', 'red', 'green', 'blue']) {
        for (const cut of [1, 128, 255]) {
          await yieldTask();
          const started = performance.now(), image = analyze(original, source, cut);
          unify([image]); timings.push(performance.now() - started);
        }
      }
    }
    const sorted = [...timings].sort((a, b) => a - b);
    report.records.push({ name, width: original.width, height: original.height, pixels: original.width * original.height,
      samples: timings.length, maxMs: sorted.at(-1), p95Ms: sorted[Math.floor(sorted.length * .95)], meanMs: timings.reduce((a, b) => a + b, 0) / timings.length });
  }
  report.finished = new Date().toISOString();
  return report;
}
