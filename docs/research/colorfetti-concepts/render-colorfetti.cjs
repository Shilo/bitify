// Original pixel geometry for four Colorfetti identity concepts.
// Usage: node render-colorfetti.cjs <optional Sharp module directory>
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const output = __dirname;
const palette = { coral: '#ef6256', gold: '#f0b644', teal: '#419ca7', violet: '#7267b5', ink: '#273342' };
const paper = '#f7f5ef';
const concepts = [
  { id: 'confetti-c', name: 'Confetti C', tagline: 'Small pieces. Big color.', note: 'Letterform made from stepped color pieces', rects: [
    [4, 2, 7, 3, 'coral'], [3, 3, 3, 3, 'coral'], [10, 3, 2, 2, 'coral'],
    [2, 5, 3, 6, 'gold'],
    [3, 10, 3, 3, 'teal'], [4, 11, 7, 3, 'teal'], [10, 11, 2, 2, 'teal'],
    [13, 1, 2, 2, 'violet'], [12, 7, 2, 2, 'coral'],
  ] },
  { id: 'confetti-canvas', name: 'Confetti canvas', tagline: 'A fresh palette for every pixel.', note: 'An image frame containing palette fragments', rects: [
    [2, 2, 8, 2, 'ink'], [2, 4, 2, 8, 'ink'], [2, 12, 12, 2, 'ink'], [12, 6, 2, 6, 'ink'],
    [5, 5, 3, 3, 'coral'], [9, 5, 2, 2, 'gold'], [5, 9, 2, 2, 'teal'], [8, 8, 3, 3, 'violet'],
    [12, 2, 2, 2, 'coral'],
  ] },
  { id: 'palette-relay', name: 'Palette relay', tagline: 'Pass your pixels a fresh palette.', note: 'Linked swatches suggest a change of color', rects: [
    [2, 2, 5, 5, 'coral'], [5, 5, 5, 5, 'gold'], [8, 8, 5, 5, 'teal'],
    [12, 2, 2, 2, 'violet'], [2, 12, 2, 2, 'violet'],
  ] },
  { id: 'confetti-burst', name: 'Confetti burst', tagline: 'Give your colors something to celebrate.', note: 'A compact arrangement of scattered pixel pieces', rects: [
    [7, 1, 2, 3, 'gold'], [12, 3, 2, 3, 'teal'], [11, 10, 3, 2, 'coral'],
    [6, 12, 2, 3, 'violet'], [1, 8, 3, 2, 'teal'], [2, 2, 3, 2, 'coral'],
    [6, 6, 4, 4, 'ink'],
  ] },
];
function geometry(concept, mono) {
  return concept.rects.map(([x, y, w, h, color]) => {
    if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || x + w > 16 || y + h > 16) throw new Error(`Invalid grid: ${concept.id}`);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${mono || palette[color]}"/>`;
  }).join('');
}
function icon(concept, mono) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>Colorfetti ${concept.name} concept</title>${geometry(concept, mono)}</svg>`;
}
function placed(concept, x, y, size, mono) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">${geometry(concept, mono)}</svg>`;
}
function label(x, y, content, size = 16, color = palette.ink, weight = 400) {
  return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${content}</text>`;
}
function lockup(concept, mono) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="128" viewBox="0 0 512 128"><title>Colorfetti ${concept.name} wordmark and icon concept</title>${placed(concept, 8, 16, 96, mono)}${label(126, 84, 'Colorfetti', 60, mono || palette.ink, 600)}</svg>`;
}
function appIcon(concept, monochrome = false) {
  const backdrop = monochrome ? palette.ink : paper;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Colorfetti ${concept.name} app icon concept</title><rect width="512" height="512" fill="${backdrop}"/>${placed(concept, 128, 128, 256, monochrome ? paper : undefined)}</svg>`;
}
async function render() {
  const qa = [];
  for (const concept of concepts) {
    fs.writeFileSync(path.join(output, `${concept.id}.svg`), icon(concept));
    fs.writeFileSync(path.join(output, `${concept.id}-mono.svg`), icon(concept, palette.ink));
    fs.writeFileSync(path.join(output, `${concept.id}-lockup.svg`), lockup(concept));
    fs.writeFileSync(path.join(output, `${concept.id}-lockup-mono.svg`), lockup(concept, palette.ink));
    fs.writeFileSync(path.join(output, `${concept.id}-app.svg`), appIcon(concept));
    fs.writeFileSync(path.join(output, `${concept.id}-app-mono.svg`), appIcon(concept, true));
    // Native grid first, nearest-neighbor enlargement thereafter.
    const native = await sharp(Buffer.from(icon(concept))).resize(16, 16).ensureAlpha().raw().toBuffer();
    const mono = await sharp(Buffer.from(icon(concept, palette.ink))).resize(16, 16).ensureAlpha().raw().toBuffer();
    for (let p = 0; p < native.length; p += 4) {
      if (![0, 255].includes(native[p + 3])) throw new Error(`Partial pixel alpha: ${concept.id}`);
      if (native[p + 3] !== mono[p + 3]) throw new Error(`Changed mono silhouette: ${concept.id}`);
    }
    for (const size of [16, 24, 32, 48, 256]) {
      await sharp(native, { raw: { width: 16, height: 16, channels: 4 } }).resize(size, size, { kernel: 'nearest' }).png().toFile(path.join(output, `${concept.id}-${size}.png`));
    }
    for (const [suffix, svg] of [['app', appIcon(concept)], ['app-mono', appIcon(concept, true)]]) {
      await sharp(Buffer.from(svg)).png().toFile(path.join(output, `${concept.id}-${suffix}-512.png`));
    }
    await sharp(Buffer.from(lockup(concept))).resize(1024, 256).png().toFile(path.join(output, `${concept.id}-lockup.png`));
    // All non-background pixels in the 512 icon must lie in the maskable safe circle.
    const appData = await sharp(Buffer.from(appIcon(concept))).removeAlpha().raw().toBuffer();
    const bg = [247, 245, 239];
    let radius = 0;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const offset = (y * 512 + x) * 3;
      if (bg.some((v, channel) => appData[offset + channel] !== v)) radius = Math.max(radius, Math.hypot(x + .5 - 256, y + .5 - 256));
    }
    if (radius > 204.8) throw new Error(`Unsafe app icon: ${concept.id}`);
    qa.push({ concept: concept.id, logicalGrid: '16x16', identicalMonochromeSilhouette: true, solidPixelAlpha: true, maximumAppMarkRadius: Number(radius.toFixed(2)), safeCircleRadius: 204.8 });
  }
  const pieces = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1048" viewBox="0 0 1200 1048">',
    `<rect width="1200" height="1048" fill="${paper}"/>`,
    label(32, 48, 'Colorfetti', 34, palette.ink, 600),
    label(32, 80, 'Four pixel-art identity directions · original sketches', 18, '#5c6670'),
  ];
  concepts.forEach((concept, i) => {
    const x = 32 + (i % 2) * 600;
    const y = 110 + Math.floor(i / 2) * 454;
    pieces.push(label(x, y + 28, concept.name + (i === 0 ? ' · recommended' : ''), 22, palette.ink, 600));
    pieces.push(label(x, y + 57, concept.note, 16, '#5c6670'));
    pieces.push(placed(concept, x, y + 90, 128));
    pieces.push(label(x + 156, y + 144, 'Colorfetti', 43, palette.ink, 600));
    pieces.push(label(x + 156, y + 178, concept.tagline, 17, '#5c6670'));
    pieces.push(label(x, y + 260, 'App icon', 15, '#5c6670'));
    pieces.push(`<rect x="${x}" y="${y + 278}" width="88" height="88" rx="18" fill="#e9e5dd"/>`);
    pieces.push(placed(concept, x + 12, y + 290, 64));
    pieces.push(label(x + 122, y + 260, 'Monochrome', 15, '#5c6670'));
    pieces.push(`<rect x="${x + 122}" y="${y + 278}" width="88" height="88" rx="18" fill="${palette.ink}"/>`);
    pieces.push(placed(concept, x + 134, y + 290, 64, paper));
    pieces.push(label(x + 252, y + 260, '16 / 24 / 32 / 48 px', 15, '#5c6670'));
    pieces.push(placed(concept, x + 254, y + 310, 16));
    pieces.push(placed(concept, x + 294, y + 306, 24));
    pieces.push(placed(concept, x + 342, y + 302, 32));
    pieces.push(placed(concept, x + 398, y + 294, 48));
    pieces.push(placed(concept, x + 254, y + 363, 16, palette.ink));
    pieces.push(placed(concept, x + 294, y + 359, 24, palette.ink));
    pieces.push(placed(concept, x + 342, y + 355, 32, palette.ink));
    pieces.push(placed(concept, x + 398, y + 347, 48, palette.ink));
  });
  pieces.push('<path d="M32 548H1168" stroke="#d8d5ce"/>');
  pieces.push(label(32, 1026, 'Colorfetti uses a capital C and lowercase f. Concepts for review; trademark clearance remains unresolved.', 15, '#5c6670'));
  pieces.push('</svg>');
  const board = pieces.join('\n');
  fs.writeFileSync(path.join(output, 'colorfetti-directions.svg'), board);
  await sharp(Buffer.from(board)).png().toFile(path.join(output, 'colorfetti-directions.png'));
  fs.writeFileSync(path.join(output, 'geometry-checks.json'), JSON.stringify(qa, null, 2) + '\n');
  console.log(JSON.stringify(qa));
  console.log('Created four distinct symbols, wordmark combinations, standalone app icons, monochrome variants and native-size samples.');
}
render().catch(error => { console.error(error); process.exitCode = 1; });
