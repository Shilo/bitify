// Offline comparison only; no network or account interaction.
import fs from 'node:fs';
import path from 'node:path';
import {decode,metrics} from './api-common.mjs';
import {extractPalette} from '../../src/lib/palette-import.js';
import {fullPaletteImage} from '../../src/lib/palette-state.js';
import {colorize} from '../../src/lib/quantize.js';
const dir=import.meta.dirname,source=decode(fs.readFileSync(path.join(dir,'api-workbench-input.png')));
const colors=(await extractPalette(source)).colors;
const own=await fullPaletteImage({name:'workbench-fixture.png',original:source},{colors,name:'Exact source RGB',alphaCut:128,metric:'oklab',cleanup:true,maxColors:0,dither:'none'});
const local=colorize(own,colors),cases=[];
for(const file of ['api-workbench-followup-1-1.png','api-workbench-followup-more-2-1.png']){
 const im=decode(fs.readFileSync(path.join(dir,file))),changes=[];let commonOpaqueRgbDifferences=0,visibleRgbDifferences=0,rawRgbaChanges=0;
 for(let i=0;i<source.width*source.height;i++){
  const p=i*4,s=source.data.subarray(p,p+4),out=im.data.subarray(p,p+4);
  if(s.some((v,c)=>v!==out[c]))rawRgbaChanges++;
  if(s[3]&&out[3]&&s.subarray(0,3).some((v,c)=>v!==out[c]))visibleRgbDifferences++;
  if(s[3]===255&&out[3]===255&&local.data[p+3]===255&&out.subarray(0,3).some((v,c)=>v!==local.data[p+c]))commonOpaqueRgbDifferences++;
  if(s[3]!==out[3])changes.push({x:i%source.width,y:Math.floor(i/source.width),sourceAlpha:s[3],outputAlpha:out[3]});
 }
 cases.push({file,...metrics(im),rawRgbaChanges,visibleRgbDifferences,alphaChanges:changes,commonOpaqueRgbDifferencesVsLocalExactTarget:commonOpaqueRgbDifferences});
}
const result={source:metrics(source),exactTarget:colors,localCleanupOnBinaryAlpha:metrics({...local,width:local.w,height:local.h,data:Buffer.from(local.data)}),cases,limits:['Workbench snap had no supplied target palette and reported snap0; this tests execution and a no-op, not arbitrary fixed-target snapping.','Compare RGB only on common opaque coordinates; service preserves partial source alpha while local app applies cut128.','Annotated palette/ramp PNGs contain label/background colors and are not clean raw palette strips.']};
fs.writeFileSync(path.join(dir,'api-workbench-followup-analysis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
