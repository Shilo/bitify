// Offline analysis only. Never launches a browser or calls a service.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decode,metrics,sha} from './api-common.mjs';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
import {fullPaletteImage} from '../../src/lib/palette-state.js';
import {captureGeneratedSources} from '../../src/lib/palette-generated-sources.js';
import {generatePaletteAsync} from '../../src/lib/palette-generated.js';
import {palettePngBytesAsync} from '../../src/lib/save.js';
const dir=import.meta.dirname;
const read=name=>fs.readFileSync(path.join(dir,name));
const sourceBytes=read('api-input-gradient.png'),source=decode(sourceBytes);
assert.equal(sha(sourceBytes),'6d0a9315b0c6bc0c4e86e05c2b21af7dbde71df8a23d48900e16455d2bbffe6f');
const report={source:{file:'api-input-gradient.png',pngSha256:sha(sourceBytes),rgbaSha256:sha(source.data),width:source.width,height:source.height},cases:[]};
const web=decode(read('web-output-verification-download-0.png')),rest=decode(read('api-output-count2-0.png'));
assert.equal(web.width,64);assert.equal(web.height,32);assert.equal(metrics(web).visible_colors,2);
assert.deepEqual(metrics(web).alpha_histogram,{'255':2048});
assert.ok(web.data.equals(rest.data));assert.ok(read('web-output-verification-download-0.png').equals(read('api-output-count2-0.png')));
const item={name:'website-owned-ramp.png',original:source};
async function local(colors,maxColors,dither='none',tag=''){
 const converted=await fullPaletteImage(item,{colors,name:'Comparison',alphaCut:128,metric:'oklab',maxColors,cleanup:false,dither,ditherStrength:50});
 const bytes=await palettePngBytesAsync(converted),decoded=decode(Buffer.from(bytes));
 const file=`web-independent-ours-${tag?tag+'-':''}${maxColors}-${dither}.png`;fs.writeFileSync(path.join(dir,file),bytes);
 return{file,settings:{metric:'oklab',maxColors,cleanup:false,dither,ditherStrength:50,alphaCut:128},eligibleColors:converted.colors,...metrics(decoded)};
}
function differentRgbPixels(a,b){let n=0;for(let p=0;p<a.data.length;p+=4)if([0,1,2].some(c=>a.data[p+c]!==b.data[p+c]))n++;return n;}
function spatialPattern(im){
 let varyingColumns=0;const periods={};
 for(let x=0;x<im.width;x++){const values=new Set();for(let y=0;y<im.height;y++)values.add(im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+3).toString('hex'));varyingColumns+=values.size>1;}
 for(const step of [1,2,4,8]){let mismatches=0;for(let y=step;y<im.height;y++)for(let x=0;x<im.width;x++){const a=(y*im.width+x)*4,b=((y-step)*im.width+x)*4;if([0,1,2].some(c=>im.data[a+c]!==im.data[b+c]))mismatches++;}periods[step]=mismatches;}
 return{varyingColumns,verticalPeriodMismatches:periods};
}
const auto=(await generatePaletteAsync(captureGeneratedSources([item],128))).colors;
report.cases.push({name:'website-count2-none',file:'web-output-verification-download-0.png',website:metrics(web),sameOwnedSourceAsRetainedRest:true,pixelIdenticalToRetainedRestCount2:true,pngByteIdenticalToRetainedRestCount2:true,localActualAuto64ThenCap2:await local(auto,2,'none','auto64'),scope:'One exact fixture agrees across website and retained REST; this does not identify or equate endpoint algorithms.'});
if(!process.argv.includes('--count-only')){
 const file='web-output-verification-download-1.png',output=decode(read(file));
 const pico=FULL_PRESETS.find(p=>p.id==='preset-pico8');
 assert.equal(output.width,source.width);assert.equal(output.height,source.height);
 assert.ok(metrics(output).visible_colors<=8);assert.deepEqual(metrics(output).alpha_histogram,{'255':2048});
 const palette=new Set(pico.colors),used=Object.keys(metrics(output).color_histogram);
 assert.ok(used.every(c=>palette.has(c)),'Output outside canonical PICO-8 RGB values');
 const off=await local(pico.colors,8),dither=await local(pico.colors,8,'4x4');
 report.cases.push({name:'website-pico8-cap8-none',file,website:metrics(output),outputRgbBelongsToCanonicalPico8:true,localMatchedPaletteCapOff:{...off,differentRgbPixelsVsWebsite:differentRgbPixels(output,decode(read(off.file)))},localAdditionalCapAndDitherOption:{...dither,differentRgbPixelsVsWebsite:differentRgbPixels(output,decode(read(dither.file)))},scope:'Website target plus cap with dithering None; six used colors do not establish a binding eight-color cap. Local cap plus4x4 strength50 is an additional option, not a calibrated paired method because website rejected target+cap+dither.'});
}
if(!process.argv.includes('--count-only')){
 const file='web-output-verification-download-2.png',output=decode(read(file)),pico=FULL_PRESETS.find(p=>p.id==='preset-pico8');
 assert.equal(output.width,source.width);assert.equal(output.height,source.height);assert.deepEqual(metrics(output).alpha_histogram,{'255':2048});
 assert.ok(Object.keys(metrics(output).color_histogram).every(c=>pico.colors.includes(c)));
 const off=await local(pico.colors,0),dither=await local(pico.colors,0,'4x4');
 const pattern=spatialPattern(output);assert.equal(pattern.verticalPeriodMismatches[4],0);assert.ok(pattern.varyingColumns>0);
 report.cases.push({name:'website-pico8-all-4x4-strength5',file,website:metrics(output),observedSpatialPattern:pattern,outputRgbBelongsToCanonicalPico8:true,localPaletteAllOff:{...off,differentRgbPixelsVsWebsite:differentRgbPixels(output,decode(read(off.file)))},localNativeDither50:{...dither,differentRgbPixelsVsWebsite:differentRgbPixels(output,decode(read(dither.file)))},scope:'Same owned source and named PICO8 target, no maximum. Used RGB membership matches canonical PICO8; unused website preset entries were not exported. Website4x4 strength5 versus local4x4 native50 is an uncalibrated native-default comparison, with localOff retained as a control. The website earlier None output also had cap8, so its pixel differences do not isolate dithering alone.'});
}
if(!process.argv.includes('--count-only')){
 const file='web-output-verification-download-3.png',output=decode(read(file)),pico=FULL_PRESETS.find(p=>p.id==='preset-pico8'),larger=decode(read('web-output-verification-download-1.png'));
 assert.equal(output.width,source.width);assert.equal(output.height,source.height);assert.deepEqual(metrics(output).alpha_histogram,{'255':2048});
 assert.equal(metrics(output).visible_colors,2);assert.equal(metrics(larger).visible_colors,6);
 assert.ok(Object.keys(metrics(output).color_histogram).every(c=>pico.colors.includes(c)));
 const off=await local(pico.colors,2);
 report.cases.push({name:'website-pico8-cap2-none',file,website:metrics(output),outputRgbBelongsToCanonicalPico8:true,bindingCapComparison:{sameOwnedInput:true,sameNamedPalette:true,sameDitherNone:true,cap8UsedColors:6,cap2UsedColors:2,capChangedOutput:true},localMatchedPaletteCapOff:{...off,differentRgbPixelsVsWebsite:differentRgbPixels(output,decode(read(off.file)))},scope:'Only requested target maximum changed from8 to2 versus the retained website PICO8 None output;6 becomes2 colors, verifying a binding cap for this fixture.'});
}
report.limits=['Website request attribution and selected controls are recorded by the separate browser driver.','The website rejected target+cap+4x4 in client validation; no output is fabricated from that rejected attempt.','This opaque still fixture cannot establish partial-alpha, multi-source, animation or GIF export behavior.','Local50 and service5 are native settings, not mathematically calibrated equivalent strengths.'];
for(const row of report.cases)for(const value of Object.values(row))if(value?.eligibleColors&&value.file)assert.equal(sha(decode(read(value.file)).data),value.rgba_sha256,'Saved local file differs from its retained analysis');
fs.writeFileSync(path.join(dir,'web-output-independent-analysis.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
