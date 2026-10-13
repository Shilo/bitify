// Original 16x16 pixel geometry. Reproduce with node render-variations.cjs <Sharp module directory>.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const out = __dirname;
const colors = { a: '#ef6256', b: '#f0b644', c: '#419ca7', d: '#7267b5', k: '#273342' };
const paper = '#f7f5ef';
const ink = colors.k;
const groups = [
  { id: 'c', name: 'Confetti C', subtitle: 'Four ways to build the initial from colorful pieces', variants: [
    { id: 'c1-paper-pieces', short: 'C1', name: 'Paper pieces', note: 'Separate pieces form an open C', rects: [
      [6,1,4,2,'a'],[11,2,2,2,'b'],[3,3,3,3,'b'],[1,7,3,3,'c'],[3,11,3,3,'d'],[7,13,4,2,'a'],[12,11,2,2,'c'],[13,0,2,2,'d'],
    ] },
    { id: 'c2-paper-strips', short: 'C2', name: 'Paper strips', note: 'Broad scraps create a broken letter', rects: [
      [5,1,7,3,'a'],[12,2,2,2,'a'],[2,4,3,4,'b'],[2,9,3,3,'c'],[6,12,6,3,'d'],[12,12,2,2,'d'],[12,6,2,2,'b'],
    ] },
    { id: 'c3-confetti-stencil', short: 'C3', name: 'Cut-paper C', note: 'Mosaic scraps form a thick, stepped C', stencil: true, rects: [
      [13,1,2,2,'d'],[13,6,2,2,'b'],
    ] },
    { id: 'c4-scatter-tail', short: 'C4', name: 'Scatter tail', note: 'A strong C breaks into paper fragments', rects: [
      [4,2,5,3,'a'],[2,4,3,8,'b'],[4,11,5,3,'c'],[10,2,2,2,'d'],[13,3,2,2,'b'],[10,12,2,2,'a'],[13,11,2,2,'d'],[11,7,2,2,'c'],
    ] },
  ] },
  { id: 'burst', name: 'Confetti burst', subtitle: 'Open C shapes, falling scraps and scattered color', variants: [
    { id: 'b1-c-burst', short: 'B1', name: 'C burst', note: 'Stepped rays make an open C-shaped burst', rects: [
      [6,1,3,3,'a'],[11,2,3,2,'c'],[2,2,3,2,'b'],[3,4,2,2,'b'],[1,7,4,2,'c'],[2,11,2,3,'d'],[4,12,2,2,'d'],[7,12,3,3,'a'],[11,11,3,2,'b'],
    ] },
    { id: 'b2-paper-shower', short: 'B2', name: 'Paper shower', note: 'Square chips and bent paper scraps fall', rects: [
      [2,1,3,2,'a'],[6,2,2,2,'b'],[11,1,2,2,'d'],[12,4,2,2,'d'],[10,4,2,2,'d'],[1,6,2,3,'c'],[5,6,3,3,'a'],[10,8,2,3,'b'],[12,10,2,2,'b'],[3,11,2,3,'d'],[7,13,3,2,'c'],
    ] },
    { id: 'b3-confetti-swirl', short: 'B3', name: 'Confetti swirl', note: 'Loose pieces curl around an open center', rects: [
      [7,1,4,2,'a'],[3,3,3,3,'b'],[1,7,3,3,'c'],[4,12,4,2,'d'],[10,11,3,3,'a'],[11,7,3,2,'c'],[7,6,2,3,'b'],[13,2,2,2,'d'],
    ] },
    { id: 'b4-pixel-toss', short: 'B4', name: 'Pixel toss', note: 'Different fragment shapes radiate loosely', rects: [
      [2,2,2,2,'a'],[6,1,3,2,'b'],[12,3,2,2,'d'],[1,8,3,2,'c'],[5,5,3,2,'a'],[6,7,2,2,'a'],[10,7,3,3,'c'],[3,12,2,2,'d'],[7,11,2,3,'b'],[12,12,2,2,'a'],
    ] },
  ] },
  { id: 'canvas', name: 'Confetti canvas', subtitle: 'Four connections between confetti, pixels and pictures', variants: [
    { id: 'p1-corner-spill', short: 'P1', name: 'Corner spill', note: 'A pixel picture releases color fragments', rects: [
      [2,3,8,2,'k'],[2,5,2,8,'k'],[2,13,12,2,'k'],[12,8,2,5,'k'],[5,6,2,2,'b'],[5,10,2,2,'c'],[7,9,2,3,'c'],[9,8,2,4,'d'],[13,1,2,2,'a'],[11,5,2,2,'b'],
    ] },
    { id: 'p2-pixel-window', short: 'P2', name: 'Pixel window', note: 'Picture corners surround a confetti mosaic', rects: [
      [2,2,4,2,'k'],[2,4,2,2,'k'],[10,2,4,2,'k'],[12,4,2,2,'k'],[2,10,2,4,'k'],[4,12,2,2,'k'],[10,12,4,2,'k'],[12,10,2,2,'k'],[5,5,3,3,'a'],[9,5,2,2,'b'],[5,9,2,2,'c'],[8,8,3,3,'d'],
    ] },
    { id: 'p3-paper-landscape', short: 'P3', name: 'Paper landscape', note: 'Color pieces become a miniature picture', rects: [
      [2,11,12,3,'c'],[3,8,4,3,'c'],[4,6,2,2,'c'],[8,7,5,4,'d'],[9,5,3,2,'d'],[2,2,3,3,'b'],[7,2,2,2,'a'],[12,1,2,2,'b'],
    ] },
    { id: 'p4-c-canvas', short: 'P4', name: 'C canvas', note: 'A C-shaped picture frame holds color pieces', rects: [
      [4,2,8,2,'k'],[2,4,2,8,'k'],[4,12,8,2,'k'],[3,3,2,2,'k'],[3,11,2,2,'k'],[11,3,2,2,'k'],[11,11,2,2,'k'],[5,5,3,3,'a'],[9,5,2,2,'b'],[5,9,2,2,'c'],[8,8,3,3,'d'],[13,7,2,2,'a'],
    ] },
  ] },
];
function grid(variant) {
  const cells = Array.from({ length: 16 }, () => Array(16).fill(null));
  if (variant.stencil) {
    for (let y = 2; y < 14; y++) for (let x = 2; x < 12; x++) cells[y][x] = ['a','b','c','d'][(Math.floor((x-2)/3)+Math.floor((y-2)/3))%4];
    // An open counter gives the assembled mosaic a clear positive C silhouette.
    for (const [x,y,w,h] of [[6,5,6,6]]) {
      for (let yy = y; yy < y+h; yy++) for (let xx = x; xx < x+w; xx++) cells[yy][xx] = null;
    }
    // Two gaps in the outside edges suggest sheets assembled from paper pieces.
    for (const [x,y,w,h] of [[2,2,2,1],[2,13,2,1],[11,2,1,2],[2,7,1,1]]) {
      for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) cells[yy][xx]=null;
    }
  }
  for (const [x,y,w,h,color] of variant.rects) {
    if (![x,y,w,h].every(Number.isInteger) || x<0 || y<0 || x+w>16 || y+h>16) throw new Error(`Invalid geometry: ${variant.id}`);
    for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) cells[yy][xx]=color;
  }
  return cells;
}
function geometry(v, mono) {
  return grid(v).flatMap((row,y)=>row.flatMap((cell,x)=>cell ? [`<rect x="${x}" y="${y}" width="1" height="1" fill="${mono || colors[cell]}"/>`] : [])).join('');
}
function icon(v, mono) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>Colorfetti ${v.short} ${v.name}</title>${geometry(v,mono)}</svg>`;
}
function placed(v,x,y,size,mono) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">${geometry(v,mono)}</svg>`;
}
function label(x,y,text,size=16,color=ink,weight=400) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}" font-weight="${weight}">${text}</text>`;
}
function app(v,mono=false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Colorfetti ${v.short} application icon</title><rect width="512" height="512" fill="${mono?ink:paper}"/>${placed(v,128,128,256,mono?paper:undefined)}</svg>`;
}
function lockup(v,mono) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="128" viewBox="0 0 512 128"><title>Colorfetti ${v.short} wordmark combination</title>${placed(v,8,16,96,mono)}${label(126,84,'Colorfetti',60,mono||ink,600)}</svg>`;
}
async function render() {
  const checks=[];
  const signatures=new Set();
  for (const g of groups) {
    for (const v of g.variants) {
      const signature=grid(v).map(r=>r.map(c=>c?'#':'.').join('')).join('\n');
      if (signatures.has(signature)) throw new Error('Duplicate silhouette');
      signatures.add(signature);
      for (const [suffix,data] of [['',icon(v)],['-mono',icon(v,ink)],['-app',app(v)],['-app-mono',app(v,true)],['-lockup',lockup(v)]]) fs.writeFileSync(path.join(out,v.id+suffix+'.svg'),data);
      const raw=await sharp(Buffer.from(icon(v))).resize(16,16).ensureAlpha().raw().toBuffer();
      const mono=await sharp(Buffer.from(icon(v,ink))).resize(16,16).ensureAlpha().raw().toBuffer();
      for (let n=0;n<raw.length;n+=4) {
        if (![0,255].includes(raw[n+3]) || raw[n+3]!==mono[n+3]) throw new Error(`Alpha failure: ${v.id}`);
      }
      for (const size of [16,24,32,48,256]) await sharp(raw,{raw:{width:16,height:16,channels:4}}).resize(size,size,{kernel:'nearest'}).png().toFile(path.join(out,`${v.id}-${size}.png`));
      await sharp(Buffer.from(app(v))).png().toFile(path.join(out,v.id+'-app-512.png'));
      checks.push({id:v.id,uniqueSilhouette:true,binaryAlpha:true,monochromeMatches:true});
    }
    const p=[`<svg xmlns="http://www.w3.org/2000/svg" width="980" height="852" viewBox="0 0 980 852"><rect width="980" height="852" fill="${paper}"/>`,label(28,44,'Colorfetti · '+g.name,30,ink,600),label(28,75,g.subtitle,17,'#5c6670')];
    g.variants.forEach((v,i)=>{
      const x=28+(i%2)*480, y=110+Math.floor(i/2)*348;
      p.push(label(x,y+22,v.short+' · '+v.name,22,ink,600),label(x,y+50,v.note,15,'#5c6670'));
      p.push(placed(v,x,y+68,128));
      p.push(`<rect x="${x+156}" y="${y+68}" width="128" height="128" rx="18" fill="${ink}"/>`,placed(v,x+164,y+76,112,paper));
      p.push(label(x+310,y+83,'16 / 32 / 48 px',14,'#5c6670'));
      p.push(placed(v,x+312,y+116,16),placed(v,x+350,y+108,32),placed(v,x+398,y+100,48));
      p.push(placed(v,x+312,y+170,16,ink),placed(v,x+350,y+162,32,ink),placed(v,x+398,y+154,48,ink));
      p.push(placed(v,x,y+228,48),label(x+62,y+264,'Colorfetti',34,ink,600));
    });
    p.push('<path d="M28 442H952" stroke="#d8d5ce"/>',label(28,826,'Original pixel geometry · color, monochrome and wordmark views · consistent palette across variants',14,'#5c6670'),'</svg>');
    fs.writeFileSync(path.join(out,g.id+'-variations.svg'),p.join('\n'));
    await sharp(Buffer.from(p.join('\n'))).png().toFile(path.join(out,g.id+'-variations.png'));
  }
  fs.writeFileSync(path.join(out,'geometry-checks.json'),JSON.stringify(checks,null,2)+'\n');
  console.log(JSON.stringify({variants:checks.length,uniqueSilhouettes:signatures.size,boards:groups.length,solidPixelAlpha:true,monochromeMatches:true}));
}
render().catch(e=>{console.error(e);process.exitCode=1;});
