// Test-only instrumentation. The application sources are never edited.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { hoverCapability } from '../../build/hover-capability.js';
import { candidate } from './candidate-transform.mjs';
const here=import.meta.dirname, root=path.resolve('.tmp/palette-usability-final');
await mkdir(here,{recursive:true});
const receipts=[];
for(const label of ['enabled','disabled','pruned','granular','granular-qa','slots','slots-qa']) {
 const enabled=label!=='disabled';
 const instrumentation={name:'count-only-instrumentation',enforce:'pre',transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/App.svelte')){
   code=candidate(code,label.replace('-qa',''));
   if(label.endsWith('-qa'))return code;
   code=code.replace('const usageKey = $derived.by(() => {','const usageKey = $derived.by(() => { globalThis.__countPerf.keys++;');
   code=code.replace('function previewUsage({ item, key, colors, used, frame, frames }) {','function previewUsage(args) { const began=performance.now(); globalThis.__countPerf.calls++; try { return previewUsageMeasured(args); } finally { globalThis.__countPerf.callbackMs += performance.now()-began; } }\n  function previewUsageMeasured({ item, key, colors, used, frame, frames }) {');
   code=code.replace('const progress = addUsageFrame(previous?.progress, colors, used, frame, frames);','globalThis.__countPerf.aggregateCalls++; const progress = addUsageFrame(previous?.progress, colors, used, frame, frames);');
   code=code.replace(/(colorUsage = new Map\(colorUsage\)\.set|colorUsage\.set)\(item.id, \{ item, key, \.\.\.\(result/,`globalThis.__countPerf.publications++; ${['granular','slots'].includes(label)?'':'globalThis.__countPerf.mapEntriesCopied += colorUsage.size; '}$1(item.id, { item, key, ...(result`);
   code=code.replace(/const key = usageKey, live = items, records = ([^;]+);/,'globalThis.__countPerf.cleanupRuns++; const key = usageKey, live = items, records = $1; globalThis.__countPerf.cleanupEntries += records.size ?? records.length;');
   if(label==='slots')code=code.replace('const key = usageKey, live = items;','globalThis.__countPerf.cleanupRuns++; const key = usageKey, live = items; globalThis.__countPerf.cleanupEntries += untrack(() => colorUsage.size);');
   if(!enabled)code=code.replace('function previewUsageMeasured({ item, key, colors, used, frame, frames }) {','function previewUsageMeasured({ item, key, colors, used, frame, frames }) { return;');
  }
  if(id.replaceAll('\\','/').endsWith('/src/Tile.svelte')){
   if(label.endsWith('-qa'))return code;
   code=code.replace('const produce = async signal => {','const produce = async signal => { globalThis.__countPerf.conversions++;');
  }
  return code;
 }};
 await build({root,configFile:false,base:'./',logLevel:'error',plugins:[instrumentation,svelte()],css:{postcss:{plugins:[hoverCapability()]}},build:{outDir:path.join(here,'dist-'+label),emptyOutDir:true}});
 receipts.push({label,source:root,sourceAppSha256:createHash('sha256').update((await readFile(path.join(root,'src/App.svelte'),'utf8')).replaceAll('\r\n','\n')).digest('hex'),change:label==='disabled'?'previewUsageMeasured returns before metadata aggregation; quantization unchanged':label.startsWith('pruned')?'Pruning reacts only to key/items':label.startsWith('granular')?'Per-item SvelteMap records and untracked stale-record pruning':label.startsWith('slots')?'Per-item SvelteMap with stable null slots for live IDs; only removed IDs deleted':'Unchanged metadata, counters only',instrumented:!label.endsWith('-qa')});
}
await writeFile(path.join(here,'build-receipt.json'),JSON.stringify(receipts,null,2));
