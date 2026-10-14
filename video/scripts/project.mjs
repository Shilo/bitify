import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

export const project = fileURLToPath(new URL("../", import.meta.url));
export const repo = resolve(project, "..");
export const work = resolve(project, ".work");
export const assets = resolve(project, "assets");
export const output = resolve(repo, "output/colorfetti-trailer");
export const master = resolve(output, "colorfetti-trailer-1080.mp4");
export const share = resolve(repo, "public/colorfetti-trailer.mp4");
export const poster = resolve(repo, "public/colorfetti-trailer-poster.png");
export const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
export const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
export const run = promisify(execFile);
export const credit =
  "Colorfetti — https://github.com/Shilo/colorfetti . Artwork: Kenney, CC0.";
export const title = "Colorfetti — Recolor images and animations";

for (const path of [
  work,
  work + "/assets",
  work + "/audio",
  work + "/qa",
  output,
]) {
  mkdirSync(path, { recursive: true });
}

export function launchBrowser() {
  return chromium.launch({
    headless: true,
    env: { ...process.env, CHROME_LOG_FILE: resolve(work, "qa/chromium.log") },
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
}

export async function encode(args, logPath) {
  const { writeFileSync } = await import("node:fs");
  const { stderr } = await run(ffmpeg, args, {
    windowsHide: true,
    maxBuffer: 8e6,
  });
  if (logPath) writeFileSync(logPath, stderr);
  return stderr;
}
