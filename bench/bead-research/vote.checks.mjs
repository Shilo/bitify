import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeVote} from './method-vote.mjs';
const colors=['#eeddaa','#ffeebb','#221100','#ffaaaa'];
function input(){const labels=new Int32Array(49).fill(0);labels[24]=1;return {width:7,height:7,labels,colors};}
test('merges selected noise into anchored fill, preserving inputs',()=>{const image=input(),before=image.labels.slice(),r=mergeVote(image,{selected:new Set([1])});assert.equal(r.labels[24],0);assert.deepEqual(image.labels,before);assert.equal(r.decisions[0].reason,'merged');});
test('protected highlight vetoes entire selected region',()=>{const image=input();image.labels[25]=1;const mask=new Uint8Array(49);mask[24]=1;const r=mergeVote(image,{selected:new Set([1]),protectedPixels:mask});assert.deepEqual(r.labels,image.labels);});
test('protected outline cannot grow or shrink',()=>{const image=input();for(const p of [17,23,25])image.labels[p]=2;const r=mergeVote(image,{selected:new Set([1]),protected:new Set([2])});assert.deepEqual(r.labels,image.labels);assert.equal(r.decisions[0].reason,'protected-boundary');});
test('equal boundary votes abstain independent of palette ordering',()=>{const image=input();image.labels[17]=2;image.labels[23]=2;assert.equal(mergeVote(image,{selected:new Set([1])}).decisions[0].reason,'tie');});
test('transparency is unchanged and is never a candidate',()=>{const image=input();image.labels[0]=-1;const r=mergeVote(image,{selected:new Set([1])});assert.equal(r.labels[0],-1);});
test('distance veto does not select runner-up',()=>{const image=input();image.labels.fill(2);image.labels[24]=1;image.labels[25]=0;const r=mergeVote(image,{selected:new Set([1])});assert.equal(r.labels[24],1);assert.equal(r.decisions[0].reason,'color-distance');});
test('rejects malformed selections and protected masks',()=>{const image=input();assert.throws(()=>mergeVote(image,{selected:new Set([999])}));assert.throws(()=>mergeVote(image,{protectedPixels:new Uint8Array(1)}));});
test('color-only selection also erases deliberate same-color details',()=>{const image=input();image.labels[10]=1;const r=mergeVote(image,{selected:new Set([1])});assert.equal(r.labels[10],0);assert.equal(r.labels[24],0);});
