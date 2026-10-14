import { existsSync } from "node:fs";
import { assets, work, encode } from "./project.mjs";

const source = assets + "/audio/music.mp3";
if (!existsSync(source)) {
  throw Error(
    "Missing ignored local music source: " +
      source +
      ". See video/README.md for restoration instructions.",
  );
}

await encode(
  [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-y",
    "-ss",
    "0",
    "-i",
    source,
    "-t",
    "30",
    "-af",
    "afade=t=in:d=0.8,afade=t=out:st=27.5:d=2.5,loudnorm=I=-23:TP=-3:LRA=7",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-c:a",
    "pcm_s24le",
    work + "/audio/music.wav",
  ],
  work + "/qa/audio.log",
);
console.log("Prepared 30-second music bed.");
