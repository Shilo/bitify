import fs from 'node:fs';
import { api, initMcp, rpc, sha } from '../palette-service-research/api-common.mjs';
const dir=import.meta.dirname;
const schema=await (await fetch('https://api.pixellab.ai/v2/openapi.json')).json();
const entry=schema.paths['/reduce-colors'];
const ref=entry.post.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
const names=[ref,'TargetPalette'];
fs.writeFileSync(`${dir}/live-public-contract.json`,JSON.stringify({at:new Date().toISOString(),path:entry,models:Object.fromEntries(names.map(n=>[n,schema.components.schemas[n]]))},null,2));
console.log('REST keys',Object.keys(schema.components.schemas[ref].properties));
console.log('Secret present',Boolean(process.env.PIXELLAB_SECRET));
if(process.env.PIXELLAB_SECRET){
 const balance=await api('/balance'); console.log('Balance status',balance.status);
 fs.writeFileSync(`${dir}/balance-before.json`,JSON.stringify({status:balance.status,credits:balance.result.credits,subscriptionGenerations:balance.result.subscription?.generations},null,2));
 await initMcp(); const listed=await rpc('tools/list',{},2);
 const list=listed.data.result?.tools??[];
 const relevant=list.filter(t=>/reduce_colors|create_image_pro|palette|smart/i.test(t.name));
 fs.writeFileSync(`${dir}/live-mcp-contract.json`,JSON.stringify({at:new Date().toISOString(),status:listed.status,total_tools:list.length,tools:relevant},null,2));
 console.log('MCP relevant',relevant.map(t=>({name:t.name,keys:Object.keys(t.inputSchema?.properties??{})})));
}
