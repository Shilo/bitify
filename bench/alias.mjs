// Images whose pixels repeat in a small pattern (dithered art, stippled transparency): does a
// tile that draws them smaller show them as light as they are? Share of light pixels among the
// solid ones, for the whole image and for pictures of it at the sizes a tile might have. 512 and
// 256 are whole fractions of the image, where the same part of a texture is picked every time.
import { pathToFileURL } from 'node:url';
const B = await import(pathToFileURL(import.meta.dirname + '/../src/lib/bitify.js'));
const w = 1024, h = 1024;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const make = pixel => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) data.set(pixel(x, y), i);
  return B.analyze({ width: w, height: h, data });
};
const shade = (x, y) => 128 + 100 * Math.sin(x / 160) * Math.cos(y / 120);
const cases = {
  // a smooth picture seen through a stipple: 2 by 2 blocks, solid and see-through in turn
  'stippled alpha': make((x, y) => { const v = shade(x, y); return [v, v, v, ((x >> 1) + (y >> 1)) % 2 ? 0 : 255]; }),
  // the same picture already dithered to black and white, as 1-bit art is
  'dithered source': make((x, y) => { const v = shade(x, y) / 255 > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 255 : 0; return [v, v, v, 255]; }),
  // one-pixel stripes
  'striped source': make((x, y) => { const v = y % 2 ? 230 : 40; return [v, v, v, 255]; }),
};
const light = m => { let on = 0, solid = 0; for (const v of m) { solid += v > 0; on += v === 2; } return solid ? (100 * on / solid).toFixed(0).padStart(4) + '%' : '   -'; };
const SIZES = [1024, 955, 700, 512, 478, 341, 256];
console.log('image             style     ' + SIZES.map(s => (s === 1024 ? 'whole' : 'at ' + s).padStart(7)).join(''));
for (const [name, img] of Object.entries(cases)) for (const style of ['solid', 'checker', 'bayer', 'atkinson', 'cutout']) {
  console.log(name.padEnd(17), style.padEnd(9), SIZES.map(s => light(B.mask(img, style, style === 'solid' || style === 'cutout' ? 128 : null, s, s)).padStart(7)).join(''));
}

