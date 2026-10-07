import { zipSync } from 'fflate';

// Output file names for a list of original names: extension replaced by "-1bit.png",
// with -2, -3... added so no two outputs collide (case-insensitively, for Windows).
export function outNames(names) {
  const taken = new Set();
  return names.map(name => {
    const base = name.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-') || 'image';
    let out = `${base}-1bit.png`;
    for (let i = 2; taken.has(out.toLowerCase()); i++) out = `${base}-${i}-1bit.png`;
    taken.add(out.toLowerCase());
    return out;
  });
}

// PNGs are already compressed, so entries are stored as they are.
export function zipBytes(names, files) {
  return zipSync(Object.fromEntries(names.map((name, i) => [name, files[i]])), { level: 0 });
}

function pngBlob({ pixels, w, h }) {
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  canvas.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

function download(blob, filename) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// An image here is { name, pixels, w, h }: the original file name and its bitified RGBA pixels.
export async function saveOne(image) {
  download(await pngBlob(image), outNames([image.name])[0]);
}

export async function saveAll(images) {
  const files = [];
  for (const image of images) files.push(new Uint8Array(await (await pngBlob(image)).arrayBuffer()));
  download(new Blob([zipBytes(outNames(images.map(i => i.name)), files)], { type: 'application/zip' }), 'bitify.zip');
}
