// Independently check the emitted startup graph and Codex browser server log.
// Run after serve.mjs + the documented browser sequence.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {gzipSync} from 'node:zlib';
const root=resolve('.tmp/aseprite-instructions-dist');
const assets=resolve(root,'assets');
const parserName=readdirSync(assets).find(n=>/^palette-ase-.*\.js$/.test(n));
assert(parserName,'Expected separately emitted parser chunk');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>resolve(root,m[1]));
const links=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).filter(s=>/preload|prefetch/.test(s));
assert(!links.some(s=>s.includes(parserName)),'Parser is preloaded in HTML');
const staticRefs=code=>[...code.matchAll(/(?:\bimport\s*(?:[^;()]*?\bfrom\s*)?|\bexport\s*[^;]*?\bfrom\s*)["'`](\.[^"'`]+)["'`]/g)].map(m=>m[1]);
assert.deepEqual(staticRefs('import{a}from"./a.js";export{b}from"./b.js";import"./side.js";export*from"./star.js";import("./lazy.js");'),['./a.js','./b.js','./side.js','./star.js']);
const visited=new Set();
function visit(path){
  if(visited.has(path))return;
  visited.add(path);assert(!path.endsWith(parserName),'Parser is a static startup dependency');
  const code=readFileSync(path,'utf8');
  for(const ref of staticRefs(code))visit(resolve(dirname(path),ref));
}
scripts.forEach(visit);
for(const link of links){const href=link.match(/\bhref="([^"]+)"/)?.[1];if(href?.endsWith('.js'))visit(resolve(root,href));}
const main=scripts.map(p=>readFileSync(p,'utf8')).join('\n');
assert([...main.matchAll(/\bimport\((["'`])([^"'`]+)\1\)/g)].some(m=>m[2]==='./'+parserName),'Expected dynamic parser import');
const requests=JSON.parse(readFileSync(process.argv[2]||'.tmp/aseprite-instructions-qa/codex-network.json','utf8'));
const parserRequests=requests.filter(r=>r.path.endsWith(parserName));
assert.equal(parserRequests.length,1,'Parser should download once in the tested browser module cache');
assert.equal(parserRequests[0].stage,'first-native-import','Parser requested before first native import');
const bytes=readFileSync(resolve(assets,parserName));
const result={parser:parserName,bytes:bytes.length,gzipBytes:gzipSync(bytes).length,htmlPreloads:links,staticStartupModules:[...visited].map(p=>p.slice(root.length+1)),parserRequests,passed:true};
writeFileSync('.tmp/aseprite-instructions-qa/lazy-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
