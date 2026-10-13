// Exactly three packed center pieces, five unique confetti colors per logo.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const palette={black:'#202020',coral:'#ef6256',gold:'#f0b644',teal:'#419ca7',violet:'#7267b5',blue:'#5187c7'};
const fixed=[[4,4,22,6,'black'],[4,10,6,18,'black'],[4,28,22,6,'black'],[28,4,6,6,'gold'],[28,28,6,6,'violet']];
const concepts=[
  {id:'01-broad-left',name:'Broad left',rects:[[12,12,12,14,'coral'],[26,12,8,5,'teal'],[26,19,8,7,'blue']]},
  {id:'02-broad-right',name:'Broad right',rects:[[12,12,8,5,'coral'],[12,19,8,7,'teal'],[22,12,12,14,'blue']]},
  {id:'03-wide-top',name:'Wide top',rects:[[12,12,22,6,'coral'],[12,20,6,6,'teal'],[20,20,14,6,'blue']]},
  {id:'04-wide-base',name:'Wide base',rects:[[12,12,14,7,'coral'],[28,12,6,7,'teal'],[12,21,22,5,'blue']]},
  {id:'05-tall-strip',name:'Tall strip',rects:[[12,12,6,14,'teal'],[20,12,14,9,'coral'],[20,23,14,3,'blue']]},
  {id:'06-offset-stack',name:'Offset stack',rects:[[12,12,14,4,'blue'],[12,18,14,8,'coral'],[28,12,6,14,'teal']]}
];
function geometry(c){
  if(c.rects.length!==3)throw Error('Must have three center pieces');
  const all=[...fixed,...c.rects];
  const confetti=all.filter(r=>r[4]!=='black');
  if(new Set(confetti.map(r=>palette[r[4]])).size!==5)throw Error('Repeated confetti color: '+c.id);
  const occupied=new Set(),center=new Set();
  for(const[x,y,w,h,key]of all){
    if(![x,y,w,h].every(Number.isInteger)||x<4||y<4||x+w>34||y+h>34||w<1||h<1)throw Error('Invalid square geometry: '+c.id);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const cell=xx+','+yy;if(occupied.has(cell))throw Error('Overlap: '+c.id);occupied.add(cell);
      if(key!=='black'&&yy>=12&&yy<26)center.add(cell);
    }
  }
  for(let y=12;y<=23;y++)for(let x=12;x<=31;x++){
    let empty=true;
    for(let yy=y;yy<y+3;yy++)for(let xx=x;xx<x+3;xx++)if(center.has(xx+','+yy))empty=false;
    if(empty)throw Error('Unfilled center: '+c.id);
  }
  return all.map(([x,y,w,h,key])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${palette[key]}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="836" viewBox="0 0 1200 836">','<rect width="1200" height="836" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Three pieces, five distinct colors',30,'#202020',600),text(32,78,'Exactly three packed center pieces. Two corner squares. No repeated confetti colors within any logo.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*358;
    board.push(`<rect x="${x}" y="${y}" width="368" height="334" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+51}" y="${y+42}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+18,y+315,'3 center pieces · 5 unique colors · square outline',14,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'three-distinct-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'three-distinct-variations.png'));
  console.log('Verified six square logos, each with three packed center pieces and five unique confetti colors.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
