import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import{createRequire}from'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=import.meta.dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(path.join(root,'fixtures'),{recursive:true});
const selected=[
 ['dungeon-wizard','tiny-dungeon',84,'Purple hood, face, outline; do not let bright face displace all hood definition.'],
 ['dungeon-archer','tiny-dungeon',112,'Green headband and eye highlights distinguish the archer.'],
 ['dungeon-knight','tiny-dungeon',100,'Warm face versus cool helmet, with dark eyes as intentional tiny detail.'],
 ['dungeon-potion','tiny-dungeon',115,'Red potion liquid versus pale stopper and bottle shadow.'],
 ['dungeon-neutral-shield','tiny-dungeon',102,'Neutral metal ramp and dark outline; intentional negative against saturated-noise priority.'],
 ['town-water-bucket','tiny-town',104,'Cyan water inside warm bucket is a distinct material.'],
 ['platformer-pilot','pixel-platformer',24,'Dark face inside green visor with pale helmet.'],
 ['platformer-pilot-blink','pixel-platformer',25,'Alternate green pilot pose: real frame supplied by creator.'],
 ['platformer-neutral-pilot','pixel-platformer',32,'Neutral grey helmet/face preserves neutral control.'],
 ['platformer-rocket','pixel-platformer',39,'Warm rocket body versus dark nozzle and pale tip.'],
 ['platformer-heart','pixel-platformer',95,'Small warm heart highlight and dark outline.'],
 ['platformer-axe','pixel-platformer',117,'Warm wood handle versus neutral metal blade and small red fastening.'],
];
const manifest={frozen:'2026-10-15 before any candidate output',baseline:'4566494',settings:{caps:[2,4,8,16],palettes:['auto','preset-res64','preset-pico8','preset-edg8'],metrics:['oklab','rgb'],alphaMode:'cut',alphaCut:128,dithering:'off',cleanup:false},files:[]};
const sources=new Map();
for(const[id,pack,index,intent]of selected){
 const list=JSON.parse(await fs.readFile(path.join(root,pack+'-files.json'),'utf8'));
 const source=list[index],b=await fs.readFile(path.join(root,source));
 const file=`fixtures/${id}.png`;await fs.writeFile(path.join(root,file),b);
 const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const colors={};for(let p=0;p<data.length;p+=4)if(data[p+3]){const rgb=data.subarray(p,p+3).toString('hex');colors[rgb]=(colors[rgb]??0)+1;}
 const packmeta=JSON.parse(await fs.readFile(path.join(root,'raw',pack+'.json'),'utf8'));
 manifest.files.push({id,file,kind:'real',intent,width:info.width,height:info.height,sha256:sha(b),rgbaSha256:sha(data),visibleColors:colors,source:{...packmeta,archivePath:source.replace(`raw/${pack}/`,''),author:'Kenney',license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'}});
 sources.set(id,{data,info});
}
// Integer-position montage, fixed before output: no recoloring, scaling or resampling.
const montage=['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion','dungeon-neutral-shield','town-water-bucket','platformer-pilot','platformer-axe'];
const pixels=Buffer.alloc(96*48*4);
for(let i=0;i<montage.length;i++){const{data,info}=sources.get(montage[i]),ox=i%4*24,oy=Math.floor(i/4)*24;for(let y=0;y<info.height;y++)data.copy(pixels,((oy+y)*96+ox)*4,y*info.width*4,(y+1)*info.width*4);}
const sheet=await sharp(pixels,{raw:{width:96,height:48,channels:4}}).png().toBuffer();await fs.writeFile(path.join(root,'fixtures/real-inventory.png'),sheet);
manifest.files.push({id:'real-inventory',file:'fixtures/real-inventory.png',kind:'real-montage',width:96,height:48,sha256:sha(sheet),rgbaSha256:sha(pixels),intent:'One shared budget across heterogeneous material sprites: rare water, potion, headband must compete with skin and neutral ramps.',assembly:montage.map((id,i)=>({id,x:i%4*24,y:Math.floor(i/4)*24})),license:'CC0-1.0, derivatives of licensed sources above'});
for(const suffix of['a','b']){const source=`../claude-audit-2026-10-15/service/fixtures/knight-${suffix}.png`,b=await fs.readFile(path.join(root,source)),file=`fixtures/owned-knight-${suffix}.png`;await fs.writeFile(path.join(root,file),b);manifest.files.push({id:`owned-knight-${suffix}`,file,kind:'owned-synthetic',width:24,height:24,sha256:sha(b),intent:'Known red tabard/blue eyes/green gem counterexample. Never replace with only favorable cases.',license:'Owned research fixture, CC0-1.0',regions:[{id:'eyes',pixels:[[10,7],[13,7]]},{id:'gem',pixels:[[4,13]]},{id:'cloth',rect:[10,11,4,7]}]});}
// Paired identical color-count controls: an isolated red pixel can be eye or accidental corruption.
for(const kind of['intentional-eye','accidental-noise','ramp-control']){
 const w=24,h=24,p=Buffer.alloc(w*h*4),ramp=[[25,28,35],[62,71,86],[107,121,140],[169,181,196],[230,237,243]];
 for(let y=3;y<21;y++)for(let x=4;x<20;x++){const c=ramp[Math.min(4,Math.floor((x-4)/3.2))];p.set([...c,255],(y*w+x)*4);}
 if(kind!=='ramp-control')p.set([245,30,44,255],(9*w+11)*4);
 const b=await sharp(p,{raw:{width:w,height:h,channels:4}}).png().toBuffer(),file=`fixtures/${kind}.png`;await fs.writeFile(path.join(root,file),b);
 manifest.files.push({id:kind,file,kind:'owned-synthetic',width:w,height:h,sha256:sha(b),intent:kind==='intentional-eye'?'The red pixel is a deliberately important indicator.':kind==='accidental-noise'?'Exactly identical pixels to intentional-eye, but red is accidental corruption. A histogram algorithm cannot know this difference.':'Smooth metal ramp without accents: do not spend a budget on rare neutral variation unnecessarily.',license:'Owned research fixture, CC0-1.0',regions:[{id:kind,pixels:[[11,9]]}]});
}
const regions={
 'dungeon-wizard':[{id:'purple-hood',sourceColors:['9b4ca3','d176d0']},{id:'face',sourceColors:['f7c282','bd6c4a']}],
 'dungeon-archer':[{id:'green-headband',sourceColors:['25956a','43e1b3']},{id:'face',sourceColors:['f7c282','e19a65']}],
 'dungeon-knight':[{id:'face',sourceColors:['f7c282','e19a65']},{id:'metal',sourceColors:['8b9bb4','c0cbdc']}],
 'dungeon-potion':[{id:'red-liquid',sourceColors:['ff706d','e84537']},{id:'stopper',sourceColors:['bd6c4a','eaa56c']}],
 'dungeon-neutral-shield':[{id:'metal',sourceColors:['8b9bb4','c0cbdc']}],
 'town-water-bucket':[{id:'water',sourceColors:['76e4ff','009adc']},{id:'bucket',sourceColors:['763b36','bd6c4a','be6c49','eaa56c','eba66c']}],
 'platformer-pilot':[{id:'green-visor',sourceColors:['86f6bb','5ad28c','34995e']},{id:'eyes',sourceColors:['434a5f']}],
 'platformer-pilot-blink':[{id:'green-visor',sourceColors:['86f6bb','5ad28c','34995e']},{id:'eyes',sourceColors:['434a5f']}],
 'platformer-neutral-pilot':[{id:'neutral-face',sourceColors:['747a90','959ab1']}],
 'platformer-rocket':[{id:'red-body',sourceColors:['fc683b','dd442c','7e3125']},{id:'neutral-metal',sourceColors:['dce1e7','959ab1','747a90']}],
 'platformer-heart':[{id:'heart-highlight',sourceColors:['fc683b']}],
 'platformer-axe':[{id:'red-fastening',sourceColors:['fb6338']},{id:'blade',sourceColors:['dce1e7','959ab1']}],
};
for(const f of manifest.files)if(regions[f.id])f.regions=regions[f.id];
manifest.animations=[{id:'owned-knight-walk',frames:['owned-knight-a','owned-knight-b'],delays:[40,160],intent:'Unchanged eyes/tabard/body must not flicker between frames.'},{id:'real-pilot-idle',frames:['platformer-pilot','platformer-pilot-blink'],delays:[60,140],intent:'Creator supplied alternate poses, not generated edits; stable remaining source coordinates must not flicker.'}];
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(manifest.files.map(x=>({id:x.id,colors:x.visibleColors})));console.log('FROZEN',manifest.files.length,sha(Buffer.from(JSON.stringify(manifest))));
