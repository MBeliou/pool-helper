// Pushes subscription/IAP config (price + localization + paywall review screenshot)
// from products/products.json to App Store Connect (or verifies structure in
// RevenueCat). Idempotent; each step is independent so one failure won't abort.
//   deno task products:push -- --target=asc     (default)
//   deno task products:push -- --target=rc      (structure verify only; needs RC key)
//
// NOTE: Apple prices are fixed price points; priceUSD is matched to the USA point.
// RevenueCat cannot set prices (verified) — --target=rc only checks structure.

import { fromFileUrl } from "@std/path";
import { ascDelete, ascGet, ascPatch, ascPost, findPaged, uploadAsset } from "./lib/asc.ts";
import { allTerritoryIds, readAvailability, resolveAppId } from "./lib/ascApp.ts";
import { opt } from "./lib/env.ts";

type Product = {
	ascProductId: string;
	kind: "subscription" | "iap";
	priceUSD: number | null;
	displayName: string | null;
	description: string | null;
	reviewNote: string;
};

const target = Deno.args.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "asc";
const cfg = JSON.parse(
	await Deno.readTextFile(fromFileUrl(new URL("./products/products.json", import.meta.url))),
) as { products: Product[] };

const PAYWALL = fromFileUrl(new URL("./out/paywall/paywall.png", import.meta.url));
const paywall = await Deno.readFile(PAYWALL).catch(() => null);

async function step(label: string, fn: () => Promise<string>) {
	try {
		console.log(`  ✓ ${label}: ${await fn()}`);
	} catch (e) {
		console.error(`  ✗ ${label}: ${(e as Error).message.split("\n")[0]}`);
	}
}

const dataId = (r: unknown) => (r as { data?: { id: string } }).data?.id;
const list = (r: unknown) => (r as { data: { id: string; attributes: Record<string, unknown> }[] }).data;

if (target === "rc") {
	await verifyRevenueCat();
	Deno.exit(0);
}

// ── App Store Connect ────────────────────────────────────────────────────────
const appId = await resolveAppId();

// index subscriptions + IAPs by productId (subs carry their group for the group localization)
type SubRef = { id: string; groupId: string; groupName: string };
const subs: Record<string, SubRef> = {};
for (const grp of list(await ascGet(`/v1/apps/${appId}/subscriptionGroups?limit=25`))) {
	for (const s of list(await ascGet(`/v1/subscriptionGroups/${grp.id}/subscriptions?limit=50`))) {
		subs[s.attributes.productId as string] = { id: s.id, groupId: grp.id, groupName: grp.attributes.referenceName as string };
	}
}
const iaps: Record<string, string> = {};
for (const p of list(await ascGet(`/v1/apps/${appId}/inAppPurchasesV2?limit=50`))) {
	iaps[p.attributes.productId as string] = p.id;
}

if (!paywall) console.log("• No out/paywall/paywall.png — run `deno task paywall` first to set review screenshots.\n");

for (const p of cfg.products) {
	console.log(`${p.ascProductId} (${p.kind})`);
	if (p.kind === "subscription") await pushSubscription(p, subs[p.ascProductId]);
	else await pushIap(p, iaps[p.ascProductId]);
	console.log("");
}
console.log(`Done. Verify with: deno task prices:report`);

// ── subscription ─────────────────────────────────────────────────────────────
async function pushSubscription(p: Product, ref: SubRef | undefined) {
	if (!ref) return console.error(`  ✗ not found in App Store Connect`);
	const { id } = ref;

	// A subscription group needs a localized display name, or every subscription in
	// it stays MISSING_METADATA — ensure the en-US group localization exists.
	await step("group localization", async () => {
		const existing = list(await ascGet(`/v1/subscriptionGroups/${ref.groupId}/subscriptionGroupLocalizations?limit=10`))
			.find((l) => l.attributes.locale === "en-US");
		if (existing) return `already "${existing.attributes.name}"`;
		await ascPost(`/v1/subscriptionGroupLocalizations`, {
			data: {
				type: "subscriptionGroupLocalizations",
				attributes: { locale: "en-US", name: ref.groupName },
				relationships: { subscriptionGroup: { data: { type: "subscriptionGroups", id: ref.groupId } } },
			},
		});
		return `created "${ref.groupName}"`;
	});

	// A subscription with no territory availability stays MISSING_METADATA.
	await step("availability", async () => {
		const av = await readAvailability("subscription", id);
		if (av.set) return `already ${av.territoryCount} territories`;
		const territories = await allTerritoryIds();
		await ascPost(`/v1/subscriptionAvailabilities`, {
			data: {
				type: "subscriptionAvailabilities",
				attributes: { availableInNewTerritories: true },
				relationships: {
					subscription: { data: { type: "subscriptions", id } },
					availableTerritories: { data: territories.map((t) => ({ type: "territories", id: t })) },
				},
			},
		});
		return `set ${territories.length} territories`;
	});

	if (p.priceUSD == null) console.log(`  • price: skipped (null in config)`);
	else {await step("price", async () => {
		const cur = (await ascGet(
			`/v1/subscriptions/${id}/prices?include=subscriptionPricePoint&filter[territory]=USA&limit=1`,
		)) as { included?: { type: string; attributes: { customerPrice: string } }[] };
		const price = cur.included?.find((i) => i.type === "subscriptionPricePoints")?.attributes.customerPrice;
		if (price === String(p.priceUSD)) return `already ${price}`;
		const point = await findPaged<{ id: string; attributes: { customerPrice: string } }>(
			`/v1/subscriptions/${id}/pricePoints?filter[territory]=USA&limit=200`,
			(x) => x.attributes.customerPrice === String(p.priceUSD),
		);
		if (!point) throw new Error(`no USA price point for $${p.priceUSD}`);
		await ascPost(`/v1/subscriptionPrices`, {
			data: {
				type: "subscriptionPrices",
				attributes: { startDate: null, preserveCurrentPrice: false },
				relationships: {
					subscription: { data: { type: "subscriptions", id } },
					subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: point.id } },
				},
			},
		});
		return `set $${p.priceUSD}`;
	});}

	if (!p.displayName || !p.description) console.log(`  • localization: skipped (null in config)`);
	else {await step("localization", async () => {
		const existing = list(await ascGet(`/v1/subscriptions/${id}/subscriptionLocalizations?limit=10`))
			.find((l) => l.attributes.locale === "en-US");
		const attributes = { name: p.displayName, description: p.description };
		if (existing) {
			await ascPatch(`/v1/subscriptionLocalizations/${existing.id}`, { data: { type: "subscriptionLocalizations", id: existing.id, attributes } });
			return `updated "${p.displayName}"`;
		}
		await ascPost(`/v1/subscriptionLocalizations`, {
			data: { type: "subscriptionLocalizations", attributes: { locale: "en-US", ...attributes }, relationships: { subscription: { data: { type: "subscriptions", id } } } },
		});
		return `created "${p.displayName}"`;
	});}

	if (paywall) {
		await step("review screenshot", async () => {
			const cur = await ascGet(`/v1/subscriptions/${id}/appStoreReviewScreenshot`).catch(() => null);
			const curId = dataId(cur);
			if (curId) await ascDelete(`/v1/subscriptionAppStoreReviewScreenshots/${curId}`);
			await uploadAsset({
				reservePath: "/v1/subscriptionAppStoreReviewScreenshots",
				resourceType: "subscriptionAppStoreReviewScreenshots",
				relationships: { subscription: { data: { type: "subscriptions", id } } },
				bytes: paywall,
				fileName: "paywall.png",
			});
			return "uploaded";
		});
	}
}

// ── in-app purchase (v2) ───────────────────────────────────────────────────────
async function pushIap(p: Product, id: string | undefined) {
	if (!id) return console.error(`  ✗ not found in App Store Connect`);

	if (p.priceUSD == null) console.log(`  • price: skipped (null in config)`);
	else {await step("price", async () => {
		// don't duplicate an existing price schedule (IAP prices, once set, aren't re-set here)
		const sched = (await ascGet(`/v2/inAppPurchases/${id}/iapPriceSchedule?include=manualPrices`).catch(() => null)) as
			| { data?: { relationships?: { manualPrices?: { data?: unknown[] } } } }
			| null;
		if (sched?.data?.relationships?.manualPrices?.data?.length) return `already priced`;
		const point = await findPaged<{ id: string; attributes: { customerPrice: string } }>(
			`/v2/inAppPurchases/${id}/pricePoints?filter[territory]=USA&limit=200`,
			(x) => x.attributes.customerPrice === String(p.priceUSD),
		);
		if (!point) throw new Error(`no USA price point for $${p.priceUSD}`);
		const tmp = `${p.ascProductId}-price`;
		await ascPost(`/v1/inAppPurchasePriceSchedules`, {
			data: {
				type: "inAppPurchasePriceSchedules",
				relationships: {
					inAppPurchase: { data: { type: "inAppPurchases", id } },
					baseTerritory: { data: { type: "territories", id: "USA" } },
					manualPrices: { data: [{ type: "inAppPurchasePrices", id: tmp }] },
				},
			},
			included: [{
				type: "inAppPurchasePrices",
				id: tmp,
				attributes: { startDate: null },
				relationships: {
					inAppPurchaseV2: { data: { type: "inAppPurchases", id } },
					inAppPurchasePricePoint: { data: { type: "inAppPurchasePricePoints", id: point.id } },
				},
			}],
		});
		return `set $${p.priceUSD}`;
	});}

	if (!p.displayName || !p.description) console.log(`  • localization: skipped (null in config)`);
	else {await step("localization", async () => {
		const existing = list(await ascGet(`/v2/inAppPurchases/${id}/inAppPurchaseLocalizations?limit=10`))
			.find((l) => l.attributes.locale === "en-US");
		const attributes = { name: p.displayName, description: p.description };
		if (existing) {
			await ascPatch(`/v1/inAppPurchaseLocalizations/${existing.id}`, { data: { type: "inAppPurchaseLocalizations", id: existing.id, attributes } });
			return `updated "${p.displayName}"`;
		}
		await ascPost(`/v1/inAppPurchaseLocalizations`, {
			data: { type: "inAppPurchaseLocalizations", attributes: { locale: "en-US", ...attributes }, relationships: { inAppPurchaseV2: { data: { type: "inAppPurchases", id } } } },
		});
		return `created "${p.displayName}"`;
	});}

	if (paywall) {
		await step("review screenshot", async () => {
			const cur = await ascGet(`/v2/inAppPurchases/${id}/appStoreReviewScreenshot`).catch(() => null);
			const curId = dataId(cur);
			if (curId) await ascDelete(`/v1/inAppPurchaseAppStoreReviewScreenshots/${curId}`);
			await uploadAsset({
				reservePath: "/v1/inAppPurchaseAppStoreReviewScreenshots",
				resourceType: "inAppPurchaseAppStoreReviewScreenshots",
				relationships: { inAppPurchaseV2: { data: { type: "inAppPurchases", id } } },
				bytes: paywall,
				fileName: "paywall.png",
			});
			return "uploaded";
		});
	}
}

// ── RevenueCat (structure verify only — RC can't set prices) ───────────────────
async function verifyRevenueCat() {
	const key = opt("RC_SECRET_API_KEY");
	if (!key) {
		console.log("• RC_SECRET_API_KEY not set. RevenueCat prices come from the store (not settable via API).");
		console.log("  Add a RevenueCat secret key (sk_…) to .env to verify products/entitlements/offerings.");
		return;
	}
	const rc = async (path: string) => {
		const r = await fetch(`https://api.revenuecat.com/v2${path}`, { headers: { authorization: `Bearer ${key}` } });
		if (!r.ok) throw new Error(`RC ${r.status} ${path}: ${(await r.text()).slice(0, 200)}`);
		return r.json();
	};
	const projects = await rc("/projects");
	for (const proj of projects.items ?? []) {
		console.log(`RC project ${proj.id} (${proj.name})`);
		const products = await rc(`/projects/${proj.id}/products`).catch(() => ({ items: [] }));
		for (const p of products.items ?? []) console.log(`  product ${p.store_identifier ?? p.id} — ${p.type}`);
		const ents = await rc(`/projects/${proj.id}/entitlements`).catch(() => ({ items: [] }));
		for (const e of ents.items ?? []) console.log(`  entitlement ${e.lookup_key ?? e.id}`);
	}
	console.log("\n(RC prices are read-only via API — set them in App Store Connect with --target=asc.)");
}
