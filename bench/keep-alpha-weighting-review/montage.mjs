import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { heldOutFixtures } from './fixtures.mjs';
import { fixtures, render } from '../keep-alpha-weighting-spike/experiment.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const require=createRequire(import.meta.url), sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const target=FULL_PRESETS.find(p=>p.id==='preset-res64')?.colors;
if(!target)throw new Error('Resurrect64 preset missing.');
const selected=[...heldOutFixtures().filter(v=>['faint-green-spill','intentional-cyan-halo'].includes(v.name)).map(v=>({name:v.name,items:[v]})),...(await fixtures()).filter(v=>v.name==='many-soft-colors')];
const cellW=260,cellH=240,columns=4,composites=[];
let row=0;
for(const f of selected){
 const source=f.items[0].original,outputs=[source];
 for(const weighting of ['none','linear','squared'])outputs.push((await render(f.items,{weighting,cap:f.name==='many-soft-colors'?4:3,target:f.name==='many-soft-colors'?target:undefined,metric:f.name==='many-soft-colors'?'rgb':'oklab'})).outputs[0]);
 for(const background of [0,255]){
  for(let col=0;col<4;col++){
   const image=outputs[col],rgb=Buffer.alloc(image.width*image.height*3);
   for(let p=0;p<image.width*image.height;p++)for(let c=0;c<3;c++)rgb[p*3+c]=Math.round(image.data[p*4+c]*image.data[p*4+3]/255+background*(1-image.data[p*4+3]/255));
   const png=await sharp(rgb,{raw:{width:image.width,height:image.height,channels:3}}).resize(240,180,{fit:'contain',kernel:'nearest',background:{r:background,g:background,b:background}}).png().toBuffer();
   composites.push({input:png,left:col*cellW+10,top:row*cellH+50});
   const label=`${f.name} / ${['source','baseline','linear','squared'][col]}`;
   composites.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="45"><rect width="260" height="45" fill="#ddd"/><text x="5" y="17" font-size="12" fill="#111">${label}</text><text x="5" y="35" font-size="12" fill="#111">${background?'white':'black'} background</text></svg>`),left:col*cellW,top:row*cellH});
  }
  row++;
 }
}
await sharp({create:{width:cellW*columns,height:cellH*row,channels:3,background:'#888'}}).composite(composites).png().toFile(new URL('./montage.png',import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
await writeFile(new URL('./montage-note.txt',import.meta.url),'Auto cap3/Oklab on spill and cyan halo. Resurrect64 cap4/RGB on many-soft-colors. Source RGBA independently composited with encoded-sRGB alpha on black and white. Native 1x values are in fixture generators; display enlarged with nearest sampling.\n');
