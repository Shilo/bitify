// Preferred #03 center proportions, uniform 2-unit gutters, curated confetti palettes.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const stroke=6,gutter=2;
const frame=[[4,4,22,6],[4,10,6,18],[4,28,22,6]];
// Order: top corner, bottom corner, upper left, lower left, center right.
const tiles=[[28,4,6,6],[28,28,6,6],[12,12,10,6],[12,20,10,6],[24,12,10,14]];
const concepts=[
  {id:'01-colorfetti-classic',name:'Colorfetti Classic',note:'Coral red · yellow · green · blue · violet',recommended:true,colors:['#F3BE45','#8969C7','#F2645A','#35AA85','#4786D3']},
  {id:'02-paper-party',name:'Paper Party',note:'Pink · golden yellow · mint · blue · lavender',colors:['#EAA844','#906EB5','#DE758C','#69A58B','#6297C5']},
  {id:'03-festival',name:'Festival',note:'Orange · purple · pink · turquoise · blue',colors:['#EF983E','#AC5BB2','#E3546B','#269F9C','#5C78C8']},
  {id:'04-primary-pop',name:'Primary Pop',note:'Red · yellow · green · blue · purple',colors:['#F4C333','#8D5AC8','#E94F4B','#4EAD57','#337BD1']},
  {id:'05-creative-bright',name:'Creative Bright',note:'Amber · pink · violet · teal · sky blue',colors:['#ECA638','#CE5997','#6C62B5','#42A78B','#4C9ECC']},
  {id:'06-warm-contrast',name:'Warm Contrast',note:'Yellow · blue · orange · pink · green',colors:['#F5BA4C','#5578C4','#E66743','#D9578C','#42A58E']}
];
function assertGeometry(){
  const gaps={
    topArmToCorner:tiles[0][0]-(frame[0][0]+frame[0][2]),
    bottomArmToCorner:tiles[1][0]-(frame[2][0]+frame[2][2]),
    spineToUpperCenter:tiles[2][0]-(frame[1][0]+frame[1][2]),
    spineToLowerCenter:tiles[3][0]-(frame[1][0]+frame[1][2]),
    topArmToCenter:tiles[2][1]-(frame[0][1]+frame[0][3]),
    centerToBottomArm:frame[2][1]-(tiles[3][1]+tiles[3][3]),
    upperToLowerCenter:tiles[3][1]-(tiles[2][1]+tiles[2][3]),
    centerColumns:tiles[4][0]-(tiles[2][0]+tiles[2][2]),
    upperCornerToCenter:tiles[4][1]-(tiles[0][1]+tiles[0][3]),
    centerToLowerCorner:tiles[1][1]-(tiles[4][1]+tiles[4][3])
  };
  if(Object.values(gaps).some(n=>n!==gutter))throw Error('Inconsistent gutter');
  if(tiles.slice(2).some(t=>t[2]!==10))throw Error('Unequal center widths');
  if(frame[0][2]!==frame[2][2])throw Error('Unequal arms');
  if(tiles[0][2]!==stroke||tiles[0][3]!==stroke||tiles[1][2]!==stroke||tiles[1][3]!==stroke)throw Error('Corner thickness');
  const rects=[...frame,...tiles],occupied=new Set();
  for(const[x,y,w,h]of rects)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    const key=xx+','+yy;if(occupied.has(key))throw Error('Overlapping shapes');occupied.add(key);
  }
  const width=Math.max(...rects.map(r=>r[0]+r[2]))-Math.min(...rects.map(r=>r[0]));
  const height=Math.max(...rects.map(r=>r[1]+r[3]))-Math.min(...rects.map(r=>r[1]));
  if(width!==height)throw Error('Non-square silhouette');
  return{stroke,gutter,gaps,width,height,centerWidths:[10,10,10],equalArms:true};
}
function geometry(c){
  if(new Set(c.colors.map(s=>s.toUpperCase())).size!==5)throw Error('Repeated colors');
  return[...frame.map(r=>[...r,'#202020']),...tiles.map((r,i)=>[...r,c.colors[i]])].map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const checks=assertGeometry();
  if(new Set(concepts.flatMap(c=>c.colors)).size!==30)throw Error('Colors repeat across palettes');
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="884" viewBox="0 0 1200 884">','<rect width="1200" height="884" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Consistent spacing, curated confetti',29,'#202020',600),text(32,78,'Your #03 proportions. Longer C arms. The same narrow gap between every neighboring shape.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const x=24+(i%3)*392,y=104+Math.floor(i/3)*380;
    board.push(`<rect x="${x}" y="${y}" width="368" height="358" rx="12" fill="#fffdf9"/>`,text(x+18,y+32,`${String(i+1).padStart(2,'0')} · ${c.name}`,20,'#202020',600));
    if(c.recommended)board.push(text(x+18,y+54,'Recommended palette',12,'#5c6670',600));
    board.push(`<svg x="${x+51}" y="${y+48}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+18,y+323,c.note,12,'#5c6670'),text(x+18,y+343,c.colors.map(s=>s.slice(1)).join('  '),11,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'curated-confetti-variations.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'curated-confetti-variations.png'));
  fs.writeFileSync(path.join(__dirname,'palette-research-and-spacing.json'),JSON.stringify({checks,frame,tiles,concepts,research:{scope:'Manufacturer catalogs and standard confetti color availability, not a sales-frequency ranking.',sources:['https://flutterfetti.com/faq/','https://www.confettivibe.com/shop/disposable-cannons/tissue-streamer-cannon/','https://www.confettimagic.com/confetti-magic-colour-swatch-2024.pdf'],recommendation:'Red/coral, warm yellow, green, blue, and violet; curated saturation and lightness for a playful creative software identity.'}},null,2)+'\n');
  console.log(JSON.stringify(checks));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
