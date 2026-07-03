// Read-only readiness report for the subscription/IAP products in products.json:
// current price, state, whether a localization + review screenshot exist.
//   deno task prices:report
// Answers "what are the prices / what's still missing before submission".

import { fromFileUrl } from "@std/path";
import { ascGet } from "./lib/asc.ts";
import { resolveAppId } from "./lib/ascApp.ts";

type Product = { ascProductId: string; kind: "subscription" | "iap" };
const cfg = JSON.parse(
	await Deno.readTextFile(fromFileUrl(new URL("./products/products.json", import.meta.url))),
) as { products: Product[] };

const g = async (p: string) => {
	try {
		return await ascGet(p);
	} catch {
		return null;
	}
};
const first = (r: unknown) => (r as { data?: unknown[] } | null)?.data?.[0] as
	| { id: string; attributes: Record<string, unknown> }
	| undefined;

const appId = await resolveAppId();

// index all subscriptions + IAPs by productId
const subs: Record<string, { id: string; attrs: Record<string, unknown> }> = {};
const groups = (await g(`/v1/apps/${appId}/subscriptionGroups?limit=25`)) as { data?: { id: string }[] } | null;
for (const grp of groups?.data ?? []) {
	const s = (await g(`/v1/subscriptionGroups/${grp.id}/subscriptions?limit=50`)) as
		| { data?: { id: string; attributes: Record<string, unknown> }[] }
		| null;
	for (const sub of s?.data ?? []) subs[sub.attributes.productId as string] = { id: sub.id, attrs: sub.attributes };
}
const iaps: Record<string, { id: string; attrs: Record<string, unknown> }> = {};
const iapList = (await g(`/v1/apps/${appId}/inAppPurchasesV2?limit=50`)) as
	| { data?: { id: string; attributes: Record<string, unknown> }[] }
	| null;
for (const p of iapList?.data ?? []) iaps[p.attributes.productId as string] = { id: p.id, attrs: p.attributes };

console.log(`App ${appId}\n`);
for (const prod of cfg.products) {
	if (prod.kind === "subscription") {
		const s = subs[prod.ascProductId];
		if (!s) {
			console.log(`✗ ${prod.ascProductId} (subscription) — not found in App Store Connect`);
			continue;
		}
		const priceRes = (await g(
			`/v1/subscriptions/${s.id}/prices?include=subscriptionPricePoint,territory&filter[territory]=USA&limit=1`,
		)) as { included?: { type: string; attributes: Record<string, unknown> }[] } | null;
		const pp = priceRes?.included?.find((i) => i.type === "subscriptionPricePoints");
		const loc = first(await g(`/v1/subscriptions/${s.id}/subscriptionLocalizations?limit=1`));
		const rs = await g(`/v1/subscriptions/${s.id}/appStoreReviewScreenshot`);
		console.log(`• ${prod.ascProductId} (subscription) — state ${s.attrs.state}`);
		console.log(`    price (USA): ${pp?.attributes.customerPrice ?? "— none set"}`);
		console.log(`    localization: ${loc ? (loc.attributes.name ?? "set") : "— none"}`);
		console.log(`    review screenshot: ${(rs as { data?: unknown } | null)?.data ? "present" : "— none"}`);
	} else {
		const p = iaps[prod.ascProductId];
		if (!p) {
			console.log(`✗ ${prod.ascProductId} (iap) — not found in App Store Connect`);
			continue;
		}
		const sched = (await g(
			`/v2/inAppPurchases/${p.id}/iapPriceSchedule?include=manualPrices&limit=1`,
		)) as { included?: { type: string; attributes: Record<string, unknown> }[] } | null;
		const mp = sched?.included?.find((i) => i.type === "inAppPurchasePrices");
		const loc = first(await g(`/v2/inAppPurchases/${p.id}/inAppPurchaseLocalizations?limit=1`));
		const rs = await g(`/v2/inAppPurchases/${p.id}/appStoreReviewScreenshot`);
		console.log(`• ${prod.ascProductId} (iap) — state ${p.attrs.state}`);
		console.log(`    price: ${mp ? "set" : "— none set"}`);
		console.log(`    localization: ${loc ? (loc.attributes.name ?? "set") : "— none"}`);
		console.log(`    review screenshot: ${(rs as { data?: unknown } | null)?.data ? "present" : "— none"}`);
	}
}
