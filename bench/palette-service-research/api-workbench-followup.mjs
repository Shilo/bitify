// Free subscriber workbench calls only. No reducer/generation endpoint is used.
// Auth stays in the environment; requests retain fixture hashes rather than data URLs.
import fs from 'node:fs';
import path from 'node:path';
import {initMcp,rpc,png,decode,metrics,sha} from './api-common.mjs';
const dir=import.meta.dirname;
const source=png(16,16,(x,y)=>{const v=x<8?38:188;return[v+(y===8?2:0),v,v,(x+y)%11===0?0:(x+y)%7===0?127:255];});
fs.writeFileSync(path.join(dir,'api-workbench-input.png'),source);
const url='data:image/png;base64,'+source.toString('base64');
const sanitize=value=>typeof value==='string'?value.replaceAll(url,'[owned fixture '+sha(source)+']').replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g,'[image data omitted]'):value;
await initMcp();
const requests=process.argv[2]==='more'?[
 ['extract-palette',url,'--max-colors','8'],
 ['palette','--base','skin=#c58c71','--base','wood=#80502f','--steps','4','--hue-shift','0.1'],
 ['repair',url,'--ops','stray'],
]:[['repair','-h'],['repair',url,'--ops','snap']];
const suffix=process.argv[2]==='more'?'-more':'';
const outputs=[];
for(let n=0;n<requests.length;n++){
 const argv=requests[n],r=await rpc('tools/call',{name:'pixelart_workbench',arguments:{argv,mode:'low',notes:'Review palette-related features and outputs using this original synthetic fixture; no changes to user assets.'}},n+2);
 const record={request:argv.map(sanitize),status:r.status,isError:r.data?.result?.isError,content:[]};
 for(const [i,c]of(r.data?.result?.content??[]).entries()){
  if(c.type==='image'){
   const bytes=Buffer.from(c.data,'base64'),name=`api-workbench-followup${suffix}-${n}-${i}.png`;
   fs.writeFileSync(path.join(dir,name),bytes);record.content.push({type:'image',mimeType:c.mimeType,file:name,metrics:metrics(decode(bytes))});
  }else record.content.push({type:c.type,text:sanitize(c.text)});
 }
 if(r.data?.error)record.error=r.data.error;
 outputs.push(record);console.log(JSON.stringify(record));
}
fs.writeFileSync(path.join(dir,`api-workbench-followup${suffix}-results.json`),JSON.stringify(outputs,null,2)+'\n');
