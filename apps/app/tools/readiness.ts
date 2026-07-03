// App Store submission readiness checker. Read-only: inspects everything required
// to submit the current version and reports what's present / missing / has issues.
//   deno task readiness            # JSON (default) — for LLM / API consumers
//   deno task readiness -- --format=text
//
// Each check has a stable id + status (ok | missing | warning | unknown). `unknown`
// = not exposed by the App Store Connect API (e.g. the Paid Apps Agreement).

import { fromFileUrl } from "@std/path";
import { ascGet } from "./lib/asc.ts";
import { appInfo, editableVersion, enUsAppInfoLoc, enUsVersionLoc, readAvailability, resolveAppId } from "./lib/ascApp.ts";

type Status = "ok" | "missing" | "warning" | "unknown";
type Check = { id: string; group: string; label: string; status: Status; detail: string };

const checks: Check[] = [];
const add = (id: string, group: string, label: string, status: Status, detail = "") => checks.push({ id, group, label, status, detail });

const g = async (p: string) => {
	try {
		return await ascGet(p);
	} catch {
		return null;
	}
};
const present = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : v != null);
const attrs = (r: unknown) => (r as { data?: { attributes?: Record<string, unknown> } } | null)?.data?.attributes ?? {};
const listData = (r: unknown) => ((r as { data?: unknown[] } | null)?.data ?? []) as { id: string; attributes: Record<string, unknown> }[];
const rel = (r: unknown, name: string) =>
	(r as { data?: { relationships?: Record<string, { data?: unknown }> } } | null)?.data?.relationships?.[name]?.data;

// ── resolve the core resources ───────────────────────────────────────────────
const appId = await resolveAppId();
const app = await g(`/v1/apps/${appId}`);
const version = await editableVersion(appId);
const vLoc = await enUsVersionLoc(version.id);
const info = await appInfo(appId);
const iLoc = await enUsAppInfoLoc(info.id);

// ── listing (version localization) ───────────────────────────────────────────
const vl = vLoc.attributes;
for (const [key, label] of [["description", "Description"], ["keywords", "Keywords"], ["promotionalText", "Promotional text"], ["supportUrl", "Support URL"], ["marketingUrl", "Marketing URL"]] as const) {
	add(`listing.${key}`, "listing", label, present(vl[key]) ? "ok" : (key === "promotionalText" || key === "marketingUrl" ? "warning" : "missing"), present(vl[key]) ? "" : "not set");
}
// ── listing (app info localization) ──────────────────────────────────────────
const il = iLoc.attributes;
add("listing.name", "listing", "App name", present(il.name) ? "ok" : "missing", String(il.name ?? ""));
add("listing.subtitle", "listing", "Subtitle", present(il.subtitle) ? "ok" : "warning", String(il.subtitle ?? "not set"));
add("listing.privacyPolicyUrl", "listing", "Privacy policy URL", present(il.privacyPolicyUrl) ? "ok" : "missing", String(il.privacyPolicyUrl ?? "not set"));

// ── category ─────────────────────────────────────────────────────────────────
const cat = rel(await g(`/v1/appInfos/${info.id}?include=primaryCategory`), "primaryCategory") as { id?: string } | undefined;
add("meta.primaryCategory", "meta", "Primary category", cat?.id ? "ok" : "missing", cat?.id ?? "not set");

// ── screenshots (6.7"/6.9" iPhone) ───────────────────────────────────────────
const sets = listData(await g(`/v1/appStoreVersionLocalizations/${vLoc.id}/appScreenshotSets`));
const set67 = sets.find((s) => s.attributes.screenshotDisplayType === "APP_IPHONE_67");
if (!set67) {
	add("screenshots.iphone67", "screenshots", "iPhone 6.7\"/6.9\" screenshots", "missing", "no screenshot set");
} else {
	const shots = listData(await g(`/v1/appScreenshotSets/${set67.id}/appScreenshots`));
	const incomplete = shots.filter((s) => (s.attributes.assetDeliveryState as { state?: string })?.state !== "COMPLETE").length;
	const status: Status = shots.length === 0 ? "missing" : incomplete ? "warning" : shots.length < 3 ? "warning" : "ok";
	add("screenshots.iphone67", "screenshots", "iPhone 6.7\"/6.9\" screenshots", status, `${shots.length} uploaded${incomplete ? `, ${incomplete} still processing/failed` : ""}`);
}

// ── build attached ───────────────────────────────────────────────────────────
const build = await g(`/v1/appStoreVersions/${version.id}/build`);
add("version.build", "version", "Build attached", (build as { data?: unknown } | null)?.data ? "ok" : "missing", (build as { data?: unknown } | null)?.data ? "" : "no build selected");

// ── review details (contact) ─────────────────────────────────────────────────
const review = attrs(await g(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`));
const hasContact = present(review.contactEmail) && present(review.contactFirstName);
add("version.reviewContact", "version", "App review contact", hasContact ? "ok" : "missing", hasContact ? String(review.contactEmail) : "not set");

// ── age rating ───────────────────────────────────────────────────────────────
const ageRating = await g(`/v1/appInfos/${info.id}/ageRatingDeclaration`);
add("meta.ageRating", "meta", "Age rating declaration", (ageRating as { data?: unknown } | null)?.data ? "ok" : "missing", (ageRating as { data?: unknown } | null)?.data ? "" : "not completed");

// ── encryption compliance (Info.plist, not an API field) ─────────────────────
try {
	const plist = await Deno.readTextFile(fromFileUrl(new URL("../ios/App/App/Info.plist", import.meta.url)));
	add("meta.encryption", "meta", "Encryption compliance (Info.plist)", plist.includes("ITSAppUsesNonExemptEncryption") ? "ok" : "warning", plist.includes("ITSAppUsesNonExemptEncryption") ? "ITSAppUsesNonExemptEncryption set" : "key not found");
} catch {
	add("meta.encryption", "meta", "Encryption compliance (Info.plist)", "unknown", "Info.plist not readable");
}

// ── app pricing + availability ───────────────────────────────────────────────
add("app.priceSchedule", "app", "App price tier", (await g(`/v1/apps/${appId}/appPriceSchedule`)) ? "ok" : "missing", "");
const appAvail = await g(`/v1/apps/${appId}/appAvailabilityV2`);
add("app.availability", "app", "App territory availability", (appAvail as { data?: unknown } | null)?.data ? "ok" : "missing", "");

// ── products (subscriptions + IAPs) ──────────────────────────────────────────
const subGroups = listData(await g(`/v1/apps/${appId}/subscriptionGroups`));
for (const grp of subGroups) {
	for (const s of listData(await g(`/v1/subscriptionGroups/${grp.id}/subscriptions`))) {
		const state = s.attributes.state as string;
		const av = await readAvailability("subscription", s.id);
		add(`product.${s.attributes.productId}`, "products", `Subscription ${s.attributes.productId}`, state === "READY_TO_SUBMIT" ? "ok" : "missing", `${state} · ${av.territoryCount} territories`);
	}
}
for (const p of listData(await g(`/v1/apps/${appId}/inAppPurchasesV2`))) {
	const state = p.attributes.state as string;
	const av = await readAvailability("iap", p.id);
	add(`product.${p.attributes.productId}`, "products", `IAP ${p.attributes.productId}`, state === "READY_TO_SUBMIT" ? "ok" : "missing", `${state} · ${av.territoryCount} territories`);
}

// ── not exposed by the API (manual) ──────────────────────────────────────────
add("agreement.paidApps", "agreements", "Paid Apps Agreement + banking/tax", "unknown", "not in the API — verify in App Store Connect → Agreements");

// ── emit ─────────────────────────────────────────────────────────────────────
const GROUP_ORDER = ["listing", "meta", "screenshots", "version", "app", "products", "agreements"];
checks.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)); // stable → groups contiguous
const summary = { ok: 0, missing: 0, warning: 0, unknown: 0 };
for (const c of checks) summary[c.status]++;
const report = {
	app: { id: appId, name: attrs(app).name ?? null, bundleId: attrs(app).bundleId ?? null },
	version: { id: version.id, versionString: version.attributes.versionString, state: version.attributes.appStoreState },
	ready: summary.missing === 0,
	summary,
	checks,
};

const format = Deno.args.find((a) => a.startsWith("--format="))?.split("=")[1] ?? "json";
if (format === "text") {
	const icon = { ok: "✓", missing: "✗", warning: "!", unknown: "?" } as const;
	console.log(`${report.app.name} · v${report.version.versionString} (${report.version.state})`);
	console.log(`Ready: ${report.ready ? "yes" : "no"}  —  ${summary.ok} ok · ${summary.missing} missing · ${summary.warning} warning · ${summary.unknown} unknown\n`);
	let group = "";
	for (const c of checks) {
		if (c.group !== group) console.log(`[${(group = c.group)}]`);
		console.log(`  ${icon[c.status]} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
	}
} else {
	console.log(JSON.stringify(report, null, 2));
}
