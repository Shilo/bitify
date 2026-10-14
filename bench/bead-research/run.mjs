import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {regions,toLab,regionSizes} from './regions.mjs';
import {mergeNearest} from './method-nearest.mjs';
import {mergeVote} from './method-vote.mjs';
import {generatePaletteAsync} from '../../src/lib/palette-generated.js';
import {captureGeneratedSources} from '../../src/lib/palette-generated-sources.js';
import {selectPaletteSubset} from '../../src/lib/palette-limit.js';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
const require=createRequire(import.meta.url);
let PNG;try{({PNG}=require('pngjs'));}catch{({PNG}=require((process.env.NODE_DEPENDENCY_ROOT??homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/pngjs'));}
const root=new URL('./',import.meta.url),privateRoot=new URL('../../.tmp/bead-research-private/',root);
const fixtureDir=process.env.BEAD_RESEARCH_FIXTURES?pathToFileURL(resolve(process.env.BEAD_RESEARCH_FIXTURES)+sep):new URL('fixtures/',privateRoot),outDir=new URL('outputs/',privateRoot);
mkdirSync(outDir,{recursive:true});
const readJson=path=>JSON.parse(readFileSync(path,'utf8')),put=(name,data)=>writeFileSync(new URL(name,root),typeof data==='string'?data:JSON.stringify(data,null,2));
function decode(png){const colors=[],map=new Map(),labels=new Int32Array(png.width*png.height).fill(-1);for(let p=0;p<labels.length;p++){const at=p*4;if(png.data[at+3]<128)continue;const hex='#'+[0,1,2].map(c=>png.data[at+c].toString(16).padStart(2,'0')).join('');if(!map.has(hex)){map.set(hex,colors.length);colors.push(hex);}labels[p]=map.get(hex);}return {width:png.width,height:png.height,colors,labels,rgba:png.data};}
function encode(image,labels){const data=Buffer.from(image.rgba);for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(image.colors[labels[p]].slice(1),16);data[p*4]=rgb>>>16;data[p*4+1]=rgb>>>8&255;data[p*4+2]=rgb&255;}return PNG.sync.write({width:image.width,height:image.height,data});}
function synthetic(id,kind){const w=24,h=24,colors=['#211b29','#f5d7ad','#e7c594','#e99fab','#ffffff'],labels=new Int32Array(w*h).fill(-1);
 const set=(x,y,l)=>labels[y*w+x]=l;
 for(let y=3;y<=20;y++)for(let x=3;x<=20;x++)set(x,y,x===3||x===20||y===3||y===20?0:1);
 for(const [x,y] of [[8,10],[15,10]]){set(x,y,0);set(x+1,y,0);set(x,y-1,4);}
 for(const x of [6,17]){set(x,13,3);set(x+1,13,3);}for(let x=10;x<=13;x++)set(x,16,0);
 const noise=[6+6*w,17+7*w,8+18*w];for(const p of noise)labels[p]=2;
 const highlight=12+7*w;labels[highlight]=2;
 if(kind==='diagonal')for(let x=5;x<=18;x++)set(x,x,0);
 if(kind==='partial-alpha')set(0,0,1);
 const rgba=Buffer.alloc(w*h*4);for(let p=0;p<labels.length;p++){if(labels[p]<0)continue;const rgb=parseInt(colors[labels[p]].slice(1),16);rgba[p*4]=rgb>>>16;rgba[p*4+1]=rgb>>>8&255;rgba[p*4+2]=rgb&255;rgba[p*4+3]=255;}if(kind==='partial-alpha')rgba[3]=180;
 const protectedPixels=new Uint8Array(w*h);if(kind!=='unprotected-highlight')protectedPixels[highlight]=1;
 return {id,image:{width:w,height:h,colors,labels,rgba},selected:[2],protected:[0,3,4],protectedPixels,unwanted:noise.filter(p=>labels[p]===2),keep:[highlight],annotation:'Constructed explicit noise, blush, eyes, outline and same-color intentional highlight. The unprotected version is a semantic counterexample.'};
}
const fixtureManifest=process.argv.includes('--synthetic-only')?[]:readJson(new URL('fixture-manifest.json',root));
for(const fixture of fixtureManifest)if(!existsSync(new URL(fixture.file,fixtureDir)))throw new Error('Private fixture missing: '+fixture.file+'. Images are not committed. Set BEAD_RESEARCH_FIXTURES to a local input directory, or use --synthetic-only.');
async function makeCase(f,bead24=false){
 const sourcePng=PNG.sync.read(readFileSync(new URL(f.file,fixtureDir)));let image=decode(sourcePng);
 if(bead24){const source={width:sourcePng.width,height:sourcePng.height,data:sourcePng.data},generated=(await generatePaletteAsync(captureGeneratedSources([{original:source}]))).colors;
 const colors=generated.length>24?(await selectPaletteSubset(generated,24,async function*(){yield {data:source.data,weight:1};})).indices.map(i=>generated[i]):generated;
 const mapped=colorize(quantize(source,preparePalette(colors)),preparePalette(colors));image=decode({width:mapped.width,height:mapped.height,data:Buffer.from(mapped.data)});}
 const labs=image.colors.map(toLab),rs=regions(image.labels,image.width,image.height),freq=new Int32Array(image.colors.length),small=new Int32Array(image.colors.length);
 for(const r of rs){freq[r.label]+=r.pixels.length;if(r.pixels.length<=4)small[r.label]+=r.pixels.length;}
 const protectedLabels=new Set();for(let i=0;i<image.colors.length;i++){const c=parseInt(image.colors[i].slice(1),16),r=c>>>16,g=c>>>8&255,b=c&255;if(labs[i][0]<.50||(r>g+20&&b>g+5)||labs[i][0]>.96)protectedLabels.add(i);}
 let selected=f.selectedColors?.map(c=>image.colors.indexOf(c)).filter(i=>i>=0);
 if(!selected){selected=image.colors.map((c,i)=>i).filter(i=>!protectedLabels.has(i)&&freq[i]>=3&&freq[i]<=image.labels.length*.15&&small[i]/freq[i]>.20).sort((a,b)=>small[b]/freq[b]-small[a]/freq[a]||image.colors[a].localeCompare(image.colors[b])).slice(0,2);}
 const protectedPixels=new Uint8Array(image.labels.length);
 if(f.id==='snowie'){for(let y=36;y<=50;y++)for(let x=39;x<=66;x++)protectedPixels[y*image.width+x]=1;for(const color of ['#f7c4ae','#fc9884','#bf6251','#dcdcdc','#ebebeb']){const label=image.colors.indexOf(color);if(label>=0)protectedLabels.add(label);}}
 return {id:f.id+(bead24?'-bead24':''),image,selected,protected:[...protectedLabels],protectedPixels,annotation:f.annotation+(f.id==='snowie'?' Face rectangle, pink accents, light eye accents and dark colors are explicitly protected.':' Dark/pink/light-color protection is heuristic and is not an artist annotation.')+(bead24?' Baseline uses production Auto + Max colors24; preservation compares against that converted chart, not the original source.':''),group:f.group};
}
const cases=[];for(const f of fixtureManifest){cases.push(await makeCase(f));if(f.id!=='snowie')cases.push(await makeCase(f,true));}
cases.push(...['protected-highlight','unprotected-highlight','diagonal','partial-alpha'].map(kind=>synthetic(kind,kind)));
const thresholds=[.005,.02,.04],report=[],gallery=[];let invariantChecks=0;
for(const c of cases){
 const {image}=c,input={width:image.width,height:image.height,labels:image.labels,colors:image.colors};
 const counts=labels=>{const result={};for(const connectivity of [4,8]){const all=regions(labels,image.width,image.height,connectivity),selected=all.filter(r=>c.selected.includes(r.label));result['singletons'+connectivity]=all.filter(r=>r.pixels.length===1).length;result['selectedSmallPixels'+connectivity]=selected.filter(r=>r.pixels.length<=4).reduce((a,r)=>a+r.pixels.length,0);}return result;};
 const baseline=counts(image.labels),outputs={};
 writeFileSync(new URL(c.id+'-original.png',outDir),encode(image,image.labels));
 for(const [method,run] of [['nearest',mergeNearest],['vote',mergeVote]])for(const maxDistanceSquared of thresholds){
  const beforeLabels=input.labels.slice();const start=performance.now(),result=run(input,{selected:new Set(c.selected),protected:new Set(c.protected),protectedPixels:c.protectedPixels,maxDistanceSquared}),ms=performance.now()-start;
  let changed=0,protectedChanged=0,outlineGrowth=0;const oldRegions=regionSizes(image.labels,image.width,image.height),newRegions=regionSizes(result.labels,image.width,image.height);
  for(let p=0;p<result.labels.length;p++){const old=image.labels[p],next=result.labels[p];assert.equal(old<0,next<0);assert(next<image.colors.length);if(old!==next){changed++;assert(c.selected.includes(old));if(c.protectedPixels[p]||c.protected.includes(old))protectedChanged++;if(c.protected.includes(next))outlineGrowth++;}invariantChecks+=3;}
  assert.equal(protectedChanged,0);assert.equal(outlineGrowth,0);assert.deepEqual(input.labels,beforeLabels);
  const reasons={};for(const d of result.decisions)reasons[d.reason]=(reasons[d.reason]||0)+1;
  const unwantedRemoved=c.unwanted?.filter(p=>result.labels[p]!==image.labels[p]&&newRegions[p]>=5).length??null,keepChanged=c.keep?.filter(p=>result.labels[p]!==image.labels[p]).length??null;
  const row={id:c.id,method,maxDistanceSquared,changed,protectedChanged,protectedColorGrowth:outlineGrowth,ms,baseline,after:counts(result.labels),unwantedRemoved,unwantedCount:c.unwanted?.length??null,keepChanged,reasons};report.push(row);
  if(maxDistanceSquared===.02){outputs[method]={labels:Array.from(result.labels),decisions:result.decisions};const bytes=encode(image,result.labels),decoded=PNG.sync.read(bytes);for(let p=0;p<result.labels.length;p++){assert.equal(decoded.data[p*4+3],image.rgba[p*4+3]);if(result.labels[p]===image.labels[p])for(let channel=0;channel<4;channel++)assert.equal(decoded.data[p*4+channel],image.rgba[p*4+channel]);}writeFileSync(new URL(c.id+'-'+method+'.png',outDir),bytes);}
 }
 gallery.push({id:c.id,width:image.width,height:image.height,labels:Array.from(image.labels),colors:image.colors,rgba:Array.from(image.rgba),selected:c.selected,protected:c.protected,protectedPixels:Array.from(c.protectedPixels),annotation:c.annotation,group:c.group,outputs});
}
writeFileSync(new URL('gallery-data.json',privateRoot),JSON.stringify(gallery));put('results.json',{thresholds,thresholdPolicy:'Fixed .005/.02/.04 comparison; .02 is the predeclared display value, not tuned on these images.',cases:cases.length,invariantChecks,rows:report});
console.log(JSON.stringify({cases:cases.length,configurations:report.length,invariantChecks,snowie:report.filter(r=>r.id==='snowie'),controls:report.filter(r=>r.maxDistanceSquared===.02&&r.unwantedCount!==null)},null,2));
