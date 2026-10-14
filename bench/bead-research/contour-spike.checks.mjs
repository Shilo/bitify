import test from 'node:test';import assert from 'node:assert/strict';
import {traceOuter,rebuildOuter} from './contour-spike.mjs';import {outlineControls} from './outline-controls.mjs';import {components} from './outline-probe.mjs';
test('4096 authored occupancy masks: trace stays occupied, connects each path and terminates',()=>{
  for(let bits=0;bits<4096;bits++){
    const width=7,height=8,labels=new Int32Array(width*height).fill(-1);for(let y=0;y<4;y++)for(let x=0;x<3;x++)if(bits&(1<<(y*3+x)))labels[(y+2)*width+x+2]=0;
    const image={width,height,labels,colors:['#101010','#eeeeee']},r=traceOuter(image),expected=components(Uint8Array.from(labels,l=>l>=0),width,height,8);
    assert.equal(r.paths.length,expected.length);for(const path of r.paths)for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length];assert(labels[a]>=0);assert(Math.abs(a%width-b%width)<=1&&Math.abs(Math.floor(a/width)-Math.floor(b/width))<=1);}
  }
});
test('explicit two-cell exterior refill fixes authored width without touching interior details',()=>{
  const c=outlineControls().find(c=>c.id==='eyes-blush-glint-text'),{image}=c;for(let y=5;y<19;y++)for(let x=5;x<19;x++)if(x===5||x===18||y===5||y===18)image.labels[y*24+x]=0;
  const r=rebuildOuter(image,{outlineColor:0,sourceShades:new Set([0]),refill:true});let edits=0;for(let p=0;p<image.labels.length;p++){assert.equal(r.labels[p]<0,image.labels[p]<0);if(r.labels[p]!==image.labels[p])edits++;}assert.equal(edits,52);for(const p of c.keep)assert.equal(r.labels[p],image.labels[p]);
  const twice=rebuildOuter({...image,labels:r.labels},{outlineColor:0,sourceShades:new Set([0]),refill:true});assert.deepEqual(twice.labels,r.labels);
});
test('intentional interior mark beside perimeter is a demonstrated failure, not protected semantics',()=>{
  const {image}=outlineControls().find(c=>c.id==='eyes-blush-glint-text'),p=10*24+5;image.labels[p]=0;
  const r=rebuildOuter(image,{outlineColor:0,sourceShades:new Set([0]),refill:true});assert.equal(r.labels[p],2);
});
test('fully opaque inputs abstain; an explicitly supplied light outline works',()=>{
  const opaque=outlineControls().find(c=>c.id==='opaque-background').image;assert(rebuildOuter(opaque,{outlineColor:0,sourceShades:new Set([0]),refill:true}).abstained);
  const light=outlineControls().find(c=>c.id==='light-border').image,r=rebuildOuter(light,{outlineColor:3,sourceShades:new Set([3]),refill:true});assert(!r.abstained);assert.deepEqual(light.labels,r.labels);
});
