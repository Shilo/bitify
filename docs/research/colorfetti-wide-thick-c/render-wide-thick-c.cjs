// Six thick-spine C variations, with equal arms greater than half the mark width.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const palette = ['#ef6256','#f0b644','#419ca7','#7267b5'];
const concepts = [
  {id:'01-compact-wide-c',name:'Compact wide C',arm:20,gap:2,split:2,lines:['Equal arms: 62.5% of the icon width.','Larger outer blocks balance the thick spine.']},
  {id:'02-balanced-wide-c',name:'Balanced wide C',arm:22,gap:2,split:2,lines:['Equal arms: 68.75% of the icon width.','A little more frame, a little less outer color.']},
  {id:'03-three-quarter-c',name:'Three-quarter C',arm:24,gap:2,split:2,lines:['Equal arms: 75% of the icon width.','A strong C around a broad inner mosaic.']},
  {id:'04-long-arm-c',name:'Long-arm C',arm:26,gap:2,split:2,lines:['Equal arms: 81.25% of the icon width.','Slim outer pieces emphasize the frame.']},
  {id:'05-airier-three-quarter-c',name:'Airier three-quarter C',arm:24,gap:2,split:4,lines:['Equal arms: 75%, with a wider horizontal gap.','More breathing room between the two rows.']},
  {id:'06-packed-three-quarter-c',name:'Packed three-quarter C',arm:24,gap:1,split:2,inset:1,lines:['Equal arms: 75%, with tighter tile gutters.','Larger inner pieces give color more weight.']}
];
function geometry(c) {
  const end=4+c.arm, inset=c.inset||2, upperEnd=20-c.split/2, lowerStart=20+c.split/2;
  const tiles=[[10+inset,10+inset,end-10-inset,upperEnd-10-inset],
    [end+c.gap,4,36-end-c.gap,upperEnd-4],
    [10+inset,lowerStart,end-10-inset,30-inset-lowerStart],
    [end+c.gap,lowerStart,36-end-c.gap,36-lowerStart]];
  const rects=[[4,4,c.arm,6,'#202020'],[4,10,6,20,'#202020'],[4,30,c.arm,6,'#202020'],...tiles.map((r,i)=>[...r,palette[i]])];
  const occupied=new Set();
  for(const [x,y,w,h]of rects){
    if(![x,y,w,h].every(Number.isInteger)||w<=0||h<=0||x<0||y<0||x+w>40||y+h>40)throw Error('Invalid geometry: '+c.id);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const cell=xx+','+yy;if(occupied.has(cell))throw Error('Overlap: '+c.id);occupied.add(cell);
    }
  }
  if(c.arm<=16)throw Error('Arms must exceed 50%: '+c.id);
  return rects.map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="860" viewBox="0 0 1200 860">','<rect width="1200" height="860" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Thick spine, longer equal arms',30,'#202020',600),text(32,78,'Six flat designs. The same thick black spine. Equal top and bottom arms, all wider than 50%.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 40 40" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*368;
    board.push(`<rect x="${x}" y="${y}" width="368" height="348" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+64}" y="${y+50}" width="240" height="240" viewBox="0 0 40 40" shape-rendering="crispEdges">${shapes}</svg>`);
    c.lines.forEach((line,j)=>board.push(text(x+18,y+308+j*20,line,13,'#5c6670')));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'wide-thick-c-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'wide-thick-c-variations.png'));
  console.log('Rendered six designs: same 6-unit black spine, equal arms greater than 50%, four flat color tiles, no overlapping geometry.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
