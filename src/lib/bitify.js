// 1-bit conversion. No DOM: everything works on plain typed arrays, so it runs in tests.

const ALPHA_CUT = 128; // alpha below this is an empty pixel
const MIN_EDGE = 24; // Auto never takes a color change weaker than this for a boundary
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Blue noise: the order in which the cells of a 16x16 tile turn light as the tone rises. Each
// number from 0 to 255 once, placed by the void-and-cluster method so that the lit cells are
// spread evenly at every tone and, unlike BAYER's, form no regular pattern.
const NOISE = (
  'ed75dbbf791b4f80ec4717e5ae8b43bc1aa11354d5acf82bb564c37d0ffb5aa98462fc2e913f679415d639a52a6fd132bb40ca73e909c6e3598af353c99904e4' +
  '920ea41db3832546af02761ede3e7b4eeb68d84a5bdc6b98fe33ba9063b4f721c4812ff58c38bd167ed348ef14309f5e3b9b12a7cd06eea25c226d9eda86d008' +
  'dd55c06a2678523ce6b1cb05584271ab1c7ae744f9b28dc50d89357cfabe28f24db603935d19df2c66f150aa189761889d2dcc36d4a049779ccf20d96ee80bd2' +
  'ff6985ea720cc2fd1141b88f4b31b93d10ad1f4cb7278756b0825f01e0a67f57c7e260a8f465e137d724f6c17423f09529458e003a9ac807a370963451ce0a6c'
).match(/../g).map(pair => parseInt(pair, 16));
// The patterns: a pixel turns light when its tone is above the cut for its place in a small
// square tile that repeats across the image. `n` is the side of the tile.
const tile = (n, cut) => ({ n, cuts: Float64Array.from({ length: n * n }, (_, i) => cut(i % n, Math.floor(i / n), i)) });
const TILES = {
  checker: tile(2, (x, y) => ((x + y) % 2 ? 0.75 : 0.25)),
  hatch: tile(3, (x, y) => 0.75 - 0.25 * ((x + y) % 3)), // diagonal lines, three pixels apart
  bayer: tile(4, (x, y, i) => (BAYER[i] + 0.5) / 16),
  noise: tile(16, (x, y, i) => (NOISE[i] + 0.5) / 256),
};

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Brightness of a '#rrggbb' color, 0 to 255, by the same weights `analyze` uses for pixels.
export function brightness(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Largest of the red, green and blue differences between the pixels at byte offsets i and j.
const diff = (d, i, j) => Math.max(Math.abs(d[i] - d[j]), Math.abs(d[i + 1] - d[j + 1]), Math.abs(d[i + 2] - d[j + 2]));

// Otsu's method: the value that best splits a 256-bin histogram into two groups.
// Returns `fallback` when there is nothing to split.
export function otsu(hist, fallback) {
  let n = 0, sum = 0;
  for (let i = 0; i < 256; i++) { n += hist[i]; sum += i * hist[i]; }
  let sumB = 0, wB = 0, best = 0, t = fallback;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const v = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (v > best) { best = v; t = i; }
  }
  return t;
}

// Auto's center for the pattern styles: halfway between the mean brightness of the dark group
// and of the light group that `cut` separates. Otsu's cut itself is the lightest brightness of
// the dark group; centered there, that color would always come out half patterned.
function toneCenter(hist, cut) {
  let darkN = 0, darkSum = 0, lightN = 0, lightSum = 0;
  for (let i = 0; i < 256; i++) {
    if (i <= cut) { darkN += hist[i]; darkSum += i * hist[i]; } else { lightN += hist[i]; lightSum += i * hist[i]; }
  }
  return darkN && lightN ? Math.round((darkSum / darkN + lightSum / lightN) / 2) : cut;
}

// Cutout's Auto seam strength for one image or all the frames of an animation: Otsu on the
// differences between adjacent solid pixels that are on the same side of brightness `t`. The
// jumps from one side to the other are left out; the tone split already shows those.
function seamStrength(frames, t) {
  const hist = new Array(256).fill(0);
  for (const { w, h, lum, right, down } of frames) {
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      const light = lum[p] > t;
      if (x + 1 < w && lum[p + 1] > t === light) hist[right[p]]++;
      if (y + 1 < h && lum[p + w] > t === light) hist[down[p]]++;
    }
  }
  hist[0] = 0; // identical neighbours are not seams, and a pair with an empty pixel in it is on record as 0
  return Math.max(MIN_EDGE, otsu(hist, 0));
}

// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
// `auto` is the Auto threshold for Cutout and Solid, `autoTone` the one for the pattern styles,
// `autoLine` the one for Lines and `autoSeam` the seam strength for Cutout.
// `lo` and `hi` are the darkest and lightest brightness among the solid pixels.
// `right` and `down` hold, for each pixel, how much its color differs from the pixel to its right
// and from the one below it (0 when either is empty). They are worked out here once, because
// Lines and Cutout ask for them at every pixel each time the threshold moves.
// The loops here and in `mask` are written flat, with nothing made per pixel: a photo has
// millions of pixels, and a phone goes through them several times slower than a desktop.
export function analyze({ width: w, height: h, data }) {
  const lum = new Uint8Array(w * h), right = new Uint8Array(w * h), down = new Uint8Array(w * h);
  const hist = new Array(256).fill(0), edges = new Array(256).fill(0), below = w * 4;
  let hasAlpha = false, lo = 255, hi = 0;
  for (let y = 0, p = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, p++, i += 4) {
    if (data[i + 3] < ALPHA_CUT) { hasAlpha = true; continue; }
    const l = (lum[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]));
    hist[l]++;
    if (l < lo) lo = l;
    if (l > hi) hi = l;
    if (x + 1 < w && data[i + 7] >= ALPHA_CUT) edges[(right[p] = diff(data, i, i + 4))]++;
    if (y + 1 < h && data[i + below + 3] >= ALPHA_CUT) edges[(down[p] = diff(data, i, i + below))]++;
  }
  edges[0] = 0; // identical neighbours are not edges
  const img = { w, h, data, lum, right, down, hasAlpha, lo, hi, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
  img.autoTone = toneCenter(hist, img.auto);
  img.autoSeam = seamStrength([img], img.auto);
  return img;
}

// Makes every frame of an animation convert the same way: the Auto thresholds and the brightness
// range are taken from all the frames together instead of frame by frame, so a pixel does not
// flicker between the two colors as the animation plays. Takes the results of `analyze` and
// updates them in place.
export function unify(frames) {
  if (frames.length < 2) return frames;
  const hist = new Array(256).fill(0), edges = new Array(256).fill(0);
  for (const f of frames) for (let i = 0; i < 256; i++) { hist[i] += f.hist[i]; edges[i] += f.edges[i]; }
  const auto = otsu(hist, 127);
  const shared = {
    auto,
    autoTone: toneCenter(hist, auto),
    autoLine: Math.max(MIN_EDGE, otsu(edges, 0)),
    autoSeam: seamStrength(frames, auto), // picked after the shared cut, which decides the tones
    hasAlpha: frames.some(f => f.hasAlpha),
    lo: Math.min(...frames.map(f => f.lo)),
    hi: Math.max(...frames.map(f => f.hi)),
  };
  for (const f of frames) Object.assign(f, shared);
  return frames;
}

// The styles that turn brightness into a pattern.
const PATTERNS = [...Object.keys(TILES), 'atkinson'];

// The threshold Auto uses for this image in this style.
export const autoThreshold = (img, style) => (style === 'lines' ? img.autoLine : PATTERNS.includes(style) ? img.autoTone : img.auto);

// Where a smaller picture's pixels fall along `n` image pixels when it is `m` pixels long: the
// image pixel under the middle of each. With m equal to n, that is every pixel in turn.
const spread = (n, m) => Int32Array.from({ length: m }, (_, i) => Math.floor(((i + 0.5) * n) / m));

// One byte per pixel: 0 empty, 1 first color (lines, dark pixels), 2 second color (fill, light pixels).
// `threshold` null means Auto.
//
// `mw` and `mh` ask for a smaller picture of the image, for a tile that shows it smaller than it
// is: mw by mh pixels, taking that many pixels' work instead of w * h. Each of its pixels stands
// for the image pixel under its middle (see `spread`), so the picture's pixels are spread evenly
// over the image at whatever spacing that comes to. The spacing is deliberately not rounded to
// a whole number of pixels: an image with a fine regular texture (dithered art, stripes, a
// stippled transparency) would have the same part of its texture picked every time, and come
// out all light or all dark.
//
// In Cutout, Lines, Solid and Silhouette each pixel of the picture is exactly what the image
// pixel it stands for is in the full mask. The pattern styles and Atkinson are instead drawn
// afresh on the picture's own pixels, because their look comes from how neighbouring pixels
// alternate, and pixels picked from a pattern do not alternate as the pattern does.
export function mask(img, style, threshold = null, mw = img.w, mh = img.h) {
  const { w, h, lum, data, right, down, lo, hi } = img, m = new Uint8Array(mw * mh);
  const xs = spread(w, mw), ys = spread(h, mh); // the image column and row of each of the picture's
  const t = threshold ?? autoThreshold(img, style);
  const opaque = !img.hasAlpha; // then every pixel is solid, and the large RGBA array is never read
  const solid = p => opaque || data[p * 4 + 3] >= ALPHA_CUT;
  // Whether p is the darker of two pixels. On a tie the earlier one is, so a boundary is one pixel wide.
  const darker = (p, q) => lum[p] < lum[q] || (lum[p] === lum[q] && p < q);
  // In the loops below `i` and `j` count the picture's pixels, `x` and `y` are the image pixel
  // that one stands for, `p` is that pixel's place in the image and `o` its place in the mask.

  if (style === 'lines') {
    // A pixel is a line when it touches empty space, or sits on the darker side of a color
    // change stronger than t. That outlines every part of a sprite, not only its silhouette.
    // The canvas edge counts as empty only for sprites, so opaque scenes get no frame.
    // `d` is the difference between p and its neighbour q
    const edge = img.hasAlpha, line = (p, q, d) => !solid(q) || (d > t && darker(p, q));
    for (let j = 0, o = 0; j < mh; j++) for (let i = 0, y = ys[j]; i < mw; i++, o++) {
      const x = xs[i], p = y * w + x;
      if (!solid(p)) continue;
      const on =
        (x ? line(p, p - 1, right[p - 1]) : edge) || (x + 1 < w ? line(p, p + 1, right[p]) : edge) || (y ? line(p, p - w, down[p - w]) : edge) || (y + 1 < h ? line(p, p + w, down[p]) : edge);
      m[o] = on ? 1 : 2;
    }
    return m;
  }

  if (style === 'cutout') {
    // Bright parts are filled, dark parts are left dark, and the boundaries between parts of the
    // same tone are cut in the other tone. 0 empty, 1 dark, 2 light; outside the canvas is
    // empty only for sprites, as in Lines.
    const out = img.hasAlpha ? 0 : -1, strength = img.autoSeam;
    const tone = q => (!solid(q) ? 0 : lum[q] > t ? 2 : 1);
    // a seam: the darker side of a strong change between two pixels of the same tone
    const cut = (p, q, d) => d > strength && darker(p, q);
    // Whether one of the four pixels diagonally next to p has tone v. Few pixels need to ask.
    const corner = (p, L, R, U, D, v) =>
      (U && L ? tone(p - w - 1) : out) === v || (U && R ? tone(p - w + 1) : out) === v || (D && L ? tone(p + w - 1) : out) === v || (D && R ? tone(p + w + 1) : out) === v;
    for (let j = 0, o = 0; j < mh; j++) for (let i = 0, y = ys[j]; i < mw; i++, o++) {
      const x = xs[i], p = y * w + x, own = tone(p);
      if (!own) continue;
      const L = x > 0, R = x + 1 < w, U = y > 0, D = y + 1 < h;
      const l = L ? tone(p - 1) : out, r = R ? tone(p + 1) : out, u = U ? tone(p - w) : out, d = D ? tone(p + w) : out;
      const seam =
        (l === own && cut(p, p - 1, right[p - 1])) || (r === own && cut(p, p + 1, right[p])) || (u === own && cut(p, p - w, down[p - w])) || (d === own && cut(p, p + w, down[p]));
      const beside = l === 0 || r === 0 || u === 0 || d === 0; // empty space on one of the four sides
      // a light pixel on the silhouette is never cut, so seams do not eat into the shape
      if (own === 2) m[o] = seam && !beside && !corner(p, L, R, U, D, 0) ? 1 : 2;
      // a dark pixel on the silhouette with no light pixel around it becomes a light rim
      else m[o] = seam || (beside && l !== 2 && r !== 2 && u !== 2 && d !== 2 && !corner(p, L, R, U, D, 2)) ? 2 : 1;
    }
    return m;
  }

  if (style === 'solid' || style === 'silhouette') {
    const cutAt = style === 'solid' ? t : 255; // nothing is brighter than 255, so a silhouette is all dark
    for (let j = 0, o = 0; j < mh; j++) for (let i = 0, row = ys[j] * w; i < mw; i++, o++) {
      const p = row + xs[i];
      if (solid(p)) m[o] = lum[p] > cutAt ? 2 : 1;
    }
    return m;
  }

  // Brightness as a tone from 0 to 1 through the image's own range: its darkest brightness is 0,
  // the threshold 0.5 and its lightest 1. So a pattern never reaches the darkest or lightest color.
  // Worked out once for each of the 256 brightnesses, not once for each pixel.
  const tones = Float64Array.from({ length: 256 }, (_, l) => (l <= t ? (t > lo ? (0.5 * (l - lo)) / (t - lo) : 0) : 0.5 + (0.5 * (l - t)) / (hi - t)));

  if (style === 'atkinson') {
    // Each of the picture's pixels passes its error on to the ones after it.
    // Error only ever reaches two rows down, so the running values are held for three rows at
    // a time (the one being converted and the two below it) instead of for the whole picture.
    const fill = (row, j) => {
      if (j < mh) for (let i = 0, from = ys[j] * w; i < mw; i++) { const p = from + xs[i]; row[i] = solid(p) ? tones[lum[p]] * 255 : 0; }
      return row;
    };
    let v = fill(new Float32Array(mw), 0), next = fill(new Float32Array(mw), 1), after = fill(new Float32Array(mw), 2);
    for (let j = 0, o = 0; j < mh; j++) {
      for (let i = 0, row = ys[j] * w; i < mw; i++, o++) {
        if (!solid(row + xs[i])) continue;
        const on = v[i] > 127.5, e = (v[i] - (on ? 255 : 0)) / 8;
        m[o] = on ? 2 : 1;
        if (i + 1 < mw) v[i + 1] += e;
        if (i + 2 < mw) v[i + 2] += e;
        if (j + 1 < mh) {
          if (i > 0) next[i - 1] += e;
          next[i] += e;
          if (i + 1 < mw) next[i + 1] += e;
        }
        if (j + 2 < mh) after[i] += e;
      }
      [v, next, after] = [next, after, fill(v, j + 3)];
    }
    return m;
  }

  // Checker, Hatch, Bayer and Noise. The pattern is laid over the picture's own pixels: `cy` and
  // `cx` are a pixel's row and column within the pattern's tile. They are kept by counting,
  // because a division for every pixel would cost more than the rest of the loop.
  const { n, cuts } = TILES[style];
  for (let j = 0, o = 0, cy = 0; j < mh; j++, cy = cy + 1 < n ? cy + 1 : 0) {
    for (let i = 0, row = ys[j] * w, cx = 0; i < mw; i++, o++, cx = cx + 1 < n ? cx + 1 : 0) {
      const p = row + xs[i];
      if (solid(p)) m[o] = tones[lum[p]] > cuts[cy * n + cx] ? 2 : 1;
    }
  }
  return m;
}

// A smaller picture of an ImageData-shaped object, mw by mh, as RGBA pixels: the same pixels of
// the original that `mask` stands a picture of that size on.
export function shrink({ width: w, height: h, data }, mw, mh) {
  const from = new Uint32Array(data.buffer, data.byteOffset, w * h), to = new Uint32Array(mw * mh), xs = spread(w, mw), ys = spread(h, mh);
  for (let j = 0, o = 0; j < mh; j++) for (let i = 0, row = ys[j] * w; i < mw; i++, o++) to[o] = from[row + xs[i]];
  return new Uint8ClampedArray(to.buffer);
}

// Turns a mask into RGBA pixels. Colors are '#rrggbb'.
export function colorize(m, first, second) {
  // Each pixel is written whole, as one 32-bit number. `c` holds the empty pixel and the two
  // colors as such numbers, built from their bytes so the byte order is the machine's own.
  const c = new Uint32Array(Uint8Array.of(0, 0, 0, 0, ...hexToRgb(first), 255, ...hexToRgb(second), 255).buffer);
  const out = new Uint32Array(m.length);
  for (let p = 0; p < m.length; p++) out[p] = c[m[p]];
  return new Uint8ClampedArray(out.buffer);
}

// A small shaded ball with a stripe: the image the style buttons preview, and the worked example
// in docs/styles.md.
export function previewBall() {
  const s = 14, data = new Uint8ClampedArray(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const r = Math.hypot(x - 6.5, y - 6.5);
    if (r > 7) continue;
    const shade = Math.hypot(x - 4, y - 3) * 9;
    const l = Math.round(r > 6 ? 25 : y >= 7 && y <= 9 ? 95 - shade * 0.4 : 240 - shade);
    data.set([l, l, l, 255], (y * s + x) * 4);
  }
  return analyze({ width: s, height: s, data });
}
