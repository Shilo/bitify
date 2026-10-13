// Original pixel-art Colorfetti C-frame variations. Pass the Sharp module directory as argv[2].
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.argv[2]||'sharp');
const out=__dirname;
const paper='#f7f5ef', ink='#273342';
const regular=[[4,2,8,2],[2,4,2,8],[4,12,8,2],[3,3,2,2],[3,11,2,2],[11,3,2,2],[11,11,2,2]];
const frame=color=>regular.map(r=>[...r,color]);
const designs=[
  {id:'01-fine-line',n:'01',name:'Fine line',note:'A light violet frame with three simple color pieces',bg:'#f2eef7',rects:[
    [4,2,8,1,'#8068a2'],[2,4,1,8,'#8068a2'],[4,13,8,1,'#8068a2'],[3,3,1,1,'#8068a2'],[3,12,1,1,'#8068a2'],[12,3,1,2,'#8068a2'],[12,11,1,2,'#8068a2'],
    [5,5,3,3,'#e99287'],[9,6,2,2,'#d3ae59'],[7,10,3,2,'#79b6b0'],
  ]},
  {id:'02-quiet-c',n:'02',name:'Quiet C',note:'A solid teal C keeps the picture and pixels clear',bg:'#edf3f0',rects:[
    ...frame('#286e76'),[5,5,3,3,'#ee927c'],[9,5,2,2,'#ddb44d'],[7,9,3,2,'#83aaa7'],
  ]},
  {id:'03-warm-gallery',n:'03',name:'Warm gallery',note:'A chunky golden frame gives the mark a softer tone',bg:'#faf2e4',rects:[
    [4,1,8,3,'#c98a35'],[1,4,3,8,'#c98a35'],[4,12,8,3,'#c98a35'],[2,2,3,3,'#c98a35'],[2,11,3,3,'#c98a35'],[11,2,2,2,'#c98a35'],[11,12,2,2,'#c98a35'],
    [6,5,2,2,'#e4bb6a'],[5,9,3,2,'#4b9690'],[8,8,3,3,'#d97668'],
  ]},
  {id:'04-palette-frame',n:'04',name:'Palette frame',note:'Three frame colors connect the C to a palette',bg:'#f8f3ee',rects:[
    [4,2,8,2,'#e86659'],[3,3,2,2,'#e86659'],[11,3,2,2,'#e86659'],
    [2,4,2,8,'#8270b0'],[3,11,2,2,'#419b9e'],[4,12,8,2,'#419b9e'],[11,11,2,2,'#419b9e'],
    [5,5,3,3,'#e9b94b'],[9,5,2,2,'#e86659'],[5,9,2,2,'#419b9e'],[8,8,3,3,'#8270b0'],
  ]},
  {id:'05-pixel-postcard',n:'05',name:'Pixel postcard',note:'A small landscape makes the picture connection explicit',bg:'#edf2f8',rects:[
    ...frame('#4b75a2'),[5,5,2,2,'#efb952'],[5,10,2,2,'#67a8a5'],[7,9,2,3,'#67a8a5'],[9,8,2,4,'#de927d'],[13,6,2,2,'#efb952'],
  ]},
  {id:'06-layered-paper',n:'06',name:'Layered paper',note:'A coral C has a crisp offset layer and paper fragments',bg:'#f8eee9',rects:[
    ...regular.map(([x,y,w,h])=>[x+1,y+1,w,h,'#ac5b71']),...frame('#ef927e'),
    [5,5,3,3,'#6fa8a3'],[9,5,2,2,'#d8ae4c'],[5,9,2,2,'#d8ae4c'],[8,8,3,3,'#9373ab'],[13,1,2,2,'#6fa8a3'],
  ]},
  {id:'07-confetti-mosaic',n:'07',name:'Confetti mosaic',note:'Separated frame pieces echo the confetti inside',bg:'#252d47',rects:[
    [4,1,3,2,'#8daae7'],[8,1,4,2,'#73c5b8'],[2,4,2,3,'#bfa1e4'],[2,8,2,4,'#8daae7'],[4,13,3,2,'#bfa1e4'],[8,13,4,2,'#73c5b8'],[11,3,2,2,'#8daae7'],[11,11,2,2,'#bfa1e4'],
    [5,5,3,3,'#ff9b8b'],[9,5,2,2,'#f4cf73'],[5,9,2,2,'#73c5b8'],[8,8,3,3,'#e69cc8'],[13,0,2,2,'#f4cf73'],
  ]},
  {id:'08-color-spill',n:'08',name:'Color spill',note:'Bright pieces tumble through a playful multicolor C',bg:'#352f47',rects:[
    [4,1,7,3,'#ef79b8'],[2,3,3,3,'#ef79b8'],[1,6,3,5,'#aa8ce2'],[2,11,3,3,'#6fc9cb'],[4,12,7,3,'#6fc9cb'],[11,2,2,2,'#ffae7c'],[11,12,2,2,'#f0ce70'],
    [5,5,3,2,'#ffae7c'],[6,7,2,2,'#ffae7c'],[9,5,2,2,'#f0ce70'],[5,10,2,2,'#9dc98c'],[9,9,2,2,'#ef79b8'],[13,0,2,2,'#f0ce70'],[13,13,2,2,'#ffae7c'],[13,3,2,2,'#aa8ce2'],
  ]},
];
function cells(v) {
  const a=Array.from({length:16},()=>Array(16).fill(null));
  for (const [x,y,w,h,c] of v.rects) {
    if (![x,y,w,h].every(Number.isInteger)||x<0||y<0||x+w>16||y+h>16) throw new Error('Invalid geometry '+v.id);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)a[yy][xx]=c;
  }
  return a;
}
function shape(v,mono) {return cells(v).flatMap((r,y)=>r.flatMap((c,x)=>c?[`<rect x="${x}" y="${y}" width="1" height="1" fill="${mono||c}"/>`]:[])).join('');}
function mark(v,mono){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>Colorfetti ${v.name} C-frame concept</title>${shape(v,mono)}</svg>`;}
function placed(v,x,y,size,mono){return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">${shape(v,mono)}</svg>`;}
function text(x,y,str,size=16,color=ink,weight=400){return `<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}" font-weight="${weight}">${str}</text>`;}
function app(v,mono=false){return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Colorfetti ${v.name} app icon</title><rect width="512" height="512" fill="${mono?ink:v.bg}"/>${placed(v,128,128,256,mono?paper:undefined)}</svg>`;}
function lockup(v){return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="128" viewBox="0 0 512 128"><title>Colorfetti ${v.name} wordmark combination</title>${placed(v,8,16,96)}${text(126,84,'Colorfetti',60,ink,600)}</svg>`;}
async function main(){
  const checks=[], silhouettes=new Set();
  for(const v of designs){
    const signature=cells(v).map(r=>r.map(c=>c?'#':'.').join('')).join('\n');
    if(silhouettes.has(signature))throw new Error('Duplicate silhouette '+v.id);
    silhouettes.add(signature);
    for(const [s,data]of[['',mark(v)],['-mono',mark(v,ink)],['-app',app(v)],['-app-mono',app(v,true)],['-lockup',lockup(v)]])fs.writeFileSync(path.join(out,v.id+s+'.svg'),data);
    const raw=await sharp(Buffer.from(mark(v))).resize(16,16).ensureAlpha().raw().toBuffer();
    const mono=await sharp(Buffer.from(mark(v,ink))).resize(16,16).ensureAlpha().raw().toBuffer();
    for(let i=0;i<raw.length;i+=4)if(![0,255].includes(raw[i+3])||raw[i+3]!==mono[i+3])throw new Error('Invalid alpha '+v.id);
    for(const size of[16,24,32,48,256])await sharp(raw,{raw:{width:16,height:16,channels:4}}).resize(size,size,{kernel:'nearest'}).png().toFile(path.join(out,`${v.id}-${size}.png`));
    await sharp(Buffer.from(app(v))).png().toFile(path.join(out,v.id+'-app-512.png'));
    await sharp(Buffer.from(app(v,true))).png().toFile(path.join(out,v.id+'-app-mono-512.png'));
    let maxRadius=0;
    cells(v).forEach((r,y)=>r.forEach((c,x)=>{if(c)for(const xx of[x*16+128,x*16+144])for(const yy of[y*16+128,y*16+144])maxRadius=Math.max(maxRadius,Math.hypot(xx-256,yy-256));}));
    if(maxRadius>204.8)throw new Error('Unsafe icon '+v.id);
    checks.push({id:v.id,uniqueSilhouette:true,binaryAlpha:true,monochromeMatches:true,appMarkRadius:Number(maxRadius.toFixed(2)),safeRadius:204.8});
  }
  for(let group=0;group<2;group++){
    const title=group===0?'Restrained and balanced':'Illustrative and playful';
    const pieces=[`<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="888" viewBox="0 0 1020 888"><rect width="1020" height="888" fill="${paper}"/>`,text(28,43,'Colorfetti · C-shaped picture frames',29,ink,600),text(28,74,title+' · different shapes, frame treatments and palettes',17,'#5c6670')];
    designs.slice(group*4,group*4+4).forEach((v,i)=>{
      const x=28+(i%2)*500,y=108+Math.floor(i/2)*366;
      pieces.push(text(x,y+23,v.n+' · '+v.name,23,ink,600),text(x,y+52,v.note,14,'#5c6670'));
      pieces.push(`<rect x="${x}" y="${y+74}" width="144" height="144" rx="18" fill="${v.bg}"/>`,placed(v,x+8,y+82,128));
      pieces.push(`<rect x="${x+164}" y="${y+74}" width="128" height="144" rx="18" fill="${ink}"/>`,placed(v,x+172,y+90,112,paper));
      pieces.push(text(x+314,y+93,'16 / 32 / 48 px',14,'#5c6670'));
      // The small colored samples use the proposed background too, which matters for the pale palettes.
      pieces.push(`<rect x="${x+308}" y="${y+108}" width="156" height="112" fill="${v.bg}"/>`);
      pieces.push(placed(v,x+316,y+127,16),placed(v,x+354,y+119,32),placed(v,x+402,y+111,48));
      const nativeMono=Number(v.n)>=7?paper:ink;
      pieces.push(placed(v,x+316,y+183,16,nativeMono),placed(v,x+354,y+175,32,nativeMono),placed(v,x+402,y+167,48,nativeMono));
      pieces.push(placed(v,x,y+246,48),text(x+62,y+283,'Colorfetti',34,ink,600));
    });
    pieces.push('<path d="M28 457H992" stroke="#d8d5ce"/>',text(28,862,'Every concept combines a C, a picture frame and interior pixel fragments. Original pixel-art sketches.',14,'#5c6670'),'</svg>');
    const filename=group===0?'c-frames-restrained':'c-frames-playful';
    fs.writeFileSync(path.join(out,filename+'.svg'),pieces.join('\n'));
    await sharp(Buffer.from(pieces.join('\n'))).png().toFile(path.join(out,filename+'.png'));
  }
  fs.writeFileSync(path.join(out,'geometry-checks.json'),JSON.stringify(checks,null,2)+'\n');
  console.log(JSON.stringify({concepts:checks.length,uniqueSilhouettes:silhouettes.size,boards:2,binaryAlpha:true,monochromeMatches:true,appIconsSafe:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
