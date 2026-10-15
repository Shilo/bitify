import fs from 'node:fs';
import { png, decode, image, metrics, api, sha, initMcp, rpc } from './api-common.mjs';
const dir=import.meta.dirname, read=n=>fs.readFileSync(`${dir}/api-input-${n}.png`);
const grad=read('gradient'), low=read('low-color'), target=read('target');
const fixtures={
  'target-alpha':png(4,1,x=>[[8,24,32,0],[52,104,86,1],[136,192,112,128],[224,248,208,255]][x]),
  'target-one':png(1,1,()=>[17,51,85,255]),
  'target-257':png(257,1,x=>[x&255,x>>8,128,255]),
  'empty':png(16,16,(x,y)=>[x*16,y*16,128,0]),
  'target-members':png(64,32,(x,y)=>[[8,24,32,255],[52,104,86,255],[136,192,112,255],[224,248,208,255]][x%4]),
  'alpha-gradient':png(64,32,(x,y)=>{const v=Math.round(x*255/63);return[v,v,v,[0,1,64,127,128,192,254,255][y%8]]}),
};
for(const[n,b]of Object.entries(fixtures))fs.writeFileSync(`${dir}/api-input-${n}.png`,b);
const cases=[
 ['target-partial-alpha',{images:[image(grad)],palette_image:image(fixtures['target-alpha'])}],
 ['target-one',{images:[image(grad)],palette_image:image(fixtures['target-one'])}],
 ['target-257',{images:[image(grad)],palette_image:image(fixtures['target-257'])}],
 ['fully-transparent',{images:[image(fixtures.empty)],num_colors:8}],
 ['already-member-dither',{images:[image(fixtures['target-members'])],palette_image:image(target),dithering:'8x8',dithering_strength:10}],
 ['count256',{images:[image(grad)],num_colors:256}],
 ['alpha-count2',{images:[image(fixtures['alpha-gradient'])],num_colors:2}],
 ['target-shared',{images:[image(grad),image(read('shifted-frame'))],palette_image:image(target),dithering:'4x4'}],
];
const all=[];
const scrub=v=>{if(Array.isArray(v))return v.map(scrub);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='base64'?{sha256:sha(Buffer.from(x.replace(/^data:[^,]*,/,''),'base64'))}:scrub(x)]));return v};
for(const[name,body]of cases){const r=await api('/reduce-colors',body);const e={name,request:scrub(body),status:r.status,ms:r.ms};if(r.status===200){e.n_colors=r.result.n_colors;e.usage=r.result.usage;e.images=r.result.images.map((v,i)=>{const b=Buffer.from(v.base64.replace(/^data:[^,]*,/,''),'base64');fs.writeFileSync(`${dir}/api-output-${name}-${i}.png`,b);return metrics(decode(b))});const b=Buffer.from(r.result.palette.base64.replace(/^data:[^,]*,/,''),'base64');fs.writeFileSync(`${dir}/api-palette-${name}.png`,b);e.palette=metrics(decode(b));}else e.error=scrub(r.result);all.push(e);fs.writeFileSync(`${dir}/api-extra-results.json`,JSON.stringify(all,null,2));console.log(name,e.status,e.ms,e.n_colors,e.images?.map(x=>x.visible_colors).join(','),e.error?JSON.stringify(e.error):'');}
await initMcp();
for(const [name,argv]of [['ramp',['palette','--base','skin=#c58c71','--base','wood=#80502f','--steps','4','--hue-shift','10','--full']],['extract',['extract-palette',`data:image/png;base64,${low.toString('base64')}`,'--max-colors','8','--full']]]){const r=await rpc('tools/call',{name:'pixelart_workbench',arguments:{argv}},5);fs.writeFileSync(`${dir}/api-workbench-${name}-result.json`,JSON.stringify(r,null,2));console.log('workbench',name,r.status,JSON.stringify(r.data).slice(0,2500));}
