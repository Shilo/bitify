// How should a big two-color image be written as a PNG? Time and file size of each way.
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = import.meta.dirname + '/../';
const { zlibSync } = createRequire(root + 'package.json')('fflate');
const B = await import(pathToFileURL(root + 'src/lib/bitify.js'));
const S = await import(pathToFileURL(root + 'src/lib/save.js'));


function make(w, h, alpha) {
  const data = new Uint8ClampedArray(w * h * 4);
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, v = y / h, blob = Math.sin(u * 9) * Math.cos(v * 7) * 60 + 128, shape = ((x >> 6) + (y >> 6)) % 3 === 0 ? 50 : 0, g = (rnd() - 0.5) * 30;
    data[i] = blob + shape + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g;
    data[i + 3] = alpha && Math.hypot(u - 0.5, v - 0.5) > 0.45 ? 0 : 255;
  }
  return { width: w, height: h, data };
}
const time = fn => { const t = performance.now(); const r = fn(); return [performance.now() - t, r]; };
for (const [w, h] of [[2048, 2048], [4000, 3000]]) for (const style of ['cutout', 'bayer', 'solid']) {
  const img = B.analyze(make(w, h, true)), m = B.mask(img, style), pixels = B.colorize(m, '#222323', '#f0f6f0');
  const line = [`${w}x${h} ${style}`.padEnd(18)];
  const rgba = () => { const stride = w * 4 + 1, rows = new Uint8Array(stride * h); for (let y = 0; y < h; y++) rows.set(pixels.subarray(y * w * 4, (y + 1) * w * 4), y * stride + 1); return rows; };
  // two bits per pixel, four pixels to a byte, most significant first, as PNG packs them
  const packed = () => {
    const stride = Math.ceil(w / 4) + 1, rows = new Uint8Array(stride * h);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0, at = y * stride + 1; x < w; x++, p++) rows[at + (x >> 2)] |= m[p] << (6 - 2 * (x & 3));
    return rows;
  };
  for (const [name, rows, level] of [['rgba L6', rgba, 6], ['rgba L1', rgba, 1], ['2-bit L6', packed, 6], ['2-bit L9', packed, 9], ['2-bit L3', packed, 3]]) {
    const [t, z] = time(() => zlibSync(rows(), { level }));
    line.push(`${name}: ${t.toFixed(0)}ms ${(z.length / 1024).toFixed(0)}KB`);
  }
  console.log(line.join(' | '));
}
