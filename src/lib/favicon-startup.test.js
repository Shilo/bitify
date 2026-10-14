import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = html.match(/<script id="colorfetti-favicons">([\s\S]*?)<\/script>/)[1];
function start(baseURI, dark) {
  const links = [...html.matchAll(/<link rel="icon"[^>]*data-favicon-light="([^"]+)" data-favicon-dark="([^"]+)"/g)]
    .map(([, light, dark]) => ({ dataset: { faviconLight: light, faviconDark: dark } }));
  let changed;
  const scheme = { matches: dark, addEventListener: (name, callback) => { expect(name).toBe('change'); changed = callback; } };
  const document = { baseURI, querySelectorAll: selector => { expect(selector).toBe('[data-favicon-light]'); return links; } };
  runInNewContext(script, { document, URL, matchMedia: query => { expect(query).toBe('(prefers-color-scheme: dark)'); return scheme; }, localStorage: { getItem() { throw new Error('Icon selection must not read app preferences'); } } });
  return { links, change(dark) { scheme.matches = dark; changed(); } };
}
describe('browser favicon selection', () => {
  it.each(['https://example.test/', 'https://example.test/colorfetti/', 'https://example.test/colorfetti/index.html'])('resolves every format within %s, then follows live browser preference changes', base => {
    const { links, change } = start(base, false);
    const root = new URL('./', base).href;
    expect(links.map(l => l.href)).toEqual(['favicon.ico', 'favicon-32x32.png', 'favicon-light.svg'].map(p => root + p + '?v=2'));
    change(true);
    expect(links.map(l => l.href)).toEqual(['favicon-dark.ico', 'favicon-dark-32x32.png', 'favicon-dark.svg'].map(p => root + p + '?v=2'));
    change(false);
    expect(links[2].href).toBe(root + 'favicon-light.svg?v=2');
  });
  it('selects explicit dark SVG and raster artwork at startup, independently of app storage', () => {
    const { links } = start('https://example.test/colorfetti/', true);
    expect(links.every(l => l.href.includes('favicon-dark'))).toBe(true);
  });
  it('keeps adaptive SVG, PNG and ICO initial fallbacks for script-disabled documents', () => {
    expect(html).toContain('href="/favicon.svg?v=2"');
    const svg = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');
    expect(svg).toContain('@media(prefers-color-scheme:dark)');
    expect(svg).not.toContain('backplate');
  });
});
