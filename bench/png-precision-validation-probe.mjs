import {decodeImageFile} from '/engine/image-decode.js';
const out=document.querySelector('#out'),status=document.querySelector('#status'),run=document.querySelector('#run');
const hash=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');
function compare(expected,actual){let alpha=0,rgb=0,max=0,opaque=0;const byAlpha={};
 if(expected.length!==actual.length)return {lengthMismatch:true,expected:expected.length,actual:actual.length};
 for(let p=0;p<expected.length;p+=4){const a=expected[p+3],g=byAlpha[a]??={pixels:0,alpha:0,rgb:0,max:0};g.pixels++;if(a!==actual[p+3]){alpha++;g.alpha++;}if(!a)continue;
 const d=Math.max(Math.abs(expected[p]-actual[p]),Math.abs(expected[p+1]-actual[p+1]),Math.abs(expected[p+2]-actual[p+2]));if(d){rgb++;g.rgb++;g.max=Math.max(g.max,d);max=Math.max(max,d);if(a===255)opaque++;}}
 return {alpha,rgb,max,opaque,byAlpha};
}
async function native(file,raw){let decoder,frame;try{
 decoder=new ImageDecoder({data:file.stream(),type:'image/png',preferAnimation:false,colorSpaceConversion:'default'});frame=(await decoder.decode({frameIndex:0,completeFramesOnly:true})).image;
 const metadata={format:frame.format,width:frame.displayWidth,height:frame.displayHeight,visibleRect:frame.visibleRect.toJSON(),rotation:frame.rotation,flip:frame.flip,colorSpace:frame.colorSpace.toJSON()};
 const cs=metadata.colorSpace;metadata.rawEligible=['RGBA','BGRA'].includes(frame.format)&&cs.primaries==='bt709'&&cs.transfer==='iec61966-2-1'&&cs.matrix==='rgb'&&cs.fullRange===true&&!frame.rotation&&!frame.flip&&!frame.visibleRect.x&&!frame.visibleRect.y&&frame.visibleRect.width===frame.displayWidth&&frame.visibleRect.height===frame.displayHeight;
 const opts=raw?{}:{format:'RGBA',colorSpace:'srgb',layout:[{offset:0,stride:frame.displayWidth*4}]},bytes=new Uint8Array(frame.allocationSize(opts)),layout=await frame.copyTo(bytes,opts);metadata.layout=layout;
 let data=bytes;
 if(raw){if(!['RGBA','BGRA','RGBX','BGRX'].includes(frame.format))throw Error('Raw format not packed8 RGB: '+frame.format);data=new Uint8Array(frame.displayWidth*frame.displayHeight*4);const plane=layout[0],bg=frame.format.startsWith('BG'),xalpha=frame.format.endsWith('X');
 for(let y=0;y<frame.displayHeight;y++)for(let x=0;x<frame.displayWidth;x++){const a=plane.offset+y*plane.stride+x*4,p=(y*frame.displayWidth+x)*4;data[p]=bytes[a+(bg?2:0)];data[p+1]=bytes[a+1];data[p+2]=bytes[a+(bg?0:2)];data[p+3]=xalpha?255:bytes[a+3];}}
 return{data,metadata,width:frame.displayWidth,height:frame.displayHeight};
}finally{frame?.close();decoder?.close();}}
run.onclick=async()=>{run.disabled=true;const report={device:new URL(location.href).searchParams.get('device')??'unknown',started:new Date().toISOString(),userAgent:navigator.userAgent,scope:'Independent authored PNG samples versus production and native controls. Browser-managed cases compare raw with explicit conversion without asserting authored bytes are sRGB. Invalid cases record tolerance. Huge metadata-only fixture never decoded.',cases:[]};
try{report.dependencies=await fetch('/dependencies',{cache:'no-store'}).then(r=>r.json());const manifest=await fetch('/fixtures/manifest.json').then(r=>r.json());
for(const f of manifest.fixtures){const row={id:f.id,oraclePolicy:f.oraclePolicy,methods:[]};if(f.oraclePolicy==='metadata-only'){row.skipped='Declared huge geometry; never passed to native decoder';report.cases.push(row);continue;}
const source=await fetch('/fixtures/'+f.file).then(r=>r.arrayBuffer());if(await hash(source)!==f.sha256)throw Error('PNG fixture hash mismatch');const file=new File([source],f.file,{type:'image/png'});
let expected;if(f.authoredRgbaFile&&f.oraclePolicy==='exact-srgb8'){expected=new Uint8Array(await fetch('/fixtures/'+f.authoredRgbaFile).then(r=>r.arrayBuffer()));if(await hash(expected)!==f.authoredRgbaSha256)throw Error('Oracle changed');}
const outputs={};for(const[name,method]of [['production',file=>decodeImageFile(file)],['native-explicit',file=>native(file,false)],['native-raw',file=>native(file,true)]]){status.textContent=f.id+' / '+name;const start=performance.now();try{const value=await method(file);outputs[name]=value;row.methods.push({name,ok:true,ms:performance.now()-start,width:value.width,height:value.height,hash:await hash(value.data),metadata:value.metadata,...(expected?{authored:compare(expected,value.data)}:{})});}catch(error){row.methods.push({name,ok:false,ms:performance.now()-start,error:{name:error.name,message:error.message}});}await new Promise(r=>setTimeout(r,0));}
if(outputs['native-raw']&&outputs['native-explicit'])row.rawVersusExplicit=compare(outputs['native-explicit'].data,outputs['native-raw'].data);
if(outputs.production&&outputs['native-explicit'])row.productionVersusExplicit=compare(outputs['native-explicit'].data,outputs.production.data);
report.cases.push(row);out.textContent=JSON.stringify(report,null,2);}
report.dependenciesAfter=await fetch('/dependencies',{cache:'no-store'}).then(r=>r.json());report.dependenciesStable=JSON.stringify(report.dependencies)===JSON.stringify(report.dependenciesAfter);if(!report.dependenciesStable)throw Error('Dependencies changed during corpus run');report.completed=true;status.textContent='Independent corpus complete';
}catch(error){report.error={name:error.name,message:error.message};report.completed=false;}finally{report.finished=new Date().toISOString();window.pngCorpusReport=report;out.textContent=JSON.stringify(report,null,2);await fetch('/report',{method:'POST',body:JSON.stringify(report)});run.disabled=false;}};
