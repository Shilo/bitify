// Exact annotated alignment, uniform 2-unit padding, fixed geometry across palettes.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const frame=[[4,4,22,6],[4,10,6,18],[4,28,22,6]];
// top corner, bottom corner, upper-left, lower-left, center-right.
const tiles=[[28,4,6,6],[28,28,6,6],[12,12,12,6],[12,20,12,6],[26,12,8,14]];
const concepts=[
  {id:'01-studio',name:'Studio',note:'Creative, balanced, approachable.',colors:['#F2BB3B','#8965C7','#EF6258','#32A884','#4487D4']},
  {id:'02-carnival',name:'Carnival',note:'Bold, warm, festive.',colors:['#FF8A32','#7755C7','#E94785','#1BB6AE','#F2C84B']},
  {id:'03-coastal',name:'Coastal',note:'Calm, airy, assured.',colors:['#E98667','#D4AF42','#6B9DD7','#43AF9B','#9576C9']},
  {id:'04-arcade',name:'Arcade',note:'Energetic, digital, expressive.',colors:['#D5EB38','#29C9DD','#FF754C','#CC55D4','#5465D8']},
  {id:'05-paper',name:'Paper',note:'Tactile, understated, artistic.',colors:['#D5A548','#537CBA','#C86849','#739B69','#9E6DA7']},
  {id:'06-candy',name:'Candy',note:'Friendly, soft, imaginative.',colors:['#F3C56C','#DB709C','#A27BCE','#6CB9A2','#6B9BD1']}
];
function validate(){
  const [top,bottom,upper,lower,right]=tiles;
  const gapChecks={
    topArmToCorner:top[0]-frame[0][0]-frame[0][2],
    bottomArmToCorner:bottom[0]-frame[2][0]-frame[2][2],
    spineToUpper:upper[0]-frame[1][0]-frame[1][2],
    spineToLower:lower[0]-frame[1][0]-frame[1][2],
    frameToUpper:upper[1]-frame[0][1]-frame[0][3],
    lowerToFrame:frame[2][1]-lower[1]-lower[3],
    upperToLower:lower[1]-upper[1]-upper[3],
    upperToRight:right[0]-upper[0]-upper[2],
    lowerToRight:right[0]-lower[0]-lower[2],
    topCornerToRight:right[1]-top[1]-top[3],
    rightToBottomCorner:bottom[1]-right[1]-right[3],
    topFrameToRight:right[1]-frame[0][1]-frame[0][3],
    rightToBottomFrame:frame[2][1]-right[1]-right[3]
  };
  if(Object.values(gapChecks).some(n=>n!==2))throw Error('Unequal padding');
  const cEnd=frame[0][0]+frame[0][2];
  if(right[0]!==cEnd||right[0]!==frame[2][0]+frame[2][2])throw Error('Center-right LEFT edge must align with C end');
  if(right[0]+right[2]!==top[0]+top[2]||right[0]+right[2]!==bottom[0]+bottom[2])throw Error('Center-right RIGHT edge must align with corners');
  const rects=[...frame,...tiles];
  const width=Math.max(...rects.map(r=>r[0]+r[2]))-Math.min(...rects.map(r=>r[0]));
  const height=Math.max(...rects.map(r=>r[1]+r[3]))-Math.min(...rects.map(r=>r[1]));
  if(width!==height)throw Error('Logo must be square');
  const occupied=new Set();
  for(const[x,y,w,h]of rects){
    if(![x,y,w,h].every(Number.isInteger))throw Error('Non-integer pixel');
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const key=xx+','+yy;if(occupied.has(key))throw Error('Overlapping shapes');occupied.add(key);
    }
  }
  if(new Set(concepts.flatMap(c=>c.colors)).size!==30)throw Error('Repeated palette colors');
  return{gapChecks,padding:2,squareWidth:width,squareHeight:height,cRightEnd:cEnd,centerRightLeft:right[0],centerRightRight:right[0]+right[2],cornersRight:top[0]+top[2],innerLeftWidths:[upper[2],lower[2]],centerRightWidth:right[2]};
}
function geometry(c){return[...frame.map(r=>[...r,'#202020']),...tiles.map((r,i)=>[...r,c.colors[i]])].map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const check=validate();
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="884" viewBox="0 0 1200 884">','<rect width="1200" height="884" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Locked shape, six personalities',30,'#202020',600),text(32,78,'Center-right starts exactly at the C’s end. All outer right edges align. Every neighboring gap is identical.',16,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*380;
    board.push(`<rect x="${x}" y="${y}" width="368" height="358" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600),`<svg x="${x+51}" y="${y+48}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+18,y+323,c.note,14,'#5c6670'),text(x+18,y+343,c.colors.map(s=>s.slice(1)).join('  '),11,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'locked-shape-personalities.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'locked-shape-personalities.png'));
  fs.writeFileSync(path.join(__dirname,'verified-geometry-and-palettes.json'),JSON.stringify({check,frame,tiles,concepts},null,2)+'\n');
  console.log(JSON.stringify(check));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
