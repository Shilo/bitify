// Writes palette-lospec-url.candidate.js (proposed fix B-1/B-2) next to this script. src/ is not edited.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../../src/lib/palette-lospec-url.js', import.meta.url), 'utf8');
const oldLink = String.raw`const LINK = /^https?:\/\/(?:www\.)?lospec`;
const newLink = String.raw`const LINK = /^(?:https?:\/\/)?(?:www\.)?lospec`;
const oldRoute = String.raw`  return /:\/\/|^(?:www\.)?lospec\.com\//i.test(text);`;
const newRoute = String.raw`  // One link-like token only: multi-line palette text with URL comments stays local.
  return /^(?:[a-z][\w+.-]*:\/\/|(?:www\.)?lospec\.com\/)\S*$/i.test(text);`;
if (!src.includes(oldLink) || !src.includes(oldRoute)) throw new Error('source changed');
fs.writeFileSync(new URL('./palette-lospec-url.candidate.js', import.meta.url), src.replace(oldLink, newLink).replace(oldRoute, newRoute));
