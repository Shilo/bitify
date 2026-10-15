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
//#region bench/webkit-fallback-candidate-gl.mjs
var MAX_BYTES = 33554432;
var MAX_PIXELS = 16777216;
var signature = [
	137,
	80,
	78,
	71,
	13,
	10,
	26,
	10
];
async function read(file, start, length, signal) {
	const bytes = new Uint8Array(await file.slice(start, start + length).arrayBuffer());
	checkCanceled(signal);
	return bytes;
}
function u32(bytes, p = 0) {
	return bytes[p] * 16777216 + (bytes[p + 1] << 16) + (bytes[p + 2] << 8) + bytes[p + 3];
}
async function eligible(file, signal) {
	if (!Number.isSafeInteger(file.size) || file.size < 45 || file.size > MAX_BYTES) return null;
	const head = await read(file, 0, 33, signal);
	if (head.length !== 33 || signature.some((value, p) => head[p] !== value) || u32(head, 8) !== 13 || String.fromCharCode(...head.subarray(12, 16)) !== "IHDR" || head[24] !== 8 || head[25] !== 6 || head[26] || head[27] || head[28]) return null;
	const width = u32(head, 16), height = u32(head, 20);
	if (!width || !height || !Number.isSafeInteger(width * height)) return null;
	let at = 33, seenSrgb = false, seenPhys = false, data = false, compressed = 0;
	for (let count = 1; count < 256 && at + 12 <= file.size; count++) {
		const chunk = await read(file, at, 8, signal);
		if (chunk.length !== 8) return null;
		const length = u32(chunk), name = String.fromCharCode(...chunk.subarray(4)), end = at + length + 12;
		if (length > 2147483647 || end > file.size) return null;
		if (name === "IDAT") {
			data = true;
			compressed += length;
		} else if (name === "sRGB" && !data && !seenSrgb && length === 1) {
			const intent = await read(file, at + 8, 1, signal);
			if (intent.length !== 1 || intent[0] > 3) return null;
			seenSrgb = true;
		} else if (name === "pHYs" && !data && !seenPhys && length === 9) {
			const units = await read(file, at + 16, 1, signal);
			if (units.length !== 1 || units[0] > 1) return null;
			seenPhys = true;
		} else if (name === "IEND" && !length && data && compressed >= 6 && end === file.size) return {
			width,
			height
		};
		else return null;
		at = end;
	}
	return null;
}
async function decodePngWithWebGL(file, { signal, validateDimensions } = {}) {
	checkCanceled(signal);
	const shape = await eligible(file, signal);
	if (!shape) return null;
	validateDimensions?.(shape.width, shape.height);
	if (shape.width * shape.height > MAX_PIXELS) return null;
	await yieldTask();
	checkCanceled(signal);
	let canvas, gl, texture, framebuffer, image, url;
	try {
		canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		gl = canvas.getContext("webgl", {
			alpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: false,
			preserveDrawingBuffer: false
		});
		if (!gl || gl.isContextLost()) return null;
		const maximum = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		if (!Number.isInteger(maximum) || maximum < shape.width || maximum < shape.height) return null;
		image = new Image();
		url = URL.createObjectURL(file);
		await new Promise((resolve, reject) => {
			const cancel = () => done(new DOMException("The image import was canceled.", "AbortError"));
			const done = (failure) => {
				image.onload = image.onerror = null;
				signal?.removeEventListener("abort", cancel);
				failure ? reject(failure) : resolve();
			};
			image.onload = () => done();
			image.onerror = () => done(/* @__PURE__ */ new Error("Could not decode PNG image."));
			signal?.addEventListener("abort", cancel, { once: true });
			if (signal?.aborted) {
				done(new DOMException("The image import was canceled.", "AbortError"));
				return;
			}
			image.src = url;
		});
		checkCanceled(signal);
		if (image.naturalWidth !== shape.width || image.naturalHeight !== shape.height) return null;
		await yieldTask();
		checkCanceled(signal);
		texture = gl.createTexture();
		framebuffer = gl.createFramebuffer();
		if (!texture || !framebuffer) throw new Error("Could not allocate image texture.");
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
		if ("unpackColorSpace" in gl) {
			gl.unpackColorSpace = "srgb";
			if (gl.unpackColorSpace !== "srgb") return null;
		}
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR || gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Could not prepare image texture.");
		checkCanceled(signal);
		const pixels = new Uint8ClampedArray(shape.width * shape.height * 4);
		const bytes = new Uint8Array(pixels.buffer), stride = shape.width * 4;
		const rows = Math.max(1, Math.floor(131072 / stride));
		for (let y = 0; y < shape.height;) {
			const deadline = performance.now() + 8;
			do {
				checkCanceled(signal);
				const count = Math.min(rows, shape.height - y);
				gl.readPixels(0, y, shape.width, count, gl.RGBA, gl.UNSIGNED_BYTE, bytes.subarray(y * stride, (y + count) * stride));
				if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error("Could not read image texture.");
				y += count;
			} while (y < shape.height && performance.now() < deadline);
			if (y < shape.height) await yieldTask();
		}
		checkCanceled(signal);
		return new ImageData(pixels, shape.width, shape.height);
	} finally {
		if (image) {
			image.onload = image.onerror = null;
			image.src = "";
		}
		if (url) URL.revokeObjectURL(url);
		if (gl) {
			if (framebuffer) gl.deleteFramebuffer(framebuffer);
			if (texture) gl.deleteTexture(texture);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		}
		if (canvas) canvas.width = canvas.height = 0;
	}
}
//#endregion
export { decodePngWithWebGL };
