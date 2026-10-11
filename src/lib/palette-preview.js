// Thumbnail overview only. Stored colors, their order and conversion are untouched.
// RGB distance gives cheap broad coverage; every displayed color is an actual entry.
export function palettePreviewColors(colors) {
  if (colors.length <= 16) return colors.slice();
  const rgb = colors.map(color => {
    const value = parseInt(color.slice(1), 16);
    return [value >>> 16, value >>> 8 & 255, value & 255];
  });
  const totals = [0, 0, 0];
  for (const channels of rgb) for (let c = 0; c < 3; c++) totals[c] += channels[c];
  const mean = totals.map(total => total / rgb.length);
  const distance = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let seed = 0, nearest = Infinity;
  for (let i = 0; i < rgb.length; i++) {
    const value = distance(rgb[i], mean);
    if (value < nearest) { nearest = value; seed = i; }
  }
  const selected = new Set([seed]);
  const minimum = rgb.map(value => distance(value, rgb[seed]));
  while (selected.size < 16) {
    let next = -1, farthest = -1;
    for (let i = 0; i < rgb.length; i++) if (!selected.has(i) && minimum[i] > farthest) { next = i; farthest = minimum[i]; }
    selected.add(next);
    for (let i = 0; i < rgb.length; i++) minimum[i] = Math.min(minimum[i], distance(rgb[i], rgb[next]));
  }
  // Maintain the palette's order among the overview colors, rather than ordering
  // the thumbnail by the coverage algorithm's choice of endpoints.
  return colors.filter((_, i) => selected.has(i));
}
