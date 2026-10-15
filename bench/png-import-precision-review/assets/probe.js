//#region src/lib/palette-library.js
function normalizeColors(colors, limit = 256) {
	if (!Array.isArray(colors) || colors.length > 4096) throw new Error("A palette must contain a list of colors.");
	const result = [], seen = /* @__PURE__ */ new Set();
	for (let color of colors) {
		if (typeof color !== "string") throw new Error("Colors must be opaque RGB hex values.");
		color = color.trim();
		if (/^#[\da-f]{3}$/i.test(color)) color = "#" + color.slice(1).split("").map((c) => c + c).join("");
		else if (/^[\da-f]{6}$/i.test(color)) color = "#" + color;
		if (!/^#[\da-f]{6}$/i.test(color)) throw new Error("Colors must use #RGB or #RRGGBB, without alpha.");
		color = color.toLowerCase();
		if (!seen.has(color)) {
			seen.add(color);
			result.push(color);
		}
	}
	if (!result.length || result.length > limit) throw new Error(`Choose between 1 and ${limit} unique colors.`);
	return result;
}
var preset = (id, name, colors, credit, url) => Object.freeze({
	id: "preset-" + id,
	name,
	colors: Object.freeze(normalizeColors(colors.split(" "))),
	revision: 1,
	source: Object.freeze({
		kind: "preset",
		credit,
		...url ? { url } : {}
	})
});
Object.freeze([
	preset("res64", "Resurrect 64", "2e222f 3e3546 625565 966c6c ab947a 694f62 7f708a 9babb2 c7dcd0 ffffff 6e2727 b33831 ea4f36 f57d4a ae2334 e83b3b fb6b1d f79617 f9c22b 7a3045 9e4539 cd683d e6904e fbb954 4c3e24 676633 a2a947 d5e04b fbff86 165a4c 239063 1ebc73 91db69 cddf6c 313638 374e4a 547e64 92a984 b2ba90 0b5e65 0b8a8f 0eaf9b 30e1b9 8ff8e2 323353 484a77 4d65b4 4d9be6 8fd3ff 45293f 6b3e75 905ea9 a884f3 eaaded 753c54 a24b6f cf657f ed8099 831c5d c32454 f04f78 f68181 fca790 fdcbb0", "Kerrie Lake", "https://lospec.com/palette-list/resurrect-64"),
	preset("edg32", "ENDESGA 32", "be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569", "ENDESGA", "https://lospec.com/palette-list/endesga-32"),
	preset("pico8", "PICO-8", "000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa", "Lexaloffle Games", "https://www.lexaloffle.com/pico-8.php"),
	preset("db16", "DawnBringer 16", "140c1c 442434 30346d 4e4a4e 854c30 346524 d04648 757161 597dce d27d2c 8595a1 6daa2c d2aa99 6dc2ca dad45e deeed6", "DawnBringer", "https://lospec.com/palette-list/dawnbringer-16"),
	preset("edg8", "ENDESGA 8", "fdfdf8 d32734 da7d22 e6da29 28c641 2d93dd 7b53ad 1b1c33", "ENDESGA", "https://lospec.com/palette-list/endesga-8"),
	preset("gray8", "Grayscale 8", "000000 242424 494949 6d6d6d 929292 b6b6b6 dbdbdb ffffff", "Colorfetti: eight evenly spaced sRGB grays"),
	preset("icecreamgb", "Ice Cream GB", "7c3f58 eb6b6f f9a875 fff6d3", "Kerrie Lake", "https://lospec.com/palette-list/ice-cream-gb"),
	preset("gameboy", "Game Boy green", "0f380f 306230 8bac0f 9bbc0f", "Game Boy LCD-inspired RGB interpretation"),
	preset("mono", "Black & white", "000000 ffffff", "Opaque sRGB black and white"),
	preset("glow", "Glow", "222323 f0f6f0", "Polyducks", "https://lospec.com/palette-list/1bit-monitor-glow"),
	preset("paper", "Paper", "382b26 b8c2b9", "Doph", "https://lospec.com/palette-list/paperback-2")
]).find((p) => p.id === "preset-edg32");
Object.freeze({
	id: "generated-32",
	name: "Auto",
	colors: Object.freeze([]),
	revision: 1,
	source: Object.freeze({
		kind: "generated",
		credit: "Shared colors from all images; updates when images change."
	})
});
Float64Array.from({ length: 256 }, (_, n) => {
	const v = n / 255;
	return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
});
function checkCanceled(signal) {
	if (signal?.aborted) throw new DOMException("The palette operation was canceled.", "AbortError");
}
var yieldTask = () => new Promise((resolve) => {
	if (typeof MessageChannel === "undefined") {
		setTimeout(resolve, 0);
		return;
	}
	const channel = new MessageChannel();
	channel.port1.onmessage = () => {
		channel.port1.close();
		channel.port2.close();
		resolve();
	};
	channel.port2.postMessage(null);
});
//#endregion
//#region src/lib/image-decode.js
var PixelLimitError = class extends Error {};
function nativeSrgb(frame) {
	const space = frame.colorSpace;
	return (frame.format === "RGBA" || frame.format === "BGRA") && space?.fullRange === true && space.matrix === "rgb" && space.primaries === "bt709" && space.transfer === "iec61966-2-1";
}
async function swapRedBlue(pixels, signal) {
	for (let start = 0; start < pixels.length;) {
		const deadline = performance.now() + 8;
		do {
			checkCanceled(signal);
			const end = Math.min(start + 131072, pixels.length);
			for (let p = start; p < end; p += 4) {
				const red = pixels[p];
				pixels[p] = pixels[p + 2];
				pixels[p + 2] = red;
			}
			start = end;
		} while (start < pixels.length && performance.now() < deadline);
		if (start < pixels.length) await yieldTask();
	}
	checkCanceled(signal);
}
async function decodeImageFile(file, { signal, maxPixels = Infinity, limitMessage = "This image is too large." } = {}) {
	const dimensions = (width, height) => {
		if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new Error("Your browser could not read this image.");
		if (width * height > maxPixels) throw new PixelLimitError(limitMessage);
	};
	checkCanceled(signal);
	if ((file.type === "image/png" || /\.png$/i.test(file.name || "")) && typeof ImageDecoder !== "undefined") {
		let decoder, frame, closed = false;
		const close = () => {
			if (decoder && !closed) {
				closed = true;
				decoder.close();
			}
		};
		try {
			if (await ImageDecoder.isTypeSupported("image/png")) {
				checkCanceled(signal);
				const data = typeof file.stream === "function" ? file.stream() : await file.arrayBuffer();
				checkCanceled(signal);
				decoder = new ImageDecoder({
					data,
					type: "image/png",
					preferAnimation: false,
					colorSpaceConversion: "default"
				});
				signal?.addEventListener("abort", close, { once: true });
				frame = (await decoder.decode({
					frameIndex: 0,
					completeFramesOnly: true
				})).image;
				checkCanceled(signal);
				const width = frame.displayWidth, height = frame.displayHeight;
				dimensions(width, height);
				if (!frame.rotation && !frame.flip && frame.visibleRect.width === width && frame.visibleRect.height === height) {
					const pixels = new Uint8ClampedArray(width * height * 4);
					const layout = [{
						offset: 0,
						stride: width * 4
					}];
					if (nativeSrgb(frame)) {
						const planes = await frame.copyTo(pixels, { layout });
						checkCanceled(signal);
						if (planes?.length !== 1 || planes[0].offset !== 0 || planes[0].stride !== width * 4) throw new Error("Unsupported native image layout.");
						if (frame.format === "BGRA") await swapRedBlue(pixels, signal);
					} else await frame.copyTo(pixels, {
						format: "RGBA",
						colorSpace: "srgb",
						layout
					});
					checkCanceled(signal);
					return new ImageData(pixels, width, height);
				}
			}
		} catch (problem) {
			checkCanceled(signal);
			if (problem instanceof PixelLimitError) throw problem;
		} finally {
			signal?.removeEventListener("abort", close);
			frame?.close();
			close();
		}
	}
	checkCanceled(signal);
	const bitmap = await createImageBitmap(file);
	let canvas;
	try {
		checkCanceled(signal);
		dimensions(bitmap.width, bitmap.height);
		canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext("2d", {
			willReadFrequently: true,
			colorSpace: "srgb"
		});
		if (!context) throw new Error("Your browser could not read this image.");
		context.drawImage(bitmap, 0, 0);
		const image = context.getImageData(0, 0, canvas.width, canvas.height);
		checkCanceled(signal);
		return image;
	} finally {
		bitmap.close();
		if (canvas) {
			canvas.width = 0;
			canvas.height = 0;
		}
	}
}
//#endregion
//#region bench/png-import-precision-probe.mjs
var run = document.querySelector("#run");
var status = document.querySelector("#status");
var out = document.querySelector("#out");
var device = document.querySelector("#device");
var selected = new URL(location.href).searchParams.get("device");
if ([...device.options].some((o) => o.value === selected)) device.value = selected;
var hash = async (data) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map((n) => n.toString(16).padStart(2, "0")).join("");
var bytes64 = (bytes) => {
	let value = "";
	for (let at = 0; at < bytes.length; at += 4096) value += String.fromCharCode(...bytes.subarray(at, at + 4096));
	return btoa(value);
};
var display = (value) => JSON.stringify(value, (key, item) => key === "actualRgbaBase64" ? void 0 : item, 2);
function compare(expected, actual, width, height) {
	const byAlpha = {}, examples = [];
	let alpha = 0, rgb = 0, max = 0, hidden = 0;
	for (let p = 0; p < expected.length; p += 4) {
		const a = expected[p + 3], g = byAlpha[a] ??= {
			pixels: 0,
			alphaMismatches: 0,
			visibleRgbMismatches: 0,
			maxChannelDelta: 0
		};
		g.pixels++;
		if (actual[p + 3] !== a) {
			alpha++;
			g.alphaMismatches++;
		}
		const delta = Math.max(...[
			0,
			1,
			2
		].map((c) => Math.abs(expected[p + c] - actual[p + c])));
		if (!a) {
			hidden += delta > 0;
			continue;
		}
		if (delta) {
			rgb++;
			g.visibleRgbMismatches++;
			max = Math.max(max, delta);
			g.maxChannelDelta = Math.max(g.maxChannelDelta, delta);
			if (examples.length < 8) examples.push({
				x: p / 4 % width,
				y: Math.floor(p / 4 / width),
				expected: [...expected.subarray(p, p + 4)],
				actual: [...actual.subarray(p, p + 4)]
			});
		}
	}
	return {
		width,
		height,
		alphaMismatches: alpha,
		visibleRgbMismatches: rgb,
		maxChannelDelta: max,
		hiddenRgbChanges: hidden,
		exactVisibleRgba: !alpha && !rgb,
		byAlpha,
		examples
	};
}
function rgba(image) {
	return {
		width: image.width,
		height: image.height,
		data: new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength)
	};
}
async function native(file, { stream = true, explicit = true, colorSpaceConversion = "default" } = {}) {
	if (typeof ImageDecoder === "undefined") throw Error("ImageDecoder absent");
	if (!await ImageDecoder.isTypeSupported("image/png")) throw Error("PNG ImageDecoder unsupported");
	let decoder, frame;
	try {
		decoder = new ImageDecoder({
			data: stream ? file.stream() : await file.arrayBuffer(),
			type: "image/png",
			preferAnimation: false,
			colorSpaceConversion
		});
		frame = (await decoder.decode({
			frameIndex: 0,
			completeFramesOnly: true
		})).image;
		const metadata = {
			format: frame.format,
			width: frame.displayWidth,
			height: frame.displayHeight,
			visibleRect: {
				x: frame.visibleRect.x,
				y: frame.visibleRect.y,
				width: frame.visibleRect.width,
				height: frame.visibleRect.height
			},
			rotation: frame.rotation,
			flip: frame.flip,
			colorSpace: frame.colorSpace?.toJSON?.()
		};
		const options = explicit ? {
			format: "RGBA",
			colorSpace: "srgb",
			layout: [{
				offset: 0,
				stride: frame.displayWidth * 4
			}]
		} : {};
		const size = frame.allocationSize(options), raw = new Uint8Array(size), layout = await frame.copyTo(raw, options);
		metadata.copyLayout = layout;
		let data = raw;
		if (!explicit) {
			if (![
				"RGBA",
				"BGRA",
				"RGBX",
				"BGRX"
			].includes(frame.format)) throw Error("Native-format output is " + frame.format + "; packed RGB comparison unavailable");
			const width = frame.displayWidth, height = frame.displayHeight, plane = layout[0];
			data = new Uint8Array(width * height * 4);
			for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
				const at = plane.offset + y * plane.stride + x * 4, to = (y * width + x) * 4, bgra = frame.format.startsWith("BG");
				data[to] = raw[at + (bgra ? 2 : 0)];
				data[to + 1] = raw[at + 1];
				data[to + 2] = raw[at + (bgra ? 0 : 2)];
				data[to + 3] = frame.format.endsWith("X") ? 255 : raw[at + 3];
			}
			metadata.channelNormalization = "Packed native " + frame.format + " → RGBA channel order only; no RGB arithmetic or color-space conversion";
		}
		return {
			width: frame.displayWidth,
			height: frame.displayHeight,
			data,
			metadata
		};
	} finally {
		frame?.close();
		decoder?.close();
	}
}
async function bitmapVideo(file) {
	if (typeof VideoFrame === "undefined") throw Error("VideoFrame absent");
	let bitmap, frame;
	try {
		bitmap = await createImageBitmap(file, {
			premultiplyAlpha: "none",
			colorSpaceConversion: "default"
		});
		frame = new VideoFrame(bitmap, {
			timestamp: 0,
			alpha: "keep"
		});
		const data = new Uint8Array(bitmap.width * bitmap.height * 4);
		await frame.copyTo(data, {
			format: "RGBA",
			colorSpace: "srgb",
			layout: [{
				offset: 0,
				stride: bitmap.width * 4
			}]
		});
		return {
			width: bitmap.width,
			height: bitmap.height,
			data,
			metadata: {
				format: frame.format,
				colorSpace: frame.colorSpace?.toJSON?.()
			}
		};
	} finally {
		frame?.close();
		bitmap?.close();
	}
}
async function bitmapCanvas(file, { premultiplyAlpha = "default", float16 = false } = {}) {
	let bitmap, canvas;
	try {
		bitmap = await createImageBitmap(file, {
			premultiplyAlpha,
			colorSpaceConversion: "default"
		});
		canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext("2d", {
			willReadFrequently: true,
			colorSpace: "srgb",
			...float16 ? { colorType: "float16" } : {}
		});
		if (!context) throw Error("Canvas context unavailable");
		const attributes = context.getContextAttributes?.();
		if (float16 && attributes?.colorType !== "float16") throw Error("Canvas float16 backing unsupported: " + JSON.stringify(attributes));
		context.drawImage(bitmap, 0, 0);
		const image = context.getImageData(0, 0, bitmap.width, bitmap.height, {
			colorSpace: "srgb",
			...float16 ? { pixelFormat: "rgba-float16" } : {}
		});
		if (float16 && image.data.constructor.name !== "Float16Array") throw Error("Float16 readback unsupported: " + image.data.constructor.name);
		const data = float16 ? Uint8Array.from(image.data, (n) => Math.max(0, Math.min(255, Math.round(n * 255)))) : new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength);
		return {
			width: bitmap.width,
			height: bitmap.height,
			data,
			metadata: {
				attributes,
				readbackArray: image.data.constructor.name,
				imageColorSpace: image.colorSpace
			}
		};
	} finally {
		bitmap?.close();
		if (canvas) canvas.width = canvas.height = 0;
	}
}
run.addEventListener("click", async () => {
	if (run.disabled) return;
	run.disabled = true;
	const report = {
		device: device.value,
		started: (/* @__PURE__ */ new Date()).toISOString(),
		userAgent: navigator.userAgent,
		scope: "Read-only owned PNG decode controls. Production path runs uninstrumented. Direct controls report their actual native errors. Matching outputs do not alone prove which hidden production fallback ran.",
		capabilities: {
			secureContext: isSecureContext,
			ImageDecoder: typeof ImageDecoder,
			VideoFrame: typeof VideoFrame,
			createImageBitmap: typeof createImageBitmap,
			Float16Array: typeof Float16Array,
			DecompressionStream: typeof DecompressionStream
		},
		fixtures: []
	};
	try {
		if (typeof ImageDecoder !== "undefined") try {
			report.capabilities.pngSupported = await ImageDecoder.isTypeSupported("image/png");
		} catch (error) {
			report.capabilities.pngSupportError = error.message;
		}
		report.build = await fetch("/build-record.json", { cache: "no-store" }).then((r) => r.json());
		const manifest = await fetch("/fixtures/manifest.json", { cache: "no-store" }).then((r) => r.json());
		const methods = [
			["production", (file) => decodeImageFile(file).then(rgba)],
			["native-stream-rgba", (file) => native(file)],
			["native-buffer-rgba", (file) => native(file, { stream: false })],
			["native-buffer-nativeformat", (file) => native(file, {
				stream: false,
				explicit: false
			})],
			["native-noneconversion", (file) => native(file, {
				stream: false,
				colorSpaceConversion: "none"
			})],
			["bitmap-default-canvas8", (file) => bitmapCanvas(file)],
			["bitmap-none-canvas8", (file) => bitmapCanvas(file, { premultiplyAlpha: "none" })],
			["bitmap-none-videoframe", bitmapVideo],
			["bitmap-none-canvas16", (file) => bitmapCanvas(file, {
				premultiplyAlpha: "none",
				float16: true
			})]
		];
		for (const fixture of manifest) {
			const raw = await fetch("/fixtures/" + fixture.file, { cache: "no-store" }).then((r) => r.arrayBuffer());
			new Uint8Array(raw);
			if (await hash(raw) !== fixture.pngSha256) throw Error("Owned fixture hash changed");
			const file = new File([raw], fixture.file, { type: "image/png" }), expected = Uint8Array.from(fixture.expectedRgba), row = {
				id: fixture.id,
				width: fixture.width,
				height: fixture.height,
				sourcePngSha256: fixture.pngSha256,
				oracle: fixture.oracle,
				methods: []
			};
			for (const [name, method] of methods) {
				status.textContent = fixture.id + " / " + name;
				const start = performance.now();
				try {
					const result = await method(file);
					if (result.width !== fixture.width || result.height !== fixture.height || result.data.length !== expected.length) throw Error("Unexpected output dimensions/layout");
					row.methods.push({
						name,
						ok: true,
						ms: performance.now() - start,
						metadata: result.metadata,
						...compare(expected, result.data, result.width, result.height),
						rgbaSha256: await hash(result.data),
						actualRgbaBase64: bytes64(result.data)
					});
				} catch (error) {
					row.methods.push({
						name,
						ok: false,
						ms: performance.now() - start,
						error: {
							name: error.name,
							message: error.message
						}
					});
				}
				out.textContent = display({
					...report,
					currentFixture: row
				});
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			report.fixtures.push(row);
		}
		report.completed = true;
		status.textContent = "Completed decoder diagnostics";
	} catch (error) {
		report.completed = false;
		report.error = {
			name: error.name,
			message: error.message
		};
		status.textContent = "Failed: " + error.message;
	} finally {
		report.finished = (/* @__PURE__ */ new Date()).toISOString();
		window.pngPrecisionReport = report;
		out.textContent = display(report);
		await fetch("/report", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(report)
		}).catch(() => {});
		run.disabled = false;
	}
});
//#endregion
export { decodeImageFile };
