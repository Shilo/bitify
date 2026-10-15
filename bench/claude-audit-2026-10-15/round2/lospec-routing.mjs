// Round 2: adversarial routing/parsing of 7fad4e7. Every routed input must either throw the
// guidance error or fetch exactly https://lospec.com/palette-list/<slug>.json.
// Run from repo root: node bench/claude-audit-2026-10-15/round2/lospec-routing.mjs
import fs from 'node:fs';
import { looksLikeLospecReference, lospecReference, canonicalLospecUrl } from '../../../src/lib/palette-lospec-url.js';
import { parsePaletteText } from '../../../src/lib/palette-import.js';
const inputs = [
  '  https://lospec.com/palette-list/slso8  ', 'https://lospec.com/palette-list/slso8\r\n', 'https://lospec.com/palette-list/slso8\n', '\r\nhttps://lospec.com/palette-list/slso8\r\n\r\n',
  'http://lospec.com/palette-list/slso8', 'HTTPS://LOSPEC.COM/PALETTE-LIST/SLSO8', 'lospec.com/palette-list/x?foo', 'lospec.com/palette-list/x#frag', 'lospec.com/palette-list/x.json',
  'https://www.lospec.com/palette-list/a-b-c/', 'https://evil.test/x', 'https://evil.test/palette-list/slso8', 'www.lospec.com', 'www.lospec.com/', 'lospec.com/', 'lospec.com',
  'https://lospec.com/', 'data:text/plain,ff0000', 'javascript:alert(1)', 'JAVASCRIPT://lospec.com/palette-list/x', 'ftp://lospec.com/palette-list/slso8', 'abc123://x',
  'ff0000', '#ff0000', 'ff0000\n00ff00', 'deadbeef', 'https://lospec.com.evil.test/palette-list/x', 'https://lospec.com@evil.test/palette-list/x',
  'https://user@lospec.com/palette-list/x', 'https://lospec.com:443/palette-list/x', '//lospec.com/palette-list/slso8', 'https://lospec.com/palette-list/slso8 extra',
  'https://lospec.com/palette-list/slso8​', ' https://lospec.com/palette-list/slso8 ', 'https://lospec.com/palette-list/slso8.hex',
  'https://lospec.com/palette-list/../x', 'https://lospec.com/palette-list/%2e%2e', 'https://lospec.com/palette-list/x?u=https://evil.test',
  'https://lospec.com/palette-list/slso8\nhttps://lospec.com/palette-list/pico-8', 'GIMP Palette\n# https://lospec.com/palette-list/slso8\n0 0 0',
  ';paint.net\nhttps://lospec.com/palette-list/slso8', 'https://lospec.com/palette-list/' + 'a'.repeat(121), 'https://lospec.com/palette-list/' + 'a'.repeat(120),
  'x'.repeat(2049) + '://', 'lospec.com/palette-list/-bad', 'lospec.com/palette-list/a--b',
];
const rows = []; let violations = 0;
for (const text of inputs) {
  const routed = looksLikeLospecReference(text); let jsonUrl = null, error = null, local = null;
  if (routed) { try { jsonUrl = lospecReference(text).jsonUrl; } catch (e) { error = e.message; } }
  else { try { local = parsePaletteText(text).length; } catch (e) { local = 'error: ' + e.message.slice(0, 60); } }
  if (jsonUrl && !/^https:\/\/lospec\.com\/palette-list\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(jsonUrl)) violations++;
  rows.push({ text: JSON.stringify(text).slice(0, 80), routed, jsonUrl, error: error && 'guidance', local, canonical: canonicalLospecUrl(text) });
}
fs.writeFileSync(new URL('./lospec-routing.out.json', import.meta.url), JSON.stringify({ violations, rows }, null, 1));
console.table(rows); console.log('non-canonical fetch destinations:', violations);
