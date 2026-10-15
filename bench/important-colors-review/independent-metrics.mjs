// Reviewer-owned output measurements; no imports from Colorfetti or candidate core.
const lin=n=>{n/=255;return n<=0.04045?n/12.92:Math.pow((n+0.055)/1.055,2.4);};
export function lab(bytes,at=0){
 const r=lin(bytes[at]),g=lin(bytes[at+1]),b=lin(bytes[at+2]);
 const L=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);
 const M=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);
 const S=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
 return[0.2104542553*L+0.7936177850*M-0.0040720468*S,1.9779984951*L-2.4285922050*M+0.4505937099*S,0.0259040371*L+0.7827717662*M-0.8086757660*S];
}
const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
const hex=(d,p)=>[...d.subarray(p,p+3)].map(n=>n.toString(16).padStart(2,'0')).join('');
export function regionPoints(source,region){
 const {width,height,data}=source,out=[];
 if(region.sourceColors){const colors=new Set(region.sourceColors);for(let i=0;i<width*height;i++)if(data[i*4+3]>=128&&colors.has(hex(data,i*4)))out.push(i);}
 else if(region.pixels)for(const[x,y]of region.pixels)out.push(y*width+x);
 else if(region.rect){const[x0,y0,w,h]=region.rect;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)out.push(y*width+x);}
 else throw Error('Unknown region '+region.id);
 return out;
}
export function measure(source,output,regions=[]){
 const {width,height,data}=source;if(width!==output.width||height!==output.height||data.length!==output.data.length)throw Error('Invalid output dimensions');
 let alphaWrong=0,n=0,rgb=0,perceptual=0;const used=new Set();
 for(let p=0;p<data.length;p+=4){const a=data[p+3]>=128?255:0;if(output.data[p+3]!==a)alphaWrong++;if(!a)continue;n++;used.add(hex(output.data,p));perceptual+=distance(lab(data,p),lab(output.data,p));for(let c=0;c<3;c++)rgb+=(data[p+c]-output.data[p+c])**2;}
 const stats={alphaWrong,usedColors:[...used].sort(),channelRmse:Math.sqrt(rgb/(3*n||1)),labMse:perceptual/(n||1),regions:{}};
 for(const region of regions){const points=regionPoints(source,region),members=new Set(points),so=[0,0,0],oo=[0,0,0],colors={};let e=0,sourceContrast=0,outputContrast=0,edges=0,exact=0;
  for(const i of points){const p=i*4,a=lab(data,p),b=lab(output.data,p);if(data[p+3]<128)continue;e+=distance(a,b);colors[hex(output.data,p)]=(colors[hex(output.data,p)]??0)+1;if(hex(data,p)===hex(output.data,p))exact++;for(let c=0;c<3;c++){so[c]+=a[c];oo[c]+=b[c];}
   const x=i%width,y=Math.floor(i/width);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||members.has(j)||data[j*4+3]<128)continue;edges++;sourceContrast+=Math.sqrt(distance(a,lab(data,j*4)));outputContrast+=Math.sqrt(distance(b,lab(output.data,j*4)));}
  }
  const count=points.length;for(let c=0;c<3;c++){so[c]/=count||1;oo[c]/=count||1;}const sc=Math.hypot(so[1],so[2]),oc=Math.hypot(oo[1],oo[2]);let hueDegrees=null;if(sc>=.04&&oc>=.02){let d=Math.abs(Math.atan2(so[2],so[1])-Math.atan2(oo[2],oo[1]));d=Math.min(d,2*Math.PI-d);hueDegrees=d*180/Math.PI;}
  stats.regions[region.id]={count,labRmse:Math.sqrt(e/(count||1)),colors,exact,sourceMeanLab:so,outputMeanLab:oo,sourceChroma:sc,outputChroma:oc,hueDegrees,edgeCount:edges,sourceContrast:sourceContrast/(edges||1),outputContrast:outputContrast/(edges||1)};
 }
 return stats;
}
export function flags(baseline,candidate){const out=[];if(candidate.channelRmse-baseline.channelRmse>2)out.push('channel-rmse+2');if(candidate.labMse>baseline.labMse*1.1+1e-12)out.push('lab-mse+10%');for(const[id,b]of Object.entries(baseline.regions)){const c=candidate.regions[id];if(c.labRmse-b.labRmse>.02)out.push(id+':region-error+.02');if(b.outputContrast>=.04&&c.outputContrast<.02)out.push(id+':contrast-collapse');if(b.hueDegrees!==null&&b.hueDegrees<=30&&(c.hueDegrees===null||c.hueDegrees>60))out.push(id+':hue-loss');}return out;}
