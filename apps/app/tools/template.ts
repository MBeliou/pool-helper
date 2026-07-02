// Creates (or recreates) the App Store marketing template on renderfast and
// saves its id to template.json. Run once; frame.ts renders each screen through it.
//   deno task template
//
// Layout (portrait 1290×2796, an accepted iPhone 6.7"/6.9" size): brand-blue
// background, bold two-line headline, a supporting subhead, and the raw
// simulator screenshot as a rounded, shadowed image centered below.
//
// Override contract (see lib/renderfast.ts): generate() targets a layer by NAME
// with { text } for the two text layers and { image_url } for the "screenshot".

import { fromFileUrl } from "@std/path";
import { createTemplate } from "./lib/renderfast.ts";

const W = 1290;
const H = 2796;
const PAD = 96;

// Brand tokens (packages/shared/styles/tokens.css). Gradient background matches
// the app header; falls back visually to solid accent if gradients aren't honored.
const BG = "linear-gradient(158deg, #1f86c4, #0b5a92)";

const jsonData = {
	canvas: { width: W, height: H, background: BG },
	layers: [
		{
			id: "headline",
			name: "headline",
			type: "text",
			zIndex: 2,
			content: "Balance your pool\nin minutes",
			position: { x: PAD, y: 150 },
			dimensions: { width: W - PAD * 2, height: 380 },
			style: {
				color: "#ffffff",
				fontSize: 104,
				fontFamily: "Archivo Black",
				fontWeight: "800",
				textAlign: "center",
				verticalAlign: "top",
				lineHeight: 1.08,
				letterSpacing: -1,
			},
		},
		{
			id: "subhead",
			name: "subhead",
			type: "text",
			zIndex: 2,
			content: "Log a water test and get an exact plan.",
			position: { x: PAD, y: 540 },
			dimensions: { width: W - PAD * 2, height: 200 },
			style: {
				color: "#dbeafe",
				fontSize: 46,
				fontFamily: "Inter",
				fontWeight: "500",
				textAlign: "center",
				verticalAlign: "top",
				lineHeight: 1.25,
			},
		},
		{
			id: "screenshot",
			name: "screenshot",
			type: "image",
			zIndex: 1,
			src: "https://via.placeholder.com/1206x2622",
			position: { x: (W - 900) / 2, y: 760 },
			dimensions: { width: 900, height: 1956 },
			borderRadius: { topLeft: 64, topRight: 64, bottomLeft: 64, bottomRight: 64 },
		},
	],
	variables: [
		{ name: "headline", type: "text", layerId: "headline", property: "content" },
		{ name: "subhead", type: "text", layerId: "subhead", property: "content" },
		{ name: "screenshot", type: "image", layerId: "screenshot", property: "src" },
	],
};

const created = await createTemplate("My Pool — App Store screenshot", jsonData);
const id = created.id;
if (!id) throw new Error(`No template id in response: ${JSON.stringify(created)}`);

const out = fromFileUrl(new URL("./template.json", import.meta.url));
await Deno.writeTextFile(out, JSON.stringify({ templateId: id, width: W, height: H }, null, 2) + "\n");
console.log(`✓ Template created: ${id}\n  saved → tools/template.json`);
