// Equal-width center pieces, packed into two columns, with randomized colors.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const frame=[[4,4,20,6],[4,10,6,18],[4,28,20,6]];
const corners=[[28,4,6,6],[28,28,6,6]];
const centerWidth=10;
const splits=[5,7,6,8,4,9];
let seed=0xc010fe77;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function hslHex(h,s,l){
  s/=100;l/=100;
  const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};
  return '#'+f(0)+f(8)+f(4);
}
function randomizedColors(){
  const start=random()*360;
  const colors=Array.from({length:5},(_,i)=>hslHex((start+i*72+(random()-.5)*20+360)%360,57+random()*23,49+random()*11));
  for(let i=colors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
  if(new Set(colors).size!==5)throw Error('Color collision');
  return colors;
}
function geometry(topHeight,colors){
  const tiles=[...corners,[12,12,centerWidth,topHeight],[12,14+topHeight,centerWidth,12-topHeight],[24,12,centerWidth,14]];
  const rects=[...frame.map(r=>[...r,'#202020']),...tiles.map((r,i)=>[...r,colors[i]])];
  if(tiles.slice(2).some(r=>r[2]!==centerWidth))throw Error('Unequal center widths');
  if(tiles[4][0]!==frame[0][0]+frame[0][2])throw Error('Center left edge does not match C end');
  if(tiles[4][0]+tiles[4][2]!==corners[0][0]+corners[0][2])throw Error('Outer edges not aligned');
  const occupied=new Set(),center=new Set();
  for(const[x,y,w,h,color]of rects){
    if(![x,y,w,h].every(Number.isInteger)||x<4||y<4||x+w>34||y+h>34||w<=0||h<=0)throw Error('Invalid square geometry');
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const key=xx+','+yy;if(occupied.has(key))throw Error('Overlap');occupied.add(key);
      if(color!=='#202020'&&yy>=12&&yy<26)center.add(key);
    }
  }
  for(let y=12;y<=23;y++)for(let x=12;x<=31;x++){
    let empty=true;
    for(let yy=y;yy<y+3;yy++)for(let xx=x;xx<x+3;xx++)if(center.has(xx+','+yy))empty=false;
    if(empty)throw Error('Unfilled center region');
  }
  return{shapes:rects.map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join(''),tiles};
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const checks=[],used=new Set();
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="836" viewBox="0 0 1200 836">','<rect width="1200" height="836" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Equal widths, packed center',30,'#202020',600),text(32,78,'Three center pieces of equal width. Varied heights. Randomized colors, with no repeats in any logo.',17,'#5c6670')];
  for(const[i,topHeight]of splits.entries()){
    const colors=randomizedColors();
    for(const color of colors){if(used.has(color))throw Error('Color repeated across variations');used.add(color);}
    const{shapes,tiles}=geometry(topHeight,colors);
    const id=String(i+1).padStart(2,'0')+'-color-mix';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti color mix ${i+1}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*358;
    board.push(`<rect x="${x}" y="${y}" width="368" height="334" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · Color mix ${i+1}`,20,'#202020',600),`<svg x="${x+51}" y="${y+42}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+18,y+315,'Equal center widths · packed space · unique colors',13,'#5c6670'));
    checks.push({id,frame,tiles,colors,centerWidth,squareSilhouette:'30x30',packedCenter:true});
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'equal-width-packed-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'equal-width-packed-variations.png'));
  fs.writeFileSync(path.join(__dirname,'geometry-and-colors.json'),JSON.stringify(checks,null,2)+'\n');
  console.log('Verified six square variations: equal 10-unit center widths, packed centers, both edge alignments preserved, 30 unique randomized colors.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
