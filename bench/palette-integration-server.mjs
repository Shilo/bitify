import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2] ?? '.tmp/palette-final-build'),reports=path.resolve(process.argv[3] ?? '.tmp/palette-implementation-20261012');
const port = Number(process.argv[4] ?? 5264);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid QA port.');
fs.mkdirSync(reports,{recursive:true});
const mime={'.html':'text/html','.json':'application/json','.js':'text/javascript','.css':'text/css','.gif':'image/gif','.png':'image/png'};
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/export') {
      const device = url.searchParams.get('device');
      if (!['android', 'desktop'].includes(device) || [...url.searchParams.keys()].some(key => key !== 'device') || url.searchParams.getAll('device').length !== 1) throw Error('Invalid export device.');
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/zip') throw Error('Only ZIP exports are accepted.');
      const limit = 16 * 1024 * 1024, chunks = [];
      const declared = req.headers['content-length'];
      if (declared !== undefined && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)) || Number(declared) > limit)) throw Error('ZIP export exceeds 16 MiB.');
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) throw Error('ZIP export exceeds 16 MiB.');
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks, size);
      if (bytes.length < 4 || bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4) throw Error('Invalid ZIP export signature.');
      const filename = `${device}-export.zip`;
      fs.writeFileSync(path.join(reports, filename), bytes);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ filename, bytes: size }));
      return;
    }
    if(req.method==='POST'&&req.url==='/results') {
      let body='';for await(const chunk of req){body+=chunk;if(body.length>1024*1024)throw Error('Report too large');}
      const data=JSON.parse(body),device=/Android/.test(data.userAgent??'')?'android':'desktop';
      const kind = data.kind === 'wall-stress' ? 'wall-stress' : data.kind === 'performance' ? 'performance' : 'integration';
      fs.writeFileSync(path.join(reports,`${device}-${kind}.json`),JSON.stringify(data,null,2));
      res.writeHead(200);res.end('Recorded');return;
    }
    const name=url.pathname==='/'?'/index.html':url.pathname;
    const file=path.resolve(root,'.'+decodeURIComponent(name));if(!file.startsWith(root+path.sep))throw Error('Invalid path');
    if(!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
  }catch(error){res.writeHead(400);res.end(error.message);}
}).listen(port,'127.0.0.1',()=>console.log(`Palette QA: http://127.0.0.1:${port}/`));
