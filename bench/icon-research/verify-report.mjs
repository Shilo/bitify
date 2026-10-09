// Validate generated report script/data without browser automation.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const report=readFileSync(`${import.meta.dirname}/report.html`,'utf8');
class Element {
 constructor(){this.options=[];this.children=[];this.style={};this.value='';this.textContent='';this.events={};}
 set innerHTML(v){this.children=[];this.options=[];this.value='';}
 add(o){this.options.push(o);if(this.options.length===1)this.value=o.value;}
 append(...children){this.children.push(...children);}
 addEventListener(event,fn){this.events[event]=fn;}
 getContext(){return {createImageData:()=>({data:new Uint8ClampedArray(1024)}),putImageData(){}};}
}
const nodes=new Map();
for(const id of ['item','variant','methodA','methodB','background','samples','sampleStats','sweep','sweepValue','sweepSamples','researchData','methodNames'])nodes.set(id,new Element());
for(const id of ['researchData','methodNames'])nodes.get(id).textContent=report.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))[1];
nodes.get('background').value='checker';nodes.get('sweep').value='60';
const document={getElementById:id=>nodes.get(id),createElement:()=>new Element(),createTextNode:t=>({textContent:t})};
const script=[...report.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
vm.runInNewContext(script,{document,Option:function(text,value){this.text=text;this.value=value;}});
let comparisons=0;
for(const item of nodes.get('item').options){
 nodes.get('item').value=item.value;nodes.get('item').events.change();
 for(const variant of nodes.get('variant').options){
  nodes.get('variant').value=variant.value;nodes.get('variant').events.change();
  for(const method of nodes.get('methodB').options){
   nodes.get('methodB').value=method.value;nodes.get('methodB').events.change();comparisons++;
  }
 }
}
for(const value of ['dark','light','checker']){nodes.get('background').value=value;nodes.get('background').events.change();}
for(let t=1;t<=254;t++){nodes.get('sweep').value=String(t);nodes.get('sweep').events.input();}
console.log(`Report script/data passed: ${comparisons} item/variant/method combinations; all 254 sweep positions; three backgrounds. This is a DOM stub check, not visual browser QA.`);
