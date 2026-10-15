// Usage: node oga.mjs <opengameart content url>... prints title, author, date, licenses, files (text only; nothing downloaded).
for (const url of process.argv.slice(2)) {
  const html = await (await fetch(url)).text();
  const pick = (re) => [...html.matchAll(re)].map(m => m[1]);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const author = (html.match(/field-name-author-submitter[\s\S]*?<a href="\/users\/[^"]*"[^>]*>([^<]*)<\/a>/) || [])[1];
  const date = (html.match(/name="dcterms.date" content="([^"]*)"/) || [])[1];
  const licBlock = (html.match(/field-name-field-art-licenses[\s\S]*?(field-name-collect|field-name-favorites|<\/section>)/) || [])[0] || '';
  const licenses = [...licBlock.matchAll(/href='([^']*)'[\s\S]*?license-name'>([^<]*)</g)].map(m => `${m[2]} ${m[1]}`);
  const files = [...new Set(pick(/href="(https:\/\/opengameart\.org\/sites\/default\/files\/[^"]+)"/g))].filter(f => !f.includes('/css/'));
  const body = ((html.match(/field-name-body[\s\S]*?<\/div><\/div><\/div>/) || [])[0] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700);
  console.log(JSON.stringify({ url, title, author, date, licenses, files, body }, null, 1));
}
