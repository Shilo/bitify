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

// The k a tile gives `mask` for an image of w by h pixels: it converts every k-th pixel of every
// k-th row. `across` is how many screen pixels the tile has for the image's longer side.
//
// Normally k is the largest that still leaves an image pixel for each screen pixel. While the
// threshold slider is dragged there is a `budget`, the milliseconds this tile may take for each
// move, and `pace`, the milliseconds per pixel its last conversion took. If the image would take
// longer than the budget, k is the smallest at which it is expected to fit: a rougher draft.
// An image that is shown whole (k of 1) is never drafted, as that would drop pixels of a sprite
// that the screen was showing. And k never leaves the shorter side fewer than 32 pixels, or a
// long thin image would be drawn in the wrong shape once its few rows were rounded up.
export function sampling(w, h, across, budget = 0, pace = 0) {
  const most = Math.max(1, Math.floor(Math.min(w, h) / 32));
  const fit = Math.min(most, Math.max(1, Math.floor(Math.max(w, h) / across)));
  return budget && fit > 1 ? Math.min(most, Math.max(fit, Math.ceil(Math.sqrt((w * h * pace) / budget)))) : fit;
}
