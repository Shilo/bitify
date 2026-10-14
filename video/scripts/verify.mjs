import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  project,
  work,
  master,
  share,
  run,
  ffmpeg,
  ffprobe,
  launchBrowser,
} from "./project.mjs";

const records = [];
for (const path of [master, share]) {
  const { stdout } = await run(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels,pix_fmt,color_space,color_transfer,color_primaries",
      "-of",
      "json",
      path,
    ],
    { windowsHide: true },
  );
  const info = JSON.parse(stdout),
    v = info.streams.find((s) => s.codec_type === "video"),
    a = info.streams.find((s) => s.codec_type === "audio");
  if (
    v.width !== 1920 ||
    v.height !== 1080 ||
    v.codec_name !== "h264" ||
    v.pix_fmt !== "yuv420p" ||
    v.nb_frames !== "900" ||
    v.r_frame_rate !== "30/1"
  )
    throw Error("Unexpected video format: " + path);
  if (a.codec_name !== "aac" || a.channels !== 2 || a.sample_rate !== "48000")
    throw Error("Unexpected audio: " + path);
  if (Math.abs(Number(info.format.duration) - 30) > 0.1)
    throw Error("Wrong duration: " + path);
  const size = statSync(path).size;
  if (path === share && size >= 10_000_000)
    throw Error("Compact file exceeds 10 MB.");
  const bytes = readFileSync(path),
    atoms = [];
  let position = 0;
  while (position + 8 <= bytes.length && atoms.length < 8) {
    const length = bytes.readUInt32BE(position),
      type = bytes.toString("ascii", position + 4, position + 8);
    atoms.push(type);
    if (length < 8) break;
    position += length;
  }
  if (
    !atoms.includes("moov") ||
    !atoms.includes("mdat") ||
    atoms.indexOf("moov") > atoms.indexOf("mdat")
  )
    throw Error("Not fast-start: " + path);
  records.push({
    path:
      path === share
        ? "public/colorfetti-trailer.mp4"
        : "output/colorfetti-trailer/colorfetti-trailer-1080.mp4",
    bytes: size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...info,
    atoms,
  });
}
const { stderr } = await run(
  ffmpeg,
  [
    "-hide_banner",
    "-i",
    master,
    "-i",
    share,
    "-filter_complex",
    "[0:v][1:v]ssim",
    "-an",
    "-f",
    "null",
    "-",
  ],
  { windowsHide: true, maxBuffer: 2e6 },
);
writeFileSync(work + "/qa/ssim.log", stderr);
const ssim = Number(stderr.match(/All:([\d.]+)/)?.[1]);
if (!Number.isFinite(ssim) || ssim < 0.99)
  throw Error("Compact quality below expected SSIM: " + ssim);
await run(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    share,
    "-vf",
    "select=eq(n\\,294)+eq(n\\,600)+eq(n\\,855)",
    "-fps_mode",
    "vfr",
    work + "/qa/encoded-%02d.png",
  ],
  { windowsHide: true },
);
const browser = await launchBrowser();
let playback;
try {
  const page = await browser.newPage();
  writeFileSync(
    work + "/qa/player.html",
    '<!doctype html><video muted controls src="' +
      pathToFileURL(share).href +
      '"></video>',
  );
  await page.goto(pathToFileURL(work + "/qa/player.html").href);
  await page.waitForFunction(
    () => document.querySelector("video").readyState >= 2,
  );
  await page.evaluate(() => document.querySelector("video").play());
  await page.waitForTimeout(1300);
  playback = await page.evaluate(() => {
    const v = document.querySelector("video");
    return {
      currentTime: v.currentTime,
      width: v.videoWidth,
      height: v.videoHeight,
      duration: v.duration,
      error: v.error?.message ?? null,
    };
  });
  if (playback.currentTime < 1 || playback.error)
    throw Error("Native playback failed.");
} finally {
  await browser.close();
}
const report = {
  files: records,
  sharingSSIMvsMaster: ssim,
  nativePlayback: playback,
  render: JSON.parse(readFileSync(work + "/qa/render.json")),
  music: JSON.parse(readFileSync(project + "/assets/audio/source.json")),
  editorial: JSON.parse(readFileSync(project + "/editorial-review.json")),
};
writeFileSync(
  work + "/qa/production-manifest.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      files: records.map((r) => ({ path: r.path, bytes: r.bytes })),
      ssim,
      playback,
    },
    null,
    2,
  ),
);
