// Candidate-metric fingerprints of a public black-box service, not implementation claims.
import fs from 'node:fs';
import {png,decode,image,metrics,api} from './api-common.mjs';
const dir=import.meta.dirname;
const colors=[[8,24,32],[52,104,86],[136,192,112],[224,248,208],[126,37,83],[255,0,77],[255,236,39],[41,173,255]];
const src=png(64,64,(x,y)=>{const n=y*64+x;return[(n&15)*17,((n>>4)&15)*17,((n>>8)&15)*17,255]});
const pal=png(colors.length,1,x=>[...colors[x],255]);
fs.writeFileSync(`${dir}/api-input-colorcube.png`,src);fs.writeFileSync(`${dir}/api-input-metric-target.png`,pal);
const r=await api('/reduce-colors',{images:[image(src)],palette_image:image(pal)});
if(r.status!==200)throw new Error('Metric test failed '+r.status);
const b=Buffer.from(r.result.images[0].base64.replace(/^data:[^,]*,/,''),'base64');fs.writeFileSync(`${dir}/api-output-colorcube-0.png`,b);
const input=decode(src),output=decode(b);
const linear=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
const oklab=c=>{const[r,g,b]=linear(c),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]};
const cielab=c=>{const[r,g,b]=linear(c),f=t=>t>216/24389?Math.cbrt(t):841/108*t+4/29,x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);return[116*y-16,500*(x-y),200*(y-z)]};
const candidates={encodedRGB:c=>c,linearRGB:linear,Oklab:oklab,CIELabD65:cielab};
const report={status:r.status,ms:r.ms,usage:r.result.usage,output:metrics(output),candidate_metrics:{}};
for(const[name,convert]of Object.entries(candidates)){const p=colors.map(convert);let mismatch=0;for(let i=0;i<input.data.length;i+=4){const c=convert([...input.data.subarray(i,i+3)]);let best=0,dmin=Infinity;for(let j=0;j<p.length;j++){const d=c.reduce((s,v,k)=>s+(v-p[j][k])**2,0);if(d<dmin){best=j;dmin=d}}if(colors[best].some((v,k)=>v!==output.data[i+k]))mismatch++}report.candidate_metrics[name]={mismatch_pixels:mismatch,total_pixels:4096,agreement:1-mismatch/4096}}
fs.writeFileSync(`${dir}/api-matching-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.candidate_metrics));
