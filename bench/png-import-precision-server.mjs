import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve('bench/png-import-precision-review'),port=Number(process.env.PORT??5298);mkdirSync(root,{recursive:true});
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/report'){let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>2000000)throw Error('Report too large');body+=chunk;}const data=JSON.parse(body);if(!['codex','edge','android'].includes(data.device))throw Error('Unknown device');const text=JSON.stringify(data,null,2)+'\n';writeFileSync(resolve(root,data.device+'-report-'+Date.now()+'.json'),text,{flag:'wx'});writeFileSync(resolve(root,data.device+'-report.json'),text);res.writeHead(200,{'content-type':'application/json'}).end('{"saved":true}');return;}
 let file;if(url.pathname==='/'||url.pathname==='/probe')file=resolve('bench/png-import-precision-probe.html');else if(url.pathname==='/build-record.json')file=resolve(root,'build-record.json');else{file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep)||!/^\/(assets|fixtures)\/[a-zA-Z0-9_.-]+\.(js|json|png)$/.test(url.pathname))throw Error('Invalid route');}
 res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'}[extname(file)],'cache-control':'no-store'}).end(readFileSync(file));
 }catch(error){res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:error.message}));}});
server.listen(port,'127.0.0.1',()=>console.log('PNG import precision http://127.0.0.1:'+port+'/'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
