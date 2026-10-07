// Cost per converted pixel for the whole image and for smaller pictures of it, in nanoseconds.
import { pathToFileURL } from 'node:url';
const B = await import(pathToFileURL(import.meta.dirname + '/../src/lib/bitify.js'));
function photo(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, v = y / h, blob = Math.sin(u * 9) * Math.cos(v * 7) * 60 + 128, shape = ((x >> 6) + (y >> 6)) % 3 === 0 ? 50 : 0, g = (rnd() - 0.5) * 30;
    data[i] = blob + shape + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g; data[i + 3] = 255;
  }
  return { width: w, height: h, data };
}
for (const [w, h] of [[2048, 2048], [4000, 3000]]) {
  const img = B.analyze(photo(w, h));
  for (const style of (process.argv[2] ?? 'cutout,lines,solid,bayer').split(',')) {
    const line = [`${w}x${h} ${style}`.padEnd(20)];
    for (const k of [1, 1.07, 2, 2.14, 4.19, 8]) {
      let best = Infinity, n;
      for (let i = 0; i < 12; i++) { const t = performance.now(); n = B.mask(img, style, 60 + i * 9, Math.round(w / k), Math.round(h / k)).length; best = Math.min(best, performance.now() - t); }
      line.push(`1 in ${k}: ${(best * 1e6 / n).toFixed(1)}ns (${best.toFixed(1)}ms)`);
    }
    console.log(line.join('  '));
  }
}
