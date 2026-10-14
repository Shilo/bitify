// Research-only explicit exterior styling. Empty enclosed holes are excluded.
import {neighbors,validateInput} from './regions.mjs';
export function exteriorCells(input){
 validateInput(input);const {width:w,height:h,labels}=input,exterior=new Uint8Array(labels.length),queue=[];
 for(let p=0;p<labels.length;p++)if(labels[p]<0&&(p%w===0||p%w===w-1||p<w||p>=w*(h-1))){exterior[p]=1;queue.push(p);}
 for(let i=0;i<queue.length;i++)for(const q of neighbors(queue[i],w,h,4))if(labels[q]<0&&!exterior[q]){exterior[q]=1;queue.push(q);}
 return Uint8Array.from(labels,(l,p)=>Number(l>=0&&(p%w===0||p%w===w-1||p<w||p>=w*(h-1)||neighbors(p,w,h,4).some(q=>exterior[q]))));
}
export function solidBoundary(input,color){
 validateInput(input);if(!Number.isInteger(color)||color<0||color>=input.colors.length)throw Error('Choose a source palette color');
 const out=input.labels.slice();if(input.labels.every(l=>l>=0))return out;
 const boundary=exteriorCells(input);for(let p=0;p<out.length;p++)if(boundary[p])out[p]=color;
 return out;
}
