import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { repo } from "./project.mjs";

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
};
export const server = createServer((req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  const path = resolve(
    repo,
    "." + (pathname === "/" ? "/video/preview.html" : pathname),
  );
  if (!path.startsWith(repo + sep)) return res.writeHead(403).end();
  try {
    const bytes = readFileSync(path);
    const headers = {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes",
    };
    // Byte ranges allow scrubbing the uncompressed WAV without downloading it again.
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(bytes.length - 1, Number(range[2])) : bytes.length - 1;
      if (start > end || start >= bytes.length) return res.writeHead(416, { "Content-Range": "bytes */" + bytes.length }).end();
      res.writeHead(206, { ...headers, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${bytes.length}` });
      res.end(bytes.subarray(start, end + 1));
    } else {
      res.writeHead(200, { ...headers, "Content-Length": bytes.length });
      res.end(bytes);
    }
  } catch {
    res.writeHead(404).end();
  }
}).listen(Number(process.env.PORT || 4174), "127.0.0.1", function () {
  console.log(
    "Trailer preview: http://127.0.0.1:" +
      this.address().port +
      "/video/preview.html (Ctrl+C to stop)",
  );
});
