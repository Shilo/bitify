import test from 'node:test';
import assert from 'node:assert/strict';
import {bridgeOneCell,thinSimple,fromRows,fixtures,stats,mergeOutlineLabels} from './outline-probe.mjs';
test('selected outline color union preserves geometry and all other color labels',()=>{
  const labels=Uint16Array.from([5,6,5,0,2,3,0,6]),result=mergeOutlineLabels(labels,[5,6],5);
  assert.deepEqual([...result],[5,5,5,0,2,3,0,5]);
  assert.deepEqual([...result].map(v=>v===5),[...labels].map(v=>v===5||v===6));
  assert.throws(()=>mergeOutlineLabels(labels,[5,6],7));
});
test('thinning reduces a thick line while preserving component and hole topology',()=>{
  const {mask,w,h}=fromRows(fixtures.thickLine),result=thinSimple(mask,w,h),a=stats(mask,w,h),b=stats(result.mask,w,h);
  assert.ok(result.removed.length>0);assert.equal(b.components8,a.components8);assert.equal(b.holes4,a.holes4);assert.equal(b.blocks2x2,0);
});
for(const name of ['ring','diagonal','endpoint','eyeHighlight'])test(`thinning preserves ${name} topology`,()=>{
  const {mask,w,h}=fromRows(fixtures[name]),result=thinSimple(mask,w,h),a=stats(mask,w,h),b=stats(result.mask,w,h);
  assert.equal(b.components8,a.components8);assert.equal(b.holes4,a.holes4);
  if(name==='endpoint'||name==='diagonal')assert.deepEqual(result.mask,mask);
});
test('protected pixels veto thinning including tiny facial details',()=>{
  const {mask,w,h}=fromRows(fixtures.eyeHighlight);assert.deepEqual(thinSimple(mask,w,h,{protectedMask:mask}).mask,mask);
});
test('bridge joins straight one-cell gap, with an explicit protection veto',()=>{
  const {mask,w,h}=fromRows(fixtures.accidentalGap),result=bridgeOneCell(mask,w,h);assert.equal(result.added.length,1);assert.equal(stats(result.mask,w,h).components8,1);
  const protectedMask=new Uint8Array(mask.length);protectedMask[result.added[0]]=1;assert.deepEqual(bridgeOneCell(mask,w,h,{protectedMask}).mask,mask);
});
test('intentional and accidental openings give identical proposals: intent requires user input',()=>{
  const a=fromRows(fixtures.accidentalGap),b=fromRows(fixtures.intentionalGap);
  assert.deepEqual(a.mask,b.mask);assert.equal(bridgeOneCell(b.mask,b.w,b.h).added.length,1);
});
test('bridge leaves diagonals, endpoints and intact holes alone',()=>{
  for(const name of ['diagonal','endpoint','ring']){const {mask,w,h}=fromRows(fixtures[name]);assert.deepEqual(bridgeOneCell(mask,w,h).mask,mask);}
});
test('thinning is deterministic but does not promise identical geometry under reverse scan',()=>{
  const {mask,w,h}=fromRows(fixtures.thickLine),a=thinSimple(mask,w,h),b=thinSimple(mask,w,h),reverse=thinSimple(mask,w,h,{reverse:true});
  assert.deepEqual(a.mask,b.mask);assert.notDeepEqual(a.mask,reverse.mask);assert.equal(stats(a.mask,w,h).components8,stats(reverse.mask,w,h).components8);
});
test('exhaustive 3x4 masks retain foreground components and background holes after thinning',()=>{
  const w=6,h=5;
  for(let bits=0;bits<4096;bits++) {
    const mask=new Uint8Array(w*h);
    for(let k=0;k<12;k++)mask[(Math.floor(k/4)+1)*w+k%4+1]=(bits>>k)&1;
    const a=stats(mask,w,h),b=stats(thinSimple(mask,w,h).mask,w,h);
    assert.equal(b.components8,a.components8,`foreground topology for mask ${bits}`);
    assert.equal(b.holes4,a.holes4,`background topology for mask ${bits}`);
  }
});
