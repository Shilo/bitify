// Six proposals, one icon per proposal. All four frame sides are continuous.
// Three heavier sides form a C; the thinner fourth side has its own color.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const out=__dirname;
const round=[[6,3,15,4],[3,7,4,10],[6,17,15,4],[4,4,4,4],[4,16,4,4]];
const square=[[3,3,4,18],[7,3,14,4],[7,17,14,4]];
const paint=(rs,color)=>rs.map(r=>[...r,color]);
const proposals=[
  {id:'01-teal-gold',name:'Teal + gold',caption:'Thick teal C · slim golden closure',bg:'#edf3ef',c:paint(round,'#2b7980'),close:[[19,7,2,10,'#d1b387']],bits:[
    [9,9,3,3,'#e58c78'],[15,9,2,2,'#dbb358'],[10,14,2,2,'#77aaa3'],[14,13,3,3,'#9583b4'],
  ]},
  {id:'02-coral-lilac',name:'Coral + lilac',caption:'Square coral C · soft lilac closure',bg:'#f9efea',c:paint(square,'#d9776c'),close:[[19,7,2,10,'#b9acce']],bits:[
    [9,9,3,3,'#d9b457'],[15,9,2,2,'#70aaa3'],[11,14,4,2,'#7e91b4'],
  ]},
  {id:'03-blue-picture',name:'Blue picture',caption:'Blue C · thin peach edge · pixel picture',bg:'#edf2f8',c:paint([[6,3,15,3],[3,6,3,12],[6,18,15,3],[4,4,3,3],[4,17,3,3]],'#4b75a2'),close:[[20,6,1,12,'#e7a78e']],bits:[
    [9,8,3,3,'#e8bd61'],[9,14,3,3,'#6daaa5'],[11,12,3,5,'#6daaa5'],[14,14,4,3,'#dc9481'],
  ]},
  {id:'04-inset-violet',name:'Violet + mint',caption:'Layered violet C · narrow mint closure',bg:'#f1edf6',c:[
    ...paint([[6,2,16,4],[2,6,4,12],[6,18,16,4],[3,3,4,4],[3,17,4,4]],'#846ca9'),
    [6,5,14,1,'#b39ac8'],[5,6,1,12,'#b39ac8'],[6,18,14,1,'#b39ac8'],
  ],close:[[20,6,2,12,'#80b3a4']],bits:[
    [8,8,3,3,'#e69385'],[14,8,3,2,'#d9b15f'],[9,14,2,2,'#80b3a4'],[13,12,4,4,'#a38ec1'],
  ]},
  {id:'05-mosaic-c',name:'Mosaic C',caption:'Cool mosaic C · pale apricot closure',bg:'#eef2f4',c:[
    ...paint(square,'#6c82ae'),[7,3,5,4,'#8777b3'],[16,3,5,4,'#6176a7'],[3,7,4,5,'#568c9d'],[3,15,4,6,'#4c989a'],[7,17,5,4,'#6a9eac'],[16,17,5,4,'#7b82b6'],
  ],close:[[19,7,2,10,'#e8bb91']],bits:[
    [9,9,3,2,'#df8d7a'],[10,11,2,2,'#df8d7a'],[15,9,2,2,'#dcb657'],[9,15,2,1,'#78ac9b'],[14,14,3,2,'#a08dbb'],
  ]},
  {id:'06-playful-mint',name:'Playful mint',caption:'Chunky mint C · thin mauve closure',bg:'#292d48',c:paint([[7,2,15,5],[2,7,5,10],[7,17,15,5],[4,4,5,5],[4,15,5,5]],'#83cbbb'),close:[[21,7,1,10,'#9683b3']],bits:[
    [10,9,3,2,'#f391b8'],[11,11,2,2,'#f391b8'],[16,9,3,2,'#f0cc72'],[9,14,2,2,'#ad97d5'],[15,14,3,2,'#f2a27b'],
  ]},
];
function grid(rects){
  const g=Array.from({length:24},()=>Array(24).fill(null));
  for(const[x,y,w,h,color]of rects){
    if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||x+w>24||y+h>24)throw new Error('Invalid grid');
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)g[yy][xx]=color;
  }
  return g;
}
function outside(g){
  const reached=new Set(),queue=[];
  function add(x,y){const key=y*24+x;if(x>=0&&y>=0&&x<24&&y<24&&!g[y][x]&&!reached.has(key)){reached.add(key);queue.push([x,y]);}}
  for(let n=0;n<24;n++){add(n,0);add(n,23);add(0,n);add(23,n);}
  for(let n=0;n<queue.length;n++){const[x,y]=queue[n];add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
  return reached;
}
function geometry(p){return grid([...p.c,...p.close,...p.bits]).flatMap((r,y)=>r.flatMap((color,x)=>color?[`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`]:[])).join('');}
function icon(p){return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 24 24"><title>Colorfetti ${p.name} complete frame concept</title><rect width="24" height="24" rx="2.4" fill="${p.bg}"/><g shape-rendering="crispEdges">${geometry(p)}</g></svg>`;}
function text(x,y,s,size=18,color='#273342',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${s}</text>`;}
async function main(){
  const checks=[];
  for(const p of proposals){
    const frame=grid([...p.c,...p.close]);
    const closedOutside=outside(frame);
    const openOutside=outside(grid(p.c));
    const confetti=grid(p.bits);
    let count=0;
    for(let y=0;y<24;y++)for(let x=0;x<24;x++)if(confetti[y][x]){
      count++;
      if(frame[y][x]||closedOutside.has(y*24+x))throw new Error('Confetti not inside complete frame: '+p.id);
    }
    if(!openOutside.has(12*24+12)||closedOutside.has(12*24+12))throw new Error('Fourth side not completing C: '+p.id);
    fs.writeFileSync(path.join(out,p.id+'.svg'),icon(p));
    await sharp(Buffer.from(icon(p))).png().toFile(path.join(out,p.id+'.png'));
    checks.push({id:p.id,completeFrame:true,cOpenWithoutFourthSide:true,confettiEntirelyInside:true,confettiPixels:count});
  }
  const pieces=['<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="806" viewBox="0 0 1040 806"><rect width="1040" height="806" fill="#f7f5ef"/>',text(28,42,'Colorfetti · Complete C frames',30,'#273342',600),text(28,73,'Three prominent sides form the C. A contrasting fourth side completes the frame.',17,'#5c6670')];
  proposals.forEach((p,i)=>{
    const x=28+(i%3)*328,y=104+Math.floor(i/3)*340;
    pieces.push(text(x+24,y+22,String(i+1).padStart(2,'0')+' · '+p.name,22,'#273342',600));
    pieces.push(`<svg x="${x+24}" y="${y+42}" width="240" height="240" viewBox="0 0 24 24"><rect width="24" height="24" rx="2.4" fill="${p.bg}"/><g shape-rendering="crispEdges">${geometry(p)}</g></svg>`);
    pieces.push(text(x+24,y+307,p.caption,13,'#5c6670'));
  });
  pieces.push(text(28,782,'One icon per design · pixel art · confetti stays inside the closed frame',15,'#5c6670'),'</svg>');
  fs.writeFileSync(path.join(out,'complete-c-frames.svg'),pieces.join('\n'));
  await sharp(Buffer.from(pieces.join('\n'))).png().toFile(path.join(out,'complete-c-frames.png'));
  fs.writeFileSync(path.join(out,'geometry-checks.json'),JSON.stringify(checks,null,2)+'\n');
  console.log(JSON.stringify({designs:checks.length,completeFrames:true,cOpenWithoutFourthSide:true,allConfettiInside:true,iconsPerDesign:1}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
