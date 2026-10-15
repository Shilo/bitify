// Usage: node darksoft.mjs <png>... counts partial-alpha pixels with dark RGB (likely shadows).
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
for (const f of process.argv.slice(2)) {
  const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let dark = 0, soft = 0;
  for (let i = 0; i < data.length; i += 4) { const a = data[i + 3]; if (a && a < 255) { soft++; if (data[i] + data[i + 1] + data[i + 2] < 120) dark++; } }
  console.log(dark, soft, f);
}
