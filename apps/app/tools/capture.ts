// Screenshot capture from the booted iOS Simulator.
//   deno task capture            — automated: seeds demo data + navigates via
//                                  mypool:// deep links, grabs each screen hands-off.
//   deno task capture -- --manual — guided: you navigate, press Enter to grab.
//
// Automated mode needs a dev build (cap:dev) running in the simulator so the
// mypool:// scheme + the DEV-only seed are available. Raw frames land in
// out/raw/<id>.png and feed frame.ts. Resolution needn't match Apple's store
// sizes — frame.ts composes the final canvas inside the iPhone frame.

import { ensureDir } from "@std/fs";
import { fromFileUrl } from "@std/path";
import { SCREENS } from "./screens.ts";

const OUT = fromFileUrl(new URL("./out/raw/", import.meta.url));
const manual = Deno.args.includes("--manual");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sh(cmd: string, args: string[]): Promise<string> {
	const out = await new Deno.Command(cmd, { args, stdout: "piped", stderr: "piped" }).output();
	if (!out.code) return new TextDecoder().decode(out.stdout);
	throw new Error(`${cmd} ${args.join(" ")} failed:\n${new TextDecoder().decode(out.stderr)}`);
}

async function waitEnter(): Promise<string> {
	const buf = new Uint8Array(256);
	const n = await Deno.stdin.read(buf);
	return n === null ? "" : new TextDecoder().decode(buf.subarray(0, n)).trim();
}

const openUrl = (url: string) => sh("xcrun", ["simctl", "openurl", "booted", url]);
const grab = (id: string) => sh("xcrun", ["simctl", "io", "booted", "screenshot", `${OUT}${id}.png`]);

// deep-link target for a route: "/" → go/home, else go/<route>
const goUrl = (route: string) => (route === "/" ? "mypool://go/home" : `mypool://go${route}`);

// ── ensure a device is booted ───────────────────────────────────────────────
const booted = await sh("xcrun", ["simctl", "list", "devices", "booted"]);
if (!/\(Booted\)/.test(booted)) {
	console.error("✗ No booted simulator. Open one and launch My Pool (cap:dev for automated mode).");
	Deno.exit(1);
}
const device = booted.match(/^\s*(.+?)\s+\([0-9A-F-]+\)\s+\(Booted\)/m)?.[1] ?? "the simulator";
console.log(`● Capturing from: ${device}${manual ? " (manual)" : ""}\n`);
await ensureDir(OUT);

if (manual) {
	// Guided fallback: you drive the app; the script grabs on Enter.
	for (const [i, s] of SCREENS.entries()) {
		console.log(`(${i + 1}/${SCREENS.length}) Navigate to  ${s.headline.replace(/\n/g, " ")}  —  ${s.route}`);
		console.log("   Press Enter to grab · type s + Enter to skip.");
		if ((await waitEnter()).toLowerCase() === "s") {
			console.log("   ↷ skipped\n");
			continue;
		}
		await grab(s.id);
		console.log(`   ✓ ${s.id}.png\n`);
	}
} else {
	// Automated: seed the demo "feed" once, then deep-link to each screen.
	console.log("Seeding demo data (mypool://seed/problem)…");
	await openUrl("mypool://seed/problem");
	await sleep(3000); // onboard + write a month of demo tests/issues + land home

	for (const [i, s] of SCREENS.entries()) {
		await openUrl(goUrl(s.route));
		await sleep(1400); // navigate + render + DB query
		await grab(s.id);
		console.log(`✓ (${i + 1}/${SCREENS.length}) ${s.id}.png  ←  ${s.route}`);
	}
}

console.log(`\nDone. Raw frames in tools/out/raw/. Next: deno task frame.`);
