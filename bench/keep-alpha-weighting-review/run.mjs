import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { heldOutFixtures, independentMetrics } from './fixtures.mjs';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { quantize, colorize } from '../../src/lib/quantize.js';
import { generatePaletteAsync, createGeneratedAccumulator } from '../keep-alpha-weighting-spike/palette-generated.candidate.js';
import { selectPaletteSubset } from '../keep-alpha-weighting-spike/palette-limit.candidate.js';

const policies = ['none', 'linear', 'squared'];
const target = ['#000000','#1c202c','#6e6458','#e8d2a6','#0af018','#26cef4','#ff142d','#ffffff'];
const report = { created: new Date().toISOString(), hashes: {}, cases: [], invariants: [] };
for (const name of ['palette-generated','palette-limit']) report.hashes[name] = createHash('sha256').update(await readFile(new URL(`../keep-alpha-weighting-spike/${name}.candidate.js`, import.meta.url))).digest('hex');
report.hashes.fixtures = createHash('sha256').update(await readFile(new URL('./fixtures.mjs', import.meta.url))).digest('hex');
report.hashes.quantize = createHash('sha256').update(await readFile(new URL('../../src/lib/quantize.js', import.meta.url))).digest('hex');
const chunks = (data, size = 128 * 1024, weight = 1) => async function* () { for (let at=0;at<data.length;at+=size) yield { data:data.subarray(at,at+size),weight }; };
for (const fixture of heldOutFixtures()) {
  const source = fixture.original;
  for (const policy of policies) {
    const generated = await generatePaletteAsync(captureGeneratedSources([fixture], 1), { alphaWeight:policy });
    for (const metric of ['rgb','oklab']) for (const kind of ['fixed3','auto3','autoAll']) {
      const palette=kind==='fixed3'?target:generated.colors;
      const selection=kind==='autoAll'?null:await selectPaletteSubset(palette,3,chunks(source.data),{ alphaCut:1,metric,alphaWeight:policy });
      const active=selection?selection.indices.map(i=>palette[i]):palette;
      const actual=colorize(quantize(source,active,1,undefined,undefined,{metric,alphaMode:'keep'}),active);
      report.cases.push({fixture:fixture.name,purpose:fixture.purpose,policy,metric,kind,colors:active,generated:generated.colors,binned:generated.binned,metrics:independentMetrics(source,actual)});
    }
    // Chunk splits must retain the same complete generated result, not merely size.
    const accumulator=createGeneratedAccumulator(1,{alphaWeight:policy});accumulator.beginAsset();
    for (let at=0;at<source.data.length;at+=508) await accumulator.addChunk(source.data.subarray(at,at+508),1);
    await accumulator.endAsset();
    const incremental=await accumulator.finish();
    report.invariants.push({fixture:fixture.name,policy,check:'generated-chunk-invariance',pass:JSON.stringify(incremental)===JSON.stringify(generated)});
    for (const metric of ['rgb','oklab']) {
      const a=await selectPaletteSubset(target,3,chunks(source.data),{alphaCut:1,metric,alphaWeight:policy});
      const b=await selectPaletteSubset(target,3,chunks(source.data,508),{alphaCut:1,metric,alphaWeight:policy});
      report.invariants.push({fixture:fixture.name,policy,metric,check:'subset-chunk-invariance',pass:JSON.stringify(a)===JSON.stringify(b)});
    }
  }
  process.stdout.write(`Completed ${fixture.name}\n`);
}
const failures=[];
for (const entry of report.cases.filter(v=>v.policy!=='none')) {
  const before=report.cases.find(v=>v.fixture===entry.fixture&&v.policy==='none'&&v.metric===entry.metric&&v.kind===entry.kind);
  for (const background of ['black','white','checker']) {
    const increase=entry.metrics.sets.all[background].rgbRmse-before.metrics.sets.all[background].rgbRmse;
    const opaqueIncrease=entry.metrics.sets.opaque[background].rgbRmse-before.metrics.sets.opaque[background].rgbRmse;
    if (increase>2+1e-9||opaqueIncrease>1+1e-9) failures.push({fixture:entry.fixture,policy:entry.policy,kind:entry.kind,metric:entry.metric,background,increase,opaqueIncrease});
  }
  if(entry.metrics.alphaMismatch)failures.push({fixture:entry.fixture,policy:entry.policy,check:'alpha-mismatch'});
}
report.failures=failures;
await writeFile(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({cases:report.cases.length,invariants:report.invariants.length,invariantFailures:report.invariants.filter(v=>!v.pass),failures},null,2)+'\n');
