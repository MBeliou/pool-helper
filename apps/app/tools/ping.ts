// Connectivity + auth smoke test. Run after filling tools/.env:
//   deno task ping
// Verifies the renderfast key works and (if present) that the ASC key mints a
// JWT and the App Store Connect API accepts it. Safe: read-only calls.

import { opt } from "./lib/env.ts";
import { listTemplates } from "./lib/renderfast.ts";

let ok = true;

// ── renderfast ──────────────────────────────────────────────────────────────
try {
	const templates = await listTemplates();
	console.log(`✓ renderfast: authenticated, ${templates.length} template(s) visible.`);
} catch (e) {
	ok = false;
	console.error(`✗ renderfast: ${(e as Error).message}`);
}

// ── App Store Connect (only if configured) ──────────────────────────────────
if (opt("ASC_KEY_ID") && opt("ASC_ISSUER_ID") && opt("ASC_P8_PATH")) {
	try {
		const { ascGet } = await import("./lib/asc.ts");
		const me = await ascGet("/v1/apps?limit=1");
		const first = (me as { data?: { attributes?: { name?: string } }[] }).data?.[0];
		console.log(
			`✓ App Store Connect: JWT accepted` +
				(first?.attributes?.name ? ` (first app: ${first.attributes.name}).` : "."),
		);
	} catch (e) {
		ok = false;
		console.error(`✗ App Store Connect: ${(e as Error).message}`);
	}
} else {
	console.log("• App Store Connect: not configured yet (ASC_* vars empty) — skipping.");
}

Deno.exit(ok ? 0 : 1);
