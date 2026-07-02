// Resolvers shared by push-metadata.ts and upload-screenshots.ts: locate the
// app, its editable version, and the en-US localizations in App Store Connect.

import { ascGet } from "./asc.ts";
import { opt, req } from "./env.ts";

type Data = { id: string; attributes: Record<string, unknown> };
const list = (r: unknown) => (r as { data: Data[] }).data;
const one = (r: unknown) => (r as { data: Data }).data;

/** App id from ASC_APP_ID, else looked up by ASC_BUNDLE_ID. */
export async function resolveAppId(): Promise<string> {
	const id = opt("ASC_APP_ID");
	if (id) return id;
	const bundle = req("ASC_BUNDLE_ID");
	const apps = list(await ascGet(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundle)}&limit=1`));
	if (!apps[0]) throw new Error(`No app found for bundle id ${bundle}`);
	return apps[0].id;
}

/** The single version that's still editable (not on the store). */
export async function editableVersion(appId: string): Promise<Data> {
	const vers = list(await ascGet(`/v1/apps/${appId}/appStoreVersions?limit=10`));
	const editable = vers.find(
		(v) => !["READY_FOR_SALE", "REPLACED_BY_NEW_VERSION"].includes(v.attributes.appStoreState as string),
	);
	if (!editable) throw new Error("No editable app store version (all are live). Create a new version first.");
	return editable;
}

export async function enUsVersionLoc(versionId: string): Promise<Data> {
	const locs = list(await ascGet(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`));
	const en = locs.find((l) => l.attributes.locale === "en-US") ?? locs[0];
	if (!en) throw new Error("No app store version localization found.");
	return en;
}

export async function appInfo(appId: string): Promise<Data> {
	const infos = list(await ascGet(`/v1/apps/${appId}/appInfos?limit=5`));
	// the editable appInfo mirrors the editable version state
	const editable = infos.find(
		(i) => !["READY_FOR_SALE", "REPLACED_BY_NEW_VERSION"].includes((i.attributes.state ?? i.attributes.appStoreState) as string),
	) ?? infos[0];
	if (!editable) throw new Error("No appInfo found.");
	return editable;
}

export async function enUsAppInfoLoc(infoId: string): Promise<Data> {
	const locs = list(await ascGet(`/v1/appInfos/${infoId}/appInfoLocalizations?limit=50`));
	const en = locs.find((l) => l.attributes.locale === "en-US") ?? locs[0];
	if (!en) throw new Error("No appInfo localization found.");
	return en;
}

export { one };
