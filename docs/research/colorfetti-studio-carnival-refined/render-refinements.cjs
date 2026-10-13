// Palette refinements only. Uses the approved narrow-right-column geometry.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../colorfetti-corner-aligned/verified-geometry-and-palettes.json'),'utf8'));
const {frame,tiles}=source;
// top corner, bottom corner, upper-left, lower-left, tall right bar.
const concepts=[
  {id:'01-carnival-swap',name:'Carnival · Direct swap',note:'Original hues, with teal on the bar and yellow inside.',colors:['#FF8A32','#7755C7','#E94785','#F2C84B','#1BB6AE']},
  {id:'02-carnival-refined',name:'Carnival · Refined',note:'Clearer orange, vivid pink, rich violet, and deeper teal.',colors:['#F47A34','#7952C7','#E63E82','#F4C340','#0EAAA5']},
  {id:'03-studio-coral',name:'Studio · Coral and jade',note:'Warmer coral and jade soften the primary-color feel.',colors:['#F0B83F','#865BC4','#F26664','#20A58B','#4779CB']},
  {id:'04-studio-berry',name:'Studio · Berry and blue',note:'Berry pink and apricot give Studio a more festive identity.',colors:['#F6A443','#845CCC','#DA4C7F','#30AA80','#3F80C9']}
];
function geometry(c){
  if(new Set(c.colors).size!==5)throw Error('Repeated palette color');
  return[...frame.map(r=>[...r,'#202020']),...tiles.map((r,i)=>[...r,c.colors[i]])].map(([x,y,w,h,color])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`).join('');
}
function text(x,y,t,size=16,color='#202020',weight=400){return `<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${t}</text>`;}
async function run(){
  const checks=[];
  const board=['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="904" viewBox="0 0 1080 904">','<rect width="1080" height="904" fill="#f7f5ef"/>',text(32,46,'Colorfetti · Carnival and Studio refinements',29,'#202020',600),text(32,78,'Same square shape and exact spacing. Two palette refinements for each direction.',17,'#5c6670')];
  for(const[i,c]of concepts.entries()){
    const shapes=geometry(c);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="304" height="304" viewBox="0 0 38 38" shape-rendering="crispEdges"><title>Colorfetti ${c.name}</title>${shapes}</svg>`;
    fs.writeFileSync(path.join(__dirname,c.id+'.svg'),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,c.id+'.png'));
    const native=await sharp(Buffer.from(svg)).resize(38,38).ensureAlpha().raw().toBuffer();
    const small=await sharp(native,{raw:{width:38,height:38,channels:4}}).resize(16,16,{kernel:'nearest'}).raw().toBuffer();
    const counts=Object.fromEntries(c.colors.map(color=>[color,0]));
    for(let p=0;p<small.length;p+=4){
      if(small[p+3]!==255)continue;
      const hex='#'+Array.from(small.subarray(p,p+3)).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
      if(hex in counts)counts[hex]++;
    }
    if(Object.values(counts).some(n=>n===0))throw Error('A confetti color vanished at 16px: '+c.id);
    await sharp(small,{raw:{width:16,height:16,channels:4}}).png().toFile(path.join(__dirname,c.id+'-16.png'));
    checks.push({id:c.id,pixelCountsAt16:counts});
    const x=24+(i%2)*528,y=104+Math.floor(i/2)*390;
    board.push(`<rect x="${x}" y="${y}" width="504" height="380" rx="12" fill="#fffdf9"/>`,text(x+20,y+36,`${String(i+1).padStart(2,'0')} · ${c.name}`,22,'#202020',600),`<svg x="${x+119}" y="${y+54}" width="266" height="266" viewBox="0 0 38 38" shape-rendering="crispEdges">${shapes}</svg>`,text(x+20,y+344,c.note,14,'#5c6670'),text(x+20,y+365,c.colors.join('  '),12,'#5c6670'));
  }
  board.push('</svg>');
  fs.writeFileSync(path.join(__dirname,'studio-carnival-refinements.svg'),board.join('\n'));
  await sharp(Buffer.from(board.join('\n'))).png().toFile(path.join(__dirname,'studio-carnival-refinements.png'));
  fs.writeFileSync(path.join(__dirname,'palette-and-small-size-checks.json'),JSON.stringify({frame,tiles,concepts,checks},null,2)+'\n');
  console.log(JSON.stringify(checks));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
