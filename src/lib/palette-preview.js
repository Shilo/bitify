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

// Paint-only canvas keeps color-critical UI out of browser forced-dark CSS/SVG
// heuristics. These Svelte actions never read pixels back, encode an image or hold
// an external resource. Strict opaque HEX validation prevents canvas interpreting
// other CSS color syntaxes. Validate before changing the previous canvas contents.
function paintColor(color) {
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) throw new TypeError('Palette paint colors must be opaque #RRGGBB.');
  return color;
}

function paintAction(canvas, value, draw) {
  const update = next => draw(canvas, next);
  update(value);
  return { update };
}

function drawSwatch(canvas, color) {
  paintColor(color);
  canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
}

export function paintPaletteSwatch(canvas, color) {
  return paintAction(canvas, color, drawSwatch);
}

// The two-ink rail retains its 135-degree split: first in the upper left,
// second in the lower right. Underpaint keeps the diagonal fully opaque.
function drawPair(canvas, colors) {
  if (!Array.isArray(colors) || colors.length !== 2) throw new TypeError('Two ink colors are required.');
  for (const color of colors) paintColor(color);
  canvas.width = 100; canvas.height = 100;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = colors[1];
  context.fillRect(0, 0, 100, 100);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(100, 0);
  context.lineTo(0, 100);
  context.closePath();
  context.fillStyle = colors[0];
  context.fill();
}

export function paintPalettePair(canvas, colors) {
  return paintAction(canvas, colors, drawPair);
}

function drawPreview(canvas, colors) {
  if (!Array.isArray(colors) || colors.length > 256) throw new TypeError('Palette paintings support zero to 256 colors.');
  // Validate all entries, including entries the sixteen-color overview omits.
  for (const color of colors) paintColor(color);
  const overview = palettePreviewColors(colors);
  // Resetting dimensions also clears an empty overview and resets drawing state.
  canvas.width = 100; canvas.height = 100;
  const context = canvas.getContext('2d');
  if (!context || !overview.length) return;
  context.fillStyle = overview[0];
  context.fillRect(0, 0, 100, 100);
  // First-color underpaint prevents transparent antialiasing seams. The remaining
  // sectors start at twelve o'clock and run clockwise like the former conic fill.
  const step = Math.PI * 2 / overview.length;
  for (let i = 1; i < overview.length; i++) {
    context.beginPath();
    context.moveTo(50, 50);
    context.arc(50, 50, 50, i * step - Math.PI / 2, (i + 1) * step - Math.PI / 2, false);
    context.closePath();
    context.fillStyle = overview[i];
    context.fill();
  }
}

export function paintPalettePreview(canvas, colors) {
  return paintAction(canvas, colors, drawPreview);
}
