// Research reproduction: existing palette removal vs selected-small and Solid.
// Reads private artwork; retains only aggregate JSON. No image data is written.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';import {homedir} from 'node:os';
import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {regions,toLab,neighbors} from './regions.mjs';
import {exteriorCells,solidBoundary} from './solid-boundary.mjs';
import {simplifySelectedShades} from './guided-shade-spike.mjs';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
import {palettePngBytes} from '../../src/lib/save.js';
const require=createRequire(import.meta.url),{PNG}=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const bytes=readFileSync(process.argv[2]??new URL('../../.tmp/bead-research-private/native-original/original.png',import.meta.url)),hash=createHash('sha256').update(bytes).digest('hex');
assert.equal(hash,'638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233');
const png=PNG.sync.read(bytes),source={width:96,height:96,data:png.data},colors=[],map=new Map(),labels=new Int32Array(9216).fill(-1);
assert.equal(png.width,96);assert.equal(png.height,96);
for(let p=0;p<labels.length;p++)if(png.data[p*4+3]>=128){const c='#'+png.data.subarray(p*4,p*4+3).toString('hex');if(!map.has(c)){map.set(c,colors.length);colors.push(c);}labels[p]=map.get(c);}
assert.equal(colors.length,24);
const image={width:96,height:96,colors,labels},border=exteriorCells(image),labs=colors.map(toLab),face=new Uint8Array(9216);
for(let y=30;y<=50;y++)for(let x=34;x<=65;x++)face[y*96+x]=1;
const accentIds=new Set(['#f7c4ae','#fc9884','#bf6251'].map(c=>map.get(c))),darkA=map.get('#200402'),darkB=map.get('#250603');
function metrics(out){let edits=0,faceEdits=0,alphaChanges=0,darkMembershipChanges=0,accentOriginalCellsRecolored=0,newAccentCells=0,newAccentCellsInFace=0,seamsBetweenTwoDarks=0;
 for(let p=0;p<out.length;p++){
  if((labels[p]<0)!==(out[p]<0))alphaChanges++;
  if(out[p]!==labels[p]){edits++;if(face[p])faceEdits++;if(accentIds.has(labels[p]))accentOriginalCellsRecolored++;}
  if(!accentIds.has(labels[p])&&accentIds.has(out[p])){newAccentCells++;if(face[p])newAccentCellsInFace++;}
  if(labels[p]>=0&&((labs[labels[p]][0]<.5)!==(labs[out[p]][0]<.5)))darkMembershipChanges++;
  for(const q of neighbors(p,96,96,4))if(q>p&&((out[p]===darkA&&out[q]===darkB)||(out[p]===darkB&&out[q]===darkA)))seamsBetweenTwoDarks++;
 }
 assert.equal(alphaChanges,0);
 return {edits,faceEdits,alphaChanges,darkMembershipChanges,accentOriginalCellsRecolored,newAccentCells,newAccentCellsInFace,seamsBetweenTwoDarks,smallCells:regions(out,96,96,8).filter(r=>r.pixels.length<=4).reduce((s,r)=>s+r.pixels.length,0),exteriorColors:new Set(Array.from(out).filter((c,p)=>border[p])).size,usedColors:new Set(out.filter(c=>c>=0)).size};
}
const guided=simplifySelectedShades(image,{selected:new Set(['#f3be91','#c18b70'].map(c=>map.get(c)))});
const rows=[{variant:'original',...metrics(labels)},{variant:'selected-small',...metrics(guided.labels)},{variant:'C',...metrics(solidBoundary({...image,labels:guided.labels},darkA))}];
for(const [variant,removedPaletteColors]of [['A',['#250603']],['B',['#250603','#f3be91','#c18b70']],['remove-two-only',['#f3be91','#c18b70']]]){
 const paletteColors=colors.filter(c=>!removedPaletteColors.includes(c)),palette=preparePalette(paletteColors),q=quantize(source,palette),data=colorize(q,palette),out=Int32Array.from(q.indices,i=>i===256?-1:map.get(paletteColors[i]));
 const decoded=PNG.sync.read(Buffer.from(palettePngBytes({...q,colors:paletteColors})));
 for(let p=0;p<labels.length;p++){assert.equal(decoded.data[p*4+3],data.data[p*4+3]);if(decoded.data[p*4+3])assert.deepEqual(decoded.data.subarray(p*4,p*4+3),Buffer.from(data.data.subarray(p*4,p*4+3)));}
 const row={variant,removedPaletteColors,...metrics(out)};assert.equal(row.darkMembershipChanges,0);assert.equal(row.newAccentCells,0);assert.equal(row.accentOriginalCellsRecolored,0);rows.push(row);
}
const report={sourceSha256:hash,preprocessing:'None; exact native PNG',width:96,height:96,sourceColors:24,protectionByClass:{dark:labs.filter(c=>c[0]<.5).length,nearWhite:labs.filter(c=>c[0]>.96).length,pink:colors.filter(c=>{const n=parseInt(c.slice(1),16),r=n>>>16,g=n>>>8&255,b=n&255;return r>g+20&&b>g+5;}).length},metricScope:'Small cells: 8-connected same-color components <=4. Seams: cardinal #200402/#250603 pairs. Accent labels are RGB proxies, not semantic blush.',rows};
writeFileSync(new URL('./native-palette-baseline-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
