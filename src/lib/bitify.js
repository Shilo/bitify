// 1-bit conversion. No DOM: everything works on plain typed arrays, so it runs in tests.

const ALPHA_CUT = 128; // alpha below this is an empty pixel
const MIN_EDGE = 24; // Auto never takes a color change weaker than this for a boundary
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const AROUND = [...NEIGHBOURS, [1, 1], [1, -1], [-1, 1], [-1, -1]]; // the four neighbours first

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
  for (const { w, h, data, lum } of frames) {
    const solid = p => data[p * 4 + 3] >= ALPHA_CUT, same = (p, q) => solid(q) && (lum[p] > t) === (lum[q] > t);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (!solid(p)) continue;
      if ((p % w) + 1 < w && same(p, p + 1)) hist[diff(data, i, i + 4)]++;
      if (p + w < w * h && same(p, p + w)) hist[diff(data, i, i + w * 4)]++;
    }
  }
  hist[0] = 0; // identical neighbours are not seams
  return Math.max(MIN_EDGE, otsu(hist, 0));
}

// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
// `auto` is the Auto threshold for Cutout and Solid, `autoTone` the one for the pattern styles,
// `autoLine` the one for Lines and `autoSeam` the seam strength for Cutout.
// `lo` and `hi` are the darkest and lightest brightness among the solid pixels.
export function analyze({ width: w, height: h, data }) {
  const lum = new Uint8Array(w * h), hist = new Array(256).fill(0), edges = new Array(256).fill(0);
  const solid = p => data[p * 4 + 3] >= ALPHA_CUT;
  let hasAlpha = false, lo = 255, hi = 0;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (!solid(p)) { hasAlpha = true; continue; }
    lum[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    hist[lum[p]]++;
    lo = Math.min(lo, lum[p]);
    hi = Math.max(hi, lum[p]);
    if ((p % w) + 1 < w && solid(p + 1)) edges[diff(data, i, i + 4)]++;
    if (p + w < w * h && solid(p + w)) edges[diff(data, i, i + w * 4)]++;
  }
  edges[0] = 0; // identical neighbours are not edges
  const img = { w, h, data, lum, hasAlpha, lo, hi, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
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
const PATTERNS = ['checker', 'hatch', 'bayer', 'atkinson'];

// The threshold Auto uses for this image in this style.
export const autoThreshold = (img, style) => (style === 'lines' ? img.autoLine : PATTERNS.includes(style) ? img.autoTone : img.auto);

// One byte per pixel: 0 empty, 1 first color (lines, dark pixels), 2 second color (fill, light pixels).
// `threshold` null means Auto.
export function mask(img, style, threshold = null) {
  const { w, h, lum, data, lo, hi } = img, m = new Uint8Array(w * h);
  const t = threshold ?? autoThreshold(img, style);
  const solid = p => data[p * 4 + 3] >= ALPHA_CUT;

  if (style === 'lines') {
    // A pixel is a line when it touches empty space, or sits on the darker side of a color
    // change stronger than t. That outlines every part of a sprite, not only its silhouette.
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      m[p] = 2;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx, ny = y + dy, q = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
          // The canvas edge counts as empty only for sprites, so opaque scenes get no frame.
          if (img.hasAlpha) m[p] = 1;
        } else if (!solid(q)) {
          m[p] = 1;
        } else if (diff(data, p * 4, q * 4) > t && (lum[p] < lum[q] || (lum[p] === lum[q] && p < q))) {
          m[p] = 1; // on a tie the earlier pixel takes the line, so a boundary is one pixel wide
        }
      }
    }
    return m;
  }

  if (style === 'cutout') {
    // Bright parts are filled, dark parts are left dark, and the boundaries between parts of the
    // same tone are cut in the other tone. 0 empty, 1 dark, 2 light; outside the canvas is
    // empty only for sprites, as in Lines.
    // ponytail: builds a small array per pixel; fine for sprites, flatten it if photos get slow
    const tone = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? (img.hasAlpha ? 0 : -1) : !solid(y * w + x) ? 0 : lum[y * w + x] > t ? 2 : 1);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      const own = tone(x, y);
      if (!own) continue;
      const around = AROUND.map(([dx, dy]) => tone(x + dx, y + dy));
      // a seam: the darker side of a strong change between two pixels of the same tone
      const seam = NEIGHBOURS.some(([dx, dy], k) => {
        const q = p + dy * w + dx;
        return around[k] === own && diff(data, p * 4, q * 4) > img.autoSeam && (lum[p] < lum[q] || (lum[p] === lum[q] && p < q));
      });
      // a light pixel on the silhouette is never cut, so seams do not eat into the shape
      if (own === 2) m[p] = seam && !around.includes(0) ? 1 : 2;
      // a dark pixel on the silhouette with no light pixel around it becomes a light rim
      else m[p] = seam || (around.slice(0, 4).includes(0) && !around.includes(2)) ? 2 : 1;
    }
    return m;
  }

  // Brightness as a tone from 0 to 1 through the image's own range: its darkest brightness is 0,
  // the threshold 0.5 and its lightest 1. So a pattern never reaches the darkest or lightest color.
  const tone = p => (lum[p] <= t ? (t > lo ? (0.5 * (lum[p] - lo)) / (t - lo) : 0) : 0.5 + (0.5 * (lum[p] - t)) / (hi - t));

  if (style === 'atkinson') {
    const v = Float32Array.from(lum, (_, p) => (solid(p) ? tone(p) * 255 : 0));
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      const on = v[p] > 127.5, e = (v[p] - (on ? 255 : 0)) / 8;
      m[p] = on ? 2 : 1;
      if (x + 1 < w) v[p + 1] += e;
      if (x + 2 < w) v[p + 2] += e;
      if (y + 1 < h) {
        if (x > 0) v[p + w - 1] += e;
        v[p + w] += e;
        if (x + 1 < w) v[p + w + 1] += e;
      }
      if (y + 2 < h) v[p + 2 * w] += e;
    }
    return m;
  }

  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    if (!solid(p)) continue;
    if (style === 'silhouette') m[p] = 1;
    else if (style === 'checker') m[p] = tone(p) > ((x + y) % 2 ? 0.75 : 0.25) ? 2 : 1;
    else if (style === 'hatch') m[p] = tone(p) > 0.75 - 0.25 * ((x + y) % 3) ? 2 : 1; // diagonal lines, three pixels apart
    else if (style === 'bayer') m[p] = tone(p) > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 2 : 1;
    else m[p] = lum[p] > t ? 2 : 1;
  }
  return m;
}

// Turns a mask into RGBA pixels. Colors are '#rrggbb'.
export function colorize(m, first, second) {
  const c = [null, hexToRgb(first), hexToRgb(second)], out = new Uint8ClampedArray(m.length * 4);
  for (let p = 0, i = 0; p < m.length; p++, i += 4) {
    if (!m[p]) continue;
    const k = c[m[p]];
    out[i] = k[0]; out[i + 1] = k[1]; out[i + 2] = k[2]; out[i + 3] = 255;
  }
  return out;
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
