import { neighbors, regions, toLab, distance, regionSizes, validateInput } from './regions.mjs';

/**
 * Research-only selected-shade merge. Frozen 4-connected regions can be recolored
 * to a perceptually close, adjacent, larger fill. This does not recognize faces,
 * highlights, outlines, materials, or an artist's intended shading.
 */
export function mergeNearest(input, options = {}) {
  validateInput(input);
  const { width, height, labels, colors } = input;
  const {
    selected = new Set(), protected: protectedLabels = new Set(),
    maxDistanceSquared = .02, minimumAnchorSize = 5, protectedPixels,
  } = options;
  if (!(selected instanceof Set) || !(protectedLabels instanceof Set) ||
      [...selected, ...protectedLabels].some(l => !Number.isInteger(l) || l < 0 || l >= colors.length) ||
      !Number.isFinite(maxDistanceSquared) || maxDistanceSquared < 0 ||
      !Number.isInteger(minimumAnchorSize) || minimumAnchorSize < 1 ||
      (protectedPixels !== undefined && (!(protectedPixels instanceof Uint8Array) || protectedPixels.length !== labels.length))) {
    throw new Error('Invalid nearest research options');
  }
  const output = labels.slice(), decisions = [];
  const labs = colors.map(toLab);
  const anchorSizes = regionSizes(labels, width, height, 4);
  for (const region of regions(labels, width, height, 4, selected)) {
    const decision = { label: region.label, pixels: region.pixels.slice(), replacement: null, reason: '', distanceSquared: null };
    decisions.push(decision);
    if (protectedLabels.has(region.label) || region.pixels.some(p => protectedPixels?.[p])) {
      decision.reason = 'protected-region';
      continue;
    }
    const candidates = new Set();
    for (const p of region.pixels) for (const q of neighbors(p, width, height, 4)) {
      const label = labels[q];
      if (label < 0 || selected.has(label) || protectedLabels.has(label)) continue;
      if (anchorSizes[q] >= minimumAnchorSize && anchorSizes[q] > region.pixels.length) candidates.add(label);
    }
    if (!candidates.size) { decision.reason = 'no-admissible-anchor'; continue; }
    const ranked = [...candidates].map(label => ({ label, error: distance(labs[region.label], labs[label]) }))
      .sort((a, b) => a.error - b.error || colors[a.label].toLowerCase().localeCompare(colors[b.label].toLowerCase()));
    const best = ranked[0];
    decision.distanceSquared = best.error;
    if (best.error > maxDistanceSquared) { decision.reason = 'color-distance-veto'; continue; }
    // An arbitrary palette index must never break an ambiguous artistic choice.
    if (ranked[1] && ranked[1].error - best.error <= Math.max(.00005, best.error * .1)) {
      decision.reason = 'ambiguous-near-tie';
      continue;
    }
    decision.replacement = best.label;
    decision.reason = 'merged';
    for (const p of region.pixels) output[p] = best.label;
  }
  return { labels: output, decisions };
}
