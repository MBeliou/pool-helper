// Pushes the App Store listing copy from tools/metadata/** to App Store Connect.
//   deno task metadata:push
// Idempotent: re-running overwrites the same fields. Each PATCH is independent —
// one rejected field (e.g. whatsNew on a first version) won't block the others.

import { fromFileUrl } from "@std/path";
import { ascPatch } from "./lib/asc.ts";
import { appInfo, editableVersion, enUsAppInfoLoc, enUsVersionLoc, resolveAppId } from "./lib/ascApp.ts";

const dir = fromFileUrl(new URL("./metadata/", import.meta.url));
const read = async (p: string) => (await Deno.readTextFile(`${dir}${p}`)).trim();

/** Parse `key=value` lines (ignoring # comments) from metadata/urls.txt. */
async function readKv(p: string): Promise<Record<string, string>> {
	const out: Record<string, string> = {};
	for (const line of (await read(p)).split("\n")) {
		const t = line.trim();
		if (!t || t.startsWith("#")) continue;
		const i = t.indexOf("=");
		if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
	}
	return out;
}

/** PATCH one resource, reporting success/failure per field group without aborting. */
async function patch(label: string, path: string, body: unknown, expectedSkip?: string) {
	try {
		await ascPatch(path, body);
		console.log(`✓ ${label}`);
	} catch (e) {
		const msg = (e as Error).message;
		// Some fields are only editable in certain version states (e.g. whatsNew on
		// a first release). Report those as an expected skip, not a failure.
		if (expectedSkip && msg.includes("STATE_ERROR")) console.log(`• ${label} — skipped (${expectedSkip})`);
		else console.error(`✗ ${label}: ${msg.split("\n")[0]}`);
	}
}

const [enUs, urls] = await Promise.all([
	(async () => ({
		description: await read("en-US/description.txt"),
		keywords: await read("en-US/keywords.txt"),
		promotionalText: await read("en-US/promotional_text.txt"),
		whatsNew: await read("en-US/release_notes.txt"),
		subtitle: await read("en-US/subtitle.txt"),
	}))(),
	readKv("urls.txt"),
]);

const appId = await resolveAppId();
const version = await editableVersion(appId);
const vLoc = await enUsVersionLoc(version.id);
const info = await appInfo(appId);
const iLoc = await enUsAppInfoLoc(info.id);
console.log(`App ${appId} · version ${version.attributes.versionString} (${version.attributes.appStoreState})\n`);

// version localization: description, keywords, promo, urls, whatsNew
await patch("listing (description, keywords, promo, URLs)", `/v1/appStoreVersionLocalizations/${vLoc.id}`, {
	data: {
		id: vLoc.id,
		type: "appStoreVersionLocalizations",
		attributes: {
			description: enUs.description,
			keywords: enUs.keywords,
			promotionalText: enUs.promotionalText,
			supportUrl: urls.support_url,
			marketingUrl: urls.marketing_url,
		},
	},
});

// whatsNew is only editable on updates, not a first release — attempt separately.
await patch(
	"release notes (whatsNew)",
	`/v1/appStoreVersionLocalizations/${vLoc.id}`,
	{ data: { id: vLoc.id, type: "appStoreVersionLocalizations", attributes: { whatsNew: enUs.whatsNew } } },
	"only editable on app updates",
);

// appInfo localization: subtitle + privacy policy URL
await patch("subtitle + privacy URL", `/v1/appInfoLocalizations/${iLoc.id}`, {
	data: {
		id: iLoc.id,
		type: "appInfoLocalizations",
		attributes: { subtitle: enUs.subtitle, privacyPolicyUrl: urls.privacy_url },
	},
});

// categories
await patch("categories", `/v1/appInfos/${info.id}`, {
	data: {
		id: info.id,
		type: "appInfos",
		relationships: {
			primaryCategory: { data: { type: "appCategories", id: urls.primary_category } },
			secondaryCategory: { data: { type: "appCategories", id: urls.secondary_category } },
		},
	},
});

console.log(`\nDone. Verify in App Store Connect → ${appId} → ${version.attributes.versionString}.`);
