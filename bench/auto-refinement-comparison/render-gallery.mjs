// Display-only rebuild from retained metrics/PNGs; never refits or calls a service.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { sha } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname,read=f=>fs.readFileSync(path.resolve(dir,f));
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const labels={current:'Current Auto','centroid-mean':'Mean-only refinement','centroid-strict':'Strict refinement','subset-swaps-mean':'Same-target swaps',pixellab:'PixelLab'};
const shown=Object.keys(labels),escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
export async function renderGallery(report){
 const gallery=report.cases.filter(row=>/^(sprite|armor)-generated/.test(row.id)).sort((a,b)=>a.id.split('-')[0].localeCompare(b.id.split('-')[0])||a.k-b.k);
 const title=row=>(row.id.startsWith('armor')?'Armor':'Inventory')+' · up to '+row.k+' colors';
 const cells=row=>[{label:'Source',file:row.sourceHashes[0].file},...shown.map(name=>{const m=row.methods.find(m=>m.name===name);return{label:labels[name],file:m.files[0],metric:m.pointOklabMSE};})];
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Auto refinement paired study</title><style>body{font:14px system-ui;background:#fffdf9;color:#241d2d;margin:20px}section{margin:30px 0}.comparisons{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;width:190px}figcaption{min-height:42px}img{image-rendering:pixelated;background:#ddd;vertical-align:top}.large{display:block;width:160px;height:160px;object-fit:contain;margin-top:8px}</style><h1>Same source and requested capacity: current, guarded candidates, PixelLab</h1><p>Native pixels plus nearest-neighbor enlargement. Point error is not semantic quality. Mean-only refinement can leave the shared target; strict guards are not a visual guarantee. Same-target swaps shows the permissive mean policy; all swap policies retained Current Auto in these cases.</p>'+gallery.map(row=>'<section data-case="'+row.id+'"><h2 data-case="'+row.id+'">'+title(row)+'</h2><div class="comparisons">'+cells(row).map(c=>'<figure><figcaption>'+escape(c.label)+(c.metric==null?'':'<br>Point '+c.metric.toFixed(7))+'</figcaption><img alt="Native '+escape(c.label)+'" src="'+c.file+'"><img class="large" alt="Enlarged '+escape(c.label)+'" src="'+c.file+'"></figure>').join('')+'</div></section>').join(''));
 for(const art of ['sprite','armor']){const rows=gallery.filter(r=>r.id.startsWith(art)),cw=220,ch=260,overlays=[];
  for(let r=0;r<rows.length;r++)for(let c=0;c<6;c++){const cell=cells(rows[r])[c],bytes=read(cell.file),label='<svg width="220" height="65"><g font-family="Arial" font-size="12" fill="#241d2d"><text x="8" y="16">'+escape(title(rows[r]))+'</text><text x="8" y="34">'+cell.label+'</text><text x="8" y="53">'+(cell.metric==null?'Original':cell.metric.toFixed(7))+'</text></g></svg>';overlays.push({input:Buffer.from(label),left:c*cw,top:r*ch},{input:bytes,left:c*cw+8,top:r*ch+70},{input:await sharp(bytes).resize(128,128,{kernel:'nearest'}).png().toBuffer(),left:c*cw+80,top:r*ch+115});}
  await sharp({create:{width:cw*6,height:ch*rows.length,channels:4,background:'#fffdf9'}}).composite(overlays).png().toFile(path.join(dir,art+'-paired.png'));
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const report=JSON.parse(read('results.json'));await renderGallery(report);
 // The fit/score measurements are unchanged. Record the earlier measurement
 // runner hash and the current display-only refactor for honest provenance.
 report.displayOnlyRefresh={recordedAt:new Date().toISOString(),previousMeasurementRunnerSha256:report.displayOnlyRefresh?.previousMeasurementRunnerSha256??report.dependencySha256['run.mjs'],reason:'Extracted gallery renderer and changed labels/mobile metadata; no fit, score or timing rerun.'};
 for(const file of ['run.mjs','render-gallery.mjs'])report.dependencySha256[file]=sha(read(file));
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Gallery rebuilt; measurements unchanged');
}
