import { assets, work, encode } from "./project.mjs";

await encode(
  [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-y",
    "-ss",
    "12",
    "-i",
    assets + "/audio/wholesome-source.mp3",
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
