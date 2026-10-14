// Explicit research background annotation, not an automatic background detector.
// All input and derived image data remain in ignored scratch storage.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';import {homedir} from 'node:os';
const require=createRequire(import.meta.url),{PNG}=require(homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const base=new URL('../../.tmp/bead-research-private/fixtures/',import.meta.url);
let png=PNG.sync.read(readFileSync(process.argv[2]??new URL('original-attachment-native.png',base)));
if(png.width===288&&png.height===288){
 const data=Buffer.alloc(96*96*4);
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){
  const at=(y*3*png.width+x*3)*4;
  for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)for(let k=0;k<4;k++)if(png.data[at+k]!==png.data[at+(dy*png.width+dx)*4+k])throw Error('Input is not an exact 3× native-grid enlargement');
  png.data.copy(data,(y*96+x)*4,at,at+4);
 }
 png={width:96,height:96,data};
 writeFileSync(new URL('original-attachment-native.png',base),PNG.sync.write(png));
}
if(png.width!==96||png.height!==96)throw Error('This source-specific experiment expects a native96 grid or its exact288 enlargement');
// These two colors were identified as the flattened checkerboard in this attachment.
// Removing them everywhere is a declared background-color choice, not a claim of semantics.
const background=new Set(['dcdcdc','ebebeb']);let removed=0;
for(let p=0;p<png.width*png.height;p++)if(background.has(png.data.subarray(p*4,p*4+3).toString('hex'))){png.data.fill(0,p*4,p*4+4);removed++;}
writeFileSync(new URL('original-attachment-background-prepared.png',base),PNG.sync.write(png));
console.log(JSON.stringify({width:png.width,height:png.height,backgroundShadeChoices:background.size,backgroundCellsRemoved:removed,occupied:png.width*png.height-removed}));
