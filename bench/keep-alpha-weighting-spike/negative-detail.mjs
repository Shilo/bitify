import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fixtures, render } from './experiment.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const require=createRequire(import.meta.url),sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const all=await fixtures(), report={cases:[]};
const preset=FULL_PRESETS.find(p=>p.id==='preset-res64');if(!preset)throw new Error('Missing stable target preset-res64');
const target=preset.colors,bgs={black:[0,0,0],white:[255,255,255],warm:[210,160,110],cool:[70,120,180]};
await fs.mkdir(new URL('./visuals/',import.meta.url),{recursive:true});
const encode=src=>sharp(Buffer.from(src.data),{raw:{width:src.width,height:src.height,channels:4}}).png().toBuffer();
for(const [name,kind,metric]of [['many-soft-colors','auto','oklab'],['many-soft-colors','fixed','rgb'],['opaque-core-alpha6-halo','auto','oklab'],['warm-glow','auto','oklab'],['retained-glow-alpha.png','auto','oklab']]){
  const f=all.find(f=>f.name===name),src=f.items[0].original, row={name,kind,metric,cap:kind==='auto'?3:4,variants:[]}, images=[{label:'Source',src}];
  for(const weighting of ['baseline','linear','squared']){
    const out=(await render(f.items,{weighting,target:kind==='fixed'?target:undefined,cap:row.cap,metric})).outputs[0], r={weighting,regions:{},backgrounds:{}};
    for(const [region,test]of [['opaque',a=>a===255],['high-alpha',a=>a>=128],['soft-alpha',a=>a>0&&a<128],['visible',a=>a>0]]){
      let n=0,sse=0,changed=0;
      for(let p=0;p<src.data.length;p+=4)if(test(src.data[p+3])){n++;let any=false;for(let c=0;c<3;c++){const d=src.data[p+c]-out.data[p+c];sse+=d*d;if(d)any=true;}if(any)changed++;}
      r.regions[region]={pixels:n,changed,straightRgbRmse:n?Math.sqrt(sse/(3*n)):null};
    }
    for(const [bgname,bg]of Object.entries(bgs)){
      let n=0,sse=0;
      for(let p=0;p<src.data.length;p+=4){const a=src.data[p+3]/255;if(!a)continue;n++;for(let c=0;c<3;c++){const s=src.data[p+c]*a+bg[c]*(1-a),o=out.data[p+c]*a+bg[c]*(1-a);sse+=(s-o)**2;}}
      r.backgrounds[bgname]={visiblePixels:n,srgbChannelRmse:Math.sqrt(sse/(3*n))};
    }
    images.push({label:weighting,src:out});row.variants.push(r);
  }
  const stem=`${name.replace('.png','')}-${kind}-${metric}`;
  for(const i of images)await fs.writeFile(new URL(`./visuals/${stem}-${i.label.toLowerCase()}.png`,import.meta.url),await encode(i.src));
  const scale=4,w=src.width*scale,h=src.height*scale,labelH=24,gap=8;
  const W=(w+gap)*4+gap,H=(h+labelH+gap)*3+gap,overlays=[];
  for(let by=0;by<3;by++)for(let ix=0;ix<images.length;ix++){
    const left=gap+ix*(w+gap),top=gap+by*(h+labelH+gap),bg=by===0?[240,224,200]:by===1?[55,70,95]:null;
    const back=Buffer.alloc(src.width*src.height*4);
    for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){const p=(y*src.width+x)*4,b=bg??((Math.floor(x/4)+Math.floor(y/4))%2?[170,170,170]:[220,220,220]);for(let c=0;c<3;c++){const a=images[ix].src.data[p+3]/255;back[p+c]=Math.round(images[ix].src.data[p+c]*a+b[c]*(1-a));}back[p+3]=255;}
    overlays.push({input:Buffer.from(`<svg width="${w}" height="${labelH}"><text x="1" y="17" font-family="Arial" font-size="13">${images[ix].label} ${by===0?'warm':by===1?'cool':'checker'}</text></svg>`),left,top});
    overlays.push({input:await sharp(back,{raw:{width:src.width,height:src.height,channels:4}}).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left,top:top+labelH});
  }
  await sharp({create:{width:W,height:H,channels:4,background:'#f4f4f4'}}).composite(overlays).png().toFile(new URL(`./visuals/${stem}-sheet.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
  report.cases.push(row);
}
await fs.writeFile(new URL('./negative-detail.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
