// Freeze eight paid comparisons from independently frozen, CC0 source art BEFORE any output.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {sha} from '../palette-service-research/api-common.mjs';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=import.meta.dirname, root=path.resolve(dir,'../..');
const m=JSON.parse(fs.readFileSync(path.join(root,'bench/important-colors-review/manifest.json')));
const prior=JSON.parse(fs.readFileSync(path.join(dir,'cases.json'))).filter(c=>!c.fresh);
const files=Object.fromEntries(m.files.map(f=>[f.id,f]));
const fresh=[];
for(const id of ['real-inventory','town-water-bucket','dungeon-archer']) {
 const f=files[id],input='bench/important-colors-review/'+f.file, bytes=fs.readFileSync(path.resolve(root,input));if(sha(bytes)!==f.sha256)throw Error('Frozen input hash mismatch');
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const regions={};
 const components=f.assembly??[{id,x:0,y:0}];
 for(const part of components)for(const region of files[part.id].regions??[]){const palette=new Set(region.sourceColors),coords=[];for(let y=part.y;y<part.y+files[part.id].height;y++)for(let x=part.x;x<part.x+files[part.id].width;x++){const p=(y*info.width+x)*4;if(data[p+3]&&palette.has(data.subarray(p,p+3).toString('hex')))coords.push([x,y]);}regions[part.id+'/'+region.id]=coords;}
 for(const count of [4,8]){const cid=id+'-k'+count;fresh.push({id:cid,fresh:true,inputs:[input],service:['bench/important-colors-service/service/'+cid+'-0.png'],count,regions,sourceLicense: f.license??f.source?.license,sourceManifestSha256:sha(fs.readFileSync(path.join(root,'bench/important-colors-review/manifest.json')))});}
 if(id!=='dungeon-archer'){const cid=id+'-edg8';fresh.push({id:cid,fresh:true,inputs:[input],service:['bench/important-colors-service/service/'+cid+'-0.png'],target:'bench/claude-audit-2026-10-15/service/fixtures/target-edg8.png',regions,sourceLicense:f.license??f.source?.license});}
}
fs.writeFileSync(path.join(dir,'cases.json'),JSON.stringify([...prior,...fresh],null,2)+'\n');
fs.writeFileSync(path.join(dir,'fresh-freeze.json'),JSON.stringify({at:new Date().toISOString(),note:'Before paid outputs; six Auto K4/K8 and two fixed ENDESGA8. Independent real cohort; known synthetic knight retained separately.',casesSha256:sha(fs.readFileSync(path.join(dir,'cases.json'))),caseIds:fresh.map(c=>c.id)},null,2)+'\n');
console.log(fresh.map(c=>c.id));
