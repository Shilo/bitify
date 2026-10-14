import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import sharp from "sharp";
import { project, work, assets, repo } from "./project.mjs";

const url = (path) => relative(work, path).replaceAll("\\", "/");
const metadata = JSON.parse(
  readFileSync(assets + "/captures/metadata.json", "utf8"),
);
const filmAssets = { logo: url(repo + "/src/assets/logo-dark.svg") };

// Capture rectangles use CSS pixels; screenshots use the recorded device pixel ratio.
for (const [name, item] of Object.entries(metadata)) {
  filmAssets[name] = url(assets + "/captures/" + name + ".png");
  if (!item.panels?.length) continue;
  const p = item.panels[0],
    dpr = item.dpr ?? 2;
  const left = Math.max(0, Math.floor(p.x * dpr) - 4);
  const top = Math.max(0, Math.floor(p.y * dpr) - 4);
  const width = Math.min(
    item.viewport.width * dpr - left,
    Math.ceil(p.width * dpr) + 8,
  );
  const height = Math.min(
    item.viewport.height * dpr - top,
    Math.ceil(p.height * dpr) + 8,
  );
  const target = work + "/assets/focus-" + name + ".png";
  await sharp(assets + "/captures/" + name + ".png")
    .extract({ left, top, width, height })
    .png()
    .toFile(target);
  filmAssets["focus-" + name] = url(target);
}
filmAssets.original = url(assets + "/town.png");
filmAssets["palette-result"] = url(assets + "/palette-result.png");
filmAssets["onebit-result"] = url(assets + "/onebit-solid.png");

const shots = JSON.parse(readFileSync(project + "/timeline.json", "utf8"));
if (
  shots.length !== 7 ||
  shots[0].start !== 0 ||
  shots.at(-1).end !== 30 ||
  shots.some(
    (s, i) =>
      s.end <= s.start ||
      (i && s.start !== shots[i - 1].end) ||
      (s.frames &&
        (s.frames.length !== s.captions.length ||
          s.frames.some((f) => !filmAssets[f] || !filmAssets["focus-" + f]))),
  )
) {
  throw Error(
    "Expected seven continuous scenes totaling 30 seconds, with matching frames/captions.",
  );
}
const runtime = readFileSync(project + "/runtime.js", "utf8");
const template = readFileSync(project + "/composition.html", "utf8");
const film = template.replace(
  "<!-- FILM_RUNTIME -->",
  "<script>window.filmAssets=" +
    JSON.stringify(filmAssets) +
    ";window.filmShots=" +
    JSON.stringify(shots) +
    ";" +
    runtime +
    "</script>",
);
writeFileSync(work + "/film.html", film);
console.log("Built " + work + "/film.html");
