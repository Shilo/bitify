// One shared module: black stroke and every colored tile are six grid units.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const colors={black:'#202020',coral:'#ef6256',gold:'#f0b644',teal:'#419ca7',violet:'#7267b5'};
const moduleSize=6;
const concepts=[
  {id:'01-balanced-grid',name:'Balanced grid',cols:4,rows:4,gap:2,lines:['One thickness for the frame and every square.','Two filled center rows, with even pixel gutters.']},
  {id:'02-tight-grid',name:'Tight grid',cols:4,rows:4,gap:1,lines:['The same module, with smaller gaps.','More color coverage inside the black C.']},
  {id:'03-airier-grid',name:'Airier grid',cols:4,rows:4,gap:3,lines:['Matching squares, with wider spacing.','Each individual confetti piece stays visible.']},
  {id:'04-wide-canvas',name:'Wide canvas',cols:5,rows:4,gap:2,lines:['Longer equal arms and an extra center column.','Every tile still matches the frame thickness.']},
  {id:'05-tall-canvas',name:'Tall canvas',cols:4,rows:5,gap:2,lines:['An extra middle row gives a taller C.','The top and bottom edge tiles match its arms.']},
  {id:'06-compact-canvas',name:'Compact canvas',cols:3,rows:4,gap:2,lines:['A narrower C with fewer, larger-looking pieces.','The same square module fills the center.']}
];
function build(c){
  const s=moduleSize,pitch=s+c.gap;
  const w=c.cols*s+(c.cols-1)*c.gap,h=c.rows*s+(c.rows-1)*c.gap;
  const x=Math.floor((48-w)/2),y=Math.floor((48-h)/2),arm=w-s-c.gap;
  const rects=[[x,y,arm,s,'black'],[x,y+s,s,h-2*s,'black'],[x,y+h-s,arm,s,'black']];
  const tiles=[];
  for(let row=0;row<c.rows;row++)for(let col=1;col<c.cols;col++){
    if((row===0||row===c.rows-1)&&col<c.cols-1)continue;
    let color;
    if(row===0)color='gold';
    else if(row===c.rows-1)color='violet';
    else if(row===1)color=col===1?'coral':'gold';
    else if(row===c.rows-2)color=col===c.cols-1?'violet':'teal';
    else color=['teal','coral','violet','gold'][(col-1)%4];
    const tile=[x+col*pitch,y+row*pitch,s,s,color];tiles.push(tile);rects.push(tile);
  }
  const cells=new Set();
  for(const[rx,ry,rw,rh]of rects){
    if(![rx,ry,rw,rh].every(Number.isInteger)||rx<0||ry<0||rx+rw>48||ry+rh>48)throw Error('Invalid grid: '+c.id);
    for(let yy=ry;yy<ry+rh;yy++)for(let xx=rx;xx<rx+rw;xx++){
      const cell=xx+','+yy;if(cells.has(cell))throw Error('Overlap: '+c.id);cells.add(cell);
    }
  }
  if(tiles.some(t=>t[2]!==s||t[3]!==s))throw Error('Unequal tile: '+c.id);
  if(tiles[0][1]!==y||tiles[tiles.length-1][1]+s!==y+h)throw Error('Unaligned edge tile: '+c.id);
  return{shapes:rects.map(([rx,ry,rw,rh,key])=>`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${colors[key]}"/>`).join(''),qa:{id:c.id,stroke:s,tileWidth:s,tileHeight:s,topArm:arm,bottomArm:arm,markWidth:w,tiles:tiles.length,allCenterCellsFilled:true}};
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const qa=[];
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="880" viewBox="0 0 1200 880">','<rect width="1200" height="880" fill="#f7f5ef"/>',text(32,46,'Colorfetti · One thickness, one grid',30,'#202020',600),text(32,78,'Every confetti piece is a matching square. The C stroke has the same thickness. The center is filled.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const{shapes,qa:check}=build(c);qa.push(check);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 48 48" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*380;
    board.push(`<rect x="${x}" y="${y}" width="368" height="360" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+40}" y="${y+38}" width="288" height="288" viewBox="0 0 48 48" shape-rendering="crispEdges">${shapes}</svg>`);
    c.lines.forEach((line,j)=>board.push(text(x+18,y+320+j*20,line,13,'#5c6670')));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'equal-module-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'equal-module-variations.png'));
  fs.writeFileSync(path.join(__dirname,'geometry-checks.json'),JSON.stringify(qa,null,2)+'\n');
  console.log(JSON.stringify(qa));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
