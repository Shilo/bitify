// Focused revisions of Square canvas. Each proposal has one thick black C.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const p = { black:'#202020', coral:'#ef6256', gold:'#f0b644', teal:'#419ca7', violet:'#7267b5' };
const base = [[3,3,18,3,'black'],[3,6,3,12,'black'],[3,18,18,3,'black']];
const hooks = depth => [[18,6,3,depth,'black'],[18,18-depth,3,depth,'black']];
const compact = [[7,7,4,4,'coral'],[13,7,3,3,'gold'],[7,13,3,3,'teal'],[11,11,5,5,'violet']];
const concepts = [
  {id:'01-wide-pieces',name:'Bigger, wider pieces',lines:['Larger fragments reach the full width','of the open canvas.'],rects:[...base,
    [7,7,5,5,'coral'],[14,7,7,3,'gold'],[7,13,4,4,'teal'],[13,11,8,6,'violet']]},
  {id:'02-full-mosaic',name:'Full-width mosaic',lines:['An almost solid picture of color,','with one clean cross-shaped gap.'],rects:[...base,
    [7,7,6,5,'coral'],[14,7,7,5,'gold'],[7,13,6,4,'teal'],[14,13,7,4,'violet']]},
  {id:'03-right-edge-pixel',name:'Right-edge confetti',lines:['The original inner arrangement, plus','a pixel aligned with the right edge.'],rects:[...base,...compact,[18,10,3,3,'coral']]},
  {id:'04-right-edge-pair',name:'Two edge pieces',lines:['Two detached fragments trace the','missing side without closing the C.'],rects:[...base,...compact,[18,7,3,3,'coral'],[18,14,3,3,'gold']]},
  {id:'05-corner-returns',name:'Slightly more closed',lines:['Short black returns strengthen the','picture-frame shape.'],rects:[...base,...hooks(2),
    [7,7,5,5,'coral'],[13,7,4,3,'gold'],[7,13,4,4,'teal'],[12,11,5,6,'violet']]},
  {id:'06-narrower-opening',name:'Narrower C opening',lines:['Longer returns leave a clear opening','beside a generous inner mosaic.'],rects:[...base,...hooks(4),
    [7,7,5,5,'coral'],[13,7,4,4,'gold'],[7,13,4,4,'teal'],[12,12,5,5,'violet']]},
  {id:'07-framed-edge-pixel',name:'Closed C + side pixel',lines:['A more enclosed C with one floating','coral piece in its opening.'],rects:[...base,...hooks(2),...compact,[19,10,2,3,'coral']]},
  {id:'08-original-canvas-remix',name:'Confetti canvas remix',lines:['Reference-style blocks and one side','fragment, held by a black C frame.'],rects:[...base,...hooks(1),
    [7,7,4,4,'coral'],[12,7,3,3,'gold'],[7,12,3,3,'teal'],[11,11,4,4,'violet'],[18,9,3,3,'coral']]},
  {id:'09-escaping-pixel',name:'A pixel breaks free',lines:['The C stays open while a confetti','piece floats just beyond the frame.'],rects:[...base,
    [7,7,5,5,'coral'],[14,7,6,3,'gold'],[7,13,4,4,'teal'],[13,11,6,6,'violet'],[22,10,2,2,'coral']]}
];
function geometry(c) {
  const occupied = new Map();
  return c.rects.map(([x,y,w,h,key])=>{
    if (![x,y,w,h].every(Number.isInteger) || x<0 || y<0 || x+w>24 || y+h>24) throw Error('Invalid pixel geometry: '+c.id);
    for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) {
      const cell=xx+','+yy;
      if(occupied.has(cell) && occupied.get(cell)!==key) throw Error('Overlapping colors: '+c.id);
      occupied.set(cell,key);
    }
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p[key]}"/>`;
  }).join('');
}
function text(x,y,t,size=16,color='#273342',weight=400) {
  return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t.replaceAll('&','&amp;')}</text>`;
}
async function run() {
  const out=__dirname;
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="1152" viewBox="0 0 1140 1152">','<rect width="1140" height="1152" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Black C canvas variations',30,'#202020',600),text(32,78,'Thick black frame throughout. Variations in the pixels, right edge, and C opening.',17,'#5c6670')];
  for(const [i,c] of concepts.entries()) {
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 24 24" shape-rendering="crispEdges"><title>Colorfetti ${c.name.replaceAll('&','&amp;')}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(out,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(out,c.id+'.png'));
    const x=24+(i%3)*372, y=104+Math.floor(i/3)*344;
    board.push(`<rect x="${x}" y="${y}" width="348" height="326" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,19,'#202020',600),`<svg x="${x+66}" y="${y+48}" width="216" height="216" viewBox="0 0 24 24" shape-rendering="crispEdges">${shapes}</svg>`);
    c.lines.forEach((line,j)=>board.push(text(x+18,y+284+j*20,line,14,'#5c6670')));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(out,'black-canvas-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(out,'black-canvas-variations.png'));
  console.log('Rendered 9 pixel-aligned designs with thick black frames and no overlapping color pieces.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
