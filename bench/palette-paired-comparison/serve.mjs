// Serve only retained comparison artifacts on loopback; no production app hooks.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
const root=import.meta.dirname;
const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.json':'application/json; charset=utf-8'};
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const name=url.pathname==='/'?'contact-sheet.html':decodeURIComponent(url.pathname.slice(1));
    const file=resolve(root,name);
    if(dirname(file)!==root||!mime[extname(file)]){res.writeHead(404).end();return;}
    let bytes=readFileSync(file);
    const selected=url.searchParams.get('case');
    if(name==='contact-sheet.html'&&selected){
      if(!/^[a-z0-9-]+$/.test(selected)){res.writeHead(400).end();return;}
      const html=bytes.toString(),sections=[...html.matchAll(/<section>[\s\S]*?<\/section>/g)];
      if(!sections.some(m=>m[0].includes('<h2>'+selected+'</h2>'))){res.writeHead(404).end();return;}
      bytes=Buffer.from(html.replace(/<section>[\s\S]*?<\/section>/g,section=>section.includes('<h2>'+selected+'</h2>')?section:''));
    }
    res.writeHead(200,{'content-type':mime[extname(file)],'cache-control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end();}
});
server.listen(5295,'127.0.0.1',()=>console.log('Paired gallery http://127.0.0.1:5295/'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
