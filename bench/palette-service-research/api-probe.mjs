// Black-box public-interface research. Reads credentials only from the environment.
import fs from 'node:fs';
import path from 'node:path';
const root = import.meta.dirname;
const secret = process.env.PIXELLAB_SECRET;
if (!secret) throw new Error('PIXELLAB_SECRET is absent');
const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
const schema = await (await fetch('https://api.pixellab.ai/v2/openapi.json')).json();
const related = {};
for (const [name, value] of Object.entries(schema.components.schemas)) {
  const props = value.properties || {};
  const matches = Object.keys(props).filter(k => /palette|color_image|max_colors|num_colors|dither|quantiz/.test(k));
  if (matches.length) related[name] = Object.fromEntries(matches.map(k => [k, props[k]]));
}
fs.writeFileSync(path.join(root, 'api-palette-controls.json'), JSON.stringify(related, null, 2));
const balance = await fetch('https://api.pixellab.ai/v2/balance', { headers });
console.log('API authentication status:', balance.status);
let session;
async function rpc(method, params, id = 1) {
  const h = { ...headers, Accept: 'application/json, text/event-stream', ...(session ? { 'Mcp-Session-Id': session } : {}) };
  const response = await fetch('https://api.pixellab.ai/mcp', { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', method, params, id }) });
  if (response.headers.get('mcp-session-id')) session = response.headers.get('mcp-session-id');
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw.split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6))).at(-1); }
  return { status: response.status, data };
}
const init = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'colorfetti-palette-research', version: '1.0' } });
console.log('MCP initialize:', init.status, JSON.stringify(init.data));
const listed = await rpc('tools/list', {}, 2);
if (listed.data?.result?.tools) {
  const tools = listed.data.result.tools;
  const relevant = tools.filter(t => /palette|reduc.*color|workbench|unzoom|image_pro/.test(t.name + ' ' + t.description));
  fs.writeFileSync(path.join(root, 'api-mcp-tool-schemas.json'), JSON.stringify(relevant, null, 2));
  console.log('MCP tool count:', tools.length, 'Relevant names:', relevant.map(t => t.name).join(', '));
} else console.log('MCP listing:', listed.status, JSON.stringify(listed.data));
