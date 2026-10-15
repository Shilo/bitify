import fs from 'node:fs';
import {png,decode,metrics,sha} from './api-common.mjs';
const dir=import.meta.dirname,read=n=>decode(fs.readFileSync(`${dir}/api-output-${n}-0.png`));
const original=decode(fs.readFileSync(`${dir}/api-input-gradient.png`));
const names=['count8','count2','bw-none','bw-2x2','bw-4x4','bw-8x8','bw-strength0','bw-strength10'];
const images=names.map(read),none=read('bw-none');
function compare(a,b){let changed=0,mse=0;for(let i=0;i<a.data.length;i+=4){if(a.data.subarray(i,i+4).compare(b.data.subarray(i,i+4)))changed++;for(let k=0;k<3;k++)mse+=(a.data[i+k]-b.data[i+k])**2}return{changed_pixels:changed,rmse:Math.sqrt(mse/(a.width*a.height*3))}}
function blockError(a,b,size){let sum=0,n=0;for(let y=0;y<a.height;y+=size)for(let x=0;x<a.width;x+=size){let sa=0,sb=0,count=0;for(let dy=0;dy<size&&y+dy<a.height;dy++)for(let dx=0;dx<size&&x+dx<a.width;dx++){const i=((y+dy)*a.width+x+dx)*4;sa+=a.data[i];sb+=b.data[i];count++}sum+=(sa/count-sb/count)**2;n++}return Math.sqrt(sum/n)}
const report=names.map((n,i)=>({name:n,...compare(original,images[i]),changed_vs_no_dither:compare(none,images[i]).changed_pixels,block4_rmse:blockError(original,images[i],4),block8_rmse:blockError(original,images[i],8)}));
const results=JSON.parse(fs.readFileSync(`${dir}/api-results.json`));
const facts={dither:report,auto_repeat_identical:results[0].images[0].rgba_sha256===results[1].images[0].rgba_sha256,strength_zero_equals_none:compare(none,read('bw-strength0')).changed_pixels===0,exact_members_unchanged:sha(decode(fs.readFileSync(`${dir}/api-input-target-members.png`)).data)===sha(read('already-member-dither').data)};
fs.writeFileSync(`${dir}/api-analysis.json`,JSON.stringify(facts,null,2));console.log(JSON.stringify(facts,null,2));
const rows=['gradient','count8','count2','bw-none','bw-2x2','bw-4x4','bw-8x8','bw-strength10'].map(n=>n==='gradient'?original:read(n));
const sheet=png(512,512,(x,y)=>{const col=Math.floor(x/256),row=Math.floor(y/128),im=rows[row*2+col],sx=Math.floor((x%256)/4),sy=Math.floor((y%128)/4);return[...im.data.subarray((sy*64+sx)*4,(sy*64+sx)*4+4)]});
fs.writeFileSync(`${dir}/api-reduction-comparison.png`,sheet);
// Remove bulky base64 echoes inside validation errors; fixture hashes are sufficient.
const scrub=v=>{if(Array.isArray(v))return v.map(scrub);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='base64'&&typeof x==='string'?{sha256:sha(Buffer.from(x.replace(/^data:[^,]*,/,''),'base64'))}:scrub(x)]));return v};
fs.writeFileSync(`${dir}/api-results.json`,JSON.stringify(scrub(results),null,2));
