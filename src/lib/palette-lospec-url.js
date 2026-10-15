// Only public Lospec palette pages/JSON endpoints become network destinations or links.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const LINK = /^https?:\/\/(?:www\.)?lospec\.com\/palette-list\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.json)?\/?(?:[?#][^\s]*)?$/i;
const INVALID = 'Use a Lospec palette link such as https://lospec.com/palette-list/slso8, or a palette slug.';

export function lospecReference(value, { urlOnly = false } = {}) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error(INVALID);
  const text = value.trim(), match = LINK.exec(text);
  const slug = match?.[1] ?? (!urlOnly && SLUG.test(text) ? text : '');
  if (!slug || slug.length > 120) throw new Error(INVALID);
  const normalized = slug.toLowerCase(), url = 'https://lospec.com/palette-list/' + normalized;
  return { slug: normalized, url, jsonUrl: url + '.json' };
}

// Persistence and rendering never turn arbitrary imported text into an href.
export function canonicalLospecUrl(value) {
  try { return lospecReference(value, { urlOnly: true }).url; } catch { return null; }
}

export function looksLikeLospecReference(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  // A plain typo or hex-like slug must not unexpectedly become a network request.
  // The UI requires a link; the lower-level reference parser also accepts slugs.
  return /:\/\/|^(?:www\.)?lospec\.com\//i.test(text);
}
