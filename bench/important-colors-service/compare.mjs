// Offline paired outputs: production modules generate the local image; Sharp independently decodes every PNG.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { quantizeAsync } from '../../src/lib/quantize.js';
import { palettePngBytesAsync } from '../../src/lib/save.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(import.meta.dirname, '../..'), out = import.meta.dirname;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.resolve(root, file));
const save = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
const decode = async bytes => { const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data: new Uint8Array(data), width: info.width, height: info.height }; };
const hex = (data, p) => '#' + Buffer.from(data.subarray(p, p + 3)).toString('hex');
const linear = v => v / 255 <= .04045 ? v / 3294.6 : ((v / 255 + .055) / 1.055) ** 2.4;
const lab = (d,p) => { const [r,g,b] = [d[p],d[p+1],d[p+2]].map(linear); const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b); return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]; };
function measure(src, dst, regions = {}, target) {
  if (src.width !== dst.width || src.height !== dst.height) throw Error('Dimensions changed');
  const used = new Set(), t = target ? new Set(target) : null;
  let alphaChanges=0, rgbSse=0, labSse=0, visible=0, exact=0, violations=0;
  for(let p=0;p<src.data.length;p+=4) {
    if(src.data[p+3]!==dst.data[p+3]) alphaChanges++;
    if(dst.data[p+3]) { const c=hex(dst.data,p); used.add(c); if(t&&!t.has(c)) violations++; }
    if(!src.data[p+3]||!dst.data[p+3]) continue;
    visible++; if(hex(src.data,p)===hex(dst.data,p)) exact++;
    const a=lab(src.data,p), b=lab(dst.data,p);
    for(let c=0;c<3;c++) {rgbSse+=(src.data[p+c]-dst.data[p+c])**2;labSse+=(a[c]-b[c])**2;}
  }
  const detail=Object.fromEntries(Object.entries(regions).map(([name,coords])=>[name, coords.map(([x,y])=>{
    const p=(y*src.width+x)*4, c=hex(dst.data,p), n=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) if(dx||dy){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=src.width||yy>=src.height)continue;const q=(yy*src.width+xx)*4;if(dst.data[q+3])n.push(hex(dst.data,q));}
    return {at:[x,y],source:hex(src.data,p),output:c,distinctFromAllNeighbours:!n.includes(c),distinctFromAnyNeighbour:n.some(k=>k!==c)};
  })]));
  return {width:dst.width,height:dst.height,alphaChanges,visibleRgb:used.size,usedColors:[...used].sort(),targetViolations:t?violations:null,pointRgbMse:rgbSse/visible,pointOklabMse:labSse/visible,exactSourceFraction:exact/visible,rgbaSha256:sha(dst.data),detail};
}
const cases=JSON.parse(fs.readFileSync(path.join(out,'cases.json')));
const report={at:new Date().toISOString(),method:'Node production palette generation/subset/quantize/PNG encode; Sharp native PNG decode; RGB/Oklab independent math. Browser and phone paths are separate.',sourceHashes:Object.fromEntries(['palette-generated.js','palette-generated-sources.js','palette-limit.js','quantize.js','save.js'].map(n=>[n,sha(read('src/lib/'+n))])),cases:[]};
fs.mkdirSync(path.join(out,'ours'),{recursive:true});fs.mkdirSync(path.join(out,'sheets'),{recursive:true});
for(const c of cases) {
  if(!fs.existsSync(path.resolve(root,c.service[0]))) continue;
  const frames=await Promise.all(c.inputs.map(f=>decode(read(f))));
  const services=await Promise.all(c.service.map(f=>decode(read(f))));
  const targetFrame=c.target?await decode(read(c.target)):null;
  const target=targetFrame?[...new Set(Array.from({length:targetFrame.width*targetFrame.height},(_,i)=>hex(targetFrame.data,i*4)))]:null;
  const row={id:c.id,inputs:c.inputs.map(f=>({file:f,pngSha256:sha(read(f))})),count:c.count??null,target:c.target??null,service:services.map((s,i)=>measure(frames[i],s,c.regions,target)),ours:[]};
  const tiles=[{label:'Source',image:frames[0]},{label:'PixelLab',image:services[0]}];
  for(const metric of ['oklab','rgb']) {
    const started=performance.now();
    let colors=target;
    if(!colors) {const item=frames.length>1?{frames:frames.map((original,i)=>({original,delay:c.delays?.[i]??100}))}:{original:frames[0]}; colors=(await generatePaletteAsync(captureGeneratedSources([item],1))).colors;}
    if(c.count&&colors.length>c.count){const fit=await selectPaletteSubset(colors,c.count,async function*(){for(let i=0;i<frames.length;i++)yield{data:frames[i].data,weight:frames.length>1?(c.delays?.[i]??100):1};},{alphaCut:1,metric});colors=fit.indices.map(i=>colors[i]);}
    const results=[];
    for(let i=0;i<frames.length;i++){const mapped=await quantizeAsync(frames[i],colors,128,undefined,undefined,{metric,dither:'none',alphaMode:'keep'});const png=await palettePngBytesAsync({...mapped,colors});fs.writeFileSync(path.join(out,'ours',`${c.id}-${metric}-${i}.png`),png);results.push(await decode(png));}
    row.ours.push({metric,palette:colors,elapsedMs:performance.now()-started,frames:results.map((s,i)=>measure(frames[i],s,c.regions,target))});
    tiles.push({label:'Colorfetti '+metric,image:results[0]});
  }
  // Native 1x row plus enlarged nearest-neighbour row, composited over neutral gray.
  const W=frames[0].width,H=frames[0].height,scale=Math.min(8,Math.max(1,Math.floor(256/Math.max(W,H))));
  const sheet=sharp({create:{width:(W*scale+12)*tiles.length,height:H+H*scale+46,channels:4,background:'#808080'}});
  const composites=[];
  for(let i=0;i<tiles.length;i++){const t=tiles[i],left=i*(W*scale+12);composites.push({input:await sharp(Buffer.from(t.image.data),{raw:{width:W,height:H,channels:4}}).png().toBuffer(),left,top:0});composites.push({input:await sharp(Buffer.from(t.image.data),{raw:{width:W,height:H,channels:4}}).resize(W*scale,H*scale,{kernel:'nearest'}).png().toBuffer(),left,top:H+24});}
  await sheet.composite(composites).png().toFile(path.join(out,'sheets',c.id+'.png'));
  row.sheetColumns=tiles.map(t=>t.label);row.sheetScale=scale;report.cases.push(row);
}
save('results.json',report);
console.log(JSON.stringify(report.cases.map(c=>({id:c.id,service:c.service.map(f=>({rgb:f.visibleRgb,alphaChanges:f.alphaChanges,error:f.pointOklabMse})),ours:c.ours.map(o=>({metric:o.metric,frames:o.frames.map(f=>({rgb:f.visibleRgb,error:f.pointOklabMse}))}))})),null,2));
