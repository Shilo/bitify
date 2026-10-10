// Run after npm run build and node bench/design-qa.mjs.
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('./design-qa/', import.meta.url);
const css = await readFile(new URL('touch.css', base), 'utf8');
await writeFile(new URL('hover-touch.css', base), css.replaceAll(':hover', '[data-hover-probe]'));
const html = (await readFile(new URL('touch.html', base), 'utf8'))
  .replace('/bench/design-qa/touch.css', '/bench/design-qa/hover-touch.css')
  .replace('</body>', `<pre id="hover-results" style="position:fixed;top:0;left:0;z-index:99999;background:#111;color:#eee;padding:8px;max-height:30vh;overflow:auto;font:11px monospace;pointer-events:none">Running hover audit...</pre><script type="module" src="/bench/hover-audit-browser.js"></script></body>`);
await writeFile(new URL('hover-touch.html', base), html);
console.log('Open /bench/design-qa/hover-touch.html at a phone viewport.');
