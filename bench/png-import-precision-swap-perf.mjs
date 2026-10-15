// Isolated production BGRA reorder cost. Native decoder/copy is a test double;
// this is not an end-to-end browser PNG timing or an Android measurement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeImageFile} from '../src/lib/image-decode.js';
const sourceHash=createHash('sha256').update(fs.readFileSync('src/lib/image-decode.js')).digest('hex');
const rows=[];let size,source,frame,lastStart,slices,yields,copyFinished;
globalThis.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};
globalThis.ImageDecoder=class{
 static async isTypeSupported(){return true;}
 async decode(){return{image:frame};} close(){}
};
globalThis.MessageChannel=class{
 constructor(){this.port1={close(){}};this.port2={close(){},postMessage:()=>{
  slices.push(performance.now()-lastStart);yields++;
  setImmediate(()=>{lastStart=performance.now();this.port1.onmessage();});
 }};}
};
for(const pixels of [1048576,4194304,16777216]){
 size=Math.sqrt(pixels);source=new Uint8ClampedArray(pixels*4);
 for(let p=0;p<source.length;p+=4){source[p]=83;source[p+1]=43;source[p+2]=29;source[p+3]=p%12===0?1:128;}
 frame={displayWidth:size,displayHeight:size,visibleRect:{width:size,height:size},format:'BGRA',
  colorSpace:{fullRange:true,matrix:'rgb',primaries:'bt709',transfer:'iec61966-2-1'},close(){},
  async copyTo(out,options){out.set(source);copyFinished=lastStart=performance.now();return options.layout;}};
 const runs=[];
 for(let run=0;run<3;run++){
  slices=[];yields=0;const start=performance.now();
  const image=await decodeImageFile({name:'owned.png',type:'image/png',stream:()=>new ReadableStream()});
  const end=performance.now();slices.push(end-lastStart);
  for(let p=0;p<image.data.length;p+=4){assert.equal(image.data[p],29);assert.equal(image.data[p+1],43);assert.equal(image.data[p+2],83);assert.equal(image.data[p+3],source[p+3]);}
  runs.push({totalMs:end-start,reorderAndSchedulingMs:end-copyFinished,maxSynchronousSpanMs:Math.max(...slices),postedYields:yields,exactVisibleRgbAndAlpha:true});
 }
 rows.push({pixels,width:size,height:size,sourceBytes:source.byteLength,additionalOutputBytes:source.byteLength,reorderScratchPixelBytes:0,runs});
}
const report={at:new Date().toISOString(),sourceHash,runtime:process.version,scope:'Isolated production reorder, mocked native decoder/copy; Node posted turns via setImmediate. CPU spans include scheduler call boundaries. Not a hard deadline, browser/phone import benchmark or total heap bound.',rows};
fs.writeFileSync('bench/png-import-precision-review/swap-performance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
