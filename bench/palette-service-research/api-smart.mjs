// One single-image smart palette generation. Official published <=256px estimate: $0.08.
import fs from 'node:fs';
import { api } from './api-common.mjs';
const dir = import.meta.dirname;
const request = {
  description: 'One small pixel art adventurer holding a wooden staff, warm light skin face, blue robe, brown leather boots, brown wooden staff with bright green leaf. Clear simple readable shapes, three shades per material, black outline. Centered isolated character on transparent background.',
  image_size: { width: 192, height: 192 },
  seed: 314159, no_background: true,
  style_options: { color_palette: false, outline: true, detail: true, shading: true },
  target_palette: { name: 'PICO-8', colors: ['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'], max_colors: 8, smart: true },
};
const start = Date.now();
const r = await api('/generate-image-v2', request);
fs.writeFileSync(`${dir}/api-smart-submission.json`,JSON.stringify({ request, ...r, started_at: new Date(start).toISOString() },null,2));
console.log('Smart submission',r.status,r.ms,JSON.stringify(r.result));
