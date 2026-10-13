// Fixed square silhouette and black C; two matching corner tiles, varied centers.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const colors={black:'#202020',coral:'#ef6256',gold:'#f0b644',teal:'#419ca7',violet:'#7267b5'};
const frame=[[4,4,22,6,'black'],[4,10,6,18,'black'],[4,28,22,6,'black']];
const corners=[[28,4,6,6,'gold'],[28,28,6,6,'violet']];
const concepts=[
  {id:'01-full-fragments',name:'Full fragments',lines:['Four varied pieces fill the open center.','Larger blocks give the color plenty of presence.'],inner:[
    [12,12,10,7,'coral'],[24,12,10,5,'gold'],[12,21,6,5,'teal'],[20,19,14,7,'violet']]},
  {id:'02-offset-pieces',name:'Offset pieces',lines:['Four pieces with staggered edges and sizes.','A less orderly arrangement inside the same C.'],inner:[
    [12,12,8,8,'coral'],[23,12,11,4,'gold'],[22,18,8,8,'violet'],[12,22,8,4,'teal']]},
  {id:'03-three-big-pieces',name:'Three bold pieces',lines:['Three center fragments, including a tall one.','A compact mix of square and rectangular forms.'],inner:[
    [12,12,10,8,'coral'],[24,12,10,14,'gold'],[12,22,10,4,'teal']]},
  {id:'04-wide-and-short',name:'Wide and short',lines:['Three broad pieces make a fuller picture.','Different widths keep the center asymmetrical.'],inner:[
    [12,12,22,6,'coral'],[12,20,8,6,'teal'],[22,20,12,6,'violet']]},
  {id:'05-loose-confetti',name:'Loose confetti',lines:['Four fragments, including a smaller floating piece.','More varied gaps give the center a playful feel.'],inner:[
    [12,12,12,6,'coral'],[27,12,7,3,'gold'],[12,21,7,5,'teal'],[22,20,12,6,'violet']]},
  {id:'06-tall-and-wide',name:'Tall and wide',lines:['Four pieces contrast a tall strip with wider blocks.','The square outline and corner tiles stay fixed.'],inner:[
    [12,12,7,14,'coral'],[21,12,13,5,'gold'],[21,19,5,7,'teal'],[28,19,6,7,'violet']]}
];
function build(c){
  const rects=[...frame,...corners,...c.inner];
  const cells=new Set();
  for(const[x,y,w,h]of rects){
    if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||x+w>38||y+h>38||w<=0||h<=0)throw Error('Grid bounds: '+c.id);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const key=xx+','+yy;if(cells.has(key))throw Error('Overlap: '+c.id);cells.add(key);
    }
  }
  const minX=Math.min(...rects.map(r=>r[0])),minY=Math.min(...rects.map(r=>r[1]));
  const maxX=Math.max(...rects.map(r=>r[0]+r[2])),maxY=Math.max(...rects.map(r=>r[1]+r[3]));
  if(maxX-minX!==maxY-minY)throw Error('Silhouette must be square: '+c.id);
  if(![3,4].includes(c.inner.length))throw Error('Center piece count: '+c.id);
  if(new Set(c.inner.map(r=>r[2]+','+r[3])).size<2)throw Error('Center pieces must vary: '+c.id);
  return{shapes:rects.map(([x,y,w,h,key])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors[key]}"/>`).join(''),check:{id:c.id,silhouetteWidth:maxX-minX,silhouetteHeight:maxY-minY,blackStroke:6,cornerTiles:'6x6',centerPieces:c.inner.length,centerSizesVary:true}};
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const checks=[];
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="870" viewBox="0 0 1200 870">','<rect width="1200" height="870" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Square frame, varied confetti',30,'#202020',600),text(32,78,'One matching piece at each right corner. Three or four varied pieces inside. Every silhouette is square.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const{shapes,check}=build(c);checks.push(check);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*372;
    board.push(`<rect x="${x}" y="${y}" width="368" height="352" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+51}" y="${y+46}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`);
    c.lines.forEach((line,j)=>board.push(text(x+18,y+314+j*20,line,13,'#5c6670')));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'square-confetti-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'square-confetti-variations.png'));
  fs.writeFileSync(path.join(__dirname,'geometry-checks.json'),JSON.stringify(checks,null,2)+'\n');
  console.log(JSON.stringify(checks));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
