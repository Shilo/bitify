// Drag payloads are protected until drop: inspect only their types while hovering,
// then copy out the strings synchronously before starting any asynchronous work.
const DROP_TYPES = new Set(['files', 'text/uri-list', 'text/html', 'text/plain', 'downloadurl']);
export const hasImageDrop = transfer => Array.from(transfer?.types ?? []).some(type => DROP_TYPES.has(type.toLowerCase()));

function imageUrl(text) {
  try {
    const url = new URL(text.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

const urlsIn = text => [...new Set(text.split(/\r?\n/).map(line => imageUrl(line)).filter(Boolean))];

export function droppedImages(transfer) {
  const files = Array.from(transfer?.files ?? []);
  // Browsers can include both the image file and its URL. Import only one copy.
  if (files.length || !transfer) return { files, urls: [] };
  const get = type => transfer.getData(type);
  // An image wrapped in a link can have a web page in uri-list. Its img src is
  // the image itself. Parse as an inert document; never insert the HTML into the app.
  const html = get('text/html');
  if (html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const urls = [...new Set(Array.from(template.content.querySelectorAll('img[src]'), img => imageUrl(img.getAttribute('src'))).filter(Boolean))];
    if (urls.length) return { files, urls };
  }
  const uris = urlsIn(get('text/uri-list'));
  if (uris.length) return { files, urls: uris };
  // Chromium's download drag format is MIME type:filename:URL; the URL itself has colons.
  const download = get('DownloadURL').match(/^[^:]*:[^:]*:(.+)$/s);
  const url = download && imageUrl(download[1]);
  return { files, urls: url ? [url] : urlsIn(get('text/plain')) };
}

const IMAGE_TYPES = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp' };

export async function fetchDroppedImage(url, signal) {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal });
  if (!response.ok) throw new Error('Image download failed');
  const blob = await response.blob();
  const mime = blob.type.split(';', 1)[0].trim();
  if (!blob.size || (mime && !mime.startsWith('image/') && mime !== 'application/octet-stream')) {
    throw new Error('The link did not return an image');
  }
  let name = new URL(url).pathname.split('/').pop() || 'image';
  try { name = decodeURIComponent(name); } catch { /* keep an invalidly escaped name as supplied */ }
  // The GIF decoder needs the exact MIME type. Generic attachment responses can
  // have extensionless URLs; their signature identifies an animation reliably.
  const extension = name.split('.').pop().toLowerCase();
  let type = mime;
  if (!mime || mime === 'application/octet-stream') {
    const header = await blob.slice(0, 6).text();
    type = /^(GIF87a|GIF89a)$/.test(header) ? 'image/gif' : IMAGE_TYPES[extension] || mime;
  }
  if (!name.includes('.')) {
    const suffix = Object.keys(IMAGE_TYPES).find(ext => IMAGE_TYPES[ext] === type);
    if (suffix) name += `.${suffix}`;
  }
  return new File([blob], name, { type });
}
