import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {regions,toLab,neighbors} from './regions.mjs';
import {spatialSimplify} from './semantic-spike.mjs';
const require=createRequire(import.meta.url),{PNG}=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const attachmentOnly=process.argv.includes('--original-attachment-only'),requestedCase=c=>c.id==='latest'||c.id.startsWith('original-');
const removedBackground=attachmentOnly&&process.argv.includes('--background-prepared'),attachmentFile=removedBackground?'original-attachment-background-prepared.png':'original-attachment-native.png';
const privateRoot=new URL('../../.tmp/bead-research-private/l0-spike/',import.meta.url);mkdirSync(privateRoot,{recursive:true});
function decode(png){const colors=[],map=new Map(),labels=new Int32Array(png.width*png.height).fill(-1);for(let p=0;p<labels.length;p++){if(png.data[p*4+3]<128)continue;const hex='#'+[0,1,2].map(c=>png.data[p*4+c].toString(16).padStart(2,'0')).join('');if(!map.has(hex)){map.set(hex,colors.length);colors.push(hex);}labels[p]=map.get(hex);}return {width:png.width,height:png.height,labels,colors,rgba:png.data};}
function encode(image,labels){const data=Buffer.from(image.rgba);for(let p=0;p<labels.length;p++)if(labels[p]>=0){const rgb=parseInt(image.colors[labels[p]].slice(1),16);for(let c=0;c<3;c++)data[p*4+c]=rgb>>>(16-c*8)&255;}return {width:image.width,height:image.height,data};}
function measures(image,labels,target){const rs=regions(labels,image.width,image.height,8);return {components8:rs.length,smallPixels8:rs.filter(r=>r.pixels.length<=4).reduce((s,r)=>s+r.pixels.length,0),singletons8:rs.filter(r=>r.pixels.length===1).length,usedColors:new Set(labels.filter(l=>l>=0)).size,targetSmall:rs.filter(r=>r.pixels.length<=4&&target.has(r.label)).reduce((s,r)=>s+r.pixels.length,0)};}
const cases=[{id:'latest',image:decode(PNG.sync.read(readFileSync(new URL('../fixtures/outline-character-latest.png',privateRoot)))),rect:[34,30,65,50],family:'required'}];
const sheet=PNG.sync.read(readFileSync('C:/Users/shilo/AppData/Local/Temp/codex-clipboard-4e4bf177-c75c-48c5-bf63-fd913daf7f23.png'));
for(let q=0;q<4;q++){const data=Buffer.alloc(96*96*4);for(let y=0;y<96;y++)for(let x=0;x<96;x++){const a=((y+Math.floor(q/2)*96)*sheet.width+x+(q%2)*96)*4;sheet.data.copy(data,(y*96+x)*4,a,a+4);}cases.push({id:'pose'+q,image:decode({width:96,height:96,data}),rect:q===0?[27,17,67,53]:[26,25,69,53],family:'related'});}
for(const [k,theme] of [['warm',['#fff0c6','#edbb95','#ff99aa']],['gray',['#ccd7ca','#b7c3b5','#b5c3b7']],['blue',['#adbce0','#95a5d0','#94a5c6']]]){
 const width=24,height=24,colors=['#261820',...theme,'#ffffff'],labels=new Int32Array(width*height).fill(-1);
 for(let y=2;y<22;y++)for(let x=2;x<22;x++)labels[y*width+x]=x===2||y===2||x===21||y===21?0:1;
 const noise=[6*24+6,17*24+17],highlight=[5*24+15],blush=[11*24+7,11*24+8,11*24+15,11*24+16],eyes=[9*24+8,9*24+15,8*24+8,8*24+15];
 for(const p of [...noise,...highlight])labels[p]=2;for(const p of blush)labels[p]=3;for(const p of eyes)labels[p]=p<9*24?4:0;
 const image={width,height,colors,labels,rgba:Buffer.alloc(width*height*4)};for(let p=0;p<labels.length;p++)if(labels[p]>=0){image.rgba[p*4+3]=255;}image.rgba=encode(image,labels).data;
 cases.push({id:'control-'+k,image,rect:[5,7,18,13],family:'authored',noise,highlight,blush,eyes});
}
if(attachmentOnly)cases.splice(0,cases.length,{id:removedBackground?'original-prepared':'original-attachment',image:decode(PNG.sync.read(readFileSync(new URL('../fixtures/'+attachmentFile,privateRoot)))),rect:[34,30,65,50],family:'most recent original attachment; correlated character variant'});
const jobs=[],strengths=[.01,.03];
for(const c of cases)for(const protectedFace of [false,true]){
 const {image}=c,labs=image.colors.map(toLab),keep=new Uint8Array(image.labels.length),locked=new Uint8Array(image.labels.length);
 if(protectedFace){const [x0,y0,x1,y1]=c.rect;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)keep[y*image.width+x]=1;}
 for(let p=0;p<image.labels.length;p++){const label=image.labels[p],x=p%image.width,y=Math.floor(p/image.width);locked[p]=Number(label<0||keep[p]||labs[label]?.[0]<.5||x===0||y===0||x===image.width-1||y===image.height-1||neighbors(p,image.width,image.height,8).some(q=>image.labels[q]<0));}
 const rgb=[];for(let p=0;p<image.labels.length;p++)for(let channel=0;channel<3;channel++)rgb.push(image.rgba[p*4+channel]);
 jobs.push({id:c.id+'-'+(protectedFace?'keep':'auto'),width:image.width,height:image.height,colors:image.colors,labels:Array.from(image.labels),locked:Array.from(locked),rgb});c[protectedFace?'keep':'auto']={keep,locked};
}
writeFileSync(new URL('job.json',privateRoot),JSON.stringify({strengths,cases:jobs}));
const python=homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',run=spawnSync(python,[fileURLToPath(new URL('l0-spike.py',import.meta.url)),fileURLToPath(new URL('job.json',privateRoot)),fileURLToPath(new URL('output.json',privateRoot))],{encoding:'utf8'});
if(run.status!==0)throw new Error(run.stderr);console.log(run.stdout.trim());
const results=JSON.parse(readFileSync(new URL('output.json',privateRoot),'utf8')),rows=[],pipelineRows=[];let checks=0;
for(const c of cases){const {image}=c,labs=image.colors.map(toLab),target=new Set(['#f3be91','#c18b70'].map(hex=>image.colors.indexOf(hex))),before=measures(image,image.labels,target),original=encode(image,image.labels),panels=[original];writeFileSync(new URL(c.id+'-original.png',privateRoot),PNG.sync.write(original));
 for(const strength of strengths)for(const protectedFace of [false,true]){
  const name=c.id+'-'+(protectedFace?'keep':'auto'),labels=Int32Array.from(results.find(r=>r.id===name&&r.strength===strength).labels),constraints=c[protectedFace?'keep':'auto'];let changed=0,targetChanged=0,darkChanged=0,alphaChanged=0,keepChanged=0;
  for(let p=0;p<labels.length;p++){if(labels[p]!==image.labels[p]){changed++;if(target.has(image.labels[p]))targetChanged++;if(labs[image.labels[p]]?.[0]<.5||labs[labels[p]]?.[0]<.5)darkChanged++;if(constraints.keep[p])keepChanged++;}if((labels[p]<0)!==(image.labels[p]<0))alphaChanged++;if(labels[p]<-1||labels[p]>=image.colors.length)throw new Error('Palette violation');checks+=4;}
  if(darkChanged||alphaChanged||keepChanged)throw new Error('Hard constraint violation');
  const png=encode(image,labels),file=c.id+'-'+strength+'-'+(protectedFace?'keep':'auto')+'.png';writeFileSync(new URL(file,privateRoot),PNG.sync.write(png));panels.push(png);
  rows.push({id:c.id,family:c.family,strength,protectGestures:protectedFace?1:0,protectedOccupied:constraints.keep.reduce((s,v,p)=>s+Number(v&&image.labels[p]>=0),0),before,after:measures(image,labels,target),changed,targetChanged:requestedCase(c)?targetChanged:null,targetCount:requestedCase(c)?image.labels.filter(c=>target.has(c)).length:null,darkChanged,alphaChanged,keepChanged,noiseRemoved:c.noise?.filter(p=>labels[p]!==image.labels[p]).length??null,blushChanged:c.blush?.filter(p=>labels[p]!==image.labels[p]).length??null,eyeChanged:c.eyes?.filter(p=>labels[p]!==image.labels[p]).length??null,highlightChanged:c.highlight?.filter(p=>labels[p]!==image.labels[p]).length??null,file});
  // Exploratory fixed pipeline: L0 .03 supplies an initializer; original source
  // color fidelity and source constraints guide the already-tested .008 descent.
  if(strength===.03){const pipeline=spatialSimplify(image,{lambda:.008,keep:constraints.keep,initialLabels:labels}),next=pipeline.labels;
   const outFile=c.id+'-0.03-'+(protectedFace?'keep':'auto')+'-spatial.png',outPng=encode(image,next);writeFileSync(new URL(outFile,privateRoot),PNG.sync.write(outPng));
   let changed=0,targetChanged=0;for(let p=0;p<next.length;p++){if(next[p]!==image.labels[p]){changed++;if(target.has(image.labels[p]))targetChanged++;}if(constraints.locked[p]&&next[p]!==image.labels[p])throw new Error('Pipeline lost hard constraint');checks++;}
   pipelineRows.push({id:c.id,strength,lambda:.008,protectGestures:protectedFace?1:0,changed,targetChanged:requestedCase(c)?targetChanged:null,before,after:measures(image,next,target),noiseRemoved:c.noise?.filter(p=>next[p]!==image.labels[p]).length??null,blushChanged:c.blush?.filter(p=>next[p]!==image.labels[p]).length??null,eyeChanged:c.eyes?.filter(p=>next[p]!==image.labels[p]).length??null,highlightChanged:c.highlight?.filter(p=>next[p]!==image.labels[p]).length??null,file:outFile});
  }
 }
 const scale=4,w=image.width*scale,h=image.height*scale,contact={width:w*panels.length,height:h,data:Buffer.alloc(w*panels.length*h*4)};
 for(let i=0;i<panels.length;i++)for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=(Math.floor(y/scale)*image.width+Math.floor(x/scale))*4,b=(y*contact.width+i*w+x)*4;panels[i].data.copy(contact.data,b,a,a+4);}writeFileSync(new URL(c.id+'-comparison.png',privateRoot),PNG.sync.write(contact));
}
writeFileSync(new URL(removedBackground?'l0-spike-original-prepared-results.json':attachmentOnly?'l0-spike-original-attachment-results.json':'l0-spike-results.json',import.meta.url),JSON.stringify({contract:'Continuous encoded-RGB L0-gradient smoothing with nearest-opaque extension and 8px edge padding, original-palette Oklab remap, hard dark/alpha/boundary/optionalKeep restoration',backgroundPolicy:removedBackground?'Explicit supplied-background annotation removes #dcdcdc/#ebebeb; not automatic detection':'Original source alpha retained',fixedParameters:{strengths,firstBetaMultiplier:2,betaStep:2,betaMaximum:1e5,padding:8},cases:cases.length,checks,rows,pipelineRows},null,2));console.log(JSON.stringify(rows.filter(r=>requestedCase(r)||r.family==='authored'),null,2));
