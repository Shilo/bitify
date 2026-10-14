import { writeFileSync, copyFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  work,
  master,
  poster,
  ffmpeg,
  title,
  credit,
  launchBrowser,
} from "./project.mjs";

const browser = await launchBrowser();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(work + "/film.html").href);
  await page.evaluate(() => window.filmReady);
  for (const t of [1.5, 4.8, 9.8, 11.3, 13, 15, 17, 20, 24, 28.5]) {
    await page.evaluate((t) => window.renderFrame(t), t);
    await page.screenshot({
      path: work + "/qa/frame-" + String(t).replace(".", "-") + ".png",
      animations: "disabled",
    });
  }
  if (errors.length) throw Error(errors.join("\n"));
  if (process.argv.includes("--qa-only")) {
    console.log("QA frames ready in " + work + "/qa");
  } else {
    const args = [
      "-hide_banner",
      "-y",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-framerate",
      "30",
      "-i",
      "pipe:0",
      "-i",
      work + "/audio/music.wav",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-vf",
      "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "17",
      "-threads",
      "4",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-t",
      "30",
      "-movflags",
      "+faststart",
      "-color_range",
      "tv",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-metadata",
      "title=" + title,
      "-metadata",
      "comment=" + credit,
      master,
    ];
    const encoder = spawn(ffmpeg, args, {
      windowsHide: true,
      stdio: ["pipe", "ignore", "pipe"],
    });
    let log = "";
    encoder.stderr.on("data", (c) => {
      log = (log + c).slice(-60000);
    });
    encoder.stdin.on("error", () => {});
    const finished = once(encoder, "close");
    let failed = false;
    encoder.on("close", () => {
      failed = true;
    });
    const start = Date.now();
    try {
      for (let frame = 0; frame < 900; frame++) {
        const state = await page.evaluate(
          (t) => window.renderFrame(t),
          frame / 30,
        );
        const png = await page.screenshot({
          type: "png",
          animations: "disabled",
        });
        if (failed) throw Error("Encoder stopped: " + log.slice(-4000));
        if (!encoder.stdin.write(png)) {
          await Promise.race([
            once(encoder.stdin, "drain"),
            finished.then(() => {
              throw Error("Encoder stopped: " + log.slice(-4000));
            }),
          ]);
        }
        if (frame % 90 === 0)
          console.log(
            "Rendered " +
              frame +
              "/900 · " +
              state.scene +
              " · " +
              Math.round((Date.now() - start) / 1000) +
              "s",
          );
      }
      encoder.stdin.end();
      const [code] = await finished;
      writeFileSync(work + "/qa/render.log", log);
      if (code !== 0) throw Error(log.slice(-4000));
    } catch (error) {
      encoder.kill();
      throw error;
    }
    if (errors.length) throw Error(errors.join("\n"));
    copyFileSync(work + "/qa/frame-1-5.png", poster);
    writeFileSync(
      work + "/qa/render.json",
      JSON.stringify(
        {
          frames: 900,
          fps: 30,
          duration: 30,
          width: 1920,
          height: 1080,
          pageErrors: errors,
          seconds: (Date.now() - start) / 1000,
        },
        null,
        2,
      ),
    );
    console.log("Master render complete: " + master);
  }
} finally {
  await browser.close();
}
