// Research only. No production imports or settings accept these candidate modes.
export const MODES = ['oklab', 'rgb', 'lightness', 'luminance', 'cie-lightness', 'hsv-value', 'hsl-lightness', 'luma', 'gray-first', 'lightness-4', 'lightness-16', 'tone-rank'];
export const LABELS = {oklab:'Oklab · current',rgb:'RGB · current',lightness:'Lightness only · Oklab L',luminance:'Luminance only · linear Y','cie-lightness':'CIE lightness only · L*','hsv-value':'HSV Value only','hsl-lightness':'HSL Lightness only',luma:'Luma only · encoded RGB','gray-first':'Grayscale source → Oklab','lightness-4':'Lightness priority · 4× L²','lightness-16':'Lightness priority · 16× L²','tone-rank':'Tone rank · equal bands'};
const linear = Float64Array.from({length:256},(_,n)=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
export function features(key) {
  const R=key>>>16,G=key>>>8&255,B=key&255,r=linear[R],g=linear[G],b=linear[B];
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  const L=.2104542553*l+.7936177850*m-.0040720468*s,a=1.9779984951*l-2.4285922050*m+.4505937099*s,z=.0259040371*l+.7827717662*m-.8086757660*s,Y=.2126*r+.7152*g+.0722*b;
  return {key,R,G,B,L,a,b:z,Y,cie:Y>216/24389?(116*Math.cbrt(Y)-16)/100:Y*(24389/27)/100,V:Math.max(R,G,B)/255,H:(Math.max(R,G,B)+Math.min(R,G,B))/510,luma:(.2126*R+.7152*G+.0722*B)/255};
}
export const delta2=(a,b)=>(a.L-b.L)**2+(a.a-b.a)**2+(a.b-b.b)**2;
export function makeMatcher(colors,mode,{exact=true}={}) {
  if(!MODES.includes(mode)) throw Error('Unknown research mode');
  const p=colors.map(c=>features(parseInt(c.slice(1),16))), members=new Map(p.map((c,i)=>[c.key,i])),memo=new Map();
  const ranked=p.map((_,i)=>i).sort((a,b)=>p[a].L-p[b].L||p[a].key-p[b].key);
  return key=>{
    if(exact&&members.has(key))return members.get(key);
    if(memo.has(key))return memo.get(key);
    const x=features(key);let best=Infinity,secondary=Infinity,index=0;
    if(mode==='tone-rank')index=ranked[Math.min(p.length-1,Math.floor(x.L*p.length))];
    else for(let i=0;i<p.length;i++) {
      const y=p[i],dl=(x.L-y.L)**2,chrom=(x.a-y.a)**2+(x.b-y.b)**2;let d;
      switch(mode){
        case 'rgb':d=(x.R-y.R)**2+(x.G-y.G)**2+(x.B-y.B)**2;break;
        case 'lightness':d=dl;break;
        case 'luminance':d=(x.Y-y.Y)**2;break;
        case 'cie-lightness':d=(x.cie-y.cie)**2;break;
        case 'hsv-value':d=(x.V-y.V)**2;break;
        case 'hsl-lightness':d=(x.H-y.H)**2;break;
        case 'luma':d=(x.luma-y.luma)**2;break;
        case 'gray-first':d=dl+y.a*y.a+y.b*y.b;break;
        case 'lightness-4':d=4*dl+chrom;break;
        case 'lightness-16':d=16*dl+chrom;break;
        default:d=delta2(x,y);
      }
      // Full-color secondary distance resolves genuine scalar ties, then RGB key.
      // The source's hue never participates unless primary scores are exactly equal.
      const tie=delta2(x,y);
      if(d<best||!['oklab','rgb'].includes(mode)&&d===best&&(tie<secondary||tie===secondary&&y.key<p[index].key)){best=d;secondary=tie;index=i;}
    }
    memo.set(key,index);return index;
  };
}
export function render(image,colors,mode,{cut=128,keep=false,exact=true}={}) {
  const match=makeMatcher(colors,mode,{exact}),indices=new Uint16Array(image.width*image.height),data=new Uint8ClampedArray(image.data.length),keys=colors.map(c=>parseInt(c.slice(1),16));
  for(let i=0;i<indices.length;i++){
    const at=i*4;if(image.data[at+3]<(keep?1:cut)){indices[i]=256;continue;}
    const n=match(image.data[at]<<16|image.data[at+1]<<8|image.data[at+2]),rgb=keys[n];indices[i]=n;
    data[at]=rgb>>>16;data[at+1]=rgb>>>8&255;data[at+2]=rgb&255;data[at+3]=keep?image.data[at+3]:255;
  }
  return {indices,data,width:image.width,height:image.height};
}
export function measure(image,result,colors,baseline) {
  const p=colors.map(c=>features(parseInt(c.slice(1),16))),cache=new Map(),src=[];let n=0,changed=0,L=0,Y=0,E=0,exact=0,exactBroken=0;
  const used=new Set(),members=new Set(p.map(x=>x.key));
  for(let i=0;i<result.indices.length;i++){
    if(result.indices[i]===256)continue;
    const at=i*4,key=image.data[at]<<16|image.data[at+1]<<8|image.data[at+2];let x=cache.get(key);if(!x){x=features(key);cache.set(key,x);}src[i]=x;
    const out=p[result.indices[i]];used.add(out.key);n++;L+=Math.abs(x.L-out.L);Y+=Math.abs(x.Y-out.Y);E+=delta2(x,out);changed+=baseline&&baseline.indices[i]!==result.indices[i]?1:0;
    if(members.has(key)){exact++;if(key!==out.key)exactBroken++;}
  }
  let edges=0,collapsed=0,toneEdges=0,inverted=0,chromaEdges=0,chromaCollapsed=0;
  for(let i=0;i<src.length;i++)if(src[i])for(const j of [i%image.width<image.width-1?i+1:-1,i+image.width])if(j>=0&&src[j]){
    const a=src[i],b=src[j],oa=p[result.indices[i]],ob=p[result.indices[j]],de=delta2(a,b);
    if(de>=.0025){edges++;if(oa.key===ob.key)collapsed++;}
    if(Math.abs(a.L-b.L)>=.03){toneEdges++;if((a.L-b.L)*(oa.L-ob.L)<-1e-12)inverted++;}
    if(de>=.0025&&Math.abs(a.L-b.L)<.02){chromaEdges++;if(oa.key===ob.key)chromaCollapsed++;}
  }
  return {visible:n,changed:n?changed/n:0,meanAbsL:n?L/n:0,meanAbsY:n?Y/n:0,meanDeltaE:n?Math.sqrt(E/n):0,used:used.size,edges,collapsed,edgeCollapse:edges?collapsed/edges:0,toneEdges,inverted,inversions:toneEdges?inverted/toneEdges:0,chromaEdges,chromaCollapsed,chromaCollapse:chromaEdges?chromaCollapsed/chromaEdges:0,exact,exactBroken};
}
