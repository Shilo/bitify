import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

// Freeze all non-navigation sources once so concurrent contributor edits cannot
// differ between variants. Only these two files change in the A/B comparison.
const root=resolve('.'), scratch=resolve('.tmp/viewer-performance');
if(!scratch.startsWith(resolve('.tmp')+sep))throw Error('Performance snapshots must remain under workspace .tmp');
const before=join(scratch,'before'), after=join(scratch,'after');
const changed=['src/ImageViewer.svelte','src/lib/viewer-navigation.js'];
const current=changed.map(path=>readFileSync(join(root,path)));
mkdirSync(before,{recursive:true});
for(const path of ['src','build','docs/styles.md','package.json','package-lock.json','vite.config.js','index.html','public']){
  cpSync(join(root,path),join(before,path),{recursive:true,filter:file=>!file.endsWith('.mp4')});
}
for(const path of changed)writeFileSync(join(before,path),execFileSync('git',['show',`88c8db4:${path}`],{cwd:root}));
cpSync(before,after,{recursive:true,filter:path=>!path.split(sep).includes('dist')});
for(const [index,path] of changed.entries())writeFileSync(join(after,path),current[index]);
for(const cwd of [before,after])execFileSync(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd,stdio:'inherit'});
console.log('Built frozen before/after snapshots. Run node bench/viewer-performance-server.mjs, then open /qa and /regression.');
