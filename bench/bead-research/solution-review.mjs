// Research UI. Artwork is decoded at runtime from ignored local inputs only.
import {spatialSimplify} from './semantic-spike.mjs';
import {simplifySelectedShades} from './guided-shade-spike.mjs';
import {solidBoundary} from './solid-boundary.mjs';
import {regions} from './regions.mjs';
import {palettePngBytes} from '../../src/lib/save.js';
const $=id=>document.getElementById(id),before=$('before'),after=$('after');
let input,output,rects=[],first=null,marking=false,mode='spatial',request=0,selectedShades=new Set(),outlineColor=null,exportUrl=null;
function count(labels){const rs=regions(labels,input.width,input.height,8);return {small:rs.filter(r=>r.pixels.length<=4).reduce((s,r)=>s+r.pixels.length,0),singletons:rs.filter(r=>r.pixels.length===1).length};}
function paint(canvas,labels){
 canvas.width=input.width;canvas.height=input.height;const ctx=canvas.getContext('2d'),pixels=new ImageData(input.width,input.height),selected=$('color').value;
 for(let p=0;p<labels.length;p++){const c=labels[p];if(c<0)continue;const rgb=selected==='all'||Number(selected)===c?parseInt(input.colors[c].slice(1),16):0xb8b8b8;pixels.data[p*4]=rgb>>>16;pixels.data[p*4+1]=rgb>>>8&255;pixels.data[p*4+2]=rgb&255;pixels.data[p*4+3]=255;}
 ctx.putImageData(pixels,0,0);if(canvas===before){ctx.strokeStyle='#087dff';ctx.lineWidth=.35;for(const [x0,y0,x1,y1] of rects)ctx.strokeRect(x0,y0,x1-x0+1,y1-y0+1);if(first){ctx.fillStyle='#087dff';ctx.fillRect(first[0],first[1],1,1);}}
}
function render(){
 if(!input)return;if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=null;$('download-png').hidden=true;const keep=new Uint8Array(input.labels.length);for(const [x0,y0,x1,y1]of rects)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)keep[y*input.width+x]=1;
 const start=performance.now();output=mode==='solid'?solidBoundary(input,outlineColor):mode==='guided'||mode==='combined'?simplifySelectedShades(input,{selected:selectedShades,keep}).labels:spatialSimplify(input,{lambda:Number($('strength').value),keep}).labels;
 if(mode==='combined')output=solidBoundary({...input,labels:output},outlineColor);
 let changed=0,keptChanged=0;for(let p=0;p<output.length;p++)if(output[p]!==input.labels[p]){changed++;if(keep[p])keptChanged++;}
 const a=count(input.labels),b=count(output);paint(before,input.labels);paint(after,output);
 $('after-caption').textContent=mode==='solid'?'Solid exterior color from original':mode==='guided'?'Selected-shade cleanup':mode==='combined'?'Selected-shade cleanup and solid exterior':'Spatial simplification';
 $('shade-list').textContent=selectedShades.size?'Selected fill shades: '+[...selectedShades].map(c=>input.colors[c]).join(', '):'No fill shades selected.';
 const targetSmall=labels=>regions(labels,input.width,input.height,8,selectedShades).filter(r=>r.pixels.length<=4).reduce((s,r)=>s+r.pixels.length,0);
 $('status').textContent=`${input.width}×${input.height}, ${input.colors.length} source colors. Changed ${changed} cells.\nSmall same-color patch cells (8-connected, area ≤4): ${a.small} → ${b.small}. Singletons: ${a.singletons} → ${b.singletons}.\n${selectedShades.size?'Selected-shade small patch cells: '+targetSmall(input.labels)+' → '+targetSmall(output)+'.\n':''}Keep areas: ${rects.length}; changed kept cells: ${keptChanged}. ${Math.round(performance.now()-start)} ms including display/statistics.\nPatch counts are not semantic accuracy or measured craft time.`;
 $('hint').textContent=first?'Click the opposite corner of the keep area.':marking?'Click the first corner of the keep area.':`${rects.length} keep areas selected. Review isolated colors as well as the complete image.`;
}
async function load(){
 const own=++request,id=$('image').value;rects=[];first=null;marking=false;mode='spatial';selectedShades=new Set();outlineColor=null;$('status').textContent='Loading private local input…';
 try{const img=new Image();img.src=id==='native-original'?'../../.tmp/bead-research-private/native-original/original.png':id==='original-prepared'?'../../.tmp/bead-research-private/fixtures/original-attachment-background-prepared.png':id==='original-raw'?'../../.tmp/bead-research-private/fixtures/original-attachment-native.png':`../../.tmp/bead-research-private/semantic-spike/${id}-original.png`;await img.decode();if(own!==request)return;
 const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=[],indexes=new Map(),labels=new Int32Array(canvas.width*canvas.height).fill(-1);
 for(let p=0;p<labels.length;p++)if(rgba[p*4+3]>=128){const c='#'+[0,1,2].map(k=>rgba[p*4+k].toString(16).padStart(2,'0')).join('');if(!indexes.has(c)){indexes.set(c,colors.length);colors.push(c);}labels[p]=indexes.get(c);}
 input={width:canvas.width,height:canvas.height,labels,colors};$('color').replaceChildren(new Option('All colors','all'),...colors.map((c,i)=>new Option(c,String(i))));render();
 }catch(e){$('status').textContent='Private inputs unavailable. Run semantic-spike-evaluate.mjs locally first. '+e.message;}
}
before.addEventListener('click',event=>{
 if(!marking||!input)return;const box=before.getBoundingClientRect(),p=[Math.max(0,Math.min(input.width-1,Math.floor((event.clientX-box.left)*input.width/box.width))),Math.max(0,Math.min(input.height-1,Math.floor((event.clientY-box.top)*input.height/box.height)))];
 if(!first)first=p;else{rects.push([Math.min(first[0],p[0]),Math.min(first[1],p[1]),Math.max(first[0],p[0]),Math.max(first[1],p[1])]);first=null;marking=false;}mode='spatial';render();
});
$('mark').onclick=()=>{marking=true;first=null;mode='spatial';render();};
$('clear').onclick=()=>{rects=[];first=null;marking=false;render();};
$('strength').onchange=()=>{mode='spatial';render();};$('color').onchange=render;$('image').onchange=load;
$('solid').onclick=()=>{if($('color').value==='all'){$('hint').textContent='Choose the outline swatch in Single-color view first.';return;}if(input.labels.every(l=>l>=0)){$('hint').textContent='This image has no transparent foreground silhouette; solid exterior preview abstains.';return;}outlineColor=Number($('color').value);mode='solid';render();};$('restore').onclick=()=>{mode='spatial';render();};load();
$('add-shade').onclick=()=>{const c=$('color').value;if(c==='all'){$('hint').textContent='Choose a fill shade in Single-color view first.';return;}const label=Number(c);if(selectedShades.has(label))selectedShades.delete(label);else selectedShades.add(label);render();};
$('guided').onclick=()=>{mode='guided';render();};
$('combined').onclick=()=>{if($('color').value==='all'){$('hint').textContent='Select the desired border swatch in Single-color view first.';return;}if(input.labels.every(l=>l>=0)){$('hint').textContent='Solid border needs a transparent foreground silhouette; use the prepared input.';return;}outlineColor=Number($('color').value);mode='combined';render();};
$('prepare-png').onclick=()=>{if(!input||!output)return;if(exportUrl)URL.revokeObjectURL(exportUrl);const bytes=palettePngBytes({w:input.width,h:input.height,colors:input.colors,indices:Uint16Array.from(output,c=>c<0?256:c)});exportUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));const link=$('download-png');link.href=exportUrl;link.download=`bead-research-${$('image').value}-${mode}.png`;link.hidden=false;};
