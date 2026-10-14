import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require((process.env.NODE_DEPENDENCY_ROOT??homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/sharp');}
const root=new URL('../../.tmp/bead-research-private/',import.meta.url),data=JSON.parse(readFileSync(new URL('gallery-data.json',root))),columns=['original','nearest','vote'];
async function sheet(ids,name){const cellWidth=350,cellHeight=350,overlays=[];
 for(let row=0;row<ids.length;row++)for(let col=0;col<columns.length;col++){
  const id=ids[row],label=columns[col],source=data.find(d=>d.id===id),x=col*cellWidth,y=row*cellHeight;
  overlays.push({input:Buffer.from(`<svg width="350" height="40"><text x="12" y="25" font-family="Arial" font-size="15" fill="#25222c">${id} · ${label}</text></svg>`),left:x,top:y});
  const scale=Math.max(1,Math.floor(300/Math.max(source.width,source.height))),w=source.width*scale,h=source.height*scale;
  overlays.push({input:await sharp(fileURLToPath(new URL(`outputs/${id}-${label}.png`,root))).resize(w,h,{kernel:'nearest'}).flatten({background:'#e4e0d7'}).png().toBuffer(),left:x+Math.floor((cellWidth-w)/2),top:y+42+Math.floor((300-h)/2)});
 }
 await sharp({create:{width:cellWidth*3,height:cellHeight*ids.length,channels:4,background:'#f5f3ee'}}).composite(overlays).png().toFile(fileURLToPath(new URL('outputs/'+name+'.png',root)));
}
await sheet(['snowie'],'snowie-comparison');
await sheet(['s045-bead24','s085-bead24','s113-bead24','s121-bead24','s153-bead24','protected-highlight','unprotected-highlight'],'other-sprites-comparison');
