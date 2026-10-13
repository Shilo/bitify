// Six packed center mosaics; only two-unit gutters between colored pieces.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const palette={black:'#202020',coral:'#ef6256',gold:'#f0b644',teal:'#419ca7',violet:'#7267b5'};
const fixed=[[4,4,22,6,'black'],[4,10,6,18,'black'],[4,28,22,6,'black'],[28,4,6,6,'gold'],[28,28,6,6,'violet']];
const concepts=[
  {id:'01-wide-right-piece',name:'Wide right piece',count:3,rects:[[12,12,8,8,'coral'],[12,22,8,4,'teal'],[22,12,12,14,'gold']]},
  {id:'02-shallow-top-piece',name:'Shallow top piece',count:3,rects:[[12,12,22,4,'coral'],[12,18,12,8,'teal'],[26,18,8,8,'violet']]},
  {id:'03-tall-left-piece',name:'Tall left piece',count:3,rects:[[12,12,10,14,'coral'],[24,12,10,4,'gold'],[24,18,10,8,'violet']]},
  {id:'04-offset-columns',name:'Offset columns',count:4,rects:[[12,12,8,5,'coral'],[12,19,8,7,'teal'],[22,12,12,8,'gold'],[22,22,12,4,'violet']]},
  {id:'05-staggered-rows',name:'Staggered rows',count:4,rects:[[12,12,14,6,'coral'],[28,12,6,6,'gold'],[12,20,8,6,'teal'],[22,20,12,6,'violet']]},
  {id:'06-strip-and-blocks',name:'Strip and blocks',count:4,rects:[[12,12,6,14,'coral'],[20,12,14,4,'gold'],[20,18,6,8,'teal'],[28,18,6,8,'violet']]}
];
function shapes(c){
  const occupied=new Set(),center=new Set();
  const all=[...fixed,...c.rects];
  for(const [x,y,w,h,key] of all){
    if(![x,y,w,h].every(Number.isInteger)||x<4||y<4||x+w>34||y+h>34)throw Error('Invalid square bounds: '+c.id);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const cell=xx+','+yy;if(occupied.has(cell))throw Error('Overlap: '+c.id);occupied.add(cell);
      if(key!=='black'&&yy>=12&&yy<26)center.add(cell);
    }
  }
  // No 3x3 empty region may remain inside the center: gutters are at most 2 wide.
  for(let y=12;y<=23;y++)for(let x=12;x<=31;x++){
    let empty=true;
    for(let yy=y;yy<y+3;yy++)for(let xx=x;xx<x+3;xx++)if(center.has(xx+','+yy))empty=false;
    if(empty)throw Error('Unfilled center space: '+c.id);
  }
  if(c.rects.length!==c.count)throw Error('Wrong center count');
  return all.map(([x,y,w,h,key])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${palette[key]}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="836" viewBox="0 0 1200 836">','<rect width="1200" height="836" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Filled square variations',30,'#202020',600),text(32,78,'Three or four varied pieces fill the center. Only narrow gutters remain. The C and corner squares stay fixed.',16,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const geometry=shapes(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${geometry}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*358;
    board.push(`<rect x="${x}" y="${y}" width="368" height="334" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+51}" y="${y+42}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${geometry}</svg>`,text(x+18,y+315,`${c.count} center pieces · square silhouette · fully packed`,14,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'filled-square-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'filled-square-variations.png'));
  console.log('Rendered 6 square logos. Center packing verified: no empty 3x3 area; only narrow gutters between pieces.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
