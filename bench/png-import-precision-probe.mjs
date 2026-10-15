import {decodeImageFile} from '../src/lib/image-decode.js';
export {decodeImageFile};
const run=document.querySelector('#run'),status=document.querySelector('#status'),out=document.querySelector('#out'),device=document.querySelector('#device');
const selected=new URL(location.href).searchParams.get('device');if([...device.options].some(o=>o.value===selected))device.value=selected;
const hash=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');
const bytes64=bytes=>{let value='';for(let at=0;at<bytes.length;at+=4096)value+=String.fromCharCode(...bytes.subarray(at,at+4096));return btoa(value);};
const display=value=>JSON.stringify(value,(key,item)=>key==='actualRgbaBase64'?undefined:item,2);
function compare(expected,actual,width,height){
 const byAlpha={},examples=[];let alpha=0,rgb=0,max=0,hidden=0;
 for(let p=0;p<expected.length;p+=4){const a=expected[p+3],g=byAlpha[a]??={pixels:0,alphaMismatches:0,visibleRgbMismatches:0,maxChannelDelta:0};g.pixels++;
  if(actual[p+3]!==a){alpha++;g.alphaMismatches++;}const delta=Math.max(...[0,1,2].map(c=>Math.abs(expected[p+c]-actual[p+c])));
  if(!a){hidden+=delta>0;continue;}if(delta){rgb++;g.visibleRgbMismatches++;max=Math.max(max,delta);g.maxChannelDelta=Math.max(g.maxChannelDelta,delta);if(examples.length<8)examples.push({x:p/4%width,y:Math.floor(p/4/width),expected:[...expected.subarray(p,p+4)],actual:[...actual.subarray(p,p+4)]});}
 }
 return{width,height,alphaMismatches:alpha,visibleRgbMismatches:rgb,maxChannelDelta:max,hiddenRgbChanges: hidden,exactVisibleRgba:!alpha&&!rgb,byAlpha,examples};
}
function rgba(image){return{width:image.width,height:image.height,data:new Uint8Array(image.data.buffer,image.data.byteOffset,image.data.byteLength)};}
async function native(file,{stream=true,explicit=true,colorSpaceConversion='default'}={}){
 if(typeof ImageDecoder==='undefined')throw Error('ImageDecoder absent');
 if(!await ImageDecoder.isTypeSupported('image/png'))throw Error('PNG ImageDecoder unsupported');
 let decoder,frame;try{
  decoder=new ImageDecoder({data:stream?file.stream():await file.arrayBuffer(),type:'image/png',preferAnimation:false,colorSpaceConversion});
  frame=(await decoder.decode({frameIndex:0,completeFramesOnly:true})).image;
  const metadata={format:frame.format,width:frame.displayWidth,height:frame.displayHeight,visibleRect:{x:frame.visibleRect.x,y:frame.visibleRect.y,width:frame.visibleRect.width,height:frame.visibleRect.height},rotation:frame.rotation,flip:frame.flip,colorSpace:frame.colorSpace?.toJSON?.()};
  const options=explicit?{format:'RGBA',colorSpace:'srgb',layout:[{offset:0,stride:frame.displayWidth*4}]}:{};
  const size=frame.allocationSize(options),raw=new Uint8Array(size),layout=await frame.copyTo(raw,options);metadata.copyLayout=layout;
  let data=raw;
  if(!explicit){
   if(!['RGBA','BGRA','RGBX','BGRX'].includes(frame.format))throw Error('Native-format output is '+frame.format+'; packed RGB comparison unavailable');
   const width=frame.displayWidth,height=frame.displayHeight,plane=layout[0];data=new Uint8Array(width*height*4);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=plane.offset+y*plane.stride+x*4,to=(y*width+x)*4,bgra=frame.format.startsWith('BG');data[to]=raw[at+(bgra?2:0)];data[to+1]=raw[at+1];data[to+2]=raw[at+(bgra?0:2)];data[to+3]=frame.format.endsWith('X')?255:raw[at+3];}
   metadata.channelNormalization='Packed native '+frame.format+' → RGBA channel order only; no RGB arithmetic or color-space conversion';
  }
  return{width:frame.displayWidth,height:frame.displayHeight,data,metadata};
 }finally{frame?.close();decoder?.close();}
}
async function bitmapVideo(file){
 if(typeof VideoFrame==='undefined')throw Error('VideoFrame absent');let bitmap,frame;
 try{bitmap=await createImageBitmap(file,{premultiplyAlpha:'none',colorSpaceConversion:'default'});frame=new VideoFrame(bitmap,{timestamp:0,alpha:'keep'});const data=new Uint8Array(bitmap.width*bitmap.height*4);await frame.copyTo(data,{format:'RGBA',colorSpace:'srgb',layout:[{offset:0,stride:bitmap.width*4}]});return{width:bitmap.width,height:bitmap.height,data,metadata:{format:frame.format,colorSpace:frame.colorSpace?.toJSON?.()}};}finally{frame?.close();bitmap?.close();}
}
async function bitmapCanvas(file,{premultiplyAlpha='default',float16=false}={}){
 let bitmap,canvas;try{
  bitmap=await createImageBitmap(file,{premultiplyAlpha,colorSpaceConversion:'default'});canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb',...(float16?{colorType:'float16'}:{})});if(!context)throw Error('Canvas context unavailable');
  const attributes=context.getContextAttributes?.();if(float16&&attributes?.colorType!=='float16')throw Error('Canvas float16 backing unsupported: '+JSON.stringify(attributes));
  context.drawImage(bitmap,0,0);const image=context.getImageData(0,0,bitmap.width,bitmap.height,{colorSpace:'srgb',...(float16?{pixelFormat:'rgba-float16'}:{})});
  if(float16&&image.data.constructor.name!=='Float16Array')throw Error('Float16 readback unsupported: '+image.data.constructor.name);
  const data=float16?Uint8Array.from(image.data,n=>Math.max(0,Math.min(255,Math.round(n*255)))):new Uint8Array(image.data.buffer,image.data.byteOffset,image.data.byteLength);
  return{width:bitmap.width,height:bitmap.height,data,metadata:{attributes,readbackArray:image.data.constructor.name,imageColorSpace:image.colorSpace}};
 }finally{bitmap?.close();if(canvas){canvas.width=canvas.height=0;}}
}
run.addEventListener('click',async()=>{
 if(run.disabled)return;run.disabled=true;
 const report={device:device.value,started:new Date().toISOString(),userAgent:navigator.userAgent,scope:'Read-only owned PNG decode controls. Production path runs uninstrumented. Direct controls report their actual native errors. Matching outputs do not alone prove which hidden production fallback ran.',capabilities:{secureContext:isSecureContext,ImageDecoder:typeof ImageDecoder,VideoFrame:typeof VideoFrame,createImageBitmap:typeof createImageBitmap,Float16Array:typeof Float16Array,DecompressionStream:typeof DecompressionStream},fixtures:[]};
 try{
  if(typeof ImageDecoder!=='undefined')try{report.capabilities.pngSupported=await ImageDecoder.isTypeSupported('image/png');}catch(error){report.capabilities.pngSupportError=error.message;}
  report.build=await fetch('/build-record.json',{cache:'no-store'}).then(r=>r.json());
  const manifest=await fetch('/fixtures/manifest.json',{cache:'no-store'}).then(r=>r.json());
  const methods=[['production',file=>decodeImageFile(file).then(rgba)],['native-stream-rgba',file=>native(file)],['native-buffer-rgba',file=>native(file,{stream:false})],['native-buffer-nativeformat',file=>native(file,{stream:false,explicit:false})],['native-noneconversion',file=>native(file,{stream:false,colorSpaceConversion:'none'})],['bitmap-default-canvas8',file=>bitmapCanvas(file)],['bitmap-none-canvas8',file=>bitmapCanvas(file,{premultiplyAlpha:'none'})],['bitmap-none-videoframe',bitmapVideo],['bitmap-none-canvas16',file=>bitmapCanvas(file,{premultiplyAlpha:'none',float16:true})]];
  for(const fixture of manifest){
   const raw=await fetch('/fixtures/'+fixture.file,{cache:'no-store'}).then(r=>r.arrayBuffer()),source=new Uint8Array(raw);if(await hash(raw)!==fixture.pngSha256)throw Error('Owned fixture hash changed');
   const file=new File([raw],fixture.file,{type:'image/png'}),expected=Uint8Array.from(fixture.expectedRgba),row={id:fixture.id,width:fixture.width,height:fixture.height,sourcePngSha256:fixture.pngSha256,oracle:fixture.oracle,methods:[]};
   for(const[name,method]of methods){status.textContent=fixture.id+' / '+name;const start=performance.now();
    try{const result=await method(file);if(result.width!==fixture.width||result.height!==fixture.height||result.data.length!==expected.length)throw Error('Unexpected output dimensions/layout');row.methods.push({name,ok:true,ms:performance.now()-start,metadata:result.metadata,...compare(expected,result.data,result.width,result.height),rgbaSha256:await hash(result.data),actualRgbaBase64:bytes64(result.data)});}catch(error){row.methods.push({name,ok:false,ms:performance.now()-start,error:{name:error.name,message:error.message}});}
    out.textContent=display({...report,currentFixture:row});await new Promise(resolve=>setTimeout(resolve,0));
   }
   report.fixtures.push(row);
  }
  report.completed=true;status.textContent='Completed decoder diagnostics';
 }catch(error){report.completed=false;report.error={name:error.name,message:error.message};status.textContent='Failed: '+error.message;}
 finally{report.finished=new Date().toISOString();window.pngPrecisionReport=report;out.textContent=display(report);await fetch('/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)}).catch(()=>{});run.disabled=false;}
});
