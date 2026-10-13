import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('.tmp/palette-phone-build'),reports=path.resolve('.tmp/palette-perf-20261012/phone');
fs.mkdirSync(reports,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.gif':'image/gif','.png':'image/png'};
http.createServer(async(req,res)=>{
 try{
  if(req.method==='POST'&&req.url==='/results'){
   let text='';for await(const chunk of req){text+=chunk;if(text.length>1024*1024)throw Error('Report too large');}
   const data=JSON.parse(text),phone=/Android/.test(data.userAgent??'');
   fs.writeFileSync(path.join(reports,phone?'android-results.json':'desktop-results.json'),JSON.stringify(data,null,2));
   res.writeHead(200,{'Content-Type':'text/plain'});res.end('Recorded');return;
  }
  const url=new URL(req.url,'http://localhost');
  const name=url.pathname==='/perf'?'/bench/palette-performance-spike.html':url.pathname==='/'?'/index.html':url.pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(name));if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  if(!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(400);res.end(error.message);}
}).listen(5262,'127.0.0.1',()=>console.log('Palette research server: http://127.0.0.1:5262/perf'));
