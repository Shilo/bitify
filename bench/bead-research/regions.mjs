// Research-only helpers. No production module imports this directory.
export function neighbors(pixel, width, height, connectivity = 4) {
  const x = pixel % width, y = Math.floor(pixel / width), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!(dx || dy) || (connectivity === 4 && dx && dy)) continue;
    if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) out.push(pixel + dy * width + dx);
  }
  return out;
}
export function regions(labels, width, height, connectivity = 4, selected = null) {
  const seen = new Uint8Array(labels.length), out = [];
  for (let p = 0; p < labels.length; p++) {
    if (seen[p] || labels[p] < 0 || (selected && !selected.has(labels[p]))) continue;
    const pixels = [p], label = labels[p]; seen[p] = 1;
    for (let i = 0; i < pixels.length; i++) for (const q of neighbors(pixels[i], width, height, connectivity)) {
      if (!seen[q] && labels[q] === label) { seen[q] = 1; pixels.push(q); }
    }
    out.push({ label, pixels });
  }
  return out;
}
export function boundary(region, labels, width, height, selected = new Set(), connectivity = 4) {
  const votes = new Map();
  for (const p of region.pixels) for (const q of neighbors(p, width, height, connectivity)) {
    const label = labels[q];
    if (label >= 0 && label !== region.label && !selected.has(label)) votes.set(label, (votes.get(label) || 0) + 1);
  }
  return votes;
}
export function toLab(color) {
  const rgb = parseInt(color.slice(1), 16), linear = n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
  const r = linear(rgb >>> 16), g = linear(rgb >>> 8 & 255), b = linear(rgb & 255);
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
export function distance(a,b) { return a.reduce((sum,v,i)=>sum+(v-b[i])**2,0); }
export function regionSizes(labels,width,height,connectivity=4) {
  const sizes=new Int32Array(labels.length); for(const region of regions(labels,width,height,connectivity)) for(const p of region.pixels) sizes[p]=region.pixels.length; return sizes;
}
export function validateInput(input) {
  const {width,height,labels,colors}=input;
  if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1||!(labels instanceof Int32Array)||labels.length!==width*height||!Array.isArray(colors)||colors.some(c=>!/^#[0-9a-f]{6}$/i.test(c))||labels.some(l=>l < -1 || l >= colors.length))throw new Error('Invalid research image');
}
