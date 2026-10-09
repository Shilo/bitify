// Experimental candidate detector. Not production: nothing in src imports this.
// It asks one question: which inside pixels are worth offering as cuts at all? Two kinds are offered.
//   cavity  a whole connected patch as dark as the sprite's own outline, when the patch is broad
//           (holds a 2x2 block): a visor, a face opening, the mouth of a cap. Every pixel of it.
//   seam    a dark pixel in a run at most `thin` long, in one of four directions, with a lighter
//           pixel beyond both ends of the run: a line drawn between two lit areas.
// A dark run with the outline on one side of it is neither. That is the outline's own thickness.
// Returns a mask for Outline Keep (2 visible, 1 cut, 0 empty) and what each cut pixel was offered as.
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

// Otsu's split of the values up to `top`; `fallback` when there is nothing to split
function otsu(hist, fallback, top = 255) {
  let n = 0, sum = 0;
  for (let i = 0; i <= top; i++) { n += hist[i]; sum += i * hist[i]; }
  let sumB = 0, wB = 0, best = 0, t = fallback;
  for (let i = 0; i <= top; i++) {
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

// `thin`: the longest run still a seam. `thinBlack`: also offer narrow outline-dark patches that are
// not seams (the first variant tried; it brings the outline's thickness back as a moat).
// `protect`: never cut a seam in the middle of a part three pixels wide; `protectAll` extends that to
// every kind of cut (the first version let cavities through; found by the independent audit).
// `specks`: drop a cut with no cut beside it.
// `ink`: how dark "as dark as the outline" is. 'split' infers it by splitting the dark group of the
// sprite's histogram again. 'rim' measures it: the brightness three quarters of the outline's own
// pixels are at or below.
// `bays`: also offer outline-dark pixels that continue a gap of the silhouette inward (kind 3). A bay is an
// empty pixel lying between two parts of the sprite along its row or its column: a notch, a hole. From
// the pixel, in one of eight directions, nothing but outline-dark pixels and then a bay. 'keep' cuts
// only inside the sprite. 'open' also cuts the outline pixels on that line, so the notch opens to the
// outside; it changes the silhouette. Each opening is accepted or refused by itself (see below), and the
// inside cuts are the same as with 'keep'. `openSeams`: false lets only cavities and continued gaps open,
// not a seam that happens to end at a gap.
export function detect(img, { thin = 2, thinBlack = false, protect = true, protectAll = false, specks = true, seams = true, cavities = true, ink = 'split', bays = false, openSeams = true } = {}) {
  const { w, h, data, lum } = img, size = w * h, m = new Uint8Array(size), kind = new Uint8Array(size); // kind: 1 cavity, 2 seam
  const solid = p => data[p * 4 + 3] >= 128, at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && solid(y * w + x);
  const seen = new Uint8Array(size);
  for (let start = 0; start < size; start++) {
    if (seen[start] || !solid(start)) continue;
    const px = [start]; seen[start] = 1;
    for (const p of px) { const x = p % w, y = (p - x) / w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) { const n = (y + dy) * w + x + dx; if (!seen[n]) { seen[n] = 1; px.push(n); } } }
    const all = new Array(256).fill(0), inner = new Array(256).fill(0), rim = new Set(), free = new Set(); // free: inside and not at a corner of empty space
    const rowMin = new Array(h).fill(w), rowMax = new Array(h).fill(-1), colMin = new Array(w).fill(h), colMax = new Array(w).fill(-1);
    let low = 255, inside = 0;
    for (const p of px) {
      const x = p % w, y = (p - x) / w;
      rowMin[y] = Math.min(rowMin[y], x); rowMax[y] = Math.max(rowMax[y], x); colMin[x] = Math.min(colMin[x], y); colMax[x] = Math.max(colMax[x], y);
      all[lum[p]]++;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { rim.add(p); low = Math.min(low, lum[p]); }
      else { inside++; inner[lum[p]]++; if (at(x - 1, y - 1) && at(x + 1, y - 1) && at(x - 1, y + 1) && at(x + 1, y + 1)) free.add(p); }
    }
    let median = 0; for (let l = 0, c = 0; l < 256; l++) if ((c += inner[l]) * 2 >= inside) { median = l; break; }
    const share = t => { let c = 0; for (let l = 0; l <= t; l++) c += inner[l]; return inside ? c / inside : 0; };
    const T = otsu(all, low); // the dark group, shading and all
    let B = otsu(all, T, T); // the outline's own darkness: the dark group split again, until it is under half the inside
    for (let i = 0; i < 255 && share(B) >= 0.5; i++) { const n = otsu(all, B, B); if (n >= B) break; B = n; }
    const rimLum = [...rim].map(p => lum[p]).sort((a, b) => a - b), dark = ink === 'rim' ? Math.min(B, rimLum[Math.floor(rimLum.length * 0.75)]) : B;
    const bay = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !at(x, y) && ((rowMin[y] < x && x < rowMax[y]) || (colMin[x] < y && y < colMax[x]));
    const may = p => free.has(p) && lum[p] <= T && lum[p] < median; // the same limits Stencil has today
    const offered = new Map();

    if (cavities) { // connected outline-dark patches, diagonals included
      const done = new Set();
      for (const s of px) {
        if (done.has(s) || !may(s) || lum[s] > dark) continue;
        const patch = [s]; done.add(s);
        for (const p of patch) { const x = p % w, y = (p - x) / w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = (y + dy) * w + x + dx; if (at(x + dx, y + dy) && !done.has(q) && may(q) && lum[q] <= dark) { done.add(q); patch.push(q); } } }
        const set = new Set(patch), broad = patch.some(p => set.has(p + 1) && set.has(p + w) && set.has(p + w + 1) && p % w + 1 < w);
        if (broad || thinBlack) for (const p of patch) offered.set(p, 1);
      }
    }
    if (seams) {
      for (const p of px) {
        if (offered.has(p) || !may(p)) continue;
        const x = p % w, y = (p - x) / w;
        // At two darknesses: lines of the dark group between light pixels, and, in a sprite whose
        // own color is in the dark group (a book's cover), lines as dark as the outline on that color.
        for (const level of lum[p] <= dark && dark < T ? [T, dark] : [T]) {
          for (const [dx, dy] of DIRS) {
            // the run of pixels this dark through p in this direction, and the pixel beyond each end of it
            let a = 1, b = 1;
            while (at(x + dx * a, y + dy * a) && lum[(y + dy * a) * w + x + dx * a] <= level) a++;
            while (at(x - dx * b, y - dy * b) && lum[(y - dy * b) * w + x - dx * b] <= level) b++;
            if (a + b - 1 <= thin && at(x + dx * a, y + dy * a) && at(x - dx * b, y - dy * b)) { offered.set(p, 2); break; }
          }
          if (offered.has(p)) break;
        }
      }
    }
    // From p, in each of eight directions: nothing but outline-dark pixels, then a bay. Gives, for each such
    // direction, the pixels on the way that are not cuts already: outline pixels, and inside pixels at a
    // corner of empty space. A way that crosses an inside pixel which may be cut and was not is no way:
    // the gap would not be continuous.
    const ways = (p, directions = 8) => { // the first four directions are along rows and columns
      const x = p % w, y = (p - x) / w, out = [];
      for (let d = 0; d < directions; d++) {
        const dx = [1, -1, 0, 0, 1, 1, -1, -1][d], dy = [0, 0, 1, -1, 1, -1, 1, -1][d], way = [];
        for (let k = 1; ; k++) {
          const X = x + dx * k, Y = y + dy * k, q = Y * w + X;
          if (at(X, Y)) { if (lum[q] > dark) break; if (!offered.has(q)) way.push(q); continue; }
          if (bay(X, Y)) out.push(way);
          break;
        }
      }
      return out;
    };
    if (bays) for (const p of px) if (!offered.has(p) && may(p) && lum[p] <= dark && ways(p).length) offered.set(p, 3);
    const core = p => (rim.has(p - 1) && rim.has(p + 1)) || (rim.has(p - w) && rim.has(p + w)); // the one-pixel middle of a part three wide
    if (protect || protectAll) for (const p of [...offered.keys()]) if ((protectAll || offered.get(p) === 2) && core(p)) offered.delete(p);
    if (specks) {
      const lone = [...offered.keys()].filter(p => {
        const x = p % w, y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy) && offered.has((y + dy) * w + x + dx)) return false;
        return true;
      });
      for (const p of lone) offered.delete(p); // together, so one speck does not save another
    }
    // The inside cuts are final here, and are the same with the gaps opened as with the outline kept.
    for (const p of px) { const k = offered.get(p) ?? 0; m[p] = k ? 1 : 2; kind[p] = k; }
    if (bays === 'open') {
      // An opening is one way straight out, along a row or a column, from a cut that survived: the pixels
      // between that cut and a bay. (A diagonal way continues a gap inward, but opening along it takes
      // corners off the parts beside the gap.) A way through a pixel that was protected or cleaned away is
      // dropped, so nothing is opened that does not reach a cut. Each way is tried by itself on the mask of
      // inside cuts, and kept only if the ink stays in as many pieces, counted with diagonals and without:
      // so no opening breaks a part off or leaves it hanging by a corner. Then the kept ones are tried
      // together. If together they do what none does alone, the ways without which the rest would hold
      // are refused; if no single way is to blame, all are. No order of trying decides anything.
      const tried = [];
      for (const [p, k] of offered) {
        if (lum[p] > dark || (k === 2 && !openSeams)) continue;
        for (const way of ways(p, 4)) if (way.length && way.every(q => rim.has(q) || !free.has(q))) tried.push(way);
      }
      const pieces = diagonal => {
        const seen2 = new Set(); let c = 0;
        for (const s0 of px) {
          if (m[s0] !== 2 || seen2.has(s0)) continue;
          c++; const q = [s0]; seen2.add(s0);
          for (const p of q) { const x = p % w, y = (p - x) / w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = (y + dy) * w + x + dx; if ((dx || dy) && (diagonal || !dx || !dy) && at(x + dx, y + dy) && m[n] === 2 && !seen2.has(n)) { seen2.add(n); q.push(n); } } }
        }
        return c;
      };
      const with8 = pieces(true), with4 = pieces(false), holds = () => pieces(true) <= with8 && pieces(false) <= with4;
      const put = (list, v) => { for (const way of list) for (const p of way) m[p] = v; };
      let kept = tried.filter(way => { put([way], 1); const ok = holds(); put([way], 2); return ok; });
      put(kept, 1);
      if (!holds()) {
        const blamed = kept.filter(way => { put([way], 2); put(kept.filter(o => o !== way), 1); const ok = holds(); put(kept, 1); return ok; });
        put(kept, 2);
        kept = blamed.length ? kept.filter(way => !blamed.includes(way)) : [];
        put(kept, 1);
        if (!holds()) { put(kept, 2); kept = []; }
      }
      for (const way of kept) for (const p of way) kind[p] = 4;
    }
  }
  return { mask: m, kind };
}
