import { glyphComponent } from './icon-glyph.js';

// Structural icon conversion. Prepared once; moving Detail only samples two byte arrays.
// No item names, templates, trained model, or assumptions about the input palette.
const DX = Int8Array.of(-1, 0, 1, -1, 1, -1, 0, 1);
const DY = Int8Array.of(-1, -1, -1, 0, 0, 1, 1, 1);
const ADJ = new Uint8Array(8), CONNECTED = new Uint8Array(256), COUNT = new Uint8Array(256);
for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
  if (i !== j && Math.abs(DX[i] - DX[j]) <= 1 && Math.abs(DY[i] - DY[j]) <= 1) ADJ[i] |= 1 << j;
}
// Removing a pixel must not separate its eight-connected foreground neighbors.
for (let bits = 1; bits < 256; bits++) {
  let reached = bits & -bits, previous = 0, count = 0;
  for (let b = bits; b; b &= b - 1) count++;
  while (reached !== previous) {
    previous = reached;
    for (let i = 0; i < 8; i++) if (reached & (1 << i)) reached |= ADJ[i] & bits;
  }
  CONNECTED[bits] = reached === bits;
  COUNT[bits] = count;
}

// Whether the current pixel has ink neighbors, as a bit field. No temporary pixel objects.
function neighbors(ink, p, x, y, w, h) {
  let bits = 0;
  for (let k = 0; k < 8; k++) {
    const X = x + DX[k], Y = y + DY[k];
    if (X >= 0 && X < w && Y >= 0 && Y < h && ink[Y * w + X]) bits |= 1 << k;
  }
  return bits;
}

const median = (hist, n) => {
  for (let v = 0, count = 0; v < 256; v++) if ((count += hist[v]) * 2 >= n) return v;
  return 0;
};

// Cached independently for Auto/Keep/Trim. RGB Value detects a near-black drawn border;
// the selected Brightness source ranks creases and chooses a material boundary's dark side.
export function iconOf(img, outline = 'auto') {
  const cached = (img.icons ??= {});
  if (cached[outline]) return cached[outline];
  const { w, h, data, lum, cut = 128 } = img, size = w * h;
  const ink = new Uint8Array(size), detail = new Uint8Array(size).fill(255);
  const value = new Uint8Array(size), score = new Uint8Array(size), rim = new Uint8Array(size);
  const seen = new Uint8Array(size), queue = new Int32Array(size), work = new Uint8Array(size), next = new Int32Array(size);
  const insideHist = new Uint32Array(256), allHist = new Uint32Array(256);
  const heads = new Int32Array(101).fill(-1), tails = new Int32Array(101).fill(-1);
  for (let p = 0, i = 0; p < size; p++, i += 4) {
    ink[p] = data[i + 3] >= cut ? 1 : 0;
    value[p] = Math.max(data[i], data[i + 1], data[i + 2]);
  }
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    if (ink[p]) rim[p] = !x || !y || x + 1 === w || y + 1 === h || !ink[p - 1] || !ink[p + 1] || !ink[p - w] || !ink[p + w] ? 1 : 0;
  }
  for (let start = 0; start < size; start++) {
    if (!ink[start] || seen[start]) continue;
    let n = 1, inner = 0, boundary = 0;
    queue[0] = start;
    seen[start] = 1;
    for (let i = 0; i < n; i++) {
      const p = queue[i], x = p % w, y = (p - x) / w;
      allHist[value[p]]++;
      if (rim[p]) boundary++;
      else { insideHist[value[p]]++; inner++; }
      for (let k = 0; k < 8; k++) {
        const X = x + DX[k], Y = y + DY[k];
        if (X < 0 || X >= w || Y < 0 || Y >= h) continue;
        const q = Y * w + X;
        if (ink[q] && !seen[q]) { seen[q] = 1; queue[n++] = q; }
      }
    }
    if (glyphComponent(img, queue, n, outline, detail)) {
      for (let i = 0; i < n; i++) { const p = queue[i]; allHist[value[p]] = insideHist[value[p]] = 0; }
      continue;
    }
    const body = median(inner ? insideHist : allHist, inner || n), black = Math.min(32, body / 4);
    let darkRim = 0;
    for (let i = 0; i < n; i++) { const p = queue[i]; if (rim[p] && value[p] <= black) darkRim++; }
    const drawn = inner >= 4 && darkRim >= boundary * 0.55 && body > black + 20;
    // Peel only the inferred near-black stroke, not every object edge. Work starts as a copy
    // of this component's support; thin source parts and disconnected source marks survive.
    for (let i = 0; i < n; i++) work[queue[i]] = 1;
    if (outline === 'trim' || (outline === 'auto' && drawn)) {
      // Try the stroke as a whole first. Local connectivity alone can retain a false
      // bridge even though the body connects around it elsewhere (especially on circles).
      for (let i = 0; i < n; i++) {
        const p = queue[i], x = p % w, y = (p - x) / w;
        if ((outline === 'trim' ? rim[p] : value[p] <= black) && COUNT[neighbors(ink, p, x, y, w, h)] >= 3) work[p] = 0;
      }
      let pieces = 0;
      for (let i = 0; i < n; i++) {
        const start = queue[i];
        if (!work[start] || seen[start] === 2) continue;
        pieces++;
        let count = 1;
        next[0] = start; seen[start] = 2;
        for (let j = 0; j < count; j++) {
          const p = next[j], x = p % w, y = (p - x) / w;
          for (let k = 0; k < 8; k++) {
            const X = x + DX[k], Y = y + DY[k];
            if (X < 0 || X >= w || Y < 0 || Y >= h) continue;
            const q = Y * w + X;
            if (work[q] && seen[q] !== 2) { seen[q] = 2; next[count++] = q; }
          }
        }
      }
      for (let i = 0; i < n; i++) seen[queue[i]] = 1;
      // If simultaneous removal would split or erase the body, use conservative local
      // peeling instead. Both paths keep the original component connected and nonempty.
      if (pieces !== 1) {
        for (let i = 0; i < n; i++) work[queue[i]] = 1;
        for (let i = 0; i < n; i++) {
          const p = queue[i], x = p % w, y = (p - x) / w;
          if (outline === 'trim' ? !rim[p] : value[p] > black) continue;
          const original = neighbors(ink, p, x, y, w, h), current = neighbors(work, p, x, y, w, h);
          if (COUNT[original] >= 3 && CONNECTED[current]) work[p] = 0;
        }
      }
    }
    let area = 0;
    for (let i = 0; i < n; i++) { const p = queue[i]; ink[p] = work[p]; area += work[p]; }
    // Chromatic boundaries use RGB normalized by Value, so a material's smooth light-to-dark
    // ramp produces no seam. Creases require a dark valley between brighter opposite pixels.
    for (let i = 0; i < n; i++) {
      const p = queue[i], x = p % w, y = (p - x) / w;
      if (!ink[p]) continue;
      let sides = 0, best = 0;
      if (x && ink[p - 1]) sides++;
      if (x + 1 < w && ink[p + 1]) sides++;
      if (y && ink[p - w]) sides++;
      if (y + 1 < h && ink[p + w]) sides++;
      if (sides < 3) continue; // a one- or two-pixel shaft is not an interior detail
      const at = p * 4, vp = Math.max(1, value[p]);
      for (let k = 0; k < 4; k++) {
        const q = k === 0 ? (x ? p - 1 : -1) : k === 1 ? (x + 1 < w ? p + 1 : -1) : k === 2 ? (y ? p - w : -1) : (y + 1 < h ? p + w : -1);
        // Equal-brightness materials still need a boundary. A stable RGB tie-break picks
        // one side, rather than carving both sides of the same boundary.
        if (q < 0 || !ink[q] || lum[q] < lum[p]) continue;
        const to = q * 4, vq = Math.max(1, value[q]);
        if (lum[q] === lum[p] && ((data[to] << 16) | (data[to + 1] << 8) | data[to + 2]) <= ((data[at] << 16) | (data[at + 1] << 8) | data[at + 2])) continue;
        const chroma = Math.max(Math.abs(data[at] / vp - data[to] / vq), Math.abs(data[at + 1] / vp - data[to + 1] / vq), Math.abs(data[at + 2] / vp - data[to + 2] / vq));
        if (chroma > 0.28) best = Math.max(best, Math.min(100, chroma * 130));
      }
      const horizontal = x && x + 1 < w && ink[p - 1] && ink[p + 1] ? Math.max(0, Math.min(lum[p - 1], lum[p + 1]) - lum[p]) : 0;
      const vertical = y && y + 1 < h && ink[p - w] && ink[p + w] ? Math.max(0, Math.min(lum[p - w], lum[p + w]) - lum[p]) : 0;
      const high = Math.max(horizontal, vertical), low = Math.min(horizontal, vertical);
      // A point dark in both axes is more likely texture than a separator.
      if (high > 18) best = Math.max(best, Math.min(100, high * 1.4) * (low > high * 0.75 ? 0.35 : 1));
      score[p] = Math.round(best);
    }
    // Group potential cuts before ranking them. Keep short lines and sparse curved grooves;
    // discard single dots, compact patches, and broad diagonal checker texture. `next` is
    // scratch space for the region flood, then reused for the rank buckets below.
    for (let i = 0; i < n; i++) {
      const start = queue[i];
      if (score[start] < 30 || detail[start] === 254) continue;
      let count = 1, minX = w, maxX = 0, minY = h, maxY = 0, linked = 0, strength = 0, junctions = 0;
      next[0] = start;
      detail[start] = 254;
      for (let j = 0; j < count; j++) {
        const p = next[j], x = p % w, y = (p - x) / w;
        strength += score[p];
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        if ((x && score[p - 1] >= 30) || (x + 1 < w && score[p + 1] >= 30) || (y && score[p - w] >= 30) || (y + 1 < h && score[p + w] >= 30)) linked++;
        let adjacent = 0;
        for (let k = 0; k < 8; k++) {
          const X = x + DX[k], Y = y + DY[k];
          if (X < 0 || X >= w || Y < 0 || Y >= h) continue;
          const q = Y * w + X;
          if (score[q] >= 30) adjacent++;
          if (score[q] >= 30 && detail[q] !== 254) { detail[q] = 254; next[count++] = q; }
        }
        if (adjacent > 2) junctions++;
      }
      const width = maxX - minX + 1, height = maxY - minY + 1;
      const compact = width > 1 && height > 1 && count > 2 && count > width * height * 0.6 && Math.max(width, height) < Math.min(width, height) * 2;
      const checker = count > 3 && linked < count / 2 && Math.max(width, height) < Math.min(width, height) * 2;
      const texture = count >= 5 && junctions > count * 0.4;
      const rank = count < 2 || compact || checker || texture ? 0 : Math.round(strength / count);
      for (let j = 0; j < count; j++) score[next[j]] = rank;
    }
    for (let i = 0; i < n; i++) detail[queue[i]] = 255;
    // Every pixel of a groove now has its region's mean strength.
    for (let i = 0; i < n; i++) {
      const p = queue[i], rank = score[p];
      if (rank >= 30) {
        if (tails[rank] >= 0) next[tails[rank]] = p;
        else heads[rank] = p;
        tails[rank] = p;
        next[p] = -1;
      }
      allHist[value[p]] = insideHist[value[p]] = 0;
    }
    // Try stronger cuts first. Local connectivity is constant work (a lookup in 256 cases).
    // Linked rank buckets visit each candidate once, without sorting or allocating per pixel.
    // Accepted cuts get a minimum Detail setting. All later masks use the same sequence, so
    // increasing Detail cannot undo previous cuts.
    let removed = 0;
    const limit = Math.floor(area * 0.25);
    for (let rank = 100; rank >= 30 && removed < limit; rank--) {
      for (let p = heads[rank]; p >= 0 && removed < limit; p = next[p]) {
        if (!score[p]) continue;
        // The source flood is finished, so its queue can now hold this cut region.
        let count = 1;
        queue[0] = p;
        score[p] = 0;
        for (let i = 0; i < count; i++) {
          const at = queue[i], x = at % w, y = (at - x) / w;
          for (let k = 0; k < 8; k++) {
            const X = x + DX[k], Y = y + DY[k];
            if (X < 0 || X >= w || Y < 0 || Y >= h) continue;
            const q = Y * w + X;
            if (score[q] === rank) { score[q] = 0; queue[count++] = q; }
          }
        }
        if (removed + count > limit) continue;
        for (let i = 0; i < count; i++) {
          const q = queue[i], x = q % w, y = (q - x) / w, bits = neighbors(work, q, x, y, w, h);
          if (!CONNECTED[bits] || COUNT[bits] < 2) continue;
          work[q] = 0;
          detail[q] = 254;
          removed++;
        }
        // A foreground bridge may prevent part of a groove being cut. If that leaves a
        // single new hole, restore it; keeping the bridge must not introduce a speckle.
        for (let i = 0; i < count; i++) {
          const q = queue[i], x = q % w, y = (q - x) / w;
          if (detail[q] !== 254) continue;
          let support = 0;
          for (let k = 0; k < 8; k++) {
            const X = x + DX[k], Y = y + DY[k];
            if (X >= 0 && X < w && Y >= 0 && Y < h && detail[Y * w + X] === 254) support++;
          }
          if (!support) { work[q] = 1; detail[q] = 255; removed--; }
        }
        // A groove appears together, rather than exposing its first few pixels as speckles.
        const onset = Math.max(100 - rank, Math.ceil(250 * removed / area));
        for (let i = 0; i < count; i++) if (detail[queue[i]] === 254) detail[queue[i]] = onset;
      }
    }
    heads.fill(-1);
    tails.fill(-1);
  }
  return (cached[outline] = { ink, detail });
}
