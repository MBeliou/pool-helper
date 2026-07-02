// Guided screenshot capture from the booted iOS Simulator.
//   deno task capture
// You drive the app to each screen; the script grabs the frame with
// `xcrun simctl io booted screenshot`. Raw frames land in out/raw/<id>.png and
// feed frame.ts (renderfast) — their resolution need not match Apple's store
// sizes because renderfast composes the final canvas.

import { ensureDir } from "@std/fs";
import { fromFileUrl } from "@std/path";
import { SCREENS } from "./screens.ts";

const OUT = fromFileUrl(new URL("./out/raw/", import.meta.url));

async function sh(cmd: string, args: string[]): Promise<string> {
	const out = await new Deno.Command(cmd, { args, stdout: "piped", stderr: "piped" }).output();
	if (!out.code) return new TextDecoder().decode(out.stdout);
	throw new Error(`${cmd} ${args.join(" ")} failed:\n${new TextDecoder().decode(out.stderr)}`);
}

/** Block until the user presses Enter (returns the trimmed line, e.g. "s" to skip). */
async function waitEnter(): Promise<string> {
	const buf = new Uint8Array(256);
	const n = await Deno.stdin.read(buf);
	return n === null ? "" : new TextDecoder().decode(buf.subarray(0, n)).trim();
}

// ── ensure a device is booted ───────────────────────────────────────────────
const booted = await sh("xcrun", ["simctl", "list", "devices", "booted"]);
if (!/\(Booted\)/.test(booted)) {
	console.error(
		"✗ No booted simulator. Open one (Xcode → Open Developer Tool → Simulator) and launch My Pool first.",
	);
	Deno.exit(1);
}
const device = booted.match(/^\s*(.+?)\s+\([0-9A-F-]+\)\s+\(Booted\)/m)?.[1] ?? "the simulator";
console.log(`● Capturing from: ${device}\n`);

await ensureDir(OUT);

for (const [i, s] of SCREENS.entries()) {
	const headline = s.headline.replace(/\n/g, " ");
	console.log(`(${i + 1}/${SCREENS.length}) Navigate to  ${headline}  —  route ${s.route}`);
	console.log("   Press Enter to grab · type s + Enter to skip.");
	if ((await waitEnter()).toLowerCase() === "s") {
		console.log("   ↷ skipped\n");
		continue;
	}
	const path = `${OUT}${s.id}.png`;
	await sh("xcrun", ["simctl", "io", "booted", "screenshot", path]);
	console.log(`   ✓ ${s.id}.png\n`);
}

console.log(`Done. Raw frames in tools/out/raw/. Next: deno task template → deno task frame.`);
