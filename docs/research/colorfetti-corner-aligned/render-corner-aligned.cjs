// Same six palettes and C as the previous board, with a narrower right column.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../colorfetti-locked-shape/verified-geometry-and-palettes.json'),'utf8'));
const frame=source.frame;
const concepts=source.concepts;
const tiles=[[28,4,6,6],[28,28,6,6],[12,12,14,6],[12,20,14,6],[28,12,6,14]];
function validate(){
  const[top,bottom,upper,lower,right]=tiles;
  if(right[0]!==top[0]||right[0]!==bottom[0]||right[2]!==top[2]||right[2]!==bottom[2])throw Error('Right column misaligned');
  const gaps=[top[0]-frame[0][0]-frame[0][2],bottom[0]-frame[2][0]-frame[2][2],upper[0]-frame[1][0]-frame[1][2],lower[0]-frame[1][0]-frame[1][2],upper[1]-frame[0][1]-frame[0][3],frame[2][1]-lower[1]-lower[3],lower[1]-upper[1]-upper[3],right[0]-upper[0]-upper[2],right[0]-lower[0]-lower[2],right[1]-top[1]-top[3],bottom[1]-right[1]-right[3]];
  if(gaps.some(n=>n!==2))throw Error('Unequal padding');
  const rects=[...frame,...tiles],occupied=new Set();
  for(const[x,y,w,h]of rects)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    const key=xx+','+yy;if(occupied.has(key))throw Error('Overlap');occupied.add(key);
  }
  if(Math.max(...rects.map(r=>r[0]+r[2]))-4!==Math.max(...rects.map(r=>r[1]+r[3]))-4)throw Error('Non-square silhouette');
  return{padding:2,allNeighboringGaps:gaps,rightColumnX:28,rightColumnWidth:6,innerLeftWidths:[14,14],squareSilhouette:'30x30',palettesUnchanged:true};
}
function geometry(c){return[...frame.map(r=>[...r,'#202020']),...tiles.map((r,i)=>[...r,c.colors[i]])].map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const check=validate();
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="884" viewBox="0 0 1200 884">','<rect width="1200" height="884" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Aligned right column',30,'#202020',600),text(32,78,'Narrower center-right piece, aligned with both corner squares. Wider inner pieces. Same six palettes.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}, aligned right column</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*380;
    board.push(`<rect x="${x}" y="${y}" width="368" height="358" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+51}" y="${y+48}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+18,y+323,c.note,14,'#5c6670'),text(x+18,y+343,c.colors.map(s=>s.slice(1)).join('  '),11,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'corner-aligned-personalities.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'corner-aligned-personalities.png'));
  fs.writeFileSync(path.join(__dirname,'verified-geometry-and-palettes.json'),JSON.stringify({check,frame,tiles,concepts},null,2)+'\n');
  console.log(JSON.stringify(check));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
