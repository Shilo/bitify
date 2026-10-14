// Research-only automatic experiment. All images and pixel payloads stay ignored.
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mergeAutomatic} from './method-automatic.mjs';
import {regions,toLab} from './regions.mjs';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
import {prepareCleanupAsync,applyCleanup} from '../../src/lib/palette-cleanup.js';
import {generatePaletteAsync} from '../../src/lib/palette-generated.js';
import {captureGeneratedSources} from '../../src/lib/palette-generated-sources.js';
import {selectPaletteSubset} from '../../src/lib/palette-limit.js';
const root=new URL('./',import.meta.url),priv=new URL('../../.tmp/bead-research-private/automatic/',root);mkdirSync(priv,{recursive:true});
const require=createRequire(import.meta.url);let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=require((process.env.NODE_DEPENDENCY_ROOT??homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/pngjs'));}
const json=p=>JSON.parse(readFileSync(p,'utf8')),hash=s=>createHash('sha256').update(s).digest('hex');
function decode(png){const colors=[],map=new Map(),labels=new Int32Array(png.width*png.height).fill(-1);for(let p=0;p<labels.length;p++)if(png.data[p*4+3]>=128){const c='#'+[0,1,2].map(k=>png.data[p*4+k].toString(16).padStart(2,'0')).join('');if(!map.has(c)){map.set(c,colors.length);colors.push(c);}labels[p]=map.get(c);}return {width:png.width,height:png.height,rgba:png.data,labels,colors};}
function rgba(image,labels){const out=Buffer.from(image.rgba);for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(image.colors[labels[p]].slice(1),16);out[p*4]=rgb>>>16;out[p*4+1]=rgb>>>8&255;out[p*4+2]=rgb&255;}return out;}
function save(id,image,labels){writeFileSync(new URL(id+'.png',priv),PNG.sync.write({width:image.width,height:image.height,data:rgba(image,labels)}));}
function metrics(image,labels){const rs=regions(labels,image.width,image.height,8),labs=image.colors.map(toLab),dark=Uint8Array.from(labels,l=>l>=0&&labs[l][0]<.35);let blocks=0;for(let y=0;y<image.height-1;y++)for(let x=0;x<image.width-1;x++){const p=y*image.width+x;if(dark[p]&&dark[p+1]&&dark[p+image.width]&&dark[p+image.width+1])blocks++;}return {smallRegions:rs.filter(r=>r.pixels.length<=4).length,smallPixels:rs.filter(r=>r.pixels.length<=4).reduce((a,r)=>a+r.pixels.length,0),darkPixels:dark.reduce((a,v)=>a+v,0),darkBlocks2x2:blocks,dark};}
function control(id,skin,shade,blush,kind){const w=28,h=28,colors=['#241c2d',skin,shade,blush,'#ffffff'],labels=new Int32Array(w*h).fill(-1),set=(x,y,l)=>labels[y*w+x]=l;
 for(let y=3;y<=24;y++)for(let x=3;x<=24;x++)set(x,y,x===3||x===24||y===3||y===24?0:1);
 const keep=[];for(const x of [8,18]){for(let y=11;y<=12;y++)for(let dx=0;dx<2;dx++){set(x+dx,y,0);keep.push(y*w+x+dx);}set(x,11,4);for(let y=15;y<=16;y++)for(let dx=0;dx<2;dx++){set(x+dx,y,3);keep.push(y*w+x+dx);}}
 for(let x=11;x<=16;x++){set(x,20,0);keep.push(20*w+x);}const highlight=14+7*w;labels[highlight]=2;keep.push(highlight);
 let noise=[6+6*w,21+8*w,6+21*w];for(const p of noise)labels[p]=2;
 if(kind==='diagonal')for(let d=4;d<=23;d++){set(d,d,0);keep.push(d*w+d);}noise=noise.filter(p=>labels[p]===2);
 if(kind==='dither'){noise=[];for(let y=5;y<=22;y++)for(let x=5;x<=22;x++)if((x+y)%2===0){set(x,y,2);keep.push(y*w+x);}}
 const buffer=Buffer.alloc(w*h*4);for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(colors[labels[p]].slice(1),16);buffer[p*4]=rgb>>>16;buffer[p*4+1]=rgb>>>8&255;buffer[p*4+2]=rgb&255;buffer[p*4+3]=255;}
 return {id,kind:'control',group:kind,image:{width:w,height:h,colors,labels,rgba:buffer},keep:[...new Set(keep)],noise};
}
const prior=json(new URL('fixture-manifest.json',root)),priorIds=new Set(prior.map(f=>f.id));
const corpus=json(process.env.BEAD_CORPUS_MANIFEST??new URL('../../.tmp/cleanup-qa/corpus/manifest.json',root));
const heldout=corpus.items.filter(i=>i.id.startsWith('s')&&!priorIds.has(i.id)&&i.width<=128&&i.height<=128&&i.path.endsWith('.png'))
 .map(i=>({...i,order:hash('automatic-patches-20261013/'+i.id)})).sort((a,b)=>a.order.localeCompare(b.order)).slice(0,24);
assert.equal(heldout.length,24,'Need 24 fresh held-out sprites');
const cases=[];for(const f of prior){const file=new URL('../fixtures/'+f.file,priv);cases.push({id:f.id,group:f.group,kind:'prior',image:decode(PNG.sync.read(readFileSync(file)))});}
for(const f of heldout){const file=new URL(f.id+'.png',priv);if(!existsSync(file))copyFileSync(f.path,file);cases.push({id:f.id,group:f.group,kind:'heldout',sourceHash:hash(readFileSync(file)),image:decode(PNG.sync.read(readFileSync(file)))});}
const themes=[['peach','#f5d7ad','#e7c594','#e99fab'],['gray','#b9bec8','#b0b5c0','#c8b4bc'],['blue','#a7cfdf','#9bc4d5','#ccb6cf'],['olive','#cbd7ac','#bdc99f','#d2b5a9']];
for(const [name,skin,shade,blush] of themes)for(const kind of ['face','diagonal','dither'])cases.push(control(name+'-'+kind,skin,shade,blush,kind));
function palettesource(image){return {width:image.width,height:image.height,data:image.rgba};}
async function chart(source,generated,cap){const colors=generated.length>cap?(await selectPaletteSubset(generated,cap,async function*(){yield {data:source.data,weight:1};})).indices.map(i=>generated[i]):generated;const pp=preparePalette(colors),q=quantize(source,pp),paint=colorize(q,pp);return decode({width:source.width,height:source.height,data:Buffer.from(paint.data)});}
const rows=[],gallery=[],timings=[];let pixelChecks=0;
for(const c of cases){const variants=[];const source=palettesource(c.image),generated=(await generatePaletteAsync(captureGeneratedSources([{original:source}]))).colors;
 variants.push(c.image.colors.length<=256?['raw',c.image]:['auto64',await chart(source,generated,64)]);
 if(c.kind!=='control')variants.push(['bead24',await chart(source,generated,24)]);
 for(const [variant,image] of variants){const id=c.id+'-'+variant,base=metrics(image,image.labels),comparisons={original:image.labels};
 const prepared=preparePalette(image.colors),q=quantize(source,prepared),cleanup=applyCleanup(q,await prepareCleanupAsync([source],image.colors)),paint=colorize(cleanup,prepared),cleanDecoded=decode({width:image.width,height:image.height,data:Buffer.from(paint.data)});
 const colorMap=new Map(image.colors.map((co,i)=>[co,i]));comparisons.cleanup=Int32Array.from(cleanDecoded.labels,l=>l<0?-1:colorMap.get(cleanDecoded.colors[l]));
 for(const preset of ['strict','balanced']){const start=performance.now(),result=mergeAutomatic(image,{preset});timings.push(performance.now()-start);const after=metrics(image,result.labels);let changed=0,darkAdded=0,darkRemoved=0,faceRegionChanged=0,requestedShadeRecolored=0,requestedSmallRemaining=0;
 const afterSizes=new Int32Array(result.labels.length);for(const region of regions(result.labels,image.width,image.height,8))for(const p of region.pixels)afterSizes[p]=region.pixels.length;
 for(let p=0;p<image.labels.length;p++){assert.equal(image.labels[p]<0,result.labels[p]<0);assert(result.labels[p]>=-1&&result.labels[p]<image.colors.length);changed+=image.labels[p]!==result.labels[p];darkAdded+=!base.dark[p]&&after.dark[p];darkRemoved+=base.dark[p]&&!after.dark[p];if(c.id==='snowie'&&p%image.width>=39&&p%image.width<=66&&Math.floor(p/image.width)>=36&&Math.floor(p/image.width)<=50&&image.labels[p]!==result.labels[p])faceRegionChanged++;if(c.id==='snowie'&&['#f3be91','#c18b70'].includes(c.image.colors[c.image.labels[p]])){requestedShadeRecolored+=image.labels[p]!==result.labels[p];requestedSmallRemaining+=afterSizes[p]<=4;}pixelChecks+=2;}
 const keepChanged=c.keep?.filter(p=>image.labels[p]!==result.labels[p]).length??null,noiseRemoved=c.noise?.filter(p=>image.labels[p]!==result.labels[p]).length??null;
 const reasons={};for(const d of result.decisions)reasons[d.reason]=(reasons[d.reason]||0)+1;
 rows.push({id:c.id,kind:c.kind,variant,preset,width:image.width,height:image.height,colors:image.colors.length,changed,baselineSmallPixels:base.smallPixels,afterSmallPixels:after.smallPixels,baselineSmallRegions:base.smallRegions,afterSmallRegions:after.smallRegions,darkAdded,darkRemoved,baselineDarkBlocks:base.darkBlocks2x2,afterDarkBlocks:after.darkBlocks2x2,faceRegionChanged,requestedShadeRecolored:c.id==='snowie'?requestedShadeRecolored:null,requestedSmallRemaining:c.id==='snowie'?requestedSmallRemaining:null,keepChanged,keepCount:c.keep?.length??null,noiseRemoved,noiseCount:c.noise?.length??null,reasons});comparisons[preset]=result.labels;
 }
 const label='current';save(id+'-'+label,image,comparisons.cleanup);for(const name of ['original','strict','balanced'])save(id+'-'+name,image,comparisons[name]);
 const card={id,sourceId:c.id,kind:c.kind,group:c.group,variant,width:image.width,height:image.height,methods:['original','cleanup','strict','balanced'].map(name=>({name,file:id+'-'+(name==='cleanup'?'current':name)+'.png'}))};
 if(variant==='bead24'){for(const cap of [16,8]){const reduced=await chart(source,generated,cap);save(id+'-cap'+cap,reduced,reduced.labels);card.methods.push({name:'cap'+cap,file:id+'-cap'+cap+'.png'});}}
 gallery.push(card);
 }
}
const record={date:'2026-10-13',automatic:true,selectionMasks:false,handSelectedColors:false,sprites:cases.filter(c=>c.kind!=='control').length,newHeldouts:24,proceduralControls:12,variants:gallery.length,configurations:rows.length,pixelChecks,methodPolicy:'Prespecified strict .005 and balanced .02; all generic vetoes fixed before corpus evaluation. No tuning after held-out results.',heldoutManifest:heldout.map(({id,group,width,height})=>({id,group,width,height})),rows,timing:{medianMs:timings.sort((a,b)=>a-b)[Math.floor(timings.length/2)],maxMs:Math.max(...timings)}};
writeFileSync(new URL('automatic-results.json',root),JSON.stringify(record,null,2));writeFileSync(new URL('automatic-gallery.json',priv),JSON.stringify(gallery));
console.log(JSON.stringify({sprites:record.sprites,newHeldouts:24,variants:record.variants,configurations:record.configurations,pixelChecks,timing:record.timing,snowie:rows.filter(r=>r.id==='snowie'),controls:rows.filter(r=>r.kind==='control'),heldoutSummary:['strict','balanced'].map(preset=>{const rs=rows.filter(r=>r.kind==='heldout'&&r.variant==='bead24'&&r.preset===preset);return {preset,edited:rs.filter(r=>r.changed>0).length,medianChanged:rs.map(r=>r.changed).sort((a,b)=>a-b)[12],darkChanged:rs.filter(r=>r.darkAdded||r.darkRemoved).length};})},null,2));
