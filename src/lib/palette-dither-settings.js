// Kept separate from the conversion engine so restoring settings needs no tables.
export function normalizeDither(value) {
  return value === '2x2' || value === '4x4' || value === '8x8' ? value : 'none';
}

export function normalizeDitherStrength(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : 50;
}
