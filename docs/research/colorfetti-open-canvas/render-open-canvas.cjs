// Canvas-reference explorations: one open C icon per direction.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const out = __dirname;
const p = { ink:'#273342', coral:'#ef6256', gold:'#f0b644', teal:'#419ca7', violet:'#7267b5', mint:'#61baa1', blue:'#477ac7', pink:'#dc729c' };
const originalPieces = [[5,5,3,3,'coral'],[9,5,2,2,'gold'],[5,9,2,2,'teal'],[8,8,3,3,'violet']];
const concepts = [
  { id:'01-square-canvas', name:'Square canvas', note:'Closest to the reference; a fully open right edge.', rects:[
    [2,2,12,2,'ink'],[2,4,2,8,'ink'],[2,12,12,2,'ink'],...originalPieces
  ]},
  { id:'02-bracket-canvas', name:'Bracket canvas', note:'Short corner returns give the C a frame-like shape.', rects:[
    [2,2,12,2,'blue'],[2,4,2,8,'blue'],[2,12,12,2,'blue'],[12,4,2,2,'blue'],[12,10,2,2,'blue'],
    [5,5,3,3,'coral'],[9,5,2,2,'gold'],[5,9,2,2,'mint'],[8,8,3,3,'violet']
  ]},
  { id:'03-stepped-canvas', name:'Stepped canvas', note:'Pixel corners soften the C; scattered pieces add motion.', rects:[
    [4,2,10,2,'teal'],[3,3,2,2,'teal'],[2,4,2,8,'teal'],[3,11,2,2,'teal'],[4,12,10,2,'teal'],
    [6,5,3,2,'coral'],[10,5,1,1,'violet'],[5,8,2,2,'gold'],[9,8,2,3,'violet'],[7,10,1,1,'coral']
  ]},
  { id:'04-fine-canvas', name:'Fine canvas', note:'A lighter frame around a compact palette mosaic.', rects:[
    [2,2,12,1,'violet'],[2,3,1,10,'violet'],[2,13,12,1,'violet'],[13,3,1,1,'violet'],[13,12,1,1,'violet'],
    [5,5,3,3,'coral'],[9,5,2,2,'gold'],[5,9,2,2,'teal'],[8,8,3,3,'violet']
  ]},
  { id:'05-color-block-canvas', name:'Color-block canvas', note:'Three colored sides make the frame itself a palette.', rects:[
    [4,2,10,2,'coral'],[3,3,2,2,'coral'],[2,4,2,8,'gold'],[3,11,2,2,'teal'],[4,12,10,2,'teal'],
    [6,5,2,3,'violet'],[9,5,2,2,'mint'],[5,9,2,2,'coral'],[8,9,3,2,'violet']
  ]},
  { id:'06-chunky-canvas', name:'Chunky canvas', note:'A bold coral C with bright, playful pixel fragments.', rects:[
    [3,2,11,3,'coral'],[2,3,3,10,'coral'],[3,11,11,3,'coral'],
    [6,6,2,2,'gold'],[10,6,2,2,'violet'],[6,9,3,1,'teal'],[10,9,1,1,'pink']
  ]}
];
function geometry(c) {
  return c.rects.map(([x,y,w,h,color])=> {
    if (![x,y,w,h].every(Number.isInteger) || x<0 || y<0 || x+w>16 || y+h>16) throw Error(c.id);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p[color]}"/>`;
  }).join('');
}
function icon(c) { return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${geometry(c)}</svg>`; }
function text(x,y,t,size=16,color=p.ink,weight=400) { return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}">${t}</text>`; }
async function run() {
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="800" viewBox="0 0 1080 800">','<rect width="1080" height="800" fill="#f7f5ef"/>',text(32,48,'Colorfetti · C canvas',32,p.ink,600),text(32,80,'An open C-shaped picture frame, with colorful pixels inside.',18,'#5c6670')];
  for (const [i,c] of concepts.entries()) {
    const svg=icon(c);
    fs.writeFileSync(path.join(out,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(out,c.id+'.png'));
    const x=24+(i%3)*352, y=110+Math.floor(i/3)*334;
    board.push(`<rect x="${x}" y="${y}" width="328" height="308" rx="12" fill="#fffdf9"/>`,text(x+20,y+34,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,p.ink,600),`<svg x="${x+68}" y="${y+54}" width="192" height="192" viewBox="0 0 16 16" shape-rendering="crispEdges">${geometry(c)}</svg>`);
    const split=c.note.indexOf(';');
    const lines=split>=0?[c.note.slice(0,split+1),c.note.slice(split+2)]:c.note.match(/.{1,37}(?:\s|$)/g).map(s=>s.trim());
    lines.forEach((line,j)=>board.push(text(x+20,y+270+j*20,line,14,'#5c6670')));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(out,'c-canvas-examples.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(out,'c-canvas-examples.png'));
  console.log('Rendered six distinct C-canvas concepts, one icon per design.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
