// Retained CC0 artwork, assembled without changing source colors.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sharp,sha,decode} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const out=import.meta.dirname;
await mkdir(path.join(out,'fixtures'),{recursive:true});
const upstream=JSON.parse(await readFile(path.join(out,'../important-colors-review/manifest.json'),'utf8'));
const ids=['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion','town-water-bucket','platformer-pilot','platformer-rocket','platformer-heart'];
const sources=[];
for(const id of ids){const f=upstream.files.find(f=>f.id===id);assert.equal(f.source.license,'CC0-1.0');const bytes=await readFile(path.join(out,'../important-colors-review',f.file));assert.equal(sha(bytes),f.sha256);await writeFile(path.join(out,'fixtures',id+'.png'),bytes);sources.push({...f,file:'fixtures/'+id+'.png'});}
const records=sources.map(f=>({id:f.id,file:f.file,kind:'retained CC0 sprite',sha256:f.sha256,width:f.width,height:f.height,frames:1,source:f.source}));
for(const side of[1024,2048]){
 const layers=[];for(let y=0;y<side;y+=64)for(let x=0;x<side;x+=64){const s=sources[((x/64)*3+y/64)%sources.length],b=await sharp(path.join(out,s.file)).resize(48,48,{kernel:'nearest',fit:'contain',background:'#00000000'}).png().toBuffer();layers.push({input:b,left:x+8,top:y+8});}
 const bytes=await sharp({create:{width:side,height:side,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();const file=`fixtures/kenney-sheet-${side}.png`;await writeFile(path.join(out,file),bytes);records.push({id:`kenney-sheet-${side}`,file,kind:'assembled CC0 sprite sheet',width:side,height:side,frames:1,sha256:sha(bytes),construction:'64px cells, 48px nearest-neighbor sprites, 8px transparent gutters; source colors unchanged',sourceIds:ids});
}
for(const[side,count]of[[128,32],[256,48]]){
 const frames=[];for(let f=0;f<count;f++){const s=sources[f%4],sprite=await sharp(path.join(out,s.file)).resize(32,32,{kernel:'nearest'}).png().toBuffer();const left=8+Math.round((side-48)*f/(count-1)),top=Math.round(side/2-16+Math.sin(f/4)*side/5);frames.push(await sharp({create:{width:side,height:side,channels:4,background:'#00000000'}}).composite([{input:sprite,left,top}]).raw().toBuffer());}
 const delay=Array.from({length:count},(_,i)=>[60,80,100,120][i%4]);
 const bytes=await sharp(Buffer.concat(frames),{raw:{width:side,height:side*count,channels:4,pageHeight:side}}).gif({delay,loop:0,effort:1,dither:0,keepDuplicateFrames:true}).toBuffer();const file=`fixtures/kenney-motion-${side}.gif`;await writeFile(path.join(out,file),bytes);const decoded=await decode(bytes);assert.equal(decoded.frames.length,count);assert.deepEqual(decoded.delay,delay);records.push({id:`kenney-motion-${side}`,file,kind:'owned motion assembly of CC0 sprites; not a hand-authored walk cycle',width:side,height:side,frames:count,delay,loop:0,sha256:sha(bytes),sourceIds:ids.slice(0,4)});
}
const realManifest=JSON.parse(await readFile(path.join(out,'../keep-real-art-study/cohort/manifest.json'),'utf8'));
const magic=realManifest.filter(x=>x.animation?.group==='anim-rubberduck-magic');
const magicFrames=[];
for(const f of magic){const bytes=await readFile(path.join(out,'../keep-real-art-study/cohort',f.file));assert.equal(sha(bytes),f.sha256);const data=await sharp(bytes).ensureAlpha().raw().toBuffer();for(let i=3;i<data.length;i+=4)data[i]=data[i]>=128?255:0;magicFrames.push(data);}
const magicBytes=await sharp(Buffer.concat(magicFrames),{raw:{width:32,height:32*magicFrames.length,channels:4,pageHeight:32}}).gif({delay:Array(6).fill(100),loop:0,dither:0,effort:1,keepDuplicateFrames:true}).toBuffer();
await writeFile(path.join(out,'fixtures','real-magic.gif'),magicBytes);
records.push({id:'real-magic',file:'fixtures/real-magic.gif',kind:'genuine artist-authored six-frame sequence assembled as GIF',width:32,height:32,frames:6,delay:Array(6).fill(100),loop:0,sha256:sha(magicBytes),source:magic,construction:'Retained frames 03–08; alpha cut128 for GIF, author gave no timing so100ms test timing. GIF palette generation is a fixture transform; correctness compares decoded GIF.'});
await writeFile(path.join(out,'manifest.json'),JSON.stringify({frozen:'2026-10-16 before results',scope:'realistic small batch; sparse low-color large sprite sheets; bounded motion GIFs; no random-photo noise',licenses:'All artwork CC0-1.0 Kenney/rubberduck; original URLs, hashes and credits retained. Assemblies inherit CC0 source reuse permission.',records},null,2)+'\n');
console.log(records.map(r=>`${r.id} ${r.width}x${r.height} ${r.frames}f`).join('\n'));
