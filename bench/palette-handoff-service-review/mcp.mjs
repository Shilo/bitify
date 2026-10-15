// One fresh MCP reduction, at most 0.1 generations at the observed rate.
// MCP saves the owned result to the authenticated account's gallery.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { initMcp, rpc, api, sha } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname,require=createRequire(import.meta.url);
const sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const write=(name,value)=>fs.writeFileSync(`${dir}/${name}`,JSON.stringify(value,null,2)+'\n');
if(fs.existsSync(`${dir}/mcp-result.json`))throw Error('Retained result exists; do not resubmit.');
const input=fs.readFileSync(`${dir}/input-two-color-count8.png`),start=performance.now();
await initMcp();
let submission;
if(fs.existsSync(`${dir}/mcp-submission.json`))submission=JSON.parse(fs.readFileSync(`${dir}/mcp-submission.json`));
else {submission=await rpc('tools/call',{name:'reduce_colors',arguments:{images_base64:[input.toString('base64')],num_colors:8,dithering:'none'}},3);write('mcp-submission.json',submission);}
const text=submission.data?.result?.content?.filter(v=>v.type==='text').map(v=>v.text).join('\n')??'';
const job=submission.data?.result?.structuredContent?.job_id??text.match(/job_id:\s*([\w-]+)/)?.[1];
if(!job)throw Error('No job returned; inspect bounded retained submission.');
let completed;
for(let i=0;i<6;i++){
 const result=await rpc('tools/call',{name:'get_image',arguments:{job_id:job}},4+i);
 const image=result.data?.result?.content?.find(v=>v.type==='image');
 if(image){completed={result,image};break;}
 if(result.data?.result?.isError)throw Error('MCP job error.');
 await new Promise(r=>setTimeout(r,5000));
}
if(!completed)throw Error('Bounded poll exhausted; do not resubmit.');
const bytes=Buffer.from(completed.image.data,'base64');fs.writeFileSync(`${dir}/mcp-two-color-count8.png`,bytes);
const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {data:expected}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let visibleDifferences=0,alphaDifferences=0;for(let p=0;p<data.length;p+=4){alphaDifferences+=data[p+3]!==expected[p+3];if(data[p+3]&&![0,1,2].every(c=>data[p+c]===expected[p+c]))visibleDifferences++;}
const structured=completed.result.data.result.structuredContent??{};
write('mcp-result.json',{at:new Date().toISOString(),inputPngSha256:sha(input),settings:{num_colors:8,dithering:'none'},status:structured.status,frames:structured.frames,chargedGenerations:structured.charged_generations,gallerySaved:structured.asset?.status==='saved',elapsedMs:performance.now()-start,width:info.width,height:info.height,visibleRgbDifferencesFromSource:visibleDifferences,alphaDifferencesFromSource:alphaDifferences,outputPngSha256:sha(bytes),rgbaSha256:sha(data),matchesFreshRestRgba:sha(data)===JSON.parse(fs.readFileSync(`${dir}/comparison.json`)).results.find(r=>r.id==='two-color-count8').service.metrics.rgbaSha256});
const balance=await api('/balance');write('balance-final.json',{status:balance.status,credits:balance.result.credits,subscriptionGenerations:balance.result.subscription?.generations});
console.log('MCP completion',structured.status,'charge',structured.charged_generations,'visible differences',visibleDifferences,'alpha differences',alphaDifferences);
