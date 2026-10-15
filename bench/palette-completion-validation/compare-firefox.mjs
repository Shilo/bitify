// Compare this fresh engine run with the retained post-fix run; do not relabel known mismatches as passes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='bench/claude-audit-2026-10-15/device/';
const previous=JSON.parse(fs.readFileSync(base+'firefox/results.json'));
const current=JSON.parse(fs.readFileSync(base+'firefox-completion/results.json'));
const selected=new Set(['pass','alphaMismatch','rgbMismatch','exactChanged','offPalette','alphaWrong','sha256','mismatches','differsFromNearest']);
const observations=(value,prefix='',out={})=>{
  if(!value||typeof value!=='object')return out;
  for(const [key,child] of Object.entries(value)){
    const name=prefix?prefix+'.'+key:key;
    if(selected.has(key)&&typeof child!=='object')out[name]=child;
    if(child&&typeof child==='object')observations(child,name,out);
  }
  return out;
};
assert.equal(current.browserVersion,previous.browserVersion);
assert.deepEqual(current.failed,previous.failed);
const phases=current.phases.map(phase=>{
  const old=previous.phases.find(p=>p.name===phase.name);
  assert.ok(old,phase.name);
  assert.deepEqual(observations(phase),observations(old),phase.name);
  return {name:phase.name,pass:phase.pass,comparedObservations:Object.keys(observations(phase)).length,unchanged:true};
});
assert.deepEqual(current.errors,[]);
const receipt={at:new Date().toISOString(),engine:current.browserVersion,passCount:current.passed,total:phases.length,failed:current.failed,phases,disposition:'All retained correctness outcomes, visible RGB/alpha mismatch counts and exported SHA hashes are unchanged. Six source-file RGB checks still fail because Firefox canvas fallback rounds translucent RGB; they are known precision limits, not new passes. This comparison does not prove exact source-file RGB.'};
fs.writeFileSync(import.meta.dirname+'/firefox-regression-comparison.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({phases:phases.length,observations:phases.reduce((n,p)=>n+p.comparedObservations,0),unchanged:true,passed:current.passed,failed:current.failed.length}));
