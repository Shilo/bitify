import { statSync } from "node:fs";
import { master, share, work, encode, credit, title, duration } from "./project.mjs";

const base = [
  "-hide_banner",
  "-y",
  "-i",
  master,
  "-map",
  "0:v:0",
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-threads",
  "4",
  "-b:v",
  Math.min(2200, Math.floor((8_800_000 * 8 / duration - 128000) / 1000)) + "k",
  "-pix_fmt",
  "yuv420p",
  "-passlogfile",
  work + "/qa/share-pass",
];
console.log("Encoding compact video, pass 1/2");
await encode(
  [...base, "-pass", "1", "-an", "-f", "null", "-"],
  work + "/qa/share-pass-1.log",
);
console.log("Encoding compact video, pass 2/2");
await encode(
  [
    ...base,
    "-pass",
    "2",
    "-map",
    "0:a:0",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    "-metadata",
    "title=" + title,
    "-metadata",
    "comment=" + credit,
    share,
  ],
  work + "/qa/share-pass-2.log",
);
const size = statSync(share).size;
if (size >= 10_000_000) throw Error("Compact video exceeds 10 MB: " + size);
console.log(
  share + ": " + size + " bytes (" + (size / 1e6).toFixed(2) + " MB)",
);
