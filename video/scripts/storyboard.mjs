import sharp from 'sharp';
import {work,output,shots} from './project.mjs';

const at=(scene,index)=>scene.start+(index+.6)*(scene.kind==='results'?scene.comparisonAfter:scene.end-scene.start)/scene.frames.length;
const picks=[
  [1.5,'Introduction'],[at(shots[1],1),'Choose a palette'],
  [at(shots[2],1),'Import and review'],[at(shots[3],1),'Limit the colors'],
  [at(shots[4],1),'Palette dithering'],[at(shots[5],1),'Keep PNG opacity'],
  [at(shots[6],1),'Reuse output colors'],[at(shots[7],1),'1-bit palettes'],
  [at(shots[8],2),'1-bit settings'],[at(shots[9],1),'Zoom and compare'],
  [49,'Compare the results'],[51.5,'Try Colorfetti'],
];
const layers=[];
for(const [i,[time,label]] of picks.entries()){
  const left=(i%3)*640,top=Math.floor(i/3)*400;
  layers.push({input:await sharp(work+'/qa/frame-'+String(time).replace('.','-')+'.png').resize(640,360).toBuffer(),left,top});
  const text=`${time.toFixed(1)}s · ${label}`;
  layers.push({input:Buffer.from(`<svg width="640" height="40"><rect width="640" height="40" fill="#20242a"/><text x="18" y="27" font-family="Arial" font-size="22" fill="#fffdf9">${text}</text></svg>`),left,top:top+360});
}
await sharp({create:{width:1920,height:1600,channels:3,background:'#14151a'}}).composite(layers).jpeg({quality:90}).toFile(output+'/colorfetti-trailer-review-storyboard.jpg');
console.log('Saved review storyboard contact sheet.');
