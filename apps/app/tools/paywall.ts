// Guided grab of the RevenueCat paywall for the App Store IAP review screenshot.
//   deno task paywall
// The paywall is native RC UI that only renders in a real iOS build — and it must
// show REAL prices, so run a `cap:prod` build (uses the appl_ key) with a sandbox
// account, as a free (non-Pro) user. Reach it via the Home "Get Pro" pill or the
// onboarding premium screen, then press Enter. Saved unframed (review-only) to
// out/paywall/paywall.png and consumed by `products:push`.

import { ensureDir } from "@std/fs";
import { fromFileUrl } from "@std/path";

const OUT = fromFileUrl(new URL("./out/paywall/", import.meta.url));

async function sh(cmd: string, args: string[]): Promise<string> {
	const out = await new Deno.Command(cmd, { args, stdout: "piped", stderr: "piped" }).output();
	if (!out.code) return new TextDecoder().decode(out.stdout);
	throw new Error(`${cmd} ${args.join(" ")} failed:\n${new TextDecoder().decode(out.stderr)}`);
}

async function waitEnter(): Promise<void> {
	const buf = new Uint8Array(64);
	await Deno.stdin.read(buf);
}

const booted = await sh("xcrun", ["simctl", "list", "devices", "booted"]);
if (!/\(Booted\)/.test(booted)) {
	console.error("✗ No booted simulator. Launch a cap:prod build of My Pool first.");
	Deno.exit(1);
}

await ensureDir(OUT);
console.log("Paywall review screenshot");
console.log("  1. Run a production build:  pnpm cap:prod  (uses the real appl_ RevenueCat key)");
console.log("  2. Sign into a sandbox account, stay a FREE (non-Pro) user.");
console.log("  3. Open the paywall — Home 'Get Pro' pill, or Onboarding → premium.");
console.log("  4. When the paywall (with real prices) is on screen, press Enter.\n");
await waitEnter();

const path = `${OUT}paywall.png`;
await sh("xcrun", ["simctl", "io", "booted", "screenshot", path]);
console.log(`✓ saved out/paywall/paywall.png — now run: deno task products:push -- --target=asc`);
