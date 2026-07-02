// Frames each raw simulator screenshot into an App Store marketing image, fully
// locally (no external service): brand gradient + bold headline + subhead + the
// screenshot composited inside a real iPhone frame. Reads out/raw/<id>.png,
// writes out/framed/<id>.png.
//   deno task frame
//
// We composite with @napi-rs/canvas instead of renderfast because renderfast's
// API does not render image layers (see RENDERFAST_FEEDBACK.md). The device frame
// is assets/iphone-frame.svg — its screen area is transparent, so the screenshot
// sits behind it and shows through the cutout with correct rounded corners.

import { createCanvas, GlobalFonts, type Image, loadImage } from "npm:@napi-rs/canvas@0.1";
import { ensureDir } from "@std/fs";
import { fromFileUrl } from "@std/path";
import { SCREENS } from "./screens.ts";

const W = 1290; // 6.7"/6.9" iPhone portrait — accepted by App Store Connect
const H = 2796;

// Brand tokens (packages/shared/styles/tokens.css).
const GRAD_TOP = "#1f86c4";
const GRAD_BOTTOM = "#0b5a92";
const HEADLINE_FILL = "#ffffff";
const SUBHEAD_FILL = "#dbeafe";

// System fonts (direct .ttf, registered by family name).
GlobalFonts.registerFromPath("/System/Library/Fonts/Supplemental/Arial Black.ttf", "PoolHeadline");
GlobalFonts.registerFromPath("/System/Library/Fonts/Supplemental/Arial.ttf", "PoolBody");

const RAW = fromFileUrl(new URL("./out/raw/", import.meta.url));
const FRAMED = fromFileUrl(new URL("./out/framed/", import.meta.url));

// iPhone 17 Pro frame (Figma export). viewBox is 880×1832; the transparent screen
// cutout is at these viewBox coords — the capture's aspect (0.460) matches it exactly.
const SVG_W = 880;
const SVG_H = 1832;
const SCREEN = { x: 38, y: 42, w: 804, h: 1748 };

const FRAME_W = 940; // rendered device width on the 1290-wide canvas
const FRAME_TOP = 660; // y of the frame's top (leaves room for headline + subhead)

// Rasterize the frame once at 2× for crisp edges (viewBox kept, so screen coords
// stay in viewBox units regardless of raster resolution).
const frameSvg = (await Deno.readTextFile(fromFileUrl(new URL("./assets/iphone-frame.svg", import.meta.url))))
	.replace(`width="${SVG_W}"`, `width="${SVG_W * 2}"`)
	.replace(`height="${SVG_H}"`, `height="${SVG_H * 2}"`);
const FRAME_IMG = await loadImage(new TextEncoder().encode(frameSvg));

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

/** Greedy word-wrap to a max pixel width; returns the lines. */
function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let line = "";
	for (const w of words) {
		const test = line ? `${line} ${w}` : w;
		if (ctx.measureText(test).width > maxWidth && line) {
			lines.push(line);
			line = w;
		} else line = test;
	}
	if (line) lines.push(line);
	return lines;
}

async function frameOne(headline: string, subhead: string, shot: Image): Promise<Uint8Array> {
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");

	// background gradient
	const g = ctx.createLinearGradient(0, 0, W, H);
	g.addColorStop(0, GRAD_TOP);
	g.addColorStop(1, GRAD_BOTTOM);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);

	ctx.textAlign = "center";

	// headline (author-controlled line breaks via \n)
	ctx.fillStyle = HEADLINE_FILL;
	ctx.font = "104px PoolHeadline";
	const hLines = headline.split("\n");
	hLines.forEach((line, i) => ctx.fillText(line, W / 2, 236 + i * 116));

	// subhead (word-wrapped)
	ctx.fillStyle = SUBHEAD_FILL;
	ctx.font = "46px PoolBody";
	const subTop = 236 + hLines.length * 116 + 96;
	wrap(ctx, subhead, W - 200).forEach((line, i) => ctx.fillText(line, W / 2, subTop + i * 60));

	// Device frame: screenshot goes behind the frame's transparent screen cutout.
	const scale = FRAME_W / SVG_W;
	const fx = (W - FRAME_W) / 2;
	const frameH = SVG_H * scale;
	const sx = fx + SCREEN.x * scale;
	const sy = FRAME_TOP + SCREEN.y * scale;
	const sw = SCREEN.w * scale;
	const sh = SCREEN.h * scale;

	// screenshot, clipped to the screen's rounded corners so it can't peek into the
	// transparent regions outside the phone's rounded silhouette
	const screenR = 100 * scale;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(sx, sy, sw, sh, screenR);
	ctx.clip();
	ctx.drawImage(shot, sx, sy, sw, sh);
	ctx.restore();

	// frame on top, casting a soft drop shadow (the phone silhouette)
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.30)";
	ctx.shadowBlur = 60;
	ctx.shadowOffsetY = 30;
	ctx.drawImage(FRAME_IMG, fx, FRAME_TOP, FRAME_W, frameH);
	ctx.restore();

	return await canvas.encode("png");
}

// ── run ─────────────────────────────────────────────────────────────────────
await ensureDir(FRAMED);
let made = 0;
for (const s of SCREENS) {
	const rawPath = `${RAW}${s.id}.png`;
	let bytes: Uint8Array;
	try {
		bytes = await Deno.readFile(rawPath);
	} catch {
		console.log(`• skip ${s.id} — no raw capture (run: deno task capture)`);
		continue;
	}
	const shot = await loadImage(bytes);
	const png = await frameOne(s.headline, s.subhead, shot);
	await Deno.writeFile(`${FRAMED}${s.id}.png`, png);
	console.log(`✓ ${s.id}.png`);
	made++;
}
console.log(`\nFramed ${made}/${SCREENS.length} → tools/out/framed/. Next: deno task screenshots:push.`);
