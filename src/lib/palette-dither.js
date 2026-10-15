// Arbitrary-palette ordered dithering. No error crosses pixels or animation frames.
// Matching selects four candidates; a grid-realizable linear-light mixture is
// scored in Oklab, with a point-distortion penalty to discourage distant colors.
export function prepareDither(state, mode, strength, linear, lab) {
  const side = Number(mode[0]), cells = side * side;
  const ranks = new Uint8Array(cells);
  // Bayer recursion: [0 2; 3 1], anchored to original image coordinates.
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    let rank = 0;
    for (let bit = 1; bit < side; bit <<= 1) {
      const bx = (x & bit) ? 1 : 0, by = (y & bit) ? 1 : 0;
      rank = rank * 4 + ((bx ^ by) * 2 + by);
    }
    ranks[y * side + x] = rank;
  }
  const light = new Float64Array(state.size * 3);
  for (let i = 0; i < light.length; i++) light[i] = linear[state.rgb[i]];
  return { side, cells, ranks, strength: strength / 100, light, linear, lab,
    candidates: new Uint16Array(4), distances: new Float64Array(4),
    pointErrors: new Float64Array(4), mixed: new Float64Array(3) };
}

function mixturePlan(state, p) {
  const { data, labs, rgb, metric, scratch, size } = state;
  const d = state.ditherData, { linear, light, lab, candidates, distances, pointErrors, mixed, cells } = d;
  const sr = linear[data[p]], sg = linear[data[p + 1]], sb = linear[data[p + 2]];
  lab(sr, sg, sb, scratch, 0);
  const count = Math.min(4, size);
  distances.fill(Infinity);
  for (let i = 0; i < size; i++) {
    const at = i * 3;
    const dr = metric === 'rgb' ? data[p] - rgb[at] : scratch[0] - labs[at];
    const dg = metric === 'rgb' ? data[p + 1] - rgb[at + 1] : scratch[1] - labs[at + 1];
    const db = metric === 'rgb' ? data[p + 2] - rgb[at + 2] : scratch[2] - labs[at + 2];
    const distance = dr * dr + dg * dg + db * db;
    if (distance >= distances[count - 1]) continue;
    let slot = count - 1;
    while (slot && distance < distances[slot - 1]) {
      distances[slot] = distances[slot - 1]; candidates[slot] = candidates[slot - 1]; slot--;
    }
    distances[slot] = distance; candidates[slot] = i;
  }
  const nearest = candidates[0], n = nearest * 3;
  // Amount moves the desired emitted-light average from the selected metric's
  // nearest color toward the source. Zero bypasses this engine entirely. The
  // discrete grid means intermediate amounts need not change every image.
  const tr = light[n] + (sr - light[n]) * d.strength;
  const tg = light[n + 1] + (sg - light[n + 1]) * d.strength;
  const tb = light[n + 2] + (sb - light[n + 2]) * d.strength;
  lab(tr, tg, tb, mixed, 0);
  const tl = mixed[0], ta = mixed[1], tblue = mixed[2];
  for (let i = 0; i < count; i++) {
    const at = candidates[i] * 3;
    pointErrors[i] = (scratch[0] - labs[at]) ** 2 + (scratch[1] - labs[at + 1]) ** 2 + (scratch[2] - labs[at + 2]) ** 2;
  }
  const penalty = .03;
  let best = (tl - labs[n]) ** 2 + (ta - labs[n + 1]) ** 2 + (tblue - labs[n + 2]) ** 2 + penalty * pointErrors[0];
  let plan = nearest | nearest << 8;
  for (let a = 0; a < count - 1; a++) for (let b = a + 1; b < count; b++) {
    const ai = candidates[a], bi = candidates[b], ap = ai * 3, bp = bi * 3;
    const dr = light[bp] - light[ap], dg = light[bp + 1] - light[ap + 1], db = light[bp + 2] - light[ap + 2];
    const length = dr * dr + dg * dg + db * db;
    const ideal = ((tr - light[ap]) * dr + (tg - light[ap + 1]) * dg + (tb - light[ap + 2]) * db) / length;
    // Three occupancies around the linear-light projection keep the search
    // bounded (at most 6 pairs x 3 weights); this is a heuristic, not an exhaustive
    // optimal-palette mixture. Real occupancy avoids tiny, unrealizable weights.
    const middle = Math.max(1, Math.min(cells - 1, Math.round(ideal * cells)));
    const lo = Math.max(1, middle - 1), hi = Math.min(cells - 1, middle + 1);
    for (let weight = lo; weight <= hi; weight++) {
      const t = weight / cells;
      lab(light[ap] + t * dr, light[ap + 1] + t * dg, light[ap + 2] + t * db, mixed, 0);
      const error = (tl - mixed[0]) ** 2 + (ta - mixed[1]) ** 2 + (tblue - mixed[2]) ** 2
        + penalty * (pointErrors[a] * (1 - t) + pointErrors[b] * t);
      if (error < best) { best = error; plan = ai | bi << 8 | weight << 16; }
    }
  }
  return plan;
}

export function convertDither(state, start, end) {
  const { data, sourceW, xs, ys, exact, alphaCut, result } = state;
  const alpha = result.alpha;
  const { side, ranks } = state.ditherData;
  for (let o = start; o < end; o++) {
    const x = xs[o % result.w], y = ys[Math.floor(o / result.w)], p = (y * sourceW + x) * 4;
    if (data[p + 3] < alphaCut) { result.indices[o] = 256; result.hasTransparency = true; continue; }
    if (alpha) alpha[o] = data[p + 3];
    const key = data[p] << 16 | data[p + 1] << 8 | data[p + 2];
    let index = exact.get(key);
    if (index === undefined) {
      let plan = state.memo?.get(key);
      if (plan !== undefined) state.hits++;
      else {
        plan = mixturePlan(state, p);
        if (state.memo) {
          state.misses++;
          if (state.memo.size >= 4096 || state.misses >= 512 && state.hits < state.misses / 3) state.memo = null;
          else state.memo.set(key, plan);
        }
      }
      index = ranks[(y % side) * side + x % side] < (plan >>> 16) ? (plan >>> 8 & 255) : (plan & 255);
    }
    result.indices[o] = index; result.used[index] = 1;
  }
}
