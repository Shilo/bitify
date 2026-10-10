// Four independent units, in semantic order: Palette, Style, Files, More.
// Fill the lowest row from the trailing end, then move overflow upward. Each
// row aligns editing units to its left and file/app units to its right.
export function packWorkspaceControls(widths, available, gap = 8) {
  const clean = value => Number.isFinite(value) ? Math.max(0, value) : 0;
  const sizes = widths.map(clean);
  const limit = clean(available), spacing = clean(gap);
  const bottomRows = [];
  let row = 0, used = 0, count = 0;
  for (let index = sizes.length - 1; index >= 0; index--) {
    const required = sizes[index] + (count ? spacing : 0);
    if (count && used + required > limit) {
      row++; used = 0; count = 0;
    }
    bottomRows[index] = row;
    used += sizes[index] + (count ? spacing : 0);
    count++;
  }
  return sizes.map((size, index) => {
    const side = index < 2 ? 'left' : 'right';
    let offset = 0;
    if (side === 'left') {
      for (let before = 0; before < index; before++) {
        if (bottomRows[before] === bottomRows[index]) offset += sizes[before] + spacing;
      }
    } else {
      for (let after = index + 1; after < sizes.length; after++) {
        if (bottomRows[after] === bottomRows[index]) offset += sizes[after] + spacing;
      }
    }
    return { row: row - bottomRows[index] + 1, side, offset };
  });
}
