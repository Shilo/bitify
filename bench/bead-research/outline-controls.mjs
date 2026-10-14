// Authored procedural inputs; no third-party pixel data.
export function outlineControls() {
  const colors=['#302332','#604452','#ecc59d','#ffffff','#dc8f9d'];
  function make(id,draw,{opaque=false}={}) {
    const width=24,height=24,labels=new Int32Array(width*height).fill(opaque?2:-1),keep=[],repair=[];
    const set=(x,y,l)=>{labels[y*width+x]=l;},rect=(x,y,w,h,l)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)set(xx,yy,l);};
    rect(4,4,16,16,0);rect(5,5,14,14,2);draw({set,rect,labels,keep,repair,width,height});
    return {id,group:'authored '+id,kind:'control',image:{width,height,colors,labels},keep,repair};
  }
  const out=[];
  out.push(make('shade-seam',({set,repair})=>{for(let x=8;x<=14;x++){set(x,4,1);repair.push({p:4*24+x,label:0});}}));
  out.push(make('selective-border',({set,keep})=>{for(let x=8;x<=14;x++){set(x,4,2);keep.push(4*24+x);}}));
  for(const id of ['accidental-gap','intentional-gap'])out.push(make(id,({rect,set,keep,repair})=>{
    rect(7,9,2,1,0);rect(10,9,2,1,0);set(9,9,2);
    if(id==='accidental-gap')repair.push({p:9*24+9,label:0});else keep.push(9*24+9);
  }));
  out.push(make('thick-bend',({rect,keep})=>{rect(8,8,2,7,0);rect(8,13,7,2,0);for(let y=8;y<15;y++)keep.push(y*24+8);for(let x=8;x<15;x++)keep.push(14*24+x);}));
  out.push(make('double-inside',({rect,repair})=>{rect(7,9,10,2,0);for(let x=7;x<17;x++)repair.push({p:10*24+x,label:2});}));
  out.push(make('stairs',({set,keep})=>{for(let d=0;d<10;d++){const x=7+Math.floor(d/2),y=7+d;set(x,y,0);keep.push(y*24+x);}}));
  out.push(make('tiny-loop-hole',({rect,set,keep})=>{rect(9,9,3,3,0);set(10,10,-1);for(let y=9;y<12;y++)for(let x=9;x<12;x++)keep.push(y*24+x);}));
  out.push(make('eyes-blush-glint-text',({rect,set,keep})=>{
    rect(8,9,2,2,0);rect(14,9,2,2,0);set(8,9,3);rect(7,13,2,1,4);rect(15,13,2,1,4);rect(10,15,4,1,0);
    rect(10,6,3,1,0);rect(11,6,1,3,0);
    keep.push(9*24+8,9*24+9,10*24+8,10*24+9,13*24+7,13*24+15,6*24+10,7*24+11,8*24+11);
  }));
  out.push(make('disconnected-accessory',({set,keep})=>{set(1,1,0);keep.push(25);}));
  out.push(make('touching-limbs',({rect,set,keep})=>{rect(10,10,1,7,0);set(10,13,2);keep.push(13*24+10);}));
  out.push(make('opaque-background',()=>{}, {opaque:true}));
  out.push(make('light-border',({rect,keep})=>{rect(4,4,16,16,3);rect(5,5,14,14,2);keep.push(4*24+8);}));
  out.push(make('clipped-sprite',({rect,keep})=>{rect(0,8,5,8,2);keep.push(8*24);}));
  out.push(make('spur',({set,repair})=>{set(10,3,0);repair.push({p:3*24+10,label:-1});}));
  return out;
}
