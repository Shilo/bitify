import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve, extname, sep } from "node:path";
import { assets, work, repo, launchBrowser } from "./project.mjs";
// Default refreshes tracked assets; CAPTURE_DIR allows an isolated capture rehearsal.
const out = process.env.CAPTURE_DIR ? resolve(repo, process.env.CAPTURE_DIR) : assets;
mkdirSync(out + "/captures", { recursive: true });
const root = resolve(work, "app");
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://local").pathname.replace(
    /^\/colorfetti/,
    "",
  );
  const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    res
      .writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".png": "image/png",
            ".svg": "image/svg+xml",
            ".woff2": "font/woff2",
          }[extname(file)] ?? "application/octet-stream",
      })
      .end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
const metadata = {};
async function open(mobile = false, art = "town") {
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1280, height: 720 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("page error", e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("console error", msg.text());
  });
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({
      contentType: "text/css",
      body:
        "@font-face{font-family:Schibsted Grotesk;font-style:normal;font-weight:100 900;src:url(data:font/ttf;base64," +
        readFileSync(assets + "/schibsted-grotesk.ttf").toString("base64") +
        ")}",
    }),
  );
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.route(origin + "/**", async (route) => {
    const response = await fetch(route.request().url());
    const headers = Object.fromEntries(response.headers);
    delete headers["content-encoding"];
    delete headers["content-length"];
    await route.fulfill({
      status: response.status,
      headers,
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const close = page.locator('dialog.help[open] button[aria-label="Close"]');
  if (await close.count()) await close.click();
  if (art)
    await page
      .locator('input[type=file][accept="image/*"]')
      .setInputFiles(assets + "/" + art + ".png");
  await page.waitForTimeout(1500);
  return { page, context };
}
async function cap(page, name) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(10, 10);
  await page.waitForTimeout(450);
  await page.screenshot({ path: out + "/captures/" + name + ".png" });
  metadata[name] = {
    dpr: 2,
    viewport: page.viewportSize(),
    panels: await page.locator(".panel").evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }),
    ),
  };
  console.log(name);
}
async function output(page, name) {
  const canvases = await page
    .locator(".art canvas")
    .evaluateAll((nodes) =>
      nodes.map((canvas) => ({
        width: canvas.width,
        height: canvas.height,
        url: canvas.toDataURL(),
        visible: canvas.checkVisibility(),
      })),
    );
  console.log(
    "output canvases",
    name,
    canvases.map((c) => ({
      width: c.width,
      height: c.height,
      visible: c.visible,
    })),
  );
  const canvas = canvases.findLast((c) => c.visible);
  if (!canvas) throw Error("No visible canvas");
  writeFileSync(
    out + "/" + name + ".png",
    Buffer.from(canvas.url.split(",")[1], "base64"),
  );
}

async function fullResult(page, name) {
  await page.locator(".caption-preview").click();
  await page.locator(".image-viewer[open]").waitFor();
  await page.waitForTimeout(900);
  await output(page, name);
  await page
    .locator(".image-viewer[open]")
    .evaluate((dialog) => dialog.close());
}
const emptyD = await open(false, null);
await cap(emptyD.page, "desktop-empty");
await emptyD.context.close();
const emptyM = await open(true, null);
await cap(emptyM.page, "phone-empty");
await emptyM.context.close();
const { page: d, context: dc } = await open();
await d.getByRole("button", { name: "Palette", exact: true }).last().click();
await cap(d, "desktop-palettes-auto");
await d.getByRole("button", { name: "ENDESGA 32", exact: true }).click();
await cap(d, "desktop-palettes-endesga");
await d.getByRole("button", { name: "PICO-8", exact: true }).click();
await cap(d, "desktop-palettes-pico");
await d.getByRole("button", { name: "Palette settings", exact: true }).click();
const number = d.getByRole("spinbutton", {
  name: "Max colors value",
  exact: true,
});
await number.fill("8");
await number.press("Enter");
await d.getByRole("button", { name: "Cleanup on", exact: true }).click();
await fullResult(d, "palette-result");
await d.getByRole("button", { name: "Palette", exact: true }).last().click();
await d.getByRole("button", { name: "ENDESGA 32", exact: true }).click();
await d.getByRole("button", { name: "Palette settings", exact: true }).click();
await d
  .getByRole("button", { name: "Use all palette colors", exact: true })
  .click();
await d.getByRole("button", { name: "Cleanup off", exact: true }).click();
await cap(d, "desktop-settings-all");
for (const [count, name] of [
  [16, "sixteen"],
  [8, "eight"],
]) {
  const n = d.getByRole("spinbutton", {
    name: "Max colors value",
    exact: true,
  });
  await n.fill(String(count));
  await n.press("Enter");
  await cap(d, "desktop-settings-" + name);
}
await d.getByRole("button", { name: "Cleanup on", exact: true }).click();
await cap(d, "desktop-settings-cleanup");
await d.getByRole("button", { name: "Palette", exact: true }).last().click();
await d.getByRole("button", { name: "1-bit", exact: true }).click();
await d.getByRole("button", { name: "Mono", exact: true }).click();
await d.getByRole("button", { name: "Style", exact: true }).click();
for (const style of ["Solid"]) {
  await d.locator('button[aria-labelledby="style-label style-name"]').click();
  await d.getByRole("button", { name: style, exact: true }).click();
  await cap(d, "comparison-" + style.toLowerCase());
  await fullResult(d, "onebit-" + style.toLowerCase());
}
await dc.close();
let { page: m, context: mc } = await open(true);
await m.getByRole("button", { name: "Palette settings", exact: true }).click();
await m
  .getByRole("spinbutton", { name: "Max colors value", exact: true })
  .fill("8");
await m
  .getByRole("spinbutton", { name: "Max colors value", exact: true })
  .press("Enter");
await m.getByRole("button", { name: "Cleanup on", exact: true }).click();
await cap(m, "phone-settings-cleanup");
await mc.close();
({ page: m, context: mc } = await open(true, "platformer"));
await m.getByRole("button", { name: "Palette", exact: true }).last().click();
await m.getByRole("button", { name: "1-bit", exact: true }).click();
await m.getByRole("button", { name: "Mono", exact: true }).click();
await cap(m, "phone-pairs-mono");
await m.getByRole("button", { name: "Game Boy", exact: true }).click();
await cap(m, "phone-pairs-gameboy");
await m.getByRole("button", { name: "Rose", exact: true }).click();
await cap(m, "phone-pairs-rose");
await m.getByRole("button", { name: "Mono", exact: true }).click();
await m.getByRole("button", { name: "Style", exact: true }).click();
await m.locator('button[aria-labelledby="style-label style-name"]').click();
await m.getByRole("button", { name: "Bayer", exact: true }).click();
await cap(m, "phone-bayer-threshold");
const threshold = m.getByRole("slider", { name: "Threshold", exact: true });
await threshold.fill("140");
await threshold.dispatchEvent("change");
await cap(m, "phone-bayer-threshold-tuned");
await m.getByRole("button", { name: /^Matrix:/ }).click();
await cap(m, "phone-bayer-matrix-four");
await m
  .getByRole("group", { name: "Matrix", exact: true })
  .getByRole("button", { name: "8", exact: true })
  .click();
await cap(m, "phone-bayer-matrix-eight");
writeFileSync(
  out + "/captures/metadata.json",
  JSON.stringify(metadata, null, 2),
);
await mc.close();
await browser.close();
server.close();
