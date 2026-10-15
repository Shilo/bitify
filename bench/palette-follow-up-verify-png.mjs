// Independent decoding of an actual Save produced with the documented QA settings.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fullPaletteImage} from '../src/lib/palette-state.js';
import {FULL_PRESETS} from '../src/lib/palette-library.js';
import {colorize} from '../src/lib/quantize.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const file=process.argv[2],device=process.argv[3];assert(file&&['codex','android'].includes(device),'Usage: node bench/palette-follow-up-verify-png.mjs saved.png codex|android');
const bytes=readFileSync(file),source=await sharp('.tmp/dither-qa/ramp.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),actual=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const original={width:source.info.width,height:source.info.height,data:new Uint8ClampedArray(source.data)},settings={colors:FULL_PRESETS.find(p=>p.id==='preset-pico8').colors,name:'PICO-8',metric:'oklab',maxColors:8,cleanup:true,dither:'4x4',ditherStrength:50,alphaCut:128,alphaMode:'keep'};
const converted=await fullPaletteImage({name:'ramp.png',original},settings),expected=colorize(converted,converted.colors),used=new Set(),alpha=new Set();assert.equal(actual.info.width,original.width);assert.equal(actual.info.height,original.height);
for(let p=0;p<actual.data.length;p+=4){assert.equal(actual.data[p+3],source.data[p+3]);assert.equal(actual.data[p+3],expected.data[p+3]);alpha.add(actual.data[p+3]);if(actual.data[p+3]){assert.deepEqual([...actual.data.subarray(p,p+3)],[...expected.data.subarray(p,p+3)]);used.add('#'+actual.data.subarray(p,p+3).toString('hex'));}}
writeFileSync('bench/palette-follow-up-review/'+device+'-native-decoded.json',JSON.stringify({completed:true,device,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),width:original.width,height:original.height,sourceAlphaBytesMatched:original.width*original.height,alphaValues:[...alpha].sort((a,b)=>a-b),usedColors:[...used],settings,oracle:'Independent Sharp decode; every alpha value compared to original fixture; visible RGB compared to production conversion. Assumes the documented UI settings used to create this file.'},null,2)+'\n');
console.log('PASS '+device+': actual PNG '+bytes.length+' bytes, '+(original.width*original.height)+' source alpha bytes and '+used.size+' visible RGBs verified.');
