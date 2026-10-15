import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function writeLabeledSheet(outdir) {
  const png = fs.readFileSync(path.join(outdir, 'contact-sheet.png'));
  const report = JSON.parse(fs.readFileSync(path.join(outdir, 'results.json'), 'utf8'));
  const names = [...new Set(report.dither.map(row => row.fixture))];
  const modes = ['source', ...new Set(report.dither.map(row => row.mode))];
  const labels = { source:'Source', nearest:'Nearest / baseline', 'bayer-pair':'Ordered / naive (rejected)', 'bayer-grid-aware':'Ordered / grid-aware', 'fs-linear':'Diffusion / linear light', 'fs-oklab':'Diffusion / Oklab' };
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20), left = 190, top = 100, cellw = w / modes.length, cellh = h / names.length;
  const columns = modes.map((mode, i) => `<text x="${left+i*cellw+10}" y="82" font-size="19">${labels[mode]}</text>`).join('');
  const rows = names.map((name, i) => name.split('_').map((word,j) => `<text x="14" y="${top+i*cellh+30+j*25}" font-size="19">${word}</text>`).join('')).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${left+w}" height="${top+h+48}" viewBox="0 0 ${left+w} ${top+h+48}"><rect width="100%" height="100%" fill="#fafafa"/><g font-family="Arial, sans-serif" fill="#171717"><text x="14" y="30" font-size="26" font-weight="bold">Full-palette dithering: original synthetic comparison</text><text x="14" y="54" font-size="17">Pixel-grid rendering at 3×. More texture can improve average tone while harming authored shapes. See results.json and research notes.</text>${columns}${rows}<text x="14" y="${top+h+30}" font-size="16">Ordered variants are slow research prototypes; the naive version fails dark tones. No production algorithm or quality guarantee.</text></g><image x="${left}" y="${top}" width="${w}" height="${h}" style="image-rendering:pixelated" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
  fs.writeFileSync(path.join(outdir, 'contact-sheet-labeled.svg'), svg);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeLabeledSheet(path.join(path.dirname(fileURLToPath(import.meta.url)), 'output'));
}
