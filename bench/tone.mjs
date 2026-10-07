// Does a tile show the same share of light pixels as the saved file? Share of light among solid
// pixels, per style, for the full mask (k=1) and for what a tile draws at larger k.
import { pathToFileURL } from 'node:url';
const B = await import(pathToFileURL(import.meta.dirname + '/../src/lib/bitify.js'));
const w = 1200, h = 900, data = new Uint8ClampedArray(w * h * 4);
for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
  const v = 128 + 100 * Math.sin(x / 190) * Math.cos(y / 140);
  data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
}
const img = B.analyze({ width: w, height: h, data });
const light = m => (100 * m.reduce((n, v) => n + (v === 2), 0) / m.length).toFixed(1).padStart(5);
// how often a pixel has the same value as the one to its right: the texture, not just the tone
const runs = (m, pw) => { let same = 0, n = 0; for (let p = 0; p + 1 < m.length; p++) if ((p + 1) % pw) { n++; same += m[p] === m[p + 1]; } return (100 * same / n).toFixed(1).padStart(5); };
const SIZES = [1200, 955, 600, 400, 300, 240, 150, 109];
console.log('style      ' + SIZES.map(s => `${s} wide`.padStart(12)).join(''));
for (const style of ['solid', 'cutout', 'lines', 'checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
  console.log(style.padEnd(10), SIZES.map(mw => { const mh = Math.round(h * mw / w), m = B.mask(img, style, null, mw, mh); return `${light(m)}/${runs(m, mw)}`; }).join(' '));
}
console.log('(each cell: % light / % of pixels equal to their right neighbour)');
