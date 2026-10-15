// Research-only decoder bundle and immutable owned fixtures. Does not build dist.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'vite';
const require=createRequire(import.meta.url),sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.resolve('bench/png-import-precision-review'),fixtures=path.join(out,'fixtures');fs.mkdirSync(fixtures,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),rows=[];
for(const [id,input]of[['source','bench/palette-clipboard-review/fixtures/palette-source.png'],['converted','bench/palette-clipboard-review/fixtures/palette-keep-expected.png']]){
 const bytes=fs.readFileSync(input),raw=await sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const file=id+'.png';fs.writeFileSync(path.join(fixtures,file),bytes);rows.push({id,file,sourceFile:input,pngSha256:hash(bytes),width:raw.info.width,height:raw.info.height,expectedRgbaSha256:hash(raw.data),expectedRgba:[...raw.data],oracle:'Independent Sharp sRGB RGBA for these authored sRGB8 PNGs. Hidden alpha0 RGB excluded from visible comparison.'});
}
fs.writeFileSync(path.join(fixtures,'manifest.json'),JSON.stringify(rows,null,2)+'\n');
await build({configFile:false,publicDir:false,build:{outDir:path.join(out,'assets'),emptyOutDir:false,minify:false,lib:{entry:path.resolve('bench/png-import-precision-probe.mjs'),formats:['es'],fileName:()=> 'probe.js'}}});
const dependencies=['src/lib/image-decode.js','src/lib/quantize.js','bench/png-import-precision-probe.mjs','bench/png-import-precision-probe.html'];
fs.writeFileSync(path.join(out,'build-record.json'),JSON.stringify({builtAt:new Date().toISOString(),productionSourceStatus:'Metadata-guarded native-copy validation candidate; source hashes identify this research bundle.',distRebuilt:false,dependencies:Object.fromEntries(dependencies.map(file=>[file,hash(fs.readFileSync(file))])),fixtures:rows.map(({expectedRgba,...r})=>r)},null,2)+'\n');
console.log('Decoder research assets ready; production dist untouched');
