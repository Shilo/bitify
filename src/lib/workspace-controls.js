// Four independent units, in semantic order: Palette, Style, Files, More.
// Prefer one row, then two rows with Palette above the other controls. When
// that does not fit, let More accompany Palette before adding a third row.
export function packWorkspaceControls(widths, available, gap = 8) {
  const clean = value => Number.isFinite(value) ? Math.max(0, value) : 0;
  const sizes = widths.map(clean);
  const limit = clean(available), spacing = clean(gap);
  const active = sizes.map((size, index) => size > 0 ? index : -1).filter(index => index >= 0);
  const fits = indices => {
    const visible = indices.filter(index => sizes[index] > 0);
    return visible.reduce((sum, index) => sum + sizes[index], 0) + Math.max(0, visible.length - 1) * spacing <= limit;
  };
  let rows;
  if (fits(active)) {
    rows = sizes.map(() => 1);
  } else if (fits([0]) && fits([1, 2, 3])) {
    rows = [1, 2, 2, 2];
  } else if (fits([0, 3]) && fits([1, 2])) {
    rows = [1, 2, 2, 1];
  } else {
    // Right-priority greedy fallback. Hidden units consume neither width nor gap.
    const bottomRows = [];
    let row = 0, used = 0, count = 0;
    for (let index = sizes.length - 1; index >= 0; index--) {
      if (!sizes[index]) continue;
      const required = sizes[index] + (count ? spacing : 0);
      if (count && used + required > limit) {
        row++; used = 0; count = 0;
      }
      bottomRows[index] = row;
      used += sizes[index] + (count ? spacing : 0);
      count++;
    }
    rows = sizes.map((size, index) => size ? row - bottomRows[index] + 1 : row + 1);
  }
  return sizes.map((size, index) => {
    const side = index < 2 ? 'left' : 'right';
    let offset = 0;
    if (size && side === 'left') {
      for (let before = 0; before < index; before++) {
        if (sizes[before] && rows[before] === rows[index]) offset += sizes[before] + spacing;
      }
    } else if (size) {
      for (let after = index + 1; after < sizes.length; after++) {
        if (sizes[after] && rows[after] === rows[index]) offset += sizes[after] + spacing;
      }
    }
    return { row: rows[index], side, offset };
  });
}
