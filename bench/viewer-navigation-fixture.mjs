import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GifWriter } from 'omggif';
const w=1600,h=1000, data=Buffer.alloc((w*4+1)*h);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const gx=Math.floor(x/100),gy=Math.floor(y/100);
  const c=x%100<3||y%100<3?[25,30,45,255]:x>200&&x<350&&y>150&&y<300?[255,80,70,255]:x>1200&&x<1350&&y>700&&y<850?[60,130,255,255]:x>700&&x<900&&y>400&&y<600?[255,210,45,255]:[(gx*17+55)%256,(gy*23+80)%256,155,(gx+gy)%4?255:0];
  data.set(c,y*(w*4+1)+1+x*4);
}
function chunk(type,bytes){const b=Buffer.alloc(bytes.length+12);b.writeUInt32BE(bytes.length);b.write(type,4);b.set(bytes,8);let crc=-1;for(const n of b.subarray(4,-4)){crc^=n;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}b.writeUInt32BE((crc^-1)>>>0,b.length-4);return b;}
const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
mkdirSync('bench/viewer-navigation-evidence',{recursive:true});writeFileSync('bench/viewer-navigation-evidence/landmarks.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(data)),chunk('IEND',Buffer.alloc(0))]));
const gif=Buffer.alloc(16*1024*1024), writer=new GifWriter(gif,800,800,{loop:0,palette:[0x202020,0xfefefe,0xff7050,0x4070ff]});
for(let frame=0;frame<12;frame++){
  const pixels=new Uint8Array(800*800);
  for(let y=0;y<800;y++)for(let x=0;x<800;x++)pixels[y*800+x]=(Math.floor(x/80)+Math.floor(y/80)+frame)%4;
  writer.addFrame(0,0,800,800,pixels,{delay:10});
}
writeFileSync('bench/viewer-navigation-evidence/large-clip.gif',gif.subarray(0,writer.end()));
