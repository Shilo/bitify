// A separately measured, research-only optimization. Does not edit src/.
import fs from 'node:fs/promises';
import {captureGeneratedSources} from '../src/lib/palette-generated-sources.js';
const root=new URL('../.tmp/auto-capacity/',import.meta.url);
for(const count of [32,64]) {
  const source=await fs.readFile(new URL(`generated${count}.js`,root),'utf8');
  const clone=source
    .replace('nearest = new Float64Array(length).fill(Infinity);','nearest = new Float64Array(length).fill(Infinity);\n      const selectedColors = new Set(colors);')
    .replace('!colors.includes(rgb[i])','!selectedColors.has(rgb[i])')
    .replace('colors.push(rgb[selected]);','colors.push(rgb[selected]); selectedColors.add(rgb[selected]);');
  await fs.writeFile(new URL(`generated${count}-set.js`,root),clone);
}
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
const items=[];
for(const asset of manifest) {
  const frames=[];
  for(const frame of asset.frames) {
    const bytes=await fs.readFile(new URL(frame.url.slice(1),root));
    frames.push({original:{width:frame.width,height:frame.height,data:new Uint8ClampedArray(bytes)},delay:frame.delay});
  }
  items.push({name:asset.name,frames});
}
const report=[];
for(const [name,cohort] of [
  ['six buildings',items.filter(i=>i.name.startsWith('building'))],
  ['mixed wall',items.filter(i=>i.name!=='synthetic-high-entropy')],
  ['adversarial high-entropy bins',items.filter(i=>i.name==='synthetic-high-entropy')]
]) for(const count of [32,64]) {
  const baseline=await import(`../.tmp/auto-capacity/generated${count}.js`);
  const candidate=await import(`../.tmp/auto-capacity/generated${count}-set.js`);
  const snapshot=captureGeneratedSources(cohort),record={cohort:name,count,baseline:[],candidate:[],identical:true};
  let expected;
  for(let iteration=0;iteration<5;iteration++) for(const type of iteration%2?['candidate','baseline']:['baseline','candidate']) {
    const start=performance.now(),result=await(type==='baseline'?baseline:candidate).generatePaletteAsync(snapshot);
    record[type].push(performance.now()-start);
    expected??=JSON.stringify(result);
    record.identical&&=expected===JSON.stringify(result);
  }
  const median=values=>[...values].sort((a,b)=>a-b)[2];
  record.baselineMedian=median(record.baseline);record.candidateMedian=median(record.candidate);
  report.push(record);
}
await fs.writeFile(new URL('seed-set-results.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(r=>({cohort:r.cohort,count:r.count,identical:r.identical,
  baseline:r.baselineMedian,candidate:r.candidateMedian,improvement:1-r.candidateMedian/r.baselineMedian})),null,2));
