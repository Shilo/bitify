// Research only. A binary outline mask is an explicit artist selection, not a
// dark-pixel detector. Removed mask pixels do not determine a replacement RGB.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const researchDir=path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot=path.resolve(researchDir,'../..');
function loadSharp() {
  try { return require('sharp'); } catch { /* Local installation preferred. */ }
  const roots=[process.env.NODE_DEPENDENCY_ROOT,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')].filter(Boolean);
  for(const root of roots)try { return require(path.join(root,'sharp')); } catch { /* Try next runtime. */ }
  throw new Error('Install sharp locally, or set NODE_DEPENDENCY_ROOT to a node_modules directory containing sharp.');
}
const OFF8 = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const OFF4 = [[0,-1],[1,0],[0,1],[-1,0]];
const at = (m,w,h,x,y) => x>=0 && y>=0 && x<w && y<h ? m[y*w+x] : 0;
export function mergeOutlineLabels(labels,selected,target) {
  if(!selected.includes(target))throw new Error('Target must be an explicitly selected outline label');
  const chosen=new Set(selected);
  return labels.map(label=>chosen.has(label)?target:label);
}
export function components(mask,w,h,connectivity=8,foreground=1) {
  const seen=new Uint8Array(mask.length), groups=[];
  for(let i=0;i<mask.length;i++) if(!seen[i] && Number(Boolean(mask[i]))===foreground) {
    const q=[i]; seen[i]=1;
    for(let j=0;j<q.length;j++) {
      const p=q[j],x=p%w,y=Math.floor(p/w);
      for(const [dx,dy] of connectivity===8?OFF8:OFF4) {
        const nx=x+dx,ny=y+dy,n=ny*w+nx;
        if(nx>=0&&ny>=0&&nx<w&&ny<h&&!seen[n]&&Number(Boolean(mask[n]))===foreground){seen[n]=1;q.push(n);}
      }
    }
    groups.push(q);
  }
  return groups;
}
export function stats(mask,w,h) {
  let blocks=0,endpoints=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]) {
    const degree=OFF8.reduce((s,[dx,dy])=>s+at(mask,w,h,x+dx,y+dy),0);
    if(degree<=1)endpoints++;
    if(at(mask,w,h,x+1,y)&&at(mask,w,h,x,y+1)&&at(mask,w,h,x+1,y+1))blocks++;
  }
  const holes=components(mask,w,h,4,0).filter(q=>!q.some(i=>i%w===0||i%w===w-1||Math.floor(i/w)===0||Math.floor(i/w)===h-1)).length;
  return {pixels:mask.reduce((a,b)=>a+b,0),components8:components(mask,w,h).length,holes4:holes,blocks2x2:blocks,endpoints8:endpoints};
}
// Conservative candidate generator: only a one-cell, straight gap between two
// one-neighbor endpoints, each backed by another cell in the same direction.
// It still cannot distinguish an intentional opening from an accidental gap.
export function bridgeOneCell(mask,w,h,{protectedMask=new Uint8Array(mask.length)}={}) {
  const out=mask.slice(),added=[];
  const degree=(x,y)=>OFF8.reduce((s,[dx,dy])=>s+at(mask,w,h,x+dx,y+dy),0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const i=y*w+x;if(mask[i]||protectedMask[i])continue;
    for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
      if(at(mask,w,h,x-dx,y-dy)&&at(mask,w,h,x+dx,y+dy)&&
        at(mask,w,h,x-2*dx,y-2*dy)&&at(mask,w,h,x+2*dx,y+2*dy)&&
        degree(x-dx,y-dy)===1&&degree(x+dx,y+dy)===1){out[i]=1;added.push(i);break;}
    }
  }
  return {mask:out,added};
}
// Sequential simple-point deletion: foreground 8-connectivity and background
// 4-connectivity are tested in the frozen 3x3 neighborhood of each candidate.
// Sequential rechecking avoids simultaneous deletion of adjacent connectors.
// Endpoint lock and optional protected cells are useful controls, not semantics.
export function thinSimple(mask,w,h,{protectedMask=new Uint8Array(mask.length),maxPasses=w+h,reverse=false}={}) {
  const out=mask.slice(),removed=[];let passes=0;
  for(;passes<maxPasses;passes++) {
    let changes=0;
    for(let step=0;step<out.length;step++) {
      const i=reverse?out.length-1-step:step;if(!out[i]||protectedMask[i])continue;
      const x=i%w,y=Math.floor(i/w),local=new Uint8Array(9);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)local[(dy+1)*3+dx+1]=at(out,w,h,x+dx,y+dy);
      local[4]=0;
      const neighbors=local.reduce((a,b)=>a+b,0);
      if(neighbors<=1||neighbors===8)continue;
      if(components(local,3,3,8,1).length!==1)continue;
      // Count background components excluding the removed center; require all
      // existing background neighbors to be 4-connected already.
      local[4]=1;
      if(components(local,3,3,4,0).length!==1)continue;
      out[i]=0;removed.push(i);changes++;
    }
    if(!changes)break;
  }
  return {mask:out,removed,passes};
}
export function fromRows(rows) {return {mask:Uint8Array.from(rows.join(''),c=>c==='#'?1:0),w:rows[0].length,h:rows.length};}
export const fixtures={
  thickLine:['.........','..#####..','..#####..','.........'],
  ring:['.........','..#####..','..#...#..','..#...#..','..#####..','.........'],
  accidentalGap:['.........','.##.##...','.........'],
  intentionalGap:['.........','.##.##...','.........'],
  diagonal:['.......','.#.....','..#....','...#...','....#..','.....#.','.......'],
  endpoint:['.........','..#####..','.........'],
  eyeHighlight:['.......','..###..','..#.#..','..###..','.......'],
};
async function sampleGrid(sharp,file,{x0,y0,step,w,h,occluded}) {
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const mask=new Uint8Array(w*h),known=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const px=Math.round(x0+(x+.5)*step),py=Math.round(y0+(y+.5)*step),i=y*w+x;
    if(px<0||py<0||px>=info.width||py>=info.height||(occluded&&occluded(px,py)))continue;
    known[i]=1;
    const p=(py*info.width+px)*4;
    mask[i]=Number(data[p]<120&&data[p+1]<135&&data[p+2]<130);
  }
  return {mask,known,w,h,grid:{x0,y0,step},source:file};
}
async function render(sharp,file,panels,w,h) {
  const scale=8,pad=12,pw=w*scale,ph=h*scale;
  const data=Buffer.alloc((pw+pad)*panels.length*(ph+24)*4,255),width=(pw+pad)*panels.length,height=ph+24;
  for(let p=0;p<panels.length;p++)for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    let rgb=panels[p].mask[y*w+x]?[45,80,64]:[248,246,241];
    if(panels[p].known&&!panels[p].known[y*w+x])rgb=[220,196,220];
    for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++) {
      const i=((y*scale+dy+12)*width+p*(pw+pad)+x*scale+dx)*4;
      data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];
      if(dx===0||dy===0){data[i]=Math.round((rgb[0]+180)/2);data[i+1]=Math.round((rgb[1]+180)/2);data[i+2]=Math.round((rgb[2]+180)/2);}
    }
  }
  const labels=['MERGED CHART','BRIDGE PROPOSAL','THINNING BASELINE','BRIDGE + THIN','MANUAL CHART'];
  const labelSvg=Buffer.from(`<svg width="${width}" height="${height}"><g font-family="sans-serif" font-size="10" fill="#222">${panels.map((_,p)=>`<text x="${p*(pw+pad)+4}" y="10">${labels[p]}</text>`).join('')}</g></svg>`);
  await sharp(data,{raw:{width,height,channels:4}}).composite([{input:labelSvg}]).png().toFile(file);
}
export async function run() {
  const sharp=loadSharp();
  const dir=path.join(repositoryRoot,'.tmp/bead-outline-research');fs.mkdirSync(dir,{recursive:true});
  const fixtureDir=process.env.BEAD_RESEARCH_FIXTURES??path.join(repositoryRoot,'.tmp/bead-research-private/fixtures');
  const outputDir=path.join(repositoryRoot,'.tmp/bead-research-private/outputs');fs.mkdirSync(outputDir,{recursive:true});
  const merged=await sampleGrid(sharp,path.join(fixtureDir,'outline-merged.png'),{x0:49,y0:2,step:10,w:52,h:52,occluded:(x,y)=>x<153&&y<171});
  const manual=await sampleGrid(sharp,path.join(fixtureDir,'outline-manual.png'),{x0:2,y0:6,step:12,w:51,h:44});
  let alignment;
  for(let dy=-12;dy<=12;dy++)for(let dx=-8;dx<=8;dx++) {
    let intersection=0,mismatch=0,known=0;
    for(let y=0;y<merged.h;y++)for(let x=0;x<merged.w;x++) {
      const mx=x+dx,my=y+dy,a=y*merged.w+x,b=my*manual.w+mx;
      if(!merged.known[a]||mx<0||my<0||mx>=manual.w||my>=manual.h||!manual.known[b])continue;
      known++;intersection+=merged.mask[a]&&manual.mask[b];mismatch+=merged.mask[a]!==manual.mask[b];
    }
    if(!alignment||intersection-mismatch>alignment.score)alignment={dx,dy,intersection,mismatch,known,score:intersection-mismatch};
  }
  const visible={...merged},manualAligned=new Uint8Array(merged.mask.length),comparisonKnown=new Uint8Array(merged.mask.length);
  for(let y=0;y<merged.h;y++)for(let x=0;x<merged.w;x++) {
    const mx=x+alignment.dx,my=y+alignment.dy,i=y*merged.w+x;
    if(merged.known[i]&&mx>=0&&my>=0&&mx<manual.w&&my<manual.h){manualAligned[i]=manual.mask[my*manual.w+mx];comparisonKnown[i]=1;}
  }
  const lock=Uint8Array.from(merged.known,k=>1-k);
  // An unknown chart cell is not background. Veto edits touching the popup so
  // reconstruction gaps cannot invent a thinning or bridging opportunity.
  for(let y=0;y<merged.h;y++)for(let x=0;x<merged.w;x++) {
    if(OFF8.some(([dx,dy])=>x+dx>=0&&y+dy>=0&&x+dx<merged.w&&y+dy<merged.h&&!merged.known[(y+dy)*merged.w+x+dx]))lock[y*merged.w+x]=1;
  }
  const bridged=bridgeOneCell(merged.mask,merged.w,merged.h,{protectedMask:lock});
  const thinned=thinSimple(merged.mask,merged.w,merged.h,{protectedMask:lock});
  const combo=thinSimple(bridged.mask,merged.w,merged.h,{protectedMask:lock});
  const reverse=thinSimple(merged.mask,merged.w,merged.h,{protectedMask:lock,reverse:true});
  const compare=m=>{let extra=0,missing=0,known=0,maskCells=0,manualCells=0;for(let i=0;i<m.length;i++)if(comparisonKnown[i]){known++;maskCells+=m[i];manualCells+=manualAligned[i];extra+=m[i]&&!manualAligned[i];missing+=!m[i]&&manualAligned[i];}return {scope:'approximately aligned cells known in both screenshots only',commonKnownCells:known,maskCells,manualCells,extraRelativeToManual:extra,missingRelativeToManual:missing};};
  const cases={};
  for(const [name,rows] of Object.entries(fixtures)){const {mask,w,h}=fromRows(rows),thin=thinSimple(mask,w,h),bridge=bridgeOneCell(mask,w,h);cases[name]={before:stats(mask,w,h),thin:stats(thin.mask,w,h),bridge:stats(bridge.mask,w,h),removed:thin.removed.length,added:bridge.added.length};}
  const findings={verdict:'NO-GO automatic outline cleanup; GO explicit color union and reviewable proposals only',sources:[{url:'https://scikit-image.org/docs/stable/auto_examples/edges/plot_skeleton.html',supports:'Skeletonization iteratively removes border pixels while preserving connectivity; it does not infer artistic intent.'},{url:'https://scikit-image.org/docs/stable/api/skimage.morphology.html',supports:'Closing is dilation followed by erosion and can connect cracks or close gaps; changing topology is inherent.'}],limitations:['Screenshots are grid charts, not native sprites; sampled outline masks omit popup-obscured cells.','Alignment chosen by visible-cell agreement is approximate; counts are evidence on the sampled charts, not verified source-pixel ground truth.','8-connected contours are valid diagonally; 4-connected component counts would wrongly penalize stair steps.','Binary thinning does not decide which fill color should replace removed outline pixels.','Protected mask must be supplied; geometry alone cannot identify blush/eyes or intentional openings.','Same-pattern accidental and intentional gaps are indistinguishable; bridge must be explicit and reviewable.','Simple-point deletion preserves tested topology but scan order changes the retained contour.'],alignment,merged:{grid:merged.grid,dimensions:[merged.w,merged.h],knownCells:merged.known.reduce((a,b)=>a+b,0),before:stats(merged.mask,merged.w,merged.h),manualComparison:compare(merged.mask)},bridge:{added:bridged.added.length,stats:stats(bridged.mask,merged.w,merged.h),manualComparison:compare(bridged.mask)},thin:{removed:thinned.removed.length,stats:stats(thinned.mask,merged.w,merged.h),manualComparison:compare(thinned.mask)},combined:{added:bridged.added.length,removed:combo.removed.length,stats:stats(combo.mask,merged.w,merged.h),manualComparison:compare(combo.mask)},scanOrderDifference:thinned.mask.reduce((n,v,i)=>n+Number(v!==reverse.mask[i]),0),synthetic:cases};
  findings.sampling={nativeSprite:false,method:'manually calibrated cell-center RGB threshold sampled from supplied grid screenshots',threshold:{rBelow:120,gBelow:135,bBelow:130},visualVerification:'Reconstruction checked visually against both screenshots; outlines align with visible chart cells.',uncertainties:['Grid spacing and origin are calibrated manually; no native bead coordinates or chart metadata were supplied.','Threshold identifies selected dark green cells in these views, not an image-independent outline classifier.','Popup occlusion and chart clipping leave unknown cells; edits touching popup cells are vetoed.','Topology counts refer only to sampled binary masks; unknown cells may disconnect an otherwise continuous original outline.','Manual target may contain deliberate redraws in addition to repair; mismatch counts do not score artistic correctness.'],fixtures:['outline-full-pattern.png','outline-h5.png','outline-h6.png','outline-merged.png','outline-manual.png'].map(name=>`.tmp/bead-research-private/fixtures/${name}`)};
  await render(sharp,path.join(dir,'outline-comparison.png'),[visible,{mask:bridged.mask,known:merged.known},{mask:thinned.mask,known:merged.known},{mask:combo.mask,known:merged.known},{mask:manualAligned,known:comparisonKnown}],merged.w,merged.h);
  fs.writeFileSync(path.join(dir,'sampled-masks.json'),JSON.stringify({merged:{...merged,mask:[...merged.mask],known:[...merged.known]},manual:{...manual,mask:[...manual.mask],known:[...manual.known]},alignment},null,2));
  fs.copyFileSync(path.join(dir,'outline-comparison.png'),path.join(outputDir,'outline-comparison.png'));
  fs.writeFileSync(path.join(researchDir,'outline-findings.json'),JSON.stringify(findings,null,2)+'\n');
  console.log(JSON.stringify({verdict:findings.verdict,alignment,merged:findings.merged.manualComparison,thin:findings.thin.manualComparison,bridgeAdded:bridged.added.length,thinRemoved:thinned.removed.length,scanOrderDifference:findings.scanOrderDifference,outputs:['bench/bead-research/outline-findings.json','.tmp/bead-research-private/outputs/outline-comparison.png','.tmp/bead-outline-research/sampled-masks.json']},null,2));return findings;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))await run();
