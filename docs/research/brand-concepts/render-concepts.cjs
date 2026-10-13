// Original vector identity sketches. Pass the Sharp package directory as argv[2],
// or install Sharp locally to reproduce the rendered board on another machine.
// All identifying geometry is authored on a 16x16 grid, then rendered for review.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const out = __dirname;
const colors = { A: '#e95652', B: '#e5aa3f', C: '#337d9b', D: '#253d51' };
const concepts = [
  { id: 'pixel-ribbon', title: 'Pixel ribbon', note: 'Recommended · transformation and color', rows: [
    '................', '....AAAAAAAAAA..', '...AAAAAAAAAAA..', '..AAAA..........',
    '..AAAA..........', '..AAAA..........', '..BBBBBBBBBB....', '....BBBBBBBBB...',
    '..........BBBB..', '..........BBBB..', '..........BBBB..', '..CCCCCCCCCCCC..',
    '..CCCCCCCCCCC...', '..CCCCCCCCCC....', '................', '................',
  ] },
  { id: 'palette-portal', title: 'Palette portal', note: 'Alternative · artwork and exploration', rows: [
    '................', '................', '..DDDDDDDDAAAA..', '..DD......AAAA..',
    '..DD........AA..', '..DD........AA..', '..DD........BB..', '..DD........BB..',
    '..DD........BB..', '..DD........BB..', '..DD........CC..', '..DD........CC..',
    '..DD......CCCC..', '..DDDDDDDDCCCC..', '................', '................',
  ] },
  { id: 'swatch-bloom', title: 'Swatch bloom', note: 'Alternative · variety and discovery', rows: [
    '................', '....AAAAAA......', '...AAAAAAAA.....', '...AAAAAAAA.....',
    '...AAAAAAAA.....', '...AAA..BBBBBB..', '.CCCCC..BBBBBB..', '.CCCCC..BBBBBB..',
    '.CCCCC..BBBBBB..', '.CCCCCDDDDDDDD..', '.CCCCCDDDDDDDD..', '......DDDDDDD...',
    '......DDDDDD....', '......DDDDD.....', '................', '................',
  ] },
];
function cells(c, mono) {
  if (c.rows.length !== 16 || c.rows.some(r => r.length !== 16)) throw new Error(`Invalid grid: ${c.id}`);
  return c.rows.flatMap((r, y) => [...r].flatMap((s, x) => s === '.' ? [] :
    [`<rect x="${x}" y="${y}" width="1" height="1" fill="${mono || colors[s]}"/>`])).join('');
}
function source(c, mono) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>${c.title} identity sketch</title>${cells(c, mono)}</svg>`;
}
function mark(c, x, y, size, mono) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">${cells(c, mono)}</svg>`;
}
function text(x, y, content, size = 18, fill = '#243644', weight = 400) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${content}</text>`;
}
async function main() {
  for (const c of concepts) {
    fs.writeFileSync(path.join(out, `${c.id}.svg`), source(c));
    fs.writeFileSync(path.join(out, `${c.id}-mono.svg`), source(c, '#243644'));
    await sharp(Buffer.from(source(c))).resize(256, 256, { kernel: 'nearest' }).png().toFile(path.join(out, `${c.id}.png`));
  }
  const pieces = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="850" viewBox="0 0 1120 850">',
    '<rect width="1120" height="850" fill="#f6f4ef"/>',
    text(40, 46, 'Pixel-art identity directions', 28, '#243644', 700),
    text(40, 77, 'Original concept sketches · choose one master symbol', 17, '#596570'),
  ];
  concepts.forEach((c, i) => {
    const x = 40 + i * 360;
    pieces.push(text(x, 125, c.title, 22, '#243644', 700), text(x, 151, c.note, 15, '#596570'));
    pieces.push(`<rect x="${x}" y="175" width="320" height="270" fill="#eae6dd"/>`);
    pieces.push(mark(c, x + 64, 206, 192));
    pieces.push(text(x, 477, 'Same silhouette in one color', 16));
    pieces.push(mark(c, x + 10, 494, 64, '#243644'));
    pieces.push(`<rect x="${x + 110}" y="494" width="80" height="80" fill="#1c2d3a"/>`);
    pieces.push(mark(c, x + 118, 502, 64, '#f6f4ef'));
    pieces.push(text(x, 601, 'Native display sizes: 16 / 32 / 48 px', 15, '#596570'));
    pieces.push(mark(c, x + 8, 627, 16), mark(c, x + 64, 619, 32), mark(c, x + 128, 611, 48));
  });
  pieces.push('<path d="M40 689H1080" stroke="#d8d4cb"/>');
  pieces.push(mark(concepts[0], 40, 722, 80));
  pieces.push(text(140, 752, 'Swatchstep', 36, '#243644', 700));
  pieces.push(text(140, 786, 'Image and GIF palette converter', 19));
  pieces.push(text(650, 752, 'Color with character.', 25, '#243644', 700));
  pieces.push(text(650, 786, 'Provisional name and copy · discussion only', 16, '#596570'));
  pieces.push('</svg>');
  const board = pieces.join('\n');
  fs.writeFileSync(path.join(out, 'logo-directions.svg'), board);
  await sharp(Buffer.from(board)).png().toFile(path.join(out, 'logo-directions.png'));
  // Exact cell colors and alpha are the prototype's useful geometric validation.
  for (const c of concepts) {
    const { data, info } = await sharp(Buffer.from(source(c))).resize(16, 16).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = new Set();
    for (let n = 0; n < data.length; n += 4) {
      if (data[n + 3] !== 0 && data[n + 3] !== 255) throw new Error(`Non-pixel alpha: ${c.id}`);
      rgba.add([...data.subarray(n, n + 4)].join(','));
    }
    console.log(`${c.id}: ${info.width}x${info.height}; ${rgba.size - 1} colors + transparency; integer grid verified`);
  }
  console.log('Rendered logo-directions.png and three editable SVG concepts.');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
