import { neighbors, regions, toLab, distance, validateInput } from './regions.mjs';

/** Research only; neither preset recognizes artistic meaning.
 * Frozen 8-connected regions of at most four pixels may merge into a color with
 * an edge-adjacent >=8-pixel component and at least half external edge contacts.
 * Border/transparency contact, a near tie, excessive color distance, or a third
 * boundary color >.02 squared Oklab from the replacement vetoes the proposal.
 * The third-color veto is a bounded structure heuristic, not outline protection.
 * Neither source geometry nor palette membership changes; label identity can.
 */
export function mergeAutomatic(input, { preset = 'strict' } = {}) {
  validateInput(input);
  if (preset !== 'strict' && preset !== 'balanced') throw new Error('Invalid automatic research preset');
  const { width, height, labels, colors } = input;
  const maximumDistance = preset === 'strict' ? .005 : .02;
  const frozenRegions = regions(labels, width, height, 8);
  const sizes = new Int32Array(labels.length);
  for (const region of frozenRegions) for (const pixel of region.pixels) sizes[pixel] = region.pixels.length;
  const labs = colors.map(toLab), output = labels.slice(), decisions = [];
  for (const region of frozenRegions) {
    if (region.pixels.length > 4) continue;
    const decision = { label: region.label, pixels: region.pixels.slice(), replacement: null, reason: '', distanceSquared: null };
    decisions.push(decision);
    if (region.pixels.some(p => p % width === 0 || p % width === width - 1 || p < width || p >= labels.length - width ||
        neighbors(p, width, height, 8).some(q => labels[q] < 0))) {
      decision.reason = 'border-or-transparency-veto'; continue;
    }
    const votes = new Map(), anchored = new Set();
    let externalContacts = 0;
    for (const p of region.pixels) for (const q of neighbors(p, width, height, 4)) {
      const label = labels[q];
      if (label < 0 || label === region.label) continue;
      externalContacts++;
      votes.set(label, (votes.get(label) || 0) + 1);
      if (sizes[q] >= 8) anchored.add(label);
    }
    const ranked = [...anchored].filter(label => votes.get(label) * 2 >= externalContacts)
      .map(label => ({ label, error: distance(labs[region.label], labs[label]) }))
      .sort((a, b) => a.error - b.error || colors[a.label].toLowerCase().localeCompare(colors[b.label].toLowerCase()));
    if (!ranked.length) { decision.reason = 'no-majority-anchor'; continue; }
    const best = ranked[0];
    decision.distanceSquared = best.error;
    if (best.error > maximumDistance) { decision.reason = 'color-distance-veto'; continue; }
    if (ranked[1] && ranked[1].error - best.error <= Math.max(.00005, best.error * .1)) {
      decision.reason = 'ambiguous-near-tie'; continue;
    }
    if ([...votes.keys()].some(label => label !== best.label && distance(labs[best.label], labs[label]) > .02)) {
      decision.reason = 'third-color-edge-veto'; continue;
    }
    decision.replacement = best.label;
    decision.reason = 'merged';
    for (const pixel of region.pixels) output[pixel] = best.label;
  }
  return { labels: output, decisions };
}
