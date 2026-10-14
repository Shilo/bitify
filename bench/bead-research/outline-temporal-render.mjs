// Visual inspection of individual GIF frames; not a flicker or production GIF test.
import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {homedir} from 'node:os';import {fileURLToPath} from 'node:url';
import {decodeGif} from '../../src/lib/gif.js';import {outlineTransform,OUTLINE_METHODS} from './method-outline.mjs';
const require=createRequire(import.meta.url),modules=process.env.NODE_DEPENDENCY_ROOT??homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';let sharp;try{sharp=require('sharp');}catch{sharp=require(modules+'/sharp');}
const corpus=JSON.parse(readFileSync(process.env.BEAD_CORPUS_MANIFEST??new URL('../../.tmp/cleanup-qa/corpus/manifest.json',import.meta.url))),input=corpus.items.find(c=>c.id==='a003'),clip=decodeGif(new Uint8Array(readFileSync(input.path))),colors=[],map=new Map();
const frames=clip.frames.map(f=>{const labels=new Int32Array(clip.width*clip.height).fill(-1);for(let p=0;p<labels.length;p++)if(f.data[p*4+3]>=128){const c='#'+[0,1,2].map(k=>f.data[p*4+k].toString(16).padStart(2,'0')).join('');if(!map.has(c)){map.set(c,colors.length);colors.push(c);}labels[p]=map.get(c);}return {width:clip.width,height:clip.height,colors,labels};});
const root=new URL('../../.tmp/bead-research-private/outline/',import.meta.url),methods=['original',...OUTLINE_METHODS],cw=280,ch=290,overlays=[];
for(const [row,index] of [0,Math.floor(frames.length/2),frames.length-1].entries())for(const [col,method] of methods.entries()){
 const image=frames[index],labels=method==='original'?image.labels:outlineTransform(image,method).labels,data=Buffer.alloc(labels.length*4);
 for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(colors[labels[p]].slice(1),16);data[p*4]=rgb>>>16;data[p*4+1]=rgb>>>8&255;data[p*4+2]=rgb&255;data[p*4+3]=255;}
 const png=await sharp(data,{raw:{width:image.width,height:image.height,channels:4}}).png().toBuffer();await sharp(png).toFile(fileURLToPath(new URL('a003-frame'+index+'-'+method+'.png',root)));
 overlays.push({input:Buffer.from(`<svg width="280" height="24"><text x="4" y="17" font-family="Arial" font-size="12">a003 frame ${index} · ${method}</text></svg>`),left:col*cw,top:row*ch},{input:await sharp(png).flatten({background:'#e3dfd7'}).png().toBuffer(),left:col*cw+12,top:row*ch+26});
}
await sharp({create:{width:cw*methods.length,height:ch*3,channels:4,background:'#f5f2ed'}}).composite(overlays).png().toFile(fileURLToPath(new URL('temporal-a003.png',root)));
console.log('Private first/middle/last animation-frame panels rendered.');
