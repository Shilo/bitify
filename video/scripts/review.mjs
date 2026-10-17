import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const steps=['build','audio','check-layout','render','storyboard','encode','verify'];
for(const step of steps){
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[fileURLToPath(new URL('./'+step+'.mjs',import.meta.url))],{env:{...process.env,TRAILER_REVIEW:'1'},stdio:'inherit',windowsHide:true});
    child.on('error',reject);child.on('close',resolve);
  });
  if(code!==0)process.exit(code||1);
}
