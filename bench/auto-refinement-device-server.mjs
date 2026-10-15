// Research only: loopback fixtures, source modules and results; no production edits.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve('.'),out=resolve('bench/auto-refinement-device-review');
mkdirSync(out,{recursive:true});
const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.gif':'image/gif','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/report'){
    let bytes=0,body='';for await(const chunk of req){bytes+=chunk.length;if(bytes>2e6)throw Error('Report too large');body+=chunk;}
    const report=JSON.parse(body);if(!['codex','android'].includes(report.device))throw Error('Unknown device');
    writeFileSync(resolve(out,report.device+'-results.json'),JSON.stringify(report,null,2)+'\n');
    res.writeHead(200,{'content-type':'application/json'}).end('{"saved":true}');return;
  }
  let local=url.pathname==='/'?'bench/auto-refinement-device-qa.html':decodeURIComponent(url.pathname).slice(1);
  const source=/^src\/lib\/[a-z0-9-]+\.js$/.test(local),research=/^bench\/(auto-refinement-spike|auto-refinement-comparison)\/[a-z0-9_-]+\.(mjs|html|json|png|gif)$/.test(local),image=/^bench\/(palette-paired-comparison|palette-service-research)\/[a-z0-9_-]+\.png$/.test(local);
  if(!source&&!research&&!image&&local!=='bench/auto-refinement-device-qa.html')throw Error('Unknown route');
  const file=resolve(root,local);if(!file.startsWith(root+sep)||!existsSync(file))throw Error('Missing file');
  let bytes=readFileSync(file);const selected=url.searchParams.get('case');
  if(selected&&local==='bench/auto-refinement-comparison/index.html'){
    if(!/^(armor|sprite)-generated(2|4|8|16)$/.test(selected))throw Error('Unknown comparison');
    const html=bytes.toString();if(!html.includes('data-case="'+selected+'"'))throw Error('Missing comparison');
    bytes=Buffer.from(html.replace(/<section data-case="([^"]+)">[\s\S]*?<\/section>/g,(section,id)=>id===selected?section:''));
  }
  res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'}).end(bytes);
}catch(error){res.writeHead(400,{'content-type':'application/json'}).end(JSON.stringify({error:error.message}));}});
server.listen(5296,'127.0.0.1',()=>console.log('Auto refinement research http://127.0.0.1:5296/'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
