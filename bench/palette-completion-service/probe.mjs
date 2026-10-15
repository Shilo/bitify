// Free, public-contract refresh; authenticated MCP tools/list only when configured.
// No image generation, browser session inspection or private implementation access.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { initMcp, rpc } from '../palette-service-research/api-common.mjs';
const dir = import.meta.dirname;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const urls = [
  'https://api.pixellab.ai/v2/openapi.json',
  'https://api.pixellab.ai/mcp/docs',
  'https://api.pixellab.ai/v2/llms.txt',
  'https://www.pixellab.ai/docs/tools/reduce-colors',
  'https://www.pixellab.ai/docs/options/color',
  'https://www.pixellab.ai/docs/options/dithering',
];
const pages = await Promise.all(urls.map(async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  return { url, status: response.status, sha256: sha(text), text };
}));
const spec = JSON.parse(pages[0].text);
const schemas = spec.components.schemas;
const reduce = spec.paths['/reduce-colors'].post;
const model = reduce.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
const references = name => [...JSON.stringify(schemas[name] ?? {}).matchAll(/#\/components\/schemas\/([^"\\]+)/g)].map(m => m[1]);
const reaches = (name, target, seen = new Set()) => {
  if (name === target) return true;
  if (seen.has(name)) return false;
  seen.add(name);
  return references(name).some(next => reaches(next, target, seen));
};
const targetModels = Object.entries(schemas).filter(([, schema]) => Object.keys(schema.properties ?? {}).includes('smart')).map(([name]) => name);
const smartRoutes = [];
for (const [path, operations] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(operations)) {
  const body = op.requestBody?.content?.['application/json']?.schema;
  const name = body?.$ref?.split('/').at(-1);
  if (name && targetModels.some(t => reaches(name, t))) smartRoutes.push({ path, method, requestModel: name, summary: op.summary });
}
let mcp = { tested: false, reason: 'PIXELLAB_SECRET unavailable; public MCP documentation inspected' };
if (process.env.PIXELLAB_SECRET) {
  await initMcp();
  const response = await rpc('tools/list', {}, 2);
  const tools = response.data?.result?.tools ?? [];
  mcp = { tested: true, status: response.status, tools: tools.length, smartTools: tools.filter(t => /\bsmart\b/i.test(JSON.stringify(t))), reduceColors: tools.find(t => t.name === 'reduce_colors') };
}
const record = {
  at: new Date().toISOString(), noPaidCalls: true,
  pages: pages.map(({ text, ...metadata }) => ({ ...metadata, smartMentions: [...text.matchAll(/.{0,100}smart.{0,180}/gi)].slice(0, 20).map(m => m[0]) })),
  rest: { totalPaths: Object.keys(spec.paths).length, reducer: { operationId: reduce.operationId, model, schema: schemas[model] }, smartModels: Object.fromEntries(targetModels.map(name => [name, schemas[name]])), smartRoutes },
  mcp,
};
fs.writeFileSync(`${dir}/contract-refresh.json`, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ publicPages: record.pages.map(p => ({ url: p.url, status: p.status })), reducerFields: Object.keys(schemas[model].properties), smartRoutes, mcp: { tested: mcp.tested, status: mcp.status, tools: mcp.tools, smartTools: mcp.smartTools?.length }, noPaidCalls: true }));
