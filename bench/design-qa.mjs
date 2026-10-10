// Generate local browser fixtures from the actual production bundle.
// These simulate input/material media in CSS and matchMedia; they are not device tests.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const index = await readFile(resolve(root, 'dist/index.html'), 'utf8');
const asset = index.match(/href="\.\/(assets\/index-[^"]+\.css)"/)[1];
const css = await readFile(resolve(root, 'dist', asset), 'utf8');
const output = resolve(root, 'bench/design-qa');
await mkdir(output, { recursive: true });
for (const [name, touch, reduced] of [['touch', true, false], ['reduced', false, true], ['touch-reduced', true, true]]) {
  let styles = css;
  if (touch) styles = styles.replace(/\(hover:\s*none\)/g, '(min-width:0px)')
    .replace(/\(hover:\s*hover\)/g, '(min-width:100000px)')
    .replace(/\(pointer:\s*coarse\)/g, '(min-width:0px)')
    .replace(/\(pointer:\s*fine\)/g, '(min-width:100000px)');
  if (reduced) styles = styles.replace(/\(prefers-reduced-transparency:\s*reduce\)/g, '(min-width:0px)');
  const setup = `<script>
    const actualMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const key = query.replace(/\\s+/g, '');
      const matches = ${touch} && ['(pointer:coarse)', '(hover:none)'].includes(key) ? true
        : ${touch} && ['(pointer:fine)', '(hover:hover)'].includes(key) ? false
        : ${reduced} && key === '(prefers-reduced-transparency:reduce)' ? true : null;
      return matches === null ? actualMatchMedia(query) : {
        matches, media: query, onchange: null,
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; },
      };
    };
  </script>`;
  const html = index.replace('<head>', '<head>' + setup)
    .replace('href="./' + asset + '"', `href="/bench/design-qa/${name}.css"`)
    .replaceAll('./assets/', '/dist/assets/');
  await writeFile(resolve(output, `${name}.css`), styles);
  await writeFile(resolve(output, `${name}.html`), html);
}
console.log('QA fixtures: /bench/design-qa/{touch,reduced,touch-reduced}.html');

// Local import fixtures: many images, one long filename, one animated GIF.
for (let i = 0; i < 18; i++) {
  const source = i === 17 ? 'src/assets/logo.gif' : 'bench/icon-research/armor-source.png';
  const name = i === 0 ? 'a-very-long-file-name-for-readable-image-caption-checks-0.png'
    : `sample-${i}.${i === 17 ? 'gif' : 'png'}`;
  await copyFile(resolve(root, source), resolve(output, name));
}
