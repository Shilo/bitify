import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
for(const pack of ['tiny-dungeon','tiny-town','pixel-platformer']){
 const root=path.join(import.meta.dirname,'raw',pack,'Tiles');
 async function list(d){const out=[];for(const e of await fs.readdir(d,{withFileTypes:true}))if(e.isDirectory())out.push(...await list(path.join(d,e.name)));else if(e.name.endsWith('.png'))out.push(path.join(d,e.name));return out;}
 const files=await list(root), cols=12, cellW=80, cellH=94;
 const composites=[];
 for(let n=0;n<files.length;n++){
  const im=await sharp(files[n]).resize(64,64,{kernel:'nearest',fit:'contain'}).png().toBuffer();
  const x=n%cols*cellW,y=Math.floor(n/cols)*cellH;
  composites.push({input:im,left:x+8,top:y});
  const label=path.relative(root,files[n]).replace(/\.png$/,'').replaceAll('&','&amp;');
  composites.push({input:Buffer.from(`<svg width="80" height="28"><text x="2" y="12" fill="white" font-size="10">${n}:${label}</text></svg>`),left:x,top:y+64});
 }
 await sharp({create:{width:cols*cellW,height:Math.ceil(files.length/cols)*cellH,channels:4,background:'#363636'}}).composite(composites).png().toFile(path.join(import.meta.dirname,pack+'-curation.png'));
 await fs.writeFile(path.join(import.meta.dirname,pack+'-files.json'),JSON.stringify(files.map(f=>path.relative(import.meta.dirname,f).replaceAll('\\','/')),null,2)+'\n');
 console.log(pack,files.length);
}
