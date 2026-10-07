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

// The size of the picture a tile draws of an image of w by h pixels: the [width, height] it
// asks `mask` for. `across` is how many screen pixels the tile has for the image's longer side.
//
// An image no larger than that is drawn whole. A larger one is drawn at the tile's own size,
// a pixel of the picture for each pixel of the screen, as more could not be seen.
//
// While the threshold slider is dragged there is a `budget`, the milliseconds this tile may
// take for each move, and `pace`, the milliseconds per pixel its last conversion took. If a
// picture of the tile's size would take longer than the budget, a smaller one that is expected
// to fit is drawn instead: a rougher draft. An image that is drawn whole is never drafted, as
// that would drop pixels of a sprite that the screen was showing.
//
// A picture that is a whole number of times smaller than the image, or nearly so, is made a
// little smaller still. Its pixels would fall at the same place in every repeat of a fine
// regular texture (dithered art, stripes, a stippled transparency), and the whole image would
// come out all light or all dark. Off the whole number, the picture is right on average.
//
// The shorter side is never given fewer than 32 pixels, unless the image has fewer: a long thin
// image would be drawn in the wrong shape once its few rows were rounded.
export function shown(w, h, across, budget = 0, pace = 0) {
  let scale = Math.min(1, across / Math.max(w, h));
  if (budget && pace && scale < 1) scale = Math.min(scale, Math.sqrt(budget / (w * h * pace)));
  const times = 1 / scale;
  if (times > 1.5 && Math.abs(times - Math.round(times)) < 0.04) scale /= 1.06;
  scale = Math.min(1, Math.max(scale, 32 / Math.min(w, h)));
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}
