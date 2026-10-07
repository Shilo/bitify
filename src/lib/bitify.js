// 1-bit conversion. No DOM: everything works on plain typed arrays, so it runs in tests.

const ALPHA_CUT = 128; // alpha below this is an empty pixel
const MIN_EDGE = 24; // Auto never takes a color change weaker than this for a boundary
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

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

// Takes an ImageData-shaped object. Done once per image; `mask` reuses the result.
// `auto` is the Auto threshold for the brightness styles, `autoLine` the one for Lines.
export function analyze({ width: w, height: h, data }) {
  const lum = new Uint8Array(w * h), hist = new Array(256).fill(0), edges = new Array(256).fill(0);
  const solid = p => data[p * 4 + 3] >= ALPHA_CUT;
  let hasAlpha = false;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (!solid(p)) { hasAlpha = true; continue; }
    lum[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    hist[lum[p]]++;
    if ((p % w) + 1 < w && solid(p + 1)) edges[diff(data, i, i + 4)]++;
    if (p + w < w * h && solid(p + w)) edges[diff(data, i, i + w * 4)]++;
  }
  edges[0] = 0; // identical neighbours are not edges
  return { w, h, data, lum, hasAlpha, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
}

// Makes every frame of an animation convert the same way: the Auto thresholds are picked from
// all the frames together instead of frame by frame, so a pixel does not flicker between the
// two colors as the animation plays. Takes the results of `analyze` and updates them in place.
export function unify(frames) {
  if (frames.length < 2) return frames;
  const hist = new Array(256).fill(0), edges = new Array(256).fill(0);
  for (const f of frames) for (let i = 0; i < 256; i++) { hist[i] += f.hist[i]; edges[i] += f.edges[i]; }
  const shared = { auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)), hasAlpha: frames.some(f => f.hasAlpha) };
  for (const f of frames) Object.assign(f, shared);
  return frames;
}

// The threshold Auto uses for this image in this style.
export const autoThreshold = (img, style) => (style === 'lines' ? img.autoLine : img.auto);

// One byte per pixel: 0 empty, 1 first color (lines, dark pixels), 2 second color (fill, light pixels).
// `threshold` null means Auto.
export function mask(img, style, threshold = null) {
  const { w, h, lum, data } = img, m = new Uint8Array(w * h);
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

  if (style === 'atkinson') {
    const v = Float32Array.from(lum, x => x + 128 - t);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
      if (!solid(p)) continue;
      const on = v[p] > 128, e = (v[p] - (on ? 255 : 0)) / 8;
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
    let cut = t;
    if (style === 'checker') cut += (x + y) % 2 ? 40 : -40;
    else if (style === 'bayer') cut += ((BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 192;
    m[p] = style === 'silhouette' ? 1 : lum[p] > cut ? 2 : 1;
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
