// Historical investigation pinned to 7c0437d. Alternatives patch one guard in disposable
// copies, so later production changes cannot silently alter these comparisons.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = import.meta.dirname;
mkdirSync(`${root}/.tmp`, { recursive: true });
const baselineCommit = '7c0437d';
const original = execFileSync('git', ['show', `${baselineCommit}:src/lib/bitify.js`], { cwd: `${root}/../..`, encoding: 'utf8' });
const guard = '(lum[p] <= dark && body[p] > dark)';
if (original.split(guard).length !== 2) throw new Error('Historical guard does not match; inspect baseline.');
writeFileSync(`${root}/.tmp/stencil-original.mjs`, original.replaceAll("'./icon.js'", "'../../../src/lib/icon.js'"));
const { analyze, mask, spritesOf } = await import('./.tmp/stencil-original.mjs');
const methods = { current: mask };
for (const [name, expression] of Object.entries({ capped: '(lum[p] <= Math.min(dark, body[p] - 1))', unguarded: '(lum[p] <= dark)' })) {
  const code = original.replace(guard, expression).replaceAll("'./icon.js'", "'../../../src/lib/icon.js'");
  writeFileSync(`${root}/.tmp/stencil-${name}.mjs`, code);
  methods[name] = (await import(`./.tmp/stencil-${name}.mjs?${Date.now()}`)).mask;
}
const items = JSON.parse(readFileSync(`${root}/inputs.json`)).filter(x => x.variant === 'original' && !x.id.endsWith('-sheet'));
const dirs = [-1, 0, 1];
function components(m, w, h, accepts = x => x === 2) {
  const seen = new Uint8Array(m.length), groups = [];
  for (let p = 0; p < m.length; p++) {
    if (seen[p] || !accepts(m[p])) continue;
    const queue = [p]; seen[p] = 1;
    for (let i = 0; i < queue.length; i++) {
      const q = queue[i], x = q % w, y = Math.floor(q / w);
      for (const dy of dirs) for (const dx of dirs) {
        const X = x + dx, Y = y + dy, at = Y * w + X;
        if (X < 0 || Y < 0 || X >= w || Y >= h || seen[at] || !accepts(m[at])) continue;
        seen[at] = 1; queue.push(at);
      }
    }
    groups.push(queue);
  }
  return groups;
}
function geometry(m, img) {
  return { ink: m.reduce((n, x) => n + (x === 2), 0), cuts: m.reduce((n, x) => n + (x === 1), 0), components: components(m, img.w, img.h).length };
}
const record = { baselineCommit, productionSha256: createHash('sha256').update(original).digest('hex'), items: items.length, definitions: {
  current: 'Existing whole-component brightness cuts disable at interior median; edges independent.',
  capped: 'Prototype: effective brightness cutoff min(requested, interior median - 1), including Auto. Other rules unchanged.',
  unguarded: 'Prototype: remove median guard. Other rules unchanged.',
  reversal: 'Previously cut source pixel returns to second-color ink when Cuts increases by one.',
  limitations: 'Geometry and deterministic sweeps; not a recognition study. Median cap preserves less-than-half four-neighbor interior brightness cuts, not topology or total cuts including Edges/Trim.'
}, configurations: [], defaultDetails: [], componentDiagnostics: [], breastplate: {}, comparisonsAtAuto: {}, comparisonsAt100: {} };
const visuals = [];
for (const source of ['luma', 'value', 'red', 'green', 'blue']) {
  const analyzed = items.map(src => analyze({ ...src, data: Uint8ClampedArray.from(src.data) }, source));
  for (const outline of ['keep', 'trim']) for (const edges of [0, 50, 100]) {
    const stats = { source, outline, edges, reversedItems: 0, events: 0, restoredPixels: 0, largestRestoration: 0, cappedReversals: 0, unguardedReversals: 0, currentEqualsCapBelowGuard: true, cappedEqualsWholeHistoryUnion: true };
    for (let i = 0; i < items.length; i++) {
      const src = items[i], img = analyzed[i], sp = spritesOf(img);
      let prev, priorCap, priorNone, reversed = false;
      const union = new Uint8Array(img.w * img.h), events = [], curve = [], auto = {};
      for (const [name, fn] of Object.entries(methods)) auto[name] = geometry(fn(img, 'stencil', { cuts: null, outline, edges }), img);
      for (let cuts = 0; cuts <= 254; cuts++) {
        const opt = { cuts, outline, edges }, m = mask(img, 'stencil', opt), cap = methods.capped(img, 'stencil', opt), no = methods.unguarded(img, 'stencil', opt);
        let restored = 0, newlyCut = 0;
        for (let p = 0; p < m.length; p++) {
          if (prev && prev[p] === 1 && m[p] === 2) restored++;
          if (prev && prev[p] === 2 && m[p] === 1) newlyCut++;
          if (priorCap && priorCap[p] === 1 && cap[p] === 2) stats.cappedReversals++;
          if (priorNone && priorNone[p] === 1 && no[p] === 2) stats.unguardedReversals++;
          union[p] ||= m[p] === 1;
          if (img.data[p * 4 + 3] >= img.cut && sp.level[p] + cuts < sp.body[p] && m[p] !== cap[p]) stats.currentEqualsCapBelowGuard = false;
          if ((cap[p] === 1) !== !!union[p]) stats.cappedEqualsWholeHistoryUnion = false;
        }
        if (restored) { reversed = true; stats.events++; stats.restoredPixels += restored; stats.largestRestoration = Math.max(stats.largestRestoration, restored); events.push({ cuts, restored, newlyCut }); }
        if (source === 'luma' && outline === 'keep' && edges === 0) curve.push({ cuts, current: geometry(m, img).ink, capped: geometry(cap, img).ink, unguarded: geometry(no, img).ink });
        if (cuts === 100 && source === 'luma' && outline === 'keep' && edges === 0) {
          record.comparisonsAt100[src.id] = { source: img.data.reduce((n,x,p)=>n+(p%4===3 && x>=128),0), sourceComponents: components(m, img.w, img.h, x=>x>0).length, current: geometry(m,img), capped: geometry(cap,img), unguarded: geometry(no,img) };
          visuals.push({ id: src.id, rgba: src.data, current: [...m], capped: [...cap], unguarded: [...no], auto: Object.fromEntries(Object.entries(methods).map(([name, fn])=>[name,[...fn(img,'stencil',{outline,edges})]])) });
        }
        if (src.id === 'breastplate-1-1' && source === 'luma' && outline === 'keep' && edges === 0 && [0,69,74,75,76,77,100,254].includes(cuts)) record.breastplate[cuts] = { current: geometry(m,img), capped: geometry(cap,img), unguarded: geometry(no,img), masks: {current:[...m],capped:[...cap],unguarded:[...no]} };
        prev = m; priorCap = cap; priorNone = no;
      }
      if (reversed) stats.reversedItems++;
      if (source === 'luma' && outline === 'keep' && edges === 0) {
        record.defaultDetails.push({ id: src.id, events, curve, auto });
        record.comparisonsAtAuto[src.id] = auto;
        const sourceMask = new Uint8Array(img.w*img.h).map((_,p)=>img.data[p*4+3]>=128?2:0), solid=(x,y)=>x>=0&&y>=0&&x<img.w&&y<img.h&&sourceMask[y*img.w+x]===2;
        for(const group of components(sourceMask,img.w,img.h)) {
          const interior=group.filter(p=>{const x=p%img.w,y=Math.floor(p/img.w);return solid(x-1,y)&&solid(x+1,y)&&solid(x,y-1)&&solid(x,y+1);});
          const eligible=interior.filter(p=>{const x=p%img.w,y=Math.floor(p/img.w);return solid(x-1,y-1)&&solid(x+1,y-1)&&solid(x-1,y+1)&&solid(x+1,y+1);});
          const median=sp.body[group[0]], level=sp.level[group[0]];
          record.componentDiagnostics.push({id:src.id,sourcePixels:group.length,interior:interior.length,eligible:eligible.length,median,level,flipAt:median-level,eligibleAtMedian:eligible.filter(p=>img.lum[p]<=median).length,eligibleBelowMedian:eligible.filter(p=>img.lum[p]<median).length});
        }
      }
    }
    record.configurations.push(stats);
  }
}
for (const [label, data] of Object.entries({auto:record.comparisonsAtAuto, cuts100:record.comparisonsAt100})) {
  record[`${label}Summary`] = Object.fromEntries(Object.keys(methods).map(name=> {
    let ink=0, empty=0, fragments=0, changed=0;
    for(const row of Object.values(data)) {
      ink+=row[name].ink; empty+=row[name].ink===0; fragments+=row.sourceComponents!==undefined&&row[name].components>row.sourceComponents;changed+=row[name].ink!==row.current.ink;
    }
    return [name,{totalInk:ink,empty,extraFragmentItems:label==='auto'?null:fragments,changedInkCountItems:changed}];
  }));
}
writeFileSync(`${root}/stencil-guard-results.json`, JSON.stringify(record,null,2));
writeFileSync(`${root}/.tmp/stencil-guard-visuals.json`, JSON.stringify(visuals));
const breastCurve = record.defaultDetails.find(x=>x.id==='breastplate-1-1').curve;
const report = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stencil guard investigation</title>
<style>body{font:16px/1.6 system-ui;background:#16181d;color:#e7eaf0;max-width:1100px;margin:32px auto;padding:0 20px}a{color:#9bc9ff}h1,h2{line-height:1.25}table{border-collapse:collapse;margin:18px 0}td,th{border:1px solid #454952;padding:8px 14px;text-align:left}.note{background:#242a34;padding:18px;border-left:4px solid #e1b368}button,select{font:inherit;padding:8px;background:#303641;color:white;border:1px solid #666;border-radius:6px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}.item{background:#24272e;padding:12px;border-radius:8px}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;font-size:11px}.row canvas{width:64px;height:64px;image-rendering:pixelated;background:repeating-conic-gradient(#303540 0% 25%,#272b34 0% 50%) 0/8px 8px}.native canvas{width:16px;height:16px}svg{width:100%;height:auto}.controls{position:sticky;top:0;background:#16181df2;padding:10px 0;z-index:1}small{color:#bbc1cc}.legend span{margin-right:20px}.current{color:#f1a2a2}.capped{color:#9fdbb5}.unguarded{color:#a7c8ff}</style>
<h1>Stencil guard: confirmed control reversal</h1><small>Historical investigation of implementation commit 7c0437d. “Current” below means that baseline, not the latest app. Results generated by actual conversion and disposable one-expression variants.</small>
<p class="note"><strong>Recommendation: change the manual Cuts reversal.</strong> Keep protection against hollowing flat artwork, but stop adding cuts instead of restoring all previously useful cuts. A median cap is a conservative behavioral fix to compare, not a solution to meaningful inner-shape selection. Preserve current Auto initially; applying the cap to Auto changes 19/65 items and has not been recognition-validated.</p>
<h2>Measured behavior</h2><ul><li>All 65 items swept through Cuts 0–254 in 30 configurations: five brightness sources × Keep/Trim × Edges 0/50/100. Current, median-capped and unguarded methods compared.</li><li>Default Luma/Keep/Edges Off: <strong>64/65 items reverse</strong>, restoring 1,253 cut pixels across their reversal events; largest single restoration 51 pixels. This is a whole sweep, not a claim that every reversal occurs at Cuts 100.</li><li>Strong Edges does not fix the guard: at Edges 100, 51/65 Luma items still reverse.</li><li>The guard measures four-neighbor interior, but corner protection excludes some of those pixels from all cuts. At the median, actual brightness cuts would still be below half that interior for <strong>59/65 components with interior</strong>. This shows the median test is conservative and not an exact count of removed pixels.</li></ul>
<h2>Breastplate: Cuts 75 → 76</h2><p>Source 155 opaque pixels, four-neighbor interior 114, cut-eligible interior 97. Median 76. At 76 only 44 interior pixels would be cut (38.6%), yet the guard restores all 41 previous cuts. This behavior is intentional in the current code/spec and tests; the recommendation challenges the behavior itself.</p>
<table><tr><th>Cuts</th><th>Current retained</th><th>Median cap retained</th><th>No guard retained</th></tr>${[74,75,76,77,100,254].map(k=>`<tr><td>${k}</td><td>${record.breastplate[k].current.ink}</td><td>${record.breastplate[k].capped.ink}</td><td>${record.breastplate[k].unguarded.ink}</td></tr>`).join('')}</table>
<p>The median controls whether any brightness cuts are permitted in the component. Precisely: cut when brightness ≤ requested AND median &gt; requested. At equality the brightness-cut term turns off. Edges remains independent; with Edges Off all cuts disappear here.</p>
<div class="legend"><span class="current">Current</span><span class="capped">Median cap</span><span class="unguarded">No guard</span></div><svg viewBox="0 0 900 250" role="img" aria-label="Breastplate retained ink versus Cuts; current rises at 76; cap plateaus; unguarded continues removing pixels"><rect width="900" height="250" fill="#24272e"/><path d="M50 20V215H875" fill="none" stroke="#707782"/>${['current','capped','unguarded'].map((name,i)=>`<polyline fill="none" stroke="${['#f1a2a2','#9fdbb5','#a7c8ff'][i]}" stroke-width="2" points="${breastCurve.map(x=>`${50+x.cuts/254*825},${215-x[name]/155*180}`).join(' ')}"/>`).join('')}<text x="50" y="240" fill="white">Cuts 0</text><text x="804" y="240" fill="white">254</text><text x="4" y="36" fill="white">155</text><text x="28" y="218" fill="white">0</text></svg>
<h2>Why not simply remove the guard?</h2><p>At Cuts 100, unguarded output adds foreground fragmentation to 8/65 items; median cap adds none in this specific corpus/settings. Unrestricted thresholds can hollow flat sprites. Existing flat-color and isolated-highlight tests protect a useful behavior. Retained component count does not prove recognizable inner shape.</p>
<h2>Original investigation recommendations</h2><p>Subsequent decision: ship the per-pixel median cap for manual and Auto brightness cuts while retaining the original Otsu Auto selector. These recommendations and measurements record the earlier investigation; the cap improves control consistency, not semantic recognition.</p><ol><li>Manual Cuts should be monotonic: higher values may add cuts or reach a declared protection limit, but should not reverse old cuts. Lowest-risk prototype: min(requested brightness, median − 1). All 30 sweeps had zero reversals and matched existing output below the guard.</li><li>Keep Auto's existing conservative classification initially rather than changing 19 defaults without visual evidence. Validate coherent-region/actual-cut budgets separately; the corner-count mismatch alone does not prove every extra cut helps recognition.</li><li>A cap still leaves a dead upper slider range. Make the protection limit understandable, or redesign a control normalized to meaningful accepted features. Do not silently call a plateau “more detail.” Meaningful helmets/armor interiors remain a separate unsolved problem.</li><li>Test flat art, highlights, exact half ties, several components, thin parts, Edges plus brightness, Trim, arbitrary preview sampling and native exports. Any shipped change needs spec/test updates and benchmarks. No runtime change has been made by this investigation.</li></ol>
<h2>Visual comparisons</h2><p>All originals at 16×16. Median cap and No guard are prototypes affecting both manual and Auto in this viewer to expose the consequences; the recommended small fix would apply cap only to manual Cuts. More holes is not automatically better recognition.</p>
<div class="controls"><label>Compare <select id="setting"><option value="100">Manual Cuts 100</option><option value="auto">Auto</option></select></label> <label><input type="checkbox" id="native">Native size</label> <small>All: Luma, Outline Keep, Edges Off</small></div><div class="gallery" id="gallery"></div>
<h2>Evidence and reproduction</h2><p><a href="stencil-guard-results.json">Complete sweep measurements and curves</a> · <a href="stencil-guard.mjs">Reproduction script</a> · <a href="results.html">Icon implementation viewer</a> · <a href="report.html">Earlier research</a></p><p>Run node bench/icon-research/stencil-guard.mjs after prepare.py has generated inputs.json. The runner loads the baseline from Git commit 7c0437d, independently of the current app. Source SHA-256: ${record.productionSha256}. This is a local algorithm/geometry investigation, not a blinded recognition study.</p>
<script>const items=${JSON.stringify(visuals)};const setting=document.querySelector('#setting'),gallery=document.querySelector('#gallery');function draw(c,pixels,isOriginal){c.width=c.height=16;const cx=c.getContext('2d');for(let p=0;p<256;p++){if(isOriginal){const at=p*4;if(!pixels[at+3])continue;cx.fillStyle='rgb('+pixels.slice(at,at+3).join(',')+')';}else{if(pixels[p]!==2)continue;cx.fillStyle='#f0f6f0';}cx.fillRect(p%16,Math.floor(p/16),1,1);}}function render(){gallery.replaceChildren();for(const item of items){const box=document.createElement('section');box.className='item';const title=document.createElement('div');title.textContent=item.id;box.append(title);const row=document.createElement('div');row.className='row';box.append(row);for(const name of ['original','current','capped','unguarded']){const cell=document.createElement('div'),c=document.createElement('canvas'),label=document.createElement('div');label.textContent={original:'Original',current:'Current',capped:'Median cap',unguarded:'No guard'}[name];cell.append(c,label);row.append(cell);draw(c,name==='original'?item.rgba:(setting.value==='auto'?item.auto[name]:item[name]),name==='original');}gallery.append(box);}}setting.onchange=render;document.querySelector('#native').onchange=e=>gallery.classList.toggle('native',e.target.checked);render();</script></html>`;
writeFileSync(`${root}/stencil-guard-report.html`, report);
console.log(JSON.stringify({configurationCount:record.configurations.length,default:record.configurations[0],auto:record.autoSummary,cuts100:record.cuts100Summary,componentCount:record.componentDiagnostics.length,guardAtMedianCutsLessThanHalf:record.componentDiagnostics.filter(x=>x.interior&&x.eligibleAtMedian*2<x.interior).length,breastplate:Object.fromEntries(Object.entries(record.breastplate).map(([key,v])=>[key,Object.fromEntries(Object.entries(v).filter(([k])=>k!=='masks'))]))},null,2));
