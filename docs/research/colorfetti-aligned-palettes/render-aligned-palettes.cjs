// Fixed geometry from Broad right: center-right LEFT edge starts at the C's end.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const black='#202020';
const frame=[[4,4,22,6],[4,10,6,18],[4,28,22,6]];
// Color order: top corner, bottom corner, upper-left, lower-left, center-right.
const tiles=[[28,4,6,6],[28,28,6,6],[12,12,8,5],[12,19,8,7],[26,12,8,14]];
const concepts=[
  {id:'01-studio',name:'Studio',note:'Coral, teal, blue, gold, and violet.',colors:['#f0b644','#7267b5','#ef6256','#419ca7','#5187c7']},
  {id:'02-bold',name:'Bold',note:'Blue and magenta, with warm orange and gold.',colors:['#ff7849','#0b9aa4','#3459d8','#dd4d9d','#eabb39']},
  {id:'03-earth',name:'Earth',note:'Terracotta, sage, ochre, and muted plum.',colors:['#dab76a','#86734d','#b95f43','#709482','#9273a0']},
  {id:'04-pastel',name:'Pastel',note:'Soft rose, seafoam, lavender, peach, and blue.',colors:['#f5c37b','#b39bdb','#ea91a9','#82c5b8','#92b6db']},
  {id:'05-tropical',name:'Tropical',note:'Turquoise and lime, with gold and berry.',colors:['#f7bd38','#e4597e','#22a08b','#9ac544','#8170c9']},
  {id:'06-neon',name:'Neon',note:'Acid yellow, cyan, coral, orchid, and green.',colors:['#d6f43c','#36d7de','#fe6650','#c95de8','#7dda77']}
];
function geometry(c){
  if(new Set(c.colors.map(s=>s.toLowerCase())).size!==5)throw Error('Repeated confetti colors');
  const rightEdge=frame[0][0]+frame[0][2];
  if(tiles[4][0]!==rightEdge||frame[2][0]+frame[2][2]!==rightEdge)throw Error('Center-right left edge must align with C');
  if(tiles[4][0]+tiles[4][2]!==tiles[0][0]+tiles[0][2]||tiles[4][0]+tiles[4][2]!==tiles[1][0]+tiles[1][2])throw Error('Right edges must align');
  const rects=[...frame.map(r=>[...r,black]),...tiles.map((r,i)=>[...r,c.colors[i]])];
  const occupied=new Set();
  for(const[x,y,w,h]of rects){
    if(![x,y,w,h].every(Number.isInteger)||x<4||y<4||x+w>34||y+h>34)throw Error('Invalid square grid');
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const key=xx+','+yy;if(occupied.has(key))throw Error('Overlap');occupied.add(key);
    }
  }
  return rects.map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="836" viewBox="0 0 1200 836">','<rect width="1200" height="836" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Corrected alignment',30,'#202020',600),text(32,78,'Center-right: left edge aligned with the C’s end; right edge aligned with both corner squares.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'-corrected.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'-corrected.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*358;
    board.push(`<rect x="${x}" y="${y}" width="368" height="334" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+51}" y="${y+42}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+18,y+315,c.note,13,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'corrected-palette-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'corrected-palette-variations.png'));
  fs.writeFileSync(path.join(__dirname,'corrected-palette-and-geometry.json'),JSON.stringify({black,frame,tiles,centerRightLeftEdge:26,cRightEdge:26,centerRightRightEdge:34,cornerSquaresRightEdge:34,squareSilhouette:'30x30',concepts},null,2)+'\n');
  console.log('Verified: center-right LEFT edge = C right edge = 26. Center-right RIGHT edge = both corner right edges = 34.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
