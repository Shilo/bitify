// Free public-contract and authenticated MCP schema refresh. No image operation.
import fs from 'node:fs';
import { api, initMcp, rpc, sha } from '../palette-service-research/api-common.mjs';
const save = (name, value) => fs.writeFileSync(new URL(name, import.meta.url), JSON.stringify(value, null, 2) + '\n');
const response = await fetch('https://api.pixellab.ai/v2/openapi.json');
const spec = await response.json();
const operation = spec.paths['/reduce-colors'].post;
const modelName = operation.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
await initMcp();
const result = await rpc('tools/list', {}, 2);
const tools = result.data?.result?.tools ?? [];
const reduce = tools.find(t => t.name === 'reduce_colors');
const balance = await api('/balance');
save('contract.json', { at: new Date().toISOString(), publicSchema: { url: response.url, status: response.status, sha256: sha(Buffer.from(JSON.stringify(spec))) }, operation, modelName, requestModel: spec.components.schemas[modelName], mcp: { status: result.status, tools: tools.length, reduceColors: reduce }, balance: { status: balance.status, credits: balance.result.credits, subscriptionGenerations: balance.result.subscription?.generations } });
console.log(JSON.stringify({ schemaStatus: response.status, restFields: Object.keys(spec.components.schemas[modelName].properties), mcpStatus: result.status, mcpFields: Object.keys(reduce?.inputSchema?.properties ?? {}), balanceStatus: balance.status }));
