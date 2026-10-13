// Flat flag-like color tiles combined with original black C geometry.
// Percentages refer to the 32-unit total mark width, including the right tiles.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const palettes = {
  classic:['#ef6256','#f0b644','#419ca7','#7267b5'],
  bright:['#ff6658','#ffc14a','#2eafa6','#8664d8'],
  cool:['#e86e94','#8c77d2','#439fac','#5b83c5']
};
const concepts = [
  {id:'01-half-width-c', name:'Half-width C', top:16,bottom:16,stroke:4,palette:'classic',lines:['C arms: 50% / 50% of the total width.','Right tiles align with the C at top and bottom.'],tiles:[[10,10,10,9],[22,4,14,15],[10,21,10,9],[22,21,14,15]]},
  {id:'02-half-top-long-base', name:'Half top, longer base',top:16,bottom:24,stroke:4,palette:'classic',lines:['C arms: 50% top / 75% bottom.','The lower-left tile fills above the longer base.'],tiles:[[10,10,10,9],[22,4,14,15],[10,21,18,9],[30,21,6,15]]},
  {id:'03-three-quarter-c',name:'Three-quarter C',top:24,bottom:24,stroke:4,palette:'bright',lines:['C arms: 75% / 75%, with a larger inner picture.','Slim right-side tiles complete the flat composition.'],tiles:[[10,10,18,9],[30,4,6,15],[10,21,18,9],[30,21,6,15]]},
  {id:'04-long-top-half-base',name:'Long top, half base',top:24,bottom:16,stroke:4,palette:'classic',lines:['C arms: 75% top / 50% bottom.','The asymmetry shifts the weight to the top.'],tiles:[[10,10,18,9],[30,4,6,15],[10,21,10,9],[22,21,14,15]]},
  {id:'05-airier-flag',name:'Airier four-piece flag',top:16,bottom:16,stroke:4,palette:'cool',lines:['C arms: 50% / 50%, with wider tile gutters.','Square outer tiles keep the silhouette balanced.'],tiles:[[10,10,10,8],[22,4,14,14],[10,22,10,8],[22,22,14,14]]},
  {id:'06-bold-asymmetric-c',name:'Bolder asymmetric C',top:16,bottom:24,stroke:6,palette:'bright',lines:['C arms: 50% top / 75% bottom, with more weight.','A thicker spine emphasizes the letterform.'],tiles:[[12,12,8,7],[22,4,14,15],[12,21,16,7],[30,21,6,15]]}
];
function geometry(c) {
  const rects=[[4,4,c.top,c.stroke,'#202020'],[4,4+c.stroke,c.stroke,32-c.stroke*2,'#202020'],[4,36-c.stroke,c.bottom,c.stroke,'#202020'],...c.tiles.map((r,i)=>[...r,palettes[c.palette][i]])];
  const occupied = new Set();
  for(const [x,y,w,h] of rects) {
    if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||x+w>40||y+h>40) throw Error('Grid bounds: '+c.id);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++) {
      const key=xx+','+yy;
      if(occupied.has(key))throw Error('Overlapping tiles: '+c.id);
      occupied.add(key);
    }
  }
  if(c.tiles[1][1]!==4 || c.tiles[3][1]+c.tiles[3][3]!==36) throw Error('Right tiles misaligned: '+c.id);
  return rects.map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400) {return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run() {
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="866" viewBox="0 0 1200 866">','<rect width="1200" height="866" fill="#f7f5ef"/>',text(32,46,'Colorfetti · C + flat color flag',30,'#202020',600),text(32,78,'Four flat color pieces. Thick black C. Right-side pieces aligned to the outer top and bottom.',17,'#5c6670')];
  const checks=[];
  for(const [i,c] of concepts.entries()) {
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 40 40" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392, y=104+Math.floor(i/3)*368;
    board.push(`<rect x="${x}" y="${y}" width="368" height="348" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+64}" y="${y+50}" width="240" height="240" viewBox="0 0 40 40" shape-rendering="crispEdges">${shapes}</svg>`);
    c.lines.forEach((line,j)=>board.push(text(x+18,y+308+j*20,line,13,'#5c6670')));
    checks.push({id:c.id,topWidthPercent:c.top/32*100,bottomWidthPercent:c.bottom/32*100,rightTilesAlignWithOuterTopAndBottom:true,colorPieces:4});
  }
  board.push(text(32,854,'Arm percentages use the full icon width, including the colored pieces on the right.',13,'#5c6670'),'</svg>');
  fs.writeFileSync(path.join(__dirname,'flat-flag-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'flat-flag-variations.png'));
  fs.writeFileSync(path.join(__dirname,'geometry-checks.json'),JSON.stringify(checks,null,2)+'\n');
  console.log(JSON.stringify(checks));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
