export function compactPaletteName(name, limit = 12) {
  const chars = [...name];
  if (chars.length <= limit) return name;
  const front = Math.ceil((limit - 1) / 2), back = Math.floor((limit - 1) / 2);
  return chars.slice(0, front).join('') + '…' + chars.slice(-back).join('');
}
