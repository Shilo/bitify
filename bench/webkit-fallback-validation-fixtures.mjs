// Independent owned narrow-PNG adversaries. Never imports production PNG code.
// `policy` records the abandoned custom-pixel-decoder gate, NOT native GL
// eligibility: native decoding may tolerate a corrupt CRC as it did before.
import fs from 'node:fs';
import path from 'node:path';
import {crc32,deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const fixtureDirectory=path.join(import.meta.dirname,'webkit-fallback-validation-fixtures');
const sig=Buffer.from([137,80,78,71,13,10,26,10]);
export function chunk(type,data=Buffer.alloc(0)){const body=Buffer.concat([Buffer.from(type),data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),out.length-4);return out;}
function ihdr(w=13,h=11,{depth=8,type=6,compression=0,filter=0,interlace=0}={}){const b=Buffer.alloc(13);b.writeUInt32BE(w,0);b.writeUInt32BE(h,4);b.set([depth,type,compression,filter,interlace],8);return chunk('IHDR',b);}
function file(chunks){return Buffer.concat([sig,...chunks]);}
const srgb=chunk('sRGB',Buffer.from([0])),end=chunk('IEND');
const width=13,height=11,rgba=Buffer.from(Array.from({length:width*height},(_,p)=>[29+p%5,43+Math.floor(p/width)%5,83+p%7,[0,1,64,127,128,192,254,255][p%8]]).flat());
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
function scanlines(filter){const stride=width*4,out=Buffer.alloc(height*(stride+1));for(let y=0;y<height;y++){const at=y*(stride+1);out[at]=filter;for(let x=0;x<stride;x++){const v=rgba[y*stride+x],a=x>=4?rgba[y*stride+x-4]:0,b=y?rgba[(y-1)*stride+x]:0,c=y&&x>=4?rgba[(y-1)*stride+x-4]:0;const prediction=filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0;out[at+1+x]=(v-prediction)&255;}}return out;}
export function buildValidationCases(){const list=[],add=(id,bytes,policy='decline',note='',expected)=>list.push({id,bytes,policy,note,expected});const header=ihdr(),raw=scanlines(0),compressed=deflateSync(raw),idat=chunk('IDAT',compressed),valid=file([header,srgb,idat,end]);
for(let f=0;f<=4;f++)add('filter-'+f,file([header,srgb,chunk('IDAT',deflateSync(scanlines(f))),end]),'exact','Authored straight RGBA, all8alpha values',{width,height,data:rgba});
add('untagged-rgba8',file([header,idat,end]),'exact','Conventional untagged PNG; browser policy must be explicit',{width,height,data:rgba});
add('consecutive-idat-split',file([header,srgb,chunk('IDAT',compressed.subarray(0,7)),chunk('IDAT'),chunk('IDAT',compressed.subarray(7)),end]),'exact','Legal consecutive IDAT, including empty chunk',{width,height,data:rgba});
const phys=Buffer.alloc(9);phys.writeUInt32BE(3780,0);phys.writeUInt32BE(3780,4);phys[8]=1;add('physical-density',file([header,srgb,chunk('pHYs',phys),idat,end]),'exact','Pixel density does not change decoded sample grid',{width,height,data:rgba});
add('invalid-physical-density-length',file([header,srgb,chunk('pHYs',phys.subarray(0,8)),idat,end]));const invalidPhys=Buffer.from(phys);invalidPhys[8]=2;add('invalid-physical-density-unit',file([header,srgb,chunk('pHYs',invalidPhys),idat,end]));
add('bad-signature',Buffer.concat([Buffer.from('not PNG!'),valid.subarray(8)]));
add('truncated-signature',sig.subarray(0,7));
add('truncated-chunk-header',Buffer.concat([sig,Buffer.from([0,0,0])]));
add('truncated-chunk-data',valid.subarray(0,valid.length-8));
const hugeLength=Buffer.from(valid);hugeLength.writeUInt32BE(0x7fffffff,8);add('declared-chunk-length-overflow',hugeLength);
for(const kind of ['IHDR','sRGB','IDAT','IEND']){const bad=Buffer.from(valid);let at=8;while(bad.toString('ascii',at+4,at+8)!==kind)at+=12+bad.readUInt32BE(at);bad[at+8+bad.readUInt32BE(at)]^=1;add('bad-crc-'+kind,bad);}
add('duplicate-ihdr',file([header,header,srgb,idat,end]));add('ihdr-not-first',file([srgb,header,idat,end]));
add('missing-idat',file([header,srgb,end]));add('missing-iend',file([header,srgb,idat]));add('nonzero-iend',file([header,srgb,idat,chunk('IEND',Buffer.from([1]))]));
add('trailing-data',Buffer.concat([valid,Buffer.from([1])]));add('duplicate-iend',file([header,srgb,idat,end,end]));
add('srgb-after-idat',file([header,idat,srgb,end]));add('duplicate-srgb',file([header,srgb,srgb,idat,end]));add('srgb-invalid-length',file([header,chunk('sRGB'),idat,end]));add('srgb-invalid-intent',file([header,chunk('sRGB',Buffer.from([4])),idat,end]));
add('idat-not-consecutive',file([header,chunk('IDAT',compressed.subarray(0,7)),chunk('tEXt',Buffer.from('a\0b')),chunk('IDAT',compressed.subarray(7)),end]));
add('unknown-critical',file([header,chunk('ABCD'),idat,end]));add('reserved-chunk-bit',file([header,chunk('teXt'),idat,end]));
const gamma=Buffer.alloc(4);gamma.writeUInt32BE(45455);add('gamma-even-srgb',file([header,chunk('gAMA',gamma),idat,end]),'decline','Requires color-managed policy; even seeminglymatching gamma is outside narrow scope');
for(const type of ['iCCP','cHRM','cICP','eXIf','acTL','fcTL','fdAT'])add('decline-'+type.toLowerCase(),file([header,chunk(type,Buffer.alloc(type==='acTL'?8:4)),idat,end]),'decline','No profile, presentation or animation bypass');
for(const [id,w,h,options]of [['zero-width',0,11,{}],['zero-height',13,0,{}],['huge-geometry',0x7fffffff,0x7fffffff,{}],['unsupported-depth16',13,11,{depth:16}],['unsupported-gray',13,11,{type:0}],['unsupported-adam7',13,11,{interlace:1}],['invalid-interlace2',13,11,{interlace:2}],['invalid-compression',13,11,{compression:1}],['invalid-filter-method',13,11,{filter:1}]])add(id,file([ihdr(w,h,options),srgb,idat,end]));
const invalidFilter=Buffer.from(raw);invalidFilter[0]=5;add('invalid-scanline-filter5',file([header,srgb,chunk('IDAT',deflateSync(invalidFilter)),end]));
add('inflated-one-byte-short',file([header,srgb,chunk('IDAT',deflateSync(raw.subarray(0,-1))),end]));add('inflated-one-byte-extra',file([header,srgb,chunk('IDAT',deflateSync(Buffer.concat([raw,Buffer.from([0])]))),end]));
add('truncated-zlib',file([header,srgb,chunk('IDAT',compressed.subarray(0,-3)),end]));const checksum=Buffer.from(compressed);checksum[checksum.length-1]^=1;add('invalid-zlib-checksum',file([header,srgb,chunk('IDAT',checksum),end]));
add('not-zlib',file([header,srgb,chunk('IDAT',Buffer.from([1,2,3,4,5])),end]));add('inflate8mib-declared1px',file([ihdr(1,1),srgb,chunk('IDAT',deflateSync(Buffer.alloc(8*1024*1024))),end]),'decline','Must stop output accumulation at exact5bytes, never collect8MiB');
add('zlib-trailing-junk',file([header,srgb,chunk('IDAT',Buffer.concat([compressed,Buffer.from([1,2,3])])),end]));add('concatenated-zlib-streams',file([header,srgb,chunk('IDAT',Buffer.concat([compressed,compressed])),end]));
return list;}
export function writeValidationFixtures(){fs.mkdirSync(fixtureDirectory,{recursive:true});const list=buildValidationCases(),manifest={scope:'Independent fixture inventory and abandoned custom-pixel-decoder gates. The policy field is NOT a nativeGLexpectation: native PNG may tolerate malformed data as before. Valid exact samples authored without production codec.',cases:[]};for(const c of list){const filename=c.id+'.png';fs.writeFileSync(path.join(fixtureDirectory,filename),c.bytes);const entry={id:c.id,file:filename,policy:c.policy,note:c.note,bytes:c.bytes.length,sha256:createHash('sha256').update(c.bytes).digest('hex')};if(c.expected){entry.width=c.expected.width;entry.height=c.expected.height;entry.rgbaFile=c.id+'.rgba';fs.writeFileSync(path.join(fixtureDirectory,entry.rgbaFile),c.expected.data);}manifest.cases.push(entry);}fs.writeFileSync(path.join(fixtureDirectory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){const m=writeValidationFixtures();console.log(JSON.stringify({cases:m.cases.length,exact:m.cases.filter(c=>c.policy==='exact').length,decline:m.cases.filter(c=>c.policy==='decline').length}));}
