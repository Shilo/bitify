// Reusing an attached device page accumulates init scripts. They must install
// only one observer, animation loop and canvas wrapper in each new document.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {instrumentation} from './workflows.mjs';
let observers=0,raf=0,nativeWrites=0;
class CanvasContext {constructor(){this.canvas={closest:()=>true}}putImageData(){nativeWrites++}}
const context=vm.createContext({CanvasRenderingContext2D:CanvasContext,PerformanceObserver:class{constructor(){observers++}observe(){}},requestAnimationFrame(){raf++},performance:{now:()=>10}});
vm.runInContext(`(${instrumentation.toString()})();(${instrumentation.toString()})();const c=new CanvasRenderingContext2D();c.putImageData({});globalThis.receipt={writes:__practical.writes,paints:c.canvas.__paintCount};`,context);
assert.equal(observers,1);assert.equal(raf,1);assert.equal(nativeWrites,1);assert.equal(context.receipt.writes,1);assert.equal(context.receipt.paints,1);
await writeFile(new URL('instrumentation-selfcheck.json',import.meta.url),JSON.stringify({pass:true,duplicateInitScripts:2,observers,rafLoops:raf,nativeWrites,recordedWrites:context.receipt.writes,recordedPaints:context.receipt.paints},null,2)+'\n');console.log('PASS idempotent instrumentation');
