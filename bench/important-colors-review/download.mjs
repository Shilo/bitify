import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const root = new URL('./raw/', import.meta.url);
await fs.mkdir(root,{recursive:true});
for(const pack of ['tiny-dungeon','tiny-town','pixel-platformer']){
 const page=`https://kenney.nl/assets/${pack}`;
 const html=await(await fetch(page)).text();
 const match=[...html.matchAll(/href=["']([^"']+\.zip)["']/g)].map(x=>x[1])[0];
 if(!match)throw Error('No download '+pack);
 const url=new URL(match,page).href;
 const b=Buffer.from(await(await fetch(url)).arrayBuffer());
 if(b.length>20e6)throw Error('Too big');
 await fs.writeFile(new URL(pack+'.zip',root),b);
 await fs.writeFile(new URL(pack+'.json',root),JSON.stringify({page,url,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length,retrieved:'2026-10-15'},null,2)+'\n');
 console.log(pack,b.length,url);
}
