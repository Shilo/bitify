// 1-bit conversion. No DOM: everything works on plain typed arrays, so it runs in tests.

const ALPHA_CUT = 128; // alpha below this is an empty pixel, unless `analyze` is given another cut
const MIN_EDGE = 24; // Auto never takes a color change weaker than this for a boundary
// Blue noise: the order in which the cells of a 16x16 tile turn light as the tone rises. Each
// number from 0 to 255 once, placed by the void-and-cluster method so that the lit cells are
// spread evenly at every tone and, unlike Bayer's, form no regular pattern.
const NOISE = (
  'ed75dbbf791b4f80ec4717e5ae8b43bc1aa11354d5acf82bb564c37d0ffb5aa98462fc2e913f679415d639a52a6fd132bb40ca73e909c6e3598af353c99904e4' +
  '920ea41db3832546af02761ede3e7b4eeb68d84a5bdc6b98fe33ba9063b4f721c4812ff58c38bd167ed348ef14309f5e3b9b12a7cd06eea25c226d9eda86d008' +
  'dd55c06a2678523ce6b1cb05584271ab1c7ae744f9b28dc50d89357cfabe28f24db603935d19df2c66f150aa189761889d2dcc36d4a049779ccf20d96ee80bd2' +
  'ff6985ea720cc2fd1141b88f4b31b93d10ad1f4cb7278756b0825f01e0a67f57c7e260a8f465e137d724f6c17423f09529458e003a9ac807a370963451ce0a6c'
).match(/../g).map(pair => parseInt(pair, 16));
// The patterns: a pixel turns light when its tone is above the cut for its place in a small
// square tile that repeats across the image. `n` is the side of the tile.
const tile = (n, cut) => ({ n, cuts: Float64Array.from({ length: n * n }, (_, i) => cut(i % n, Math.floor(i / n), i)) });
// The Bayer grid of side n (2, 4 or 8). Each quarter of a grid is the grid of half its side with
// every number times four, plus 0, 2, 3 and 1 by quarter. Side 4 is the classic one.
function bayer(n) {
  let m = [[0]];
  for (let s = 1; s < n; s *= 2) m = [...m.map(r => [...r.map(v => 4 * v), ...r.map(v => 4 * v + 2)]), ...m.map(r => [...r.map(v => 4 * v + 3), ...r.map(v => 4 * v + 1)])];
  return m.flat();
}
// Which of Hatch's lines a pixel is on, counted across the lines, for each way they can run.
const ACROSS = { '/': (x, y) => x + y, '\\': (x, y) => x - y, '-': (x, y) => y, '|': x => x };
// Each takes the style's settings; a setting left out has the value it had before there were settings.
const TILES = {
  checker: () => tile(2, (x, y) => ((x + y) % 2 ? 0.75 : 0.25)),
  // lines `spacing` pixels apart, widening one pixel at a time as the tone darkens
  hatch: ({ direction = '/', spacing: n = 3 }) => tile(n, (x, y) => (n - ((ACROSS[direction](x, y) + n) % n)) / (n + 1)),
  bayer: ({ matrix: n = 4 }) => { const grid = bayer(n); return tile(n, (x, y, i) => (grid[i] + 0.5) / (n * n)); },
  noise: () => tile(16, (x, y, i) => (NOISE[i] + 0.5) / 256),
};
// Error diffusion: where the error made at a pixel goes, as [columns right, rows down, parts] for
// each pixel that is handed some, out of `of` parts. Both hand on all of the error, and neither
// reaches further than two rows down. Atkinson's kernel, which hands on six eighths and drops
// the rest, is written out in `mask`.
const kernel = (of, ...to) => ({ dx: Int8Array.from(to, t => t[0]), dy: Int8Array.from(to, t => t[1]), part: Float64Array.from(to, t => t[2] / of) });
const KERNELS = {
  floyd: kernel(16, [1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]),
  stucki: kernel(42, [1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]),
};
// What brightness is read from: how much of red, green and blue. 'value', the lightest of the
// three, is not a mix and is not listed.
const SOURCES = { luma: [0.2126, 0.7152, 0.0722], red: [1, 0, 0], green: [0, 1, 0], blue: [0, 0, 1] };

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Brightness of a '#rrggbb' color, 0 to 255, by the weights `analyze` uses for pixels unless told otherwise.
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
// `soft` says whether any pixel is partly see-through, neither clear nor solid: only then does the
// opacity cut change anything, and only then is it offered.
// `source` is what brightness is read from ('luma', 'value', 'red', 'green' or 'blue') and `cut`
// the alpha below which a pixel is empty. Both are settings of a style, so an image is analysed
// again when the style in use has other values for them.
// The loops here and in `mask` are written flat, with nothing made per pixel: a photo has
// millions of pixels, and a phone goes through them several times slower than a desktop.
export function analyze({ width: w, height: h, data }, source = 'luma', cut = ALPHA_CUT) {
  const lum = new Uint8Array(w * h), right = new Uint8Array(w * h), down = new Uint8Array(w * h);
  const hist = new Uint32Array(256), edges = new Uint32Array(256), below = w * 4; // counts, in arrays of numbers only: a plain array made the loop a little slower
  let hasAlpha = false, lo = 255, hi = 0, part = 0;
  for (let y = 0, p = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, p++, i += 4) {
    // `part` gathers the bits of every alpha plus one. An alpha of 0 gives 1 and one of 255 gives
    // 256; any alpha between gives a number with one of the bits of 254 in it. So those bits say
    // whether a pixel is partly see-through, for one sum and one `or` and no choice to make.
    part |= data[i + 3] + 1;
    if (data[i + 3] < cut) { hasAlpha = true; continue; }
    const l = (lum[p] = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]));
    hist[l]++;
    if (l < lo) lo = l;
    if (l > hi) hi = l;
    if (x + 1 < w && data[i + 7] >= cut) edges[(right[p] = diff(data, i, i + 4))]++;
    if (y + 1 < h && data[i + below + 3] >= cut) edges[(down[p] = diff(data, i, i + below))]++;
  }
  edges[0] = 0; // identical neighbours are not edges
  if (source !== 'luma') {
    // Brightness read from anything else is worked out in a pass of its own, over what the loop
    // above found. Choosing between them inside that loop made every image take an eighth longer.
    const [wr, wg, wb] = SOURCES[source] ?? SOURCES.luma, value = source === 'value';
    hist.fill(0);
    lo = 255;
    hi = 0;
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (data[i + 3] < cut) continue;
      const l = (lum[p] = value ? Math.max(data[i], data[i + 1], data[i + 2]) : Math.round(wr * data[i] + wg * data[i + 1] + wb * data[i + 2]));
      hist[l]++;
      if (l < lo) lo = l;
      if (l > hi) hi = l;
    }
  }
  const img = { w, h, data, lum, right, down, cut, hasAlpha, soft: (part & 254) !== 0, lo, hi, hist, edges, auto: otsu(hist, 127), autoLine: Math.max(MIN_EDGE, otsu(edges, 0)) };
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
    soft: frames.some(f => f.soft),
    lo: Math.min(...frames.map(f => f.lo)),
    hi: Math.max(...frames.map(f => f.hi)),
  };
  for (const f of frames) Object.assign(f, shared);
  return frames;
}

// What Stencil needs to know of each sprite, held for every solid pixel of it:
//   `level`  the brightness of the darkest pixel on the sprite's outline, which a Cuts set by hand
//            counts up from;
//   `auto`   the brightness Auto cuts up to: Otsu's split of all the sprite's pixels, its outline
//            among them, so that the dark group is the outline's colors and what is drawn in them;
//   `body`   the median brightness of the pixels inside the sprite. At least half of them are that
//            dark or darker, so a cut that reaches it would take half the inside or more.
// With them comes `cuts`: the least and the most that Auto comes to for the image's sprites, said
// the way a Cuts set by hand is, as so much above the outline level.
// A sprite is a group of solid pixels that touch, diagonals included, and a pixel is on its outline
// when one of the four pixels beside it is empty or off the canvas; the rest are inside. An image
// with no empty pixel is one sprite with no outline, all of it inside. What is said of that one is
// read from the image's own histogram, since `lo` and `auto` are shared by all the frames of an
// animation.
// Each sprite is walked once, outwards from its first pixel, with `queue` holding the pixels found.
// ponytail: the walk holds five bytes for every pixel of the image while it runs (`queue` and
// `seen`), a moment's 60 MB for 12 megapixels with see-through parts. Label the sprites row by
// row if that ever matters.
function sprites(img) {
  const { w, h, lum, data, hist, cut = ALPHA_CUT } = img, level = new Uint8Array(w * h), auto = new Uint8Array(w * h), body = new Uint8Array(w * h);
  // the brightness that at least half of the `n` pixels counted in `of` are at or below
  const median = (of, n) => { for (let l = 0, c = 0; l < 256; l++) if ((c += of[l]) * 2 >= n) return l; return 0; };
  if (!img.hasAlpha) {
    let low = 0;
    while (low < 255 && !hist[low]) low++;
    const t = otsu(hist, low), says = Math.min(254, t - low);
    return { level: level.fill(low), auto: auto.fill(t), body: body.fill(median(hist, w * h)), cuts: [says, says] };
  }
  const seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
  const all = new Uint32Array(256), inner = new Uint32Array(256); // how many of the sprite's pixels, and of those inside it, have each brightness
  let least = 254, most = 0;
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] < cut) continue;
    let n = 0, low = 255, inside = 0;
    queue[n++] = start;
    seen[start] = 1;
    for (let i = 0; i < n; i++) {
      const p = queue[i], x = p % w, y = (p - x) / w;
      let rim = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const q = Y * w + X;
        if (data[q * 4 + 3] < cut) { if (!dx || !dy) rim = true; }
        else if (!seen[q]) { seen[q] = 1; queue[n++] = q; }
      }
      all[lum[p]]++;
      if (!rim) { inside++; inner[lum[p]]++; }
      else if (lum[p] < low) low = lum[p];
    }
    // a sprite with nothing inside it has nothing to cut, and Auto has nothing to say of it
    let t = low, mid = 0;
    if (inside) {
      t = otsu(all, low);
      mid = median(inner, inside);
      const says = Math.min(254, Math.max(0, t - low));
      if (says < least) least = says;
      if (says > most) most = says;
    }
    // the counts are put back to nothing for the next sprite here, a pixel at a time: clearing all 256 of each for every sprite would cost more than the walk on an image of specks
    for (let i = 0; i < n; i++) { const q = queue[i]; level[q] = low; auto[q] = t; body[q] = mid; all[lum[q]] = inner[lum[q]] = 0; }
  }
  return { level, auto, body, cuts: least > most ? [0, 0] : [least, most] };
}
// What Stencil knows of an image's sprites, found the first time it is asked for and kept with the
// analysis. That walks the whole image once, which a caller may want done before it starts a clock.
export const spritesOf = img => (img.sprites ??= sprites(img));

// The styles that turn brightness into a pattern.
const PATTERNS = [...Object.keys(TILES), 'atkinson'];

// The threshold Auto uses for this image in this style.
export const autoThreshold = (img, style) => (style === 'lines' ? img.autoLine : PATTERNS.includes(style) ? img.autoTone : img.auto);

// Where a smaller picture's pixels fall along `n` image pixels when it is `m` pixels long: the
// image pixel under the middle of each. With m equal to n, that is every pixel in turn.
const spread = (n, m) => Int32Array.from({ length: m }, (_, i) => Math.floor(((i + 0.5) * n) / m));

// One byte per pixel: 0 empty, 1 first color (lines, dark pixels), 2 second color (fill, light pixels).
// `set` is the style's settings (see lib/settings.js). Any left out has its default, a threshold
// of null means Auto, and a number alone is a threshold with every other setting at its default.
//
// `mw` and `mh` ask for a smaller picture of the image, for a tile that shows it smaller than it
// is: mw by mh pixels, taking that many pixels' work instead of w * h. Each of its pixels stands
// for the image pixel under its middle (see `spread`), so the picture's pixels are spread evenly
// over the image at whatever spacing that comes to. The spacing is deliberately not rounded to
// a whole number of pixels: an image with a fine regular texture (dithered art, stripes, a
// stippled transparency) would have the same part of its texture picked every time, and come
// out all light or all dark.
//
// In Cutout, Solid, Stencil, Lines and Silhouette each pixel of the picture is exactly what the image
// pixel it stands for is in the full mask. The pattern styles and Atkinson are instead drawn
// afresh on the picture's own pixels, because their look comes from how neighbouring pixels
// alternate, and pixels picked from a pattern do not alternate as the pattern does.
export function mask(img, style, set = null, mw = img.w, mh = img.h) {
  const { w, h, lum, data, right, down, lo, hi, cut: alphaCut = ALPHA_CUT } = img, m = new Uint8Array(mw * mh);
  const xs = spread(w, mw), ys = spread(h, mh); // the image column and row of each of the picture's
  const opt = typeof set === 'number' ? { threshold: set } : set ?? {};
  const t = opt.threshold ?? autoThreshold(img, style);
  const opaque = !img.hasAlpha; // then every pixel is solid, and the large RGBA array is never read
  const solid = p => opaque || data[p * 4 + 3] >= alphaCut;
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
    const thin = (x, y, p) =>
      (x ? line(p, p - 1, right[p - 1]) : edge) || (x + 1 < w ? line(p, p + 1, right[p]) : edge) || (y ? line(p, p - w, down[p - w]) : edge) || (y + 1 < h ? line(p, p + w, down[p]) : edge);
    // `thickness` widens the lines: a solid pixel fewer than that many steps (left, right, up or
    // down) from a line is a line too. `darks` also makes every pixel that dark or darker first
    // color, without widening it; 0 leaves that off.
    const reach = (opt.thickness ?? 1) - 1, darks = opt.darks ?? 0;
    const dark = p => darks > 0 && lum[p] <= darks;
    if (reach && w * h <= 2 * mw * mh) {
      // The picture has at least half the image's pixels, so the lines are found once for the
      // whole image and then grown a step at a time. Asking each pixel of the picture about all
      // the pixels within reach of it costs more than that from about there up, and less for a
      // smaller picture (timed on a smooth 1600x1200 image, where few pixels find a line early:
      // the two cost the same at 0.4 of its pixels for thickness 3 and at 0.65 for thickness 2).
      let from = new Uint8Array(w * h), to = new Uint8Array(w * h);
      for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) from[p] = solid(p) && thin(x, y, p) ? 1 : 0;
      for (let step = 0; step < reach; step++, [from, to] = [to, from]) {
        for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
          to[p] = from[p] | (x ? from[p - 1] : 0) | (x + 1 < w ? from[p + 1] : 0) | (y ? from[p - w] : 0) | (y + 1 < h ? from[p + w] : 0);
        }
      }
      for (let j = 0, o = 0; j < mh; j++) for (let i = 0, row = ys[j] * w; i < mw; i++, o++) {
        const p = row + xs[i];
        if (solid(p)) m[o] = from[p] || dark(p) ? 1 : 2;
      }
      return m;
    }
    // whether a line lies within reach of the pixel at x, y, which is not one itself
    const near = (x, y) => {
      for (let dy = -reach; dy <= reach; dy++) {
        const Y = y + dy, across = reach - Math.abs(dy);
        if (Y < 0 || Y >= h) continue;
        for (let X = Math.max(0, x - across), end = Math.min(w - 1, x + across), q = Y * w + X; X <= end; X++, q++) if (solid(q) && thin(X, Y, q)) return true;
      }
      return false;
    };
    for (let j = 0, o = 0; j < mh; j++) for (let i = 0, y = ys[j]; i < mw; i++, o++) {
      const x = xs[i], p = y * w + x;
      if (solid(p)) m[o] = dark(p) || thin(x, y, p) || (reach && near(x, y)) ? 1 : 2;
    }
    return m;
  }

  if (style === 'cutout') {
    // Bright parts are filled, dark parts are left dark, and the boundaries between parts of the
    // same tone are cut in the other tone. 0 empty, 1 dark, 2 light; outside the canvas is
    // empty only for sprites, as in Lines.
    const out = img.hasAlpha ? 0 : -1, strength = opt.seams ?? img.autoSeam, rim = opt.rim ?? true;
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
      // a dark pixel on the silhouette with no light pixel around it becomes a light rim, unless rims are off
      else m[o] = seam || (rim && beside && l !== 2 && r !== 2 && u !== 2 && d !== 2 && !corner(p, L, R, U, D, 2)) ? 2 : 1;
    }
    return m;
  }

  if (style === 'stencil') {
    // Every solid pixel is the second color but the cuts: inside pixels about as dark as their
    // sprite's own outline, and with Edges the darker side of a strong color change. How dark
    // that is, each sprite says for itself on Auto; a Cuts set by hand is so much above each
    // sprite's outline level. A sprite that would lose half its inside or more that way has no
    // line art to cut, only its own color, and is left whole. The outline itself is kept, or cut
    // when it is trimmed. The canvas edge is empty only for sprites, as in Lines.
    const { level, auto, body } = spritesOf(img), edge = img.hasAlpha;
    // no two pixels differ by more than 255, so with Edges off nothing is strong enough
    const cuts = opt.cuts ?? null, trim = opt.outline === 'trim', strength = 255 - 2 * (opt.edges ?? 0);
    for (let j = 0, o = 0; j < mh; j++) for (let i = 0, y = ys[j]; i < mw; i++, o++) {
      const x = xs[i], p = y * w + x;
      if (!solid(p)) continue;
      if ((x ? !solid(p - 1) : edge) || (x + 1 < w ? !solid(p + 1) : edge) || (y ? !solid(p - w) : edge) || (y + 1 < h ? !solid(p + w) : edge)) m[o] = trim ? 1 : 2;
      else {
        const seam =
          (x && right[p - 1] > strength && darker(p, p - 1)) || (x + 1 < w && right[p] > strength && darker(p, p + 1)) || (y && down[p - w] > strength && darker(p, p - w)) || (y + 1 < h && down[p] > strength && darker(p, p + w));
        // an inside pixel that touches empty space at a corner is never cut: there an outline two pixels thick would leave a speck
        const corner = !solid(p - w - 1) || !solid(p - w + 1) || !solid(p + w - 1) || !solid(p + w + 1);
        const dark = cuts === null ? auto[p] : level[p] + cuts; // this dark or darker is cut
        m[o] = !corner && (seam || (lum[p] <= dark && body[p] > dark)) ? 1 : 2;
      }
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
  // `shading` then says how far from the threshold a tone is still patterned: at 100 as far as
  // the darkest and lightest, at 50 half as far, with every tone beyond that fully dark or
  // light, and at 0 not at all, which is Solid.
  // Worked out once for each of the 256 brightnesses, not once for each pixel.
  const shading = (opt.shading ?? 100) / 100;
  const tones = Float64Array.from({ length: 256 }, (_, l) => {
    const tone = l <= t ? (t > lo ? (0.5 * (l - lo)) / (t - lo) : 0) : 0.5 + (0.5 * (l - t)) / (hi - t);
    return shading ? Math.min(1, Math.max(0, 0.5 + (tone - 0.5) / shading)) : tone > 0.5 ? 1 : 0;
  });

  if (style === 'atkinson') {
    // Each of the picture's pixels passes its error on to the ones after it, by the kernel chosen.
    // Error only ever reaches two rows down, so the running values are held for three rows at
    // a time (the one being converted and the two below it) instead of for the whole picture.
    const fill = (row, j) => {
      if (j < mh) for (let i = 0, from = ys[j] * w; i < mw; i++) { const p = from + xs[i]; row[i] = solid(p) ? tones[lum[p]] * 255 : 0; }
      return row;
    };
    // Atkinson's own kernel, the default, is written out, which runs in well under half the time
    // of the loop the other kernels go through.
    const other = KERNELS[opt.diffusion], { dx, dy, part } = other ?? KERNELS.floyd, parts = part.length;
    let v = fill(new Float32Array(mw), 0), next = fill(new Float32Array(mw), 1), after = fill(new Float32Array(mw), 2);
    for (let j = 0, o = 0; j < mh; j++) {
      for (let i = 0, row = ys[j] * w; i < mw; i++, o++) {
        if (!solid(row + xs[i])) continue;
        const on = v[i] > 127.5, error = v[i] - (on ? 255 : 0);
        m[o] = on ? 2 : 1;
        // a row past the last one is never read, so error handed to it is simply lost
        if (other) {
          for (let n = 0; n < parts; n++) {
            const x = i + dx[n];
            if (x >= 0 && x < mw) (dy[n] === 0 ? v : dy[n] === 1 ? next : after)[x] += error * part[n];
          }
          continue;
        }
        const e = error / 8;
        if (i + 1 < mw) v[i + 1] += e;
        if (i + 2 < mw) v[i + 2] += e;
        if (i > 0) next[i - 1] += e;
        next[i] += e;
        if (i + 1 < mw) next[i + 1] += e;
        after[i] += e;
      }
      [v, next, after] = [next, after, fill(v, j + 3)];
    }
    return m;
  }

  // Checker, Hatch, Bayer and Noise. The pattern is laid over the picture's own pixels.
  // `scale` draws each cell of the pattern that many pixels wide and high. A smaller picture has
  // fewer pixels for the same cell, so there the scale shrinks with it, and a pattern too fine
  // for the picture is drawn at 1.
  const { n, cuts } = TILES[style](opt), scale = Math.max(1, Math.round(((opt.scale ?? 1) * mw) / w));
  // the column of the tile each column of the picture is in, worked out once, not for every row
  const cxs = Int32Array.from({ length: mw }, (_, i) => Math.floor(i / scale) % n);
  for (let j = 0, o = 0; j < mh; j++) {
    for (let i = 0, row = ys[j] * w, cy = (Math.floor(j / scale) % n) * n; i < mw; i++, o++) {
      const p = row + xs[i];
      if (solid(p)) m[o] = tones[lum[p]] > cuts[cy + cxs[i]] ? 2 : 1;
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

// Turns a mask into RGBA pixels. Colors are '#rrggbb', or null for a color that is None, whose
// pixels are left clear like the empty ones.
export function colorize(m, first, second) {
  // Each pixel is written whole, as one 32-bit number. `c` holds the empty pixel and the two
  // colors as such numbers, built from their bytes so the byte order is the machine's own.
  const rgba = hex => (hex ? [...hexToRgb(hex), 255] : [0, 0, 0, 0]);
  const c = new Uint32Array(Uint8Array.of(0, 0, 0, 0, ...rgba(first), ...rgba(second)).buffer);
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
