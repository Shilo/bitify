// Offline native PNG comparison. Algorithm outputs are not built-app/UI evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { quantizeAsync } from '../../src/lib/quantize.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { palettePngBytesAsync } from '../../src/lib/save.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = import.meta.dirname, base = path.resolve(dir, '../claude-audit-2026-10-15/service');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const decode = async file => { const { data, info } = await sharp(file, { failOn: 'error' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8Array(data), file, pngSha256: sha(fs.readFileSync(file)) }; };
const key = (d,p) => '#' + Buffer.from(d.subarray(p,p+3)).toString('hex');
const colorsOf = image => [...new Set(Array.from({length:image.data.length/4},(_,i)=>i*4).filter(p=>image.data[p+3]).map(p=>key(image.data,p)))].sort();
const metrics = (source, output, target) => {
  if (source.width !== output.width || source.height !== output.height) return { dimensionsMatch:false, width:output.width, height:output.height };
  let alphaChanges=0, visibleRgbChanges=0, opaqueRgbChanges=0, compositeSum=0, visible=0;
  for(let p=0;p<source.data.length;p+=4){
    const a=source.data[p+3]/255;
    if(source.data[p+3]!==output.data[p+3])alphaChanges++;
    if(!source.data[p+3])continue;
    visible++;
    if(key(source.data,p)!==key(output.data,p)){visibleRgbChanges++;if(a===1)opaqueRgbChanges++;}
    for(let c=0;c<3;c++)compositeSum+=(a*(source.data[p+c]-output.data[p+c]))**2;
  }
  const colors=colorsOf(output);
  return {dimensionsMatch:true,width:output.width,height:output.height,pngSha256:output.pngSha256,rgbaSha256:sha(output.data),alphaChanges,visibleRgb:colors.length,colors,visibleRgbChanges,opaqueRgbChanges,compositeChannelRmse:alphaChanges?null:Math.sqrt(compositeSum/(Math.max(1,visible)*3)),targetViolations:target?colors.filter(c=>!target.includes(c)):null};
};
const strip=await decode(path.join(base,'fixtures/target-edg8.png'));
const targets=Array.from({length:strip.width},(_,i)=>key(strip.data,i*4));
const cases=[
 {id:'w1',inputs:['glow-alpha.png'],count:4,retained:'glow-count4',retainedOurs:'ours-glow-count4-auto-cap-keep'},
 {id:'w2',inputs:['knight-a.png'],target:targets,retained:'knight-edg8',retainedOurs:'ours-knight-edg8-oklab'},
 {id:'w3',inputs:['knight-a.png','knight-b.png'],count:8,retained:'knight-2frame-count8',retainedOurs:'ours-knight-2frame-count8-auto-cap-oklab'},
];
fs.mkdirSync(path.join(dir,'local'),{recursive:true});fs.mkdirSync(path.join(dir,'website'),{recursive:true});
const results={at:new Date().toISOString(),method:'Native Sharp decode; regenerated unchanged production modules in Node. W3 is one equal-duration animation, not a promise of one cap across separate still files. Composite RMSE is descriptive, not artistic quality.',cases:[]};
for(const c of cases){
 const frames=await Promise.all(c.inputs.map(f=>decode(path.join(base,'fixtures',f))));
 const item=frames.length>1?{frames:frames.map(original=>({original,delay:100}))}:{original:frames[0]};
 let colors=c.target??(await generatePaletteAsync(captureGeneratedSources([item],1))).colors;
 if(c.count&&colors.length>c.count){const fitted=await selectPaletteSubset(colors,c.count,async function*(){for(const f of frames)yield{data:f.data,weight:frames.length>1?100:1};},{alphaCut:1,metric:'oklab'});colors=fitted.indices.map(i=>colors[i]);}
 const record={id:c.id,inputs:frames.map(f=>({file:path.relative(process.cwd(),f.file),pngSha256:f.pngSha256,width:f.width,height:f.height})),settings:{numColors:c.count??null,target:c.target??null,dithering:'none',alphaMode:'keep',matching:'oklab',cleanup:false},outputs:[]};
 for(let i=0;i<frames.length;i++){
  const local=path.join(dir,'local',`${c.id}-${i}.png`);
  fs.writeFileSync(local,await palettePngBytesAsync({...await quantizeAsync(frames[i],colors,128,undefined,undefined,{metric:'oklab',alphaMode:'keep',dither:'none'}),colors}));
  const ours=await decode(local),service=await decode(path.join(base,'service',`service-${c.retained}-${i}.png`));
  const old=await decode(path.join(base,'ours',`${c.retainedOurs}-${i}.png`));
  const webPath=path.join(dir,'website',c.id==='w3'?'web-w3-sheet.png':`web-${c.id}.png`);
  let web=fs.existsSync(webPath)?await decode(webPath):null;
  if(web&&c.id==='w3'){
   if(web.width!==frames[i].width*frames.length||web.height!==frames[i].height)throw Error('Unexpected website multi-image sheet dimensions');
   const bytes=await sharp(webPath).extract({left:i*frames[i].width,top:0,width:frames[i].width,height:frames[i].height}).png().toBuffer();
   const derived=path.join(dir,'website',`derived-w3-frame${i}.png`);fs.writeFileSync(derived,bytes);web=await decode(derived);
  }
  const same=(a,b)=>a.width===b.width&&a.height===b.height&&Buffer.from(a.data).equals(Buffer.from(b.data));
  record.outputs.push({frame:i,local:metrics(frames[i],ours,c.target),retainedRest:metrics(frames[i],service,c.target),localMatchesRetained:same(ours,old),website:web?{...metrics(frames[i],web,c.target),nativeDownload:path.relative(dir,webPath),nativeDownloadPngSha256:sha(fs.readFileSync(webPath)),derivedSheetCrop:c.id==='w3',matchesRetainedRest:same(web,service)}:{tested:false,reason:'Awaiting attributable native website download'}});
 }
 results.cases.push(record);
}
fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({cases:results.cases.length,localOutputs:results.cases.flatMap(c=>c.outputs).length,unchangedLocal:results.cases.flatMap(c=>c.outputs).every(o=>o.localMatchesRetained),websiteOutputs:results.cases.flatMap(c=>c.outputs).filter(o=>o.website.tested!==false).length}));
