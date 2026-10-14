import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { project } from "./project.mjs";

const records = [];
function scan(dir) {
  for (const entry of readdirSync(project + "/" + dir, {
    withFileTypes: true,
  }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = dir + "/" + entry.name;
    // Local music and its archived predecessor are intentionally excluded from Git.
    if (path.startsWith("assets/audio/") && path.endsWith(".mp3")) continue;
    if (entry.isDirectory()) scan(path);
    else {
      let bytes = readFileSync(project + "/" + path);
      const text = /\.(txt|json)$/.test(path);
      if (text) bytes = Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"));
      records.push({
        path,
        ...(text ? { encoding: "UTF-8, LF canonical line endings" } : {}),
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
}
scan("assets");
scan("licenses");
writeFileSync(
  project + "/source-manifest.json",
  JSON.stringify(records, null, 2) + "\n",
);
console.log("Recorded " + records.length + " source files.");
