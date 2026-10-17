import {readFile,writeFile} from 'node:fs/promises';
const pages=['index.html','overview-controls.html','overview-palettes.html','overview-output.html','overview-help.html','overview-fixes.html'];
const checked=new Map();
for(const file of pages){const text=await readFile('bench/palette-change-guide/'+file,'utf8');for(const [,ref]of text.matchAll(/(?:src|href)="([^"]+)"/g)){if(ref.startsWith('#'))continue;const url=new URL(ref,'http://127.0.0.1:5334/'+file).href;if(!checked.has(url)){const response=await fetch(url);checked.set(url,response.status);await response.arrayBuffer();}}}
const failures=[...checked].filter(([,code])=>code!==200);
const receipt={pages:pages.length,uniqueLocalAssets:checked.size,failures};
await writeFile('bench/palette-change-guide/gallery-link-check.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
if(failures.length)process.exitCode=1;
