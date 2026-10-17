(() => {
  const root=document.getElementById('cf-studio'), assets=window.filmAssets, shots=window.filmShots;
  const duration=shots.at(-1).end, views=[...root.querySelectorAll('[data-scene]')], layers=new Map();
  const clamp=x=>Math.max(0,Math.min(1,x)), ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  root.querySelectorAll('[data-asset]').forEach(img=>{img.src=assets[img.dataset.asset];});
  for(const img of root.querySelectorAll('[data-screen],[data-phone],[data-focus],[data-detail]')){
    const old=img.cloneNode(false);for(const k of ['screen','phone','focus','detail']) delete old.dataset[k];
    old.classList.add('cfs-crossfade');img.parentElement.appendChild(old);layers.set(img,old);
  }
  function pair(img,current,previous,alpha){
    if(!img)return;const old=layers.get(img);
    if(img.getAttribute('src')!==assets[current])img.src=assets[current];
    if(old.getAttribute('src')!==assets[previous])old.src=assets[previous];
    img.style.opacity='1';old.style.opacity=String(1-alpha);
  }
  function stage(index,time){
    const s=shots[index],view=views[index], local=clamp((time-s.start)/(s.end-s.start));
    view.style.setProperty('--cfs-drift',String(local*10));
    if(s.frames){
      const length=s.kind==='results'?s.comparisonAfter:s.end-s.start;
      const slot=clamp((time-s.start)/length)*s.frames.length;
      const k=Math.min(s.frames.length-1,Math.floor(slot)), previous=Math.max(0,k-1), alpha=k===0?1:ease((slot-k)*length/s.frames.length/.24);
      pair(view.querySelector('[data-screen]'),s.frames[k],s.frames[previous],alpha);
      pair(view.querySelector('[data-phone]'),s.phoneFrames[k],s.phoneFrames[previous],alpha);
      pair(view.querySelector('[data-focus]'),'focus-'+s.frames[k],'focus-'+s.frames[previous],alpha);
      pair(view.querySelector('[data-detail]'),'detail-'+s.frames[k],'detail-'+s.frames[previous],alpha);
      view.querySelector('[data-caption]').textContent=s.captions[k];
    }
    if(s.kind==='results'){
      const reveal=ease((time-s.start-s.comparisonAfter)/.4);
      view.querySelector('.cfs-triptych').style.opacity=String(reveal);
      for(const node of view.querySelectorAll('.cfs-inspection'))node.style.opacity=String(1-reveal);
    }
  }
  window.renderFrame=time=>{
    const t=Math.max(0,Math.min(duration,time));
    let index=shots.findIndex(s=>t>=s.start&&t<s.end);if(index<0)index=shots.length-1;
    const entering=index===0?1:ease((t-shots[index].start)/.42);
    views.forEach((view,i)=>{
      const active=i===index,previous=i===index-1&&entering<1;
      view.style.visibility=active||previous?'visible':'hidden';view.style.opacity=String(active?entering:previous?1-entering:0);
      view.style.transform=`translateY(${active?(1-entering)*18:previous?-entering*12:0}px)`;
      view.style.zIndex=active?'2':'1';view.setAttribute('aria-hidden',String(!active));
      if(active||previous)stage(i,t);
    });
    root.style.setProperty('--cfs-progress',String(t/duration*100)+'%');
    return {time:t,scene:shots[index].name};
  };
  window.filmReady=(async()=>{
    await document.fonts.ready;
    await Promise.all(Object.values(assets).map(src=>new Promise((ok,fail)=>{const img=new Image();img.onload=ok;img.onerror=()=>fail(Error('Image failed: '+src));img.src=src;})));
    window.renderFrame(0);return true;
  })();
})();
