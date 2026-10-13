import { generatePaletteAsync as generate32 } from '../src/lib/palette-generated.js';
import { generatePaletteAsync as generate64 } from '../.tmp/auto-capacity/generated64.js';
import { captureGeneratedSources } from '../src/lib/palette-generated-sources.js';
import { preparePalette, quantizeAsync, EMPTY_INDEX, yieldTask } from '../src/lib/quantize.js';
import { selectPaletteSubset } from '../src/lib/palette-limit.js';
import { prepareCleanupAsync } from '../src/lib/palette-cleanup.js';

const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const linear = Float64Array.from({length: 256}, (_, n) => {
  const v = n / 255;
  return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
});
function lab(r, g, b) {
  r = linear[r]; g = linear[g]; b = linear[b];
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,
    1.9779984951*l-2.428592205*m+.4505937099*s,
    .0259040371*l+.7827717662*m-.808675766*s];
}
async function errorSample(items, palette) {
  const labs = palette.colors.map(hex => {
    const n = parseInt(hex.slice(1),16); return lab(n >>> 16, n >>> 8 & 255, n & 255);
  });
  let total = 0, assets = 0;
  for (const item of items) {
    let error = 0, mass = 0;
    for (const frame of item.frames) {
      const image = frame.original;
      const scale = Math.min(1, 64 / Math.max(image.width, image.height));
      const w = Math.max(1, Math.floor(image.width*scale));
      const h = Math.max(1, Math.floor(image.height*scale));
      const result = await quantizeAsync(image, palette, 128, w, h);
      for (let i=0;i<result.indices.length;i++) {
        if(result.indices[i] === EMPTY_INDEX) continue;
        const x=Math.floor((i%w+.5)*image.width/w), y=Math.floor((Math.floor(i/w)+.5)*image.height/h);
        const at=(y*image.width+x)*4, a=lab(...image.data.subarray(at,at+3)), b=labs[result.indices[i]];
        error += ((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)*frame.delay;
        mass += frame.delay;
      }
    }
    if(mass) { total += error/mass; assets++; }
  }
  return {meanSquaredOklab:total/assets, assets, method:'equal-asset, duration-weighted, uniform <=64px samples; not semantic readability'};
}
export async function runCapacity({manifest, readBytes, status=()=>{}, device='node'}) {
  const report = {kind:'performance', experiment:'auto-capacity', device, started:new Date().toISOString(),
    note:'Research-only64 clone. Timings include cooperative yield; source decode excluded; no production settings changed.', records:[]};
  const items = [];
  for (const asset of manifest) {
    const frames=[];
    for (const frame of asset.frames) frames.push({original:{width:frame.width,height:frame.height,
      data:new Uint8ClampedArray(await readBytes(frame.url))}, delay:frame.delay});
    items.push({name:asset.name, frames});
  }
  report.sourceBytes=items.reduce((sum,item)=>sum+item.frames.reduce((s,f)=>s+f.original.data.length,0),0);
  report.assets=items.length; report.frames=items.reduce((s,item)=>s+item.frames.length,0);
  const cohorts = [ ['single two-color', items.filter(i=>i.name==='girl')],
    ['six buildings', items.filter(i=>i.name.startsWith('building'))],
    ['dungeon animation', items.filter(i=>i.name==='dungeon')],
    ['mixed wall',items.filter(i=>i.name!=='synthetic-high-entropy')],
    ['adversarial high-entropy bins',items.filter(i=>i.name==='synthetic-high-entropy')] ];
  for (const [name, cohort] of cohorts) {
    const snapshot=captureGeneratedSources(cohort);
    const palettes=new Map();
    for(let iteration=0;iteration<3;iteration++) for(const count of iteration%2?[64,32]:[32,64]) {
      status(`${name}: ${count}, run ${iteration+1}`);
      const start=performance.now(), result=await (count===32?generate32:generate64)(snapshot);
      let record=report.records.find(r=>r.cohort===name&&r.count===count);
      if(!record) { record={cohort:name,count,generationMs:[],colors:result.colors.length,binned:result.binned}; report.records.push(record); }
      record.generationMs.push(performance.now()-start);
      palettes.set(count,preparePalette(result.colors));
      await yieldTask();
    }
    for(const count of [32,64]) {
      const record=report.records.find(r=>r.cohort===name&&r.count===count), palette=palettes.get(count);
      record.medianGenerationMs=median(record.generationMs);
      status(`${name}: ${count} fidelity and first-frame conversion`);
      record.error=await errorSample(cohort,palette);
      const frameTimes=[];
      for(let iteration=0;iteration<3;iteration++) {
        const start=performance.now();
        for(const item of cohort) await quantizeAsync(item.frames[0].original,palette,128);
        frameTimes.push(performance.now()-start);
      }
      record.firstFramesMs=frameTimes; record.medianFirstFramesMs=median(frameTimes);
      if(name==='dungeon animation') {
        const frames=cohort[0].frames;
        let start=performance.now();
        for(const frame of frames) await quantizeAsync(frame.original,palette,128,256,229);
        record.cold56FramePreviewMs=performance.now()-start;
        start=performance.now();
        const subset=await selectPaletteSubset(palette.colors,8,async function*(){
          for(const frame of frames) yield {data:frame.original.data,weight:frame.delay};
        });
        record.cap8WholeClipMs=performance.now()-start;
        record.cap8Colors=subset.colors?.length ?? subset.length;
        start=performance.now();
        const cleanup=await prepareCleanupAsync(frames.map(f=>f.original),palette,128,'oklab');
        record.cleanupWholeClipMs=performance.now()-start; record.cleanupHasChanges=cleanup.hasChanges;
      }
    }
  }
  report.completed=true;
  return report;
}
