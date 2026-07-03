// Pulls the CURRENT App Store Connect settings (price + localization) for each
// product into products/products.json, so the config mirrors reality before you
// edit + push it back. Preserves `reviewNote` (not stored in ASC) and order.
//   deno task products:pull

import { fromFileUrl } from "@std/path";
import { ascGet, findPaged } from "./lib/asc.ts";
import { resolveAppId } from "./lib/ascApp.ts";

/** App Store Connect price ids base64-encode `{s,t,p,…}`; return the price-point number `p`. */
function decodeP(id: string): string | null {
	try {
		return JSON.parse(atob(id)).p ?? null;
	} catch {
		return null;
	}
}

type Product = {
	ascProductId: string;
	kind: "subscription" | "iap";
	priceUSD: number | null;
	displayName: string | null;
	description: string | null;
	reviewNote: string;
};

const path = fromFileUrl(new URL("./products/products.json", import.meta.url));
const cfg = JSON.parse(await Deno.readTextFile(path)) as { _note?: string; products: Product[] };

const g = async (p: string) => {
	try {
		return await ascGet(p);
	} catch {
		return null;
	}
};
const list = (r: unknown) => ((r as { data?: { id: string; attributes: Record<string, unknown> }[] } | null)?.data ?? []);

const appId = await resolveAppId();

// index subscriptions + IAPs by productId
const subs: Record<string, string> = {};
for (const grp of list(await g(`/v1/apps/${appId}/subscriptionGroups?limit=25`))) {
	for (const s of list(await g(`/v1/subscriptionGroups/${grp.id}/subscriptions?limit=50`))) subs[s.attributes.productId as string] = s.id;
}
const iaps: Record<string, string> = {};
for (const p of list(await g(`/v1/apps/${appId}/inAppPurchasesV2?limit=50`))) iaps[p.attributes.productId as string] = p.id;

async function pullSub(id: string) {
	const price = (await g(`/v1/subscriptions/${id}/prices?include=subscriptionPricePoint&filter[territory]=USA&limit=1`)) as
		| { included?: { type: string; attributes: { customerPrice: string } }[] }
		| null;
	const priceUSD = price?.included?.find((i) => i.type === "subscriptionPricePoints")?.attributes.customerPrice;
	const loc = list(await g(`/v1/subscriptions/${id}/subscriptionLocalizations?limit=10`)).find((l) => l.attributes.locale === "en-US");
	return {
		priceUSD: priceUSD ? Number(priceUSD) : null,
		displayName: (loc?.attributes.name as string) ?? null,
		description: (loc?.attributes.description as string) ?? null,
	};
}

async function pullIap(id: string) {
	// price lives on the schedule's manual price → its price point's customerPrice
	const sched = (await g(`/v2/inAppPurchases/${id}/iapPriceSchedule?include=manualPrices`)) as
		| { data?: { relationships?: { manualPrices?: { data?: { id: string }[] } } } }
		| null;
	let priceUSD: number | null = null;
	const priceId = sched?.data?.relationships?.manualPrices?.data?.[0]?.id;
	if (priceId) {
		// GET /v1/inAppPurchasePrices/{id} 403s, so resolve the amount from the price
		// point instead: the manual-price id base64-decodes to {s,t,p,…} where p is the
		// price-point number. Match that against the product's USA price points.
		const targetP = decodeP(priceId);
		if (targetP) {
			const point = await findPaged<{ id: string; attributes: { customerPrice: string } }>(
				`/v2/inAppPurchases/${id}/pricePoints?filter[territory]=USA&limit=200`,
				(pp) => decodeP(pp.id) === targetP,
			);
			if (point) priceUSD = Number(point.attributes.customerPrice);
		}
	}
	const loc = list(await g(`/v2/inAppPurchases/${id}/inAppPurchaseLocalizations?limit=10`)).find((l) => l.attributes.locale === "en-US");
	return {
		priceUSD,
		displayName: (loc?.attributes.name as string) ?? null,
		description: (loc?.attributes.description as string) ?? null,
	};
}

for (const prod of cfg.products) {
	const id = prod.kind === "subscription" ? subs[prod.ascProductId] : iaps[prod.ascProductId];
	if (!id) {
		console.log(`✗ ${prod.ascProductId} — not found in App Store Connect (left unchanged)`);
		continue;
	}
	const pulled = prod.kind === "subscription" ? await pullSub(id) : await pullIap(id);
	prod.priceUSD = pulled.priceUSD;
	prod.displayName = pulled.displayName;
	prod.description = pulled.description;
	console.log(`✓ ${prod.ascProductId}: price ${pulled.priceUSD ?? "—"} · name ${pulled.displayName ? `"${pulled.displayName}"` : "—"}`);
}

await Deno.writeTextFile(path, JSON.stringify(cfg, null, "\t") + "\n");
console.log(`\nWrote products/products.json from App Store Connect. Edit + \`deno task products:push -- --target=asc\` to apply.`);
