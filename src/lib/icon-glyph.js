// Small transparent sprites: coherent cavities, short seams, and silhouette notches.
// Derived from the independently reviewed cavity/bay experiment. No item templates.
// Work is bounded to 1024 source pixels in a 64x64 box; larger/opaque art uses Icon's
// linear groove preparation. Typed scratch arrays are made per component, never per pixel.
const DX = Int8Array.of(1, -1, 0, 0, 1, 1, -1, -1);
const DY = Int8Array.of(0, 0, 1, -1, 1, -1, 1, -1);

function split(hist, fallback, top = 255) {
  let n = 0, sum = 0, sumB = 0, wB = 0, best = 0, result = fallback;
  for (let v = 0; v <= top; v++) { n += hist[v]; sum += v * hist[v]; }
  for (let v = 0; v <= top; v++) {
    wB += hist[v];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += v * hist[v];
    const score = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (score > best) { best = score; result = v; }
  }
  return result;
}

// The padded component is small. Both topology tests reuse the same typed flood queue.
function pieces(ink, w, h, diagonal, seen, queue) {
  seen.fill(0);
  let total = 0;
  for (let s = 0; s < ink.length; s++) {
    if (!ink[s] || seen[s]) continue;
    total++;
    let count = 1;
    queue[0] = s; seen[s] = 1;
    for (let i = 0; i < count; i++) {
      const p = queue[i], x = p % w, y = (p - x) / w;
      for (let d = 0; d < (diagonal ? 8 : 4); d++) {
        const X = x + DX[d], Y = y + DY[d], q = Y * w + X;
        if (X >= 0 && Y >= 0 && X < w && Y < h && ink[q] && !seen[q]) {
          seen[q] = 1; queue[count++] = q;
        }
      }
    }
  }
  return total;
}

function degree(ink, p, w) {
  let n = 0;
  for (let d = 0; d < 8; d++) n += ink[p + DY[d] * w + DX[d]] || 0;
  return n;
}

function core(rim, p, w) {
  return (rim[p - 1] && rim[p + 1]) || (rim[p - w] && rim[p + w]);
}

function bay(x, y, w, h, source, rowMin, rowMax, colMin, colMax) {
  return x >= 0 && y >= 0 && x < w && y < h && !source[y * w + x] &&
    ((rowMin[y] < x && x < rowMax[y]) || (colMin[x] < y && y < colMax[x]));
}

function holds(ink, before, source, w, h, with4, with8, seen, queue, branches) {
  if (pieces(ink, w, h, true, seen, queue) !== with8 ||
      pieces(ink, w, h, false, seen, queue) > with4) return false;
  if (branches) for (let p = w + 1; p < ink.length - w - 1; p++) {
    if (ink[p] && source[p] && degree(before, p, w) > 1 && degree(ink, p, w) < 2) return false;
  }
  return true;
}

// Try independent straight paths, then reject joint conflicts without scan-order choices.
// Paths only extend cavities/notches, never seams; they cannot cross an unaccepted cut.
function openGaps(ink, source, lum, rim, free, kind, dark, w, h,
  rowMin, rowMax, colMin, colMax, seen, queue, before, trial, paths, lengths, active) {
  before.set(ink);
  const with4 = pieces(ink, w, h, false, seen, queue), with8 = pieces(ink, w, h, true, seen, queue);
  let count = 0;
  for (let p = w + 1; p < ink.length - w - 1; p++) {
    if (ink[p] || (kind[p] !== 1 && kind[p] !== 3)) continue;
    const x = p % w, y = (p - x) / w;
    for (let d = 0; d < 4; d++) {
      let n = 0, end = -1, blocked = false;
      for (let k = 1; ; k++) {
        const X = x + DX[d] * k, Y = y + DY[d] * k, q = Y * w + X;
        if (X < 0 || Y < 0 || X >= w || Y >= h) break;
        if (!source[q]) {
          if (bay(X, Y, w, h, source, rowMin, rowMax, colMin, colMax)) end = q;
          break;
        }
        if (lum[q] > dark || (ink[q] && (free[q] || (!rim[q] && core(rim, q, w))))) { blocked = true; break; }
        if (ink[q]) {
          if (count === lengths.length) return; // Too many proposals: keep this stage's contour.
          paths[count * 64 + n++] = q;
        }
      }
      if (blocked || end < 0 || !n) continue;
      let duplicate = false;
      for (let i = 0; i < count; i++) if (lengths[i] === n && paths[i * 64] === paths[count * 64] &&
        paths[i * 64 + n - 1] === paths[count * 64 + n - 1]) { duplicate = true; break; }
      if (!duplicate) lengths[count++] = n;
    }
  }
  active.fill(0);
  for (let i = 0; i < count; i++) {
    trial.set(before);
    for (let j = 0; j < lengths[i]; j++) trial[paths[i * 64 + j]] = 0;
    // A partial mouth opening can temporarily narrow the strip it is removing. Judge
    // branch thickness on the combined final opening, not on each partial ray.
    active[i] = holds(trial, before, source, w, h, with4, with8, seen, queue, false) ? 1 : 0;
  }
  trial.set(before);
  for (let i = 0; i < count; i++) if (active[i]) for (let j = 0; j < lengths[i]; j++) trial[paths[i * 64 + j]] = 0;
  if (!holds(trial, before, source, w, h, with4, with8, seen, queue, true)) {
    // `seen` cannot store blame: the topology floods reuse it. The upper half of active can.
    let blamed = 0;
    for (let skip = 0; skip < count; skip++) if (active[skip]) {
      trial.set(before);
      for (let i = 0; i < count; i++) if (i !== skip && active[i]) for (let j = 0; j < lengths[i]; j++) trial[paths[i * 64 + j]] = 0;
      if (holds(trial, before, source, w, h, with4, with8, seen, queue, true)) { active[128 + skip] = 1; blamed++; }
    }
    trial.set(before);
    for (let i = 0; i < count; i++) if (blamed && active[i] && !active[128 + i]) {
      for (let j = 0; j < lengths[i]; j++) trial[paths[i * 64 + j]] = 0;
    }
    if (!holds(trial, before, source, w, h, with4, with8, seen, queue, true)) trial.set(before);
  }
  ink.set(trial);
}

export function glyphComponent(img, pixels, n, outline, outDetail) {
  if (outline === 'trim' || !img.hasAlpha || n > 1024) return false;
  if (n < 12) return true; // Two supported interior cuts need at least a 3x4 source block.
  let minX = img.w, maxX = 0, minY = img.h, maxY = 0;
  for (let i = 0; i < n; i++) {
    const p = pixels[i], x = p % img.w, y = (p - x) / img.w;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (maxX - minX >= 64 || maxY - minY >= 64) return false;
  const w = maxX - minX + 3, h = maxY - minY + 3, size = w * h;
  const source = new Uint8Array(size), lum = new Uint8Array(size), rim = new Uint8Array(size), free = new Uint8Array(size);
  const kind = new Uint8Array(size), onset = new Uint8Array(size).fill(255), ink = new Uint8Array(size);
  const seen = new Uint8Array(size), queue = new Int32Array(size), before = new Uint8Array(size), trial = new Uint8Array(size), keptInk = new Uint8Array(size);
  const rowMin = new Int16Array(h).fill(w), rowMax = new Int16Array(h).fill(-1), colMin = new Int16Array(w).fill(h), colMax = new Int16Array(w).fill(-1);
  const all = new Uint32Array(256), inner = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const p = pixels[i], x = p % img.w - minX + 1, y = Math.floor(p / img.w) - minY + 1, q = y * w + x;
    source[q] = ink[q] = 1; lum[q] = img.lum[p]; all[lum[q]]++;
    rowMin[y] = Math.min(rowMin[y], x); rowMax[y] = Math.max(rowMax[y], x); colMin[x] = Math.min(colMin[x], y); colMax[x] = Math.max(colMax[x], y);
  }
  let low = 255, inside = 0, median = 0;
  for (let p = w + 1; p < size - w - 1; p++) if (source[p]) {
    rim[p] = !source[p - 1] || !source[p + 1] || !source[p - w] || !source[p + w] ? 1 : 0;
    if (rim[p]) low = Math.min(low, lum[p]);
    else {
      inside++; inner[lum[p]]++;
      free[p] = source[p - w - 1] && source[p - w + 1] && source[p + w - 1] && source[p + w + 1] ? 1 : 0;
    }
  }
  for (let v = 0, c = 0; v < 256; v++) if ((c += inner[v]) * 2 >= inside) { median = v; break; }
  const T = split(all, low);
  let dark = split(all, T, T);
  for (let i = 0; i < 255; i++) {
    let held = 0;
    for (let v = 0; v <= dark; v++) held += inner[v];
    if (!inside || held * 2 < inside) break;
    const next = split(all, dark, dark);
    if (next >= dark) break;
    dark = next;
  }
  // Whole broad dark regions. A single pixel never creates a cavity.
  for (let s = w + 1; s < size - w - 1; s++) {
    if (seen[s] || !free[s] || lum[s] > dark || lum[s] >= median) continue;
    let count = 1, broad = false;
    queue[0] = s; seen[s] = 1;
    for (let i = 0; i < count; i++) {
      const p = queue[i];
      if (free[p + 1] && free[p + w] && free[p + w + 1] && lum[p + 1] <= dark &&
        lum[p + w] <= dark && lum[p + w + 1] <= dark && lum[p + 1] < median &&
        lum[p + w] < median && lum[p + w + 1] < median) broad = true;
      for (let d = 0; d < 8; d++) {
        const q = p + DY[d] * w + DX[d];
        if (free[q] && !seen[q] && lum[q] <= dark && lum[q] < median) { seen[q] = 1; queue[count++] = q; }
      }
    }
    if (broad) for (let i = 0; i < count; i++) kind[queue[i]] = 1;
  }
  // Short valleys between brighter pixels. Above Otsu, weaker seams enter after Detail 50.
  for (let p = w + 1; p < size - w - 1; p++) {
    if (kind[p] || !free[p] || lum[p] >= median) continue;
    const level = Math.max(T, lum[p]);
    for (let pass = 0; pass < (lum[p] <= dark && dark < T ? 2 : 1) && !kind[p]; pass++) {
      const limit = pass ? dark : level;
      for (let d = 0; d < 4; d++) {
        // One representative of each opposite pair, including the two diagonals.
        const step = d === 0 ? 1 : d === 1 ? w : d === 2 ? w + 1 : 1 - w;
        let a = 1, b = 1;
        while (source[p + step * a] && lum[p + step * a] <= limit) a++;
        while (source[p - step * b] && lum[p - step * b] <= limit) b++;
        if (a + b - 1 <= 2 && source[p + step * a] && source[p - step * b]) { kind[p] = 2; break; }
      }
    }
  }
  // Continue a source notch inward, at outline darkness. Geometry is evidence, not semantics.
  for (let p = w + 1; p < size - w - 1; p++) {
    if (kind[p] || !free[p] || lum[p] > dark || lum[p] >= median) continue;
    const x = p % w, y = (p - x) / w;
    for (let d = 0; d < 8 && !kind[p]; d++) for (let k = 1; ; k++) {
      const X = x + DX[d] * k, Y = y + DY[d] * k, q = Y * w + X;
      if (X < 0 || Y < 0 || X >= w || Y >= h) break;
      if (source[q]) { if (lum[q] > dark) break; continue; }
      if (bay(X, Y, w, h, source, rowMin, rowMax, colMin, colMax)) kind[p] = 3;
      break;
    }
  }
  for (let p = 0; p < size; p++) if (kind[p] && core(rim, p, w)) kind[p] = 0;
  // Rank connected cut regions together. All members must enter before a region appears.
  seen.fill(0);
  let ranked = 0;
  for (let s = w + 1; s < size - w - 1; s++) {
    if (!kind[s] || seen[s]) continue;
    let count = 1, rank = 1;
    queue[0] = s; seen[s] = 1;
    for (let i = 0; i < count; i++) {
      const p = queue[i];
      const at = lum[p] <= T ? 50 - Math.floor(25 * (median - lum[p]) / Math.max(1, median - low)) :
        51 + Math.floor(49 * (lum[p] - T - 1) / Math.max(1, median - T - 2));
      rank = Math.max(rank, Math.min(100, at));
      for (let d = 0; d < 8; d++) {
        const q = p + DY[d] * w + DX[d];
        // Weak additions must not delay an already coherent default opening.
        if (kind[q] && !seen[q] && (lum[q] <= T) === (lum[s] <= T)) { seen[q] = 1; queue[count++] = q; }
      }
    }
    if (count < 2) { kind[s] = 0; continue; }
    ranked += count;
    for (let i = 0; i < count; i++) onset[queue[i]] = rank;
  }
  if (!ranked) return true;
  const with8 = pieces(source, w, h, true, seen, queue);
  const paths = new Int32Array(128 * 64), lengths = new Uint8Array(128), active = new Uint8Array(256);
  // Prepare all Detail levels once. The main mask loop still samples only two byte arrays.
  // Rejected cuts remain filled; a later Detail setting never undoes an accepted cut.
  for (let level = 1; level <= 100; level++) {
    let proposed = false;
    before.set(ink);
    if (level > 50) trial.set(keptInk);
    for (let p = 0; p < size; p++) if (onset[p] === level) { ink[p] = 0; proposed = true; }
    if (proposed) {
      if (level > 50) for (let p = 0; p < size; p++) if (onset[p] === level) keptInk[p] = 0;
      // After 50 both modes share the same accepted inner cuts. A weaker region must
      // preserve both the kept contour and the canonical opened contour.
      const safe = holds(ink, before, source, w, h, Infinity, with8, seen, queue, false) &&
        (level <= 50 || holds(keptInk, trial, source, w, h, Infinity, with8, seen, queue, false));
      if (!safe) { ink.set(before); if (level > 50) keptInk.set(trial); }
      else for (let i = 0; i < n; i++) {
        const p = pixels[i], q = (Math.floor(p / img.w) - minY + 1) * w + p % img.w - minX + 1;
        if (!(level <= 50 ? ink[q] : keptInk[q]) && outDetail[p] === 255) outDetail[p] = level;
      }
    }
    if (level === 50) {
      // Decide the interior first. Opening never changes which inner cuts survive.
      // Keep also prepares the canonical opening, to make later weak cuts agree.
      keptInk.set(ink);
      openGaps(ink, source, lum, rim, free, kind, dark, w, h,
        rowMin, rowMax, colMin, colMax, seen, queue, before, trial, paths, lengths, active);
      if (outline === 'auto') for (let i = 0; i < n; i++) {
        const p = pixels[i], q = (Math.floor(p / img.w) - minY + 1) * w + p % img.w - minX + 1;
        if (!ink[q] && keptInk[q]) outDetail[p] = 50;
      }
    }
  }
  return true;
}
