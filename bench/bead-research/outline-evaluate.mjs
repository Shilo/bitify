import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {outlineTransform,outlineMetrics,OUTLINE_METHODS} from './method-outline.mjs';import {outlineControls} from './outline-controls.mjs';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
import {prepareCleanupAsync,applyCleanup} from '../../src/lib/palette-cleanup.js';
import {generatePaletteAsync} from '../../src/lib/palette-generated.js';import {captureGeneratedSources} from '../../src/lib/palette-generated-sources.js';
import {selectPaletteSubset} from '../../src/lib/palette-limit.js';import {decodeGif} from '../../src/lib/gif.js';
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=require((process.env.NODE_DEPENDENCY_ROOT??homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/pngjs'));}
const root=new URL('./',import.meta.url),priv=new URL('../../.tmp/bead-research-private/outline/',root);mkdirSync(priv,{recursive:true});
const json=p=>JSON.parse(readFileSync(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
export function decode(png){const colors=[],map=new Map(),labels=new Int32Array(png.width*png.height).fill(-1);for(let p=0;p<labels.length;p++)if(png.data[p*4+3]>=128){const c='#'+[0,1,2].map(k=>png.data[p*4+k].toString(16).padStart(2,'0')).join('');if(!map.has(c)){map.set(c,colors.length);colors.push(c);}labels[p]=map.get(c);}return {width:png.width,height:png.height,labels,colors};}
function paint(image,labels=image.labels){const out=Buffer.alloc(labels.length*4);for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(image.colors[labels[p]].slice(1),16);out[p*4]=rgb>>>16;out[p*4+1]=rgb>>>8&255;out[p*4+2]=rgb&255;out[p*4+3]=255;}return out;}
let witnessPixels=0;
function save(id,image,labels=image.labels){const expected=paint(image,labels),bytes=PNG.sync.write({width:image.width,height:image.height,data:expected}),witness=PNG.sync.read(bytes);assert.deepEqual(witness.data,expected);witnessPixels+=labels.length;writeFileSync(new URL(id+'.png',priv),bytes);}
async function chart(source,generated,cap){const colors=generated.length>cap?(await selectPaletteSubset(generated,cap,async function*(){yield {data:source.data,weight:1};})).indices.map(i=>generated[i]):generated,pp=preparePalette(colors);return decode(colorize(quantize(source,pp),pp));}
function changedRgba(a,b){const x=paint(a),y=paint(b);let count=0;for(let p=0;p<a.labels.length;p++)if([0,1,2,3].some(k=>x[p*4+k]!==y[p*4+k]))count++;return count;}
function remap(clean,image){const indexes=new Map(image.colors.map((c,i)=>[c,i]));return Int32Array.from(clean.labels,l=>l<0?-1:indexes.get(clean.colors[l]));}
function resolveSource(p){if(existsSync(p))return p;const renamed=p.replace(/[/\\]bitify[/\\]/g,'/colorfetti/');assert(existsSync(renamed),'Missing private input '+p);return renamed;}
const prior=json(new URL('fixture-manifest.json',root)),old=json(new URL('automatic-results.json',root)),excluded=new Set([...prior.map(f=>f.id),...old.heldoutManifest.map(f=>f.id)]),corpus=json(process.env.BEAD_CORPUS_MANIFEST??new URL('../../.tmp/cleanup-qa/corpus/manifest.json',root));
const heldout=corpus.items.filter(f=>f.id.startsWith('s')&&!excluded.has(f.id)&&f.width<=128&&f.height<=128&&f.path.endsWith('.png')).map(f=>({...f,order:hash('outline-20261014/'+f.id)})).sort((a,b)=>a.order.localeCompare(b.order)).slice(0,24);assert.equal(heldout.length,24);
const cases=[],provenance=[];
for(const f of [{id:'latest',file:'outline-character-latest.png',group:'Latest required character'},...prior.filter(f=>f.id!=='snowie')]){
  const file=new URL('../fixtures/'+f.file,priv),bytes=readFileSync(file),png=PNG.sync.read(bytes);if(f.id==='latest')assert.equal(hash(bytes),'638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233');
  cases.push({...f,kind:'exploration',image:decode(png),source:{width:png.width,height:png.height,data:png.data}});provenance.push({id:f.id,group:f.group,hash:hash(bytes),width:png.width,height:png.height});
}
for(const f of heldout){const bytes=readFileSync(resolveSource(f.path)),png=PNG.sync.read(bytes);cases.push({...f,kind:'heldout',image:decode(png),source:{width:png.width,height:png.height,data:png.data}});provenance.push({id:f.id,group:f.group,hash:hash(bytes),width:png.width,height:png.height});}
for(const c of outlineControls())cases.push({...c,source:{width:c.image.width,height:c.image.height,data:paint(c.image)}});
const rows=[],gallery=[],timings=[];let invariants=0;
for(const c of cases){const generated=(await generatePaletteAsync(captureGeneratedSources([{original:c.source}]))).colors,variants=[[c.image.colors.length<=256?'raw':'auto64',c.image.colors.length<=256?c.image:await chart(c.source,generated,64)]];
  if(c.kind!=='control')variants.push(['bead24',await chart(c.source,generated,24)]);
  for(const [variant,image] of variants){const id=c.id+'-'+variant,methods=[],record=(name,img,labels=img.labels)=>{save(id+'-'+name,img,labels);methods.push({name,file:id+'-'+name+'.png'});};record('original',image);
    const prepared=preparePalette(image.colors),q=quantize(c.source,prepared),clean=decode(colorize(applyCleanup(q,await prepareCleanupAsync([c.source],image.colors)),prepared)),cleanLabels=remap(clean,image);
    record('cleanup',image,cleanLabels);rows.push({id:c.id,kind:c.kind,variant,method:'cleanup',...outlineMetrics(image,cleanLabels)});
    const capped=await chart(c.source,generated,16);record('cap16',capped);rows.push({id:c.id,kind:c.kind,variant,method:'cap16',...outlineMetrics(capped),changed:changedRgba(image,capped)});
    for(const method of ['colorUnion',...OUTLINE_METHODS]){const start=performance.now(),result=outlineTransform(image,method);timings.push(performance.now()-start);
      for(let p=0;p<image.labels.length;p++){assert(result.labels[p]>=-1&&result.labels[p]<image.colors.length);if(method!=='regularized')assert.equal(image.labels[p]<0,result.labels[p]<0);invariants++;}
      const metrics=outlineMetrics(image,result.labels);if(method==='regularized'){const base=outlineMetrics(image);assert.equal(base.alpha.components8,metrics.alpha.components8);assert.equal(base.alpha.holes4,metrics.alpha.holes4);}
      rows.push({id:c.id,kind:c.kind,variant,method,abstained:result.abstained,...metrics,keepChanged:c.keep?.filter(p=>image.labels[p]!==result.labels[p]).length??null,keepCount:c.keep?.length??null,repairMatched:c.repair?.filter(({p,label})=>result.labels[p]===label).length??null,repairCount:c.repair?.length??null});record(method,image,result.labels);
    }
    gallery.push({id,sourceId:c.id,kind:c.kind,group:c.group,width:image.width,height:image.height,variant,methods});
  }
}
// Temporal experiment: no production animation policy is changed.
function agreement(frames,method){const proposals=frames.map(f=>outlineTransform(f,method).labels),changes=proposals.map((labels,i)=>Array.from(labels,(l,p)=>l!==frames[i].labels[p]?p:-1).filter(p=>p>=0)),kept=changes[0].filter(p=>frames.every((f,i)=>f.labels[p]===frames[0].labels[p]&&proposals[i][p]===proposals[0][p]));
  return {method,frames:frames.length,frameChanges:changes.map(c=>c.length),firstFrameChanges:changes[0].length,wholeClipRetained:kept.length,firstFrameEditsRejected:changes[0].length-kept.length};}
const temporal=[];
const base=outlineControls().find(c=>c.id==='double-inside').image,moving=[0,1,2].map(dx=>({...base,labels:Int32Array.from(base.labels,(_,p)=>p%base.width>=dx?base.labels[p-dx]:-1)}));
for(const method of OUTLINE_METHODS)temporal.push({id:'authored-translated',...agreement(moving,method)});
const gif=corpus.items.find(f=>f.id==='a003');if(gif){const file=resolveSource(gif.path),bytes=readFileSync(file),clip=decodeGif(new Uint8Array(bytes));
  const frames=clip.frames.map(f=>decode({width:clip.width,height:clip.height,data:f.data})),colors=[...new Set(frames.flatMap(f=>f.colors))],map=new Map(colors.map((c,i)=>[c,i]));
  for(const f of frames){f.labels=Int32Array.from(f.labels,l=>l<0?-1:map.get(f.colors[l]));f.colors=colors;}
  for(const method of OUTLINE_METHODS)temporal.push({id:gif.id,hash:hash(bytes),delays:clip.frames.map(f=>f.delay),...agreement(frames,method)});
}
const algorithmHashes=Object.fromEntries(['method-outline.mjs','outline-probe.mjs','outline-controls.mjs','outline-evaluate.mjs'].map(f=>[f,hash(readFileSync(new URL(f,root)))]));
const result={date:'2026-10-14',sourceRevision:'ba17ae9',protocol:'OUTLINE-PLAN.md',protocolHash:hash(readFileSync(new URL('OUTLINE-PLAN.md',root))),algorithmHashes,sprites:cases.filter(c=>c.kind!=='control').length,heldouts:heldout.length,controls:cases.filter(c=>c.kind==='control').length,variants:gallery.length,configurations:rows.length,invariants,witnessPixels,provenance,heldoutManifest:heldout.map(({id,group,width,height})=>({id,group,width,height})),rows,temporal,timing:{medianMs:timings.sort((a,b)=>a-b)[Math.floor(timings.length/2)],maxMs:Math.max(...timings)}};
writeFileSync(new URL('outline-native-results.json',root),JSON.stringify(result,null,2));writeFileSync(new URL('gallery.json',priv),JSON.stringify(gallery));
console.log(JSON.stringify({sprites:result.sprites,heldouts:24,controls:15,variants:result.variants,invariants,witnessPixels,timing:result.timing,latest:rows.filter(r=>r.id==='latest'&&r.variant==='raw').map(({method,changed,added,removed,inside,line})=>({method,changed,added,removed,inside,line})),temporal},null,2));
