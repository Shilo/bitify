// Focused second-round native-output confirmation, explicit labels, uniform gray.
import fs from'node:fs/promises';import path from'node:path';import crypto from'node:crypto';import{createRequire}from'node:module';import{measure,regionPoints}from'./independent-metrics.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=import.meta.dirname,spike=path.join(root,'../important-colors-spike'),m=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')),results=JSON.parse(await fs.readFile(path.join(spike,'results.json'),'utf8')),byId=new Map(m.files.map(f=>[f.id,f]));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function decode(file){const bytes=await fs.readFile(file),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{bytes,data,width:info.width,height:info.height,pngSha256:sha(bytes),rgbaSha256:sha(data)};}
const cases=[
 {id:'town-water-bucket-auto-oklab-k4',region:'bucket',note:'Concave replaces 47 warm bucket pixels with gray/white, while blue water remains absent.'},
 {id:'real-inventory-auto-oklab-k8',component:'dungeon-archer',region:'green-headband',note:'Hue restores the purple hood but removes the archer green headband.'},
 {id:'dungeon-potion-edg8-rgb-k4',region:'red-liquid',note:'Both candidates turn red liquid orange.'},
 {id:'owned-knight-a-pico8-oklab-k4',region:'observed-face',observationalRegion:{id:'observed-face',sourceColors:['f2c79b','d9966b','a8603f']},note:'Hue turns warm skin gray; observed skin ROI follows the pre-existing owned fixture color constants, not a new acceptance fixture.'},
 {id:'real-inventory-pico8-oklab-k8',component:'platformer-pilot',region:'green-visor',note:'Concave loses the green visor while current and hue retain it.'},
 {id:'platformer-axe-pico8-rgb-k2',region:'blade',note:'Hue paints a neutral blade pink to retain a tiny warm fastening; this is a clear material loss even at two colors.'},
];
const rows=[];await fs.mkdir(path.join(root,'confirmed'),{recursive:true});
for(const c of cases){const row=results.rows.find(r=>r.id===c.id);if(!row?.outputFiles)throw Error('Missing saved output '+c.id);const rec=byId.get(row.item),file=path.join(root,rec.file),source=await decode(file);let region;
 if(c.component){const comp=rec.assembly.find(x=>x.id===c.component),part=byId.get(c.component),partSource=await decode(path.join(root,part.file)),partRegion=part.regions.find(x=>x.id===c.region);region={id:c.component+'/'+c.region,pixels:regionPoints(partSource,partRegion).map(i=>[i%partSource.width+comp.x,Math.floor(i/partSource.width)+comp.y])};}
 else region=c.observationalRegion??rec.regions.find(r=>r.id===c.region);
 const entry={...c,settings:{target:row.target,...row.options,dither:'none',cleanup:false},source:{pngSha256:source.pngSha256,rgbaSha256:source.rgbaSha256},outputs:{}};
 for(const method of['baseline','concave','hue']){const output=await decode(path.join(spike,row.outputFiles[method][0]));entry.outputs[method]={pngSha256:output.pngSha256,rgbaSha256:output.rgbaSha256,colors:method==='baseline'?row.baseline.colors:row.candidates[method].colors,...measure(source,output,[region])};}
 rows.push(entry);
 if(process.argv.includes('--render')){const paths=[file,...['baseline','concave','hue'].map(method=>path.join(spike,row.outputFiles[method][0]))],comp=[];for(let col=0;col<4;col++){const im=await decode(paths[col]),scale=Math.min(200/im.height,384/im.width,10),w=Math.floor(im.width*scale),h=Math.floor(im.height*scale);comp.push({input:Buffer.from(`<svg width="400" height="26"><text x="4" y="19" fill="white" font-size="16">${['Source','Current','Concave','Hue'][col]}</text></svg>`),left:col*400,top:0});comp.push({input:im.bytes,left:col*400+4,top:30});comp.push({input:await sharp(im.bytes).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:col*400+4,top:90});}await sharp({create:{width:1600,height:304,channels:4,background:'#808080'}}).composite(comp).png().toFile(path.join(root,'confirmed',c.id+'.png'));}
}
await fs.writeFile(path.join(root,'confirmed/results.json'),JSON.stringify({status:'Unblinded second-round explicit region confirmation; no blind preference tally',rows},null,2)+'\n');
for(const row of rows){console.log(row.id,row.note);for(const[method,o]of Object.entries(row.outputs))console.log(method,JSON.stringify(o.regions),o.rgbaSha256);}
