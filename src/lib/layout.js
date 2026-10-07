// Picks the column count and tile size that let `count` tiles fill a width x height area
// without scrolling. A tile is `size` wide and `size + extra` tall (the image plus its caption),
// with `gap` between tiles.
//
// If that would make the tiles smaller than `min`, the wall scrolls instead: as many columns
// of at least `min` as fit, stretched to fill the width.
export function fitGrid(count, width, height, { gap, extra, min }) {
  let best = { cols: 1, size: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.floor(Math.min((width - (cols - 1) * gap) / cols, (height - (rows - 1) * gap) / rows - extra));
    if (size > best.size) best = { cols, size };
  }
  if (best.size >= min) return { ...best, scroll: false };

  const cols = Math.max(1, Math.floor((width + gap) / (min + gap)));
  return { cols, size: Math.floor((width - (cols - 1) * gap) / cols), scroll: true };
}
