// RESEARCH ONLY. Direct CIEDE2000 squared distance, kL=kC=kH=1.
// Formula: Sharma, Wu & Dalal (2005). Validation is separate from this kernel.
export function prepareCiede(coords){return[coords[0],coords[1],coords[2],Math.hypot(coords[1],coords[2])];}
export function ciedeSquared(x,y){
 const rad=Math.PI/180,cbar=(x[3]+y[3])/2,c7=cbar**7,G=.5*(1-Math.sqrt(c7/(c7+6103515625)));
 const a1=(1+G)*x[1],a2=(1+G)*y[1],C1=Math.hypot(a1,x[2]),C2=Math.hypot(a2,y[2]);
 let h1=C1===0?0:Math.atan2(x[2],a1)/rad,h2=C2===0?0:Math.atan2(y[2],a2)/rad;if(h1<0)h1+=360;if(h2<0)h2+=360;
 let dh=h2-h1;if(C1*C2===0)dh=0;else if(dh>180)dh-=360;else if(dh< -180)dh+=360;
 const dH=2*Math.sqrt(C1*C2)*Math.sin(dh*rad/2),dL=y[0]-x[0],dC=C2-C1,L=(x[0]+y[0])/2,C=(C1+C2)/2;
 let h;if(C1*C2===0)h=h1+h2;else if(Math.abs(h1-h2)<=180)h=(h1+h2)/2;else h=(h1+h2+(h1+h2<360?360:-360))/2;
 const T=1-.17*Math.cos((h-30)*rad)+.24*Math.cos(2*h*rad)+.32*Math.cos((3*h+6)*rad)-.20*Math.cos((4*h-63)*rad);
 const Lsq=(L-50)**2,SL=1+.015*Lsq/Math.sqrt(20+Lsq),SC=1+.045*C,SH=1+.015*C*T,Cdash7=C**7;
 const RT=-2*Math.sqrt(Cdash7/(Cdash7+6103515625))*Math.sin(60*rad*Math.exp(-(((h-275)/25)**2)));
 const l=dL/SL,c=dC/SC,z=dH/SH;return Math.max(0,l*l+c*c+z*z+RT*c*z);
}
