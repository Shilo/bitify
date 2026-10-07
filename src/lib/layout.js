// Picks the column count and tile size that let `count` tiles fill a width x height area
// without scrolling. A tile is `size` wide and `size + extra` tall (the image plus its caption),
// with `gap` between tiles.
//
// Tiles are not shrunk below `min`. When they would have to be, the wall scrolls instead, with
// as many columns as fit. On a screen so short that even one tile cannot reach `min`, the size
// one tile gets becomes the limit, so a wall that fits is never made to scroll and a scrolling
// wall still shows whole rows.
export function fitGrid(count, width, height, { gap, extra, min }) {
  const one = Math.max(96, Math.floor(Math.min(width, height - extra))); // a single tile's size
  const smallest = Math.min(min, one);

  let best = { cols: 1, size: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.floor(Math.min((width - (cols - 1) * gap) / cols, (height - (rows - 1) * gap) / rows - extra));
    if (size > best.size) best = { cols, size };
  }
  if (best.size >= smallest) return { ...best, scroll: false };

  const cols = Math.max(1, Math.floor((width + gap) / (smallest + gap)));
  return { cols, size: Math.min(Math.floor((width - (cols - 1) * gap) / cols), one), scroll: true };
}
