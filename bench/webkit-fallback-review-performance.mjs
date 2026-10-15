// Bounded Windows WebKit native import controls, not app FPS or a heap benchmark.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
process.env.PLAYWRIGHT_BROWSERS_PATH??='C:/Users/shilo/AppData/Local/ms-playwright';
const require=createRequire(import.meta.url),runtime='C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {webkit}=require(runtime+'playwright'),sharp=require(runtime+'sharp'),hash=data=>createHash('sha256').update(data).digest('hex');
const dir='bench/webkit-fallback-review';fs.mkdirSync(dir,{recursive:true});
const report={scope:'Windows Playwright WebKit native controls; three repetitions each1/4MP; source transfer and independent hash scoring outside import timing; not app FPS, phone or total heap',platform:process.platform,started:new Date().toISOString(),fixtures:[]};
const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext(),page=await context.newPage();await page.goto('http://127.0.0.1:5298/');report.browserVersion=browser.version();
 for(const side of [1024,2048]){
  const source=Buffer.alloc(side*side*4),alphas=[0,1,64,127,128,192,254,255];
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){const p=(y*side+x)*4;source.set([x&255,y&255,(x+y)&255,alphas[(x+y)%8]],p);}
  const png=await sharp(source,{raw:{width:side,height:side,channels:4}}).png().toBuffer();
  const normalized=Buffer.from(source);for(let p=0;p<normalized.length;p+=4)if(!normalized[p+3])normalized.fill(0,p,p+3);
  const expected=hash(normalized),result=await page.evaluate(async fixture=>{
   const file=new File([new Uint8Array(fixture.bytes)],'owned-'+fixture.side+'.png',{type:'image/png'}),rows=[];
   const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
   for(let repetition=0;repetition<3;repetition++)for(const method of (repetition%2?['html-webgl','bitmap-canvas8']:['bitmap-canvas8','html-webgl'])){
    let image,url,canvas,gl,texture,framebuffer,rgba;const start=performance.now(),stages={};
    try{
     let at=performance.now();
     if(method==='html-webgl'){image=new Image();url=URL.createObjectURL(file);await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Owned image rejected'));image.src=url;});}
     else image=await createImageBitmap(file);
     stages.decodeMs=performance.now()-at;canvas=document.createElement('canvas');
     if(method==='html-webgl'){
      canvas.width=canvas.height=1;at=performance.now();gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL unavailable');stages.contextMs=performance.now()-at;
      if(fixture.side>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('Native texture limit');texture=gl.createTexture();framebuffer=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.BROWSER_DEFAULT_WEBGL);if('unpackColorSpace'in gl)gl.unpackColorSpace='srgb';gl.disable(gl.BLEND);
      at=performance.now();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);stages.uploadMs=performance.now()-at;gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete owned framebuffer');rgba=new Uint8Array(fixture.side*fixture.side*4);
      at=performance.now();gl.readPixels(0,0,fixture.side,fixture.side,gl.RGBA,gl.UNSIGNED_BYTE,rgba);stages.readPixelsMs=performance.now()-at;if(gl.getError()!==gl.NO_ERROR)throw Error('Native GL error');
     }else{
      canvas.width=canvas.height=fixture.side;const ctx=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});let at=performance.now();ctx.drawImage(image,0,0);stages.drawMs=performance.now()-at;at=performance.now();rgba=ctx.getImageData(0,0,fixture.side,fixture.side).data;stages.readPixelsMs=performance.now()-at;
     }
     const importMs=performance.now()-start;
     // Normalize only immaterial hidden RGB, after the measured native import.
     let alphaMismatches=0,visibleRgbMismatches=0;for(let y=0;y<fixture.side;y++)for(let x=0;x<fixture.side;x++){const p=(y*fixture.side+x)*4,a=[0,1,64,127,128,192,254,255][(x+y)%8];alphaMismatches+=rgba[p+3]!==a;if(a)visibleRgbMismatches+=rgba[p]!== (x&255)||rgba[p+1]!== (y&255)||rgba[p+2]!== ((x+y)&255);else rgba[p]=rgba[p+1]=rgba[p+2]=0;}
     rows.push({repetition,method,importMs,stages,alphaMismatches,visibleRgbMismatches,normalizedRgbaSha256:await digest(rgba),exact:alphaMismatches===0&&visibleRgbMismatches===0});
    }catch(error){rows.push({repetition,method,ok:false,error:error.message});}
    finally{if(gl){if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture)gl.deleteTexture(texture);gl.getExtension('WEBGL_lose_context')?.loseContext();}if(canvas)canvas.width=canvas.height=0;if(url){image.src='';URL.revokeObjectURL(url);}else image?.close();}
    await new Promise(resolve=>setTimeout(resolve,40));
   }
   return rows;
  },{side,bytes:[...png]});
  for(const row of result)if(row.method==='html-webgl'&&row.exact&&row.normalizedRgbaSha256!==expected)throw Error('Independent normalized hash disagreed');
  report.fixtures.push({side,pixels:side*side,pngBytes:png.length,sourcePngSha256:hash(png),expectedNormalizedRgbaSha256:expected,rows:result});
  console.log(JSON.stringify({side,pngBytes:png.length,rows:result.map(r=>({method:r.method,repetition:r.repetition,total:r.importMs,stages:r.stages,exact:r.exact,error:r.error}))}));
 }
 report.completed=true;
}catch(error){report.completed=false;report.error={message:error.message,stack:error.stack};process.exitCode=1;}
finally{await browser.close();report.finished=new Date().toISOString();fs.writeFileSync(dir+'/native-performance.json',JSON.stringify(report,null,2)+'\n');}
