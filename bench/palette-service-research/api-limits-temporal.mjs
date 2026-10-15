// Four bounded follow-up requests: two exact-area images, one oversized validation,
// and two frames differing in one pixel with a fixed target and ordered dither.
import fs from 'node:fs';
import {png,decode,image,metrics,api,sha} from './api-common.mjs';
const dir=import.meta.dirname;
const make=(name,w,h,fn)=>{const b=png(w,h,fn);fs.writeFileSync(`${dir}/api-input-${name}.png`,b);return b};
const cases=[];
for(const[w,h]of[[512,512],[513,513],[1024,256]]){const b=make(`limit-${w}x${h}`,w,h,(x,y)=>x%2?[230,180,70,255]:[30,50,90,255]);cases.push([`limit-${w}x${h}`,{images:[image(b)],num_colors:8}]);}
const grad=fs.readFileSync(`${dir}/api-input-gradient.png`),base=decode(grad),cx=15,cy=15;
const changed=make('one-pixel-change',64,32,(x,y)=>x===cx&&y===cy?[255,0,77,255]:[...base.data.subarray((y*64+x)*4,(y*64+x)*4+4)]);
const target=fs.readFileSync(`${dir}/api-input-target.png`);
cases.push(['temporal-one-pixel',{images:[image(grad),image(changed)],palette_image:image(target),dithering:'4x4',dithering_strength:5}]);
const results=[];
const scrub=v=>{if(Array.isArray(v))return v.map(scrub);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='base64'&&typeof x==='string'?{sha256:sha(Buffer.from(x.replace(/^data:[^,]*,/,''),'base64'))}:scrub(x)]));return v};
for(const[name,body]of cases){const r=await api('/reduce-colors',body);const e={name,request:scrub(body),status:r.status,ms:r.ms};if(r.status===200){e.usage=r.result.usage;e.n_colors=r.result.n_colors;const images=r.result.images.map((v,i)=>{const b=Buffer.from(v.base64.replace(/^data:[^,]*,/,''),'base64');fs.writeFileSync(`${dir}/api-output-${name}-${i}.png`,b);return decode(b)});e.images=images.map(metrics);if(images.length===2){let changedPixels=0,unchangedChurn=0;for(let i=0;i<images[0].data.length;i+=4){const differs=images[0].data.subarray(i,i+4).compare(images[1].data.subarray(i,i+4))!==0;if(differs){changedPixels++;if(i!==((cy*64+cx)*4))unchangedChurn++;}}e.temporal={input_changed_pixels:1,output_changed_pixels:changedPixels,unchanged_coordinate_churn:unchangedChurn,comparison_pixels:2048,changed_coordinate:{x:cx,y:cy}}}}else e.error=scrub(r.result);results.push(e);fs.writeFileSync(`${dir}/api-limits-temporal-results.json`,JSON.stringify(results,null,2));console.log(name,e.status,e.ms,e.n_colors,e.temporal||e.error||e.images.map(x=>`${x.width}x${x.height}`).join(','));}
