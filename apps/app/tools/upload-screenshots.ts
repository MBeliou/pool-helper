// Uploads the framed screenshots in tools/out/framed/ to the App Store Connect
// version's 6.7"/6.9" iPhone set, in SCREENS order.
//   deno task screenshots:push
//
// ASC upload is a 3-step dance per image: reserve (POST, returns pre-signed
// uploadOperations) → PUT the bytes → commit (PATCH with the md5 checksum).
// Idempotent: existing screenshots in the set are cleared first.

import { crypto as stdCrypto } from "@std/crypto";
import { encodeHex } from "@std/encoding";
import { fromFileUrl } from "@std/path";
import { ascDelete, ascGet, ascPatch, ascPost } from "./lib/asc.ts";
import { editableVersion, enUsVersionLoc, resolveAppId } from "./lib/ascApp.ts";
import { SCREENS } from "./screens.ts";

const DISPLAY_TYPE = "APP_IPHONE_67"; // accepts 1290×2796 / 1320×2868
const FRAMED = fromFileUrl(new URL("./out/framed/", import.meta.url));

type UploadOp = {
	method: string;
	url: string;
	length: number;
	offset: number;
	requestHeaders: { name: string; value: string }[];
};

async function md5Hex(bytes: Uint8Array): Promise<string> {
	return encodeHex(new Uint8Array(await stdCrypto.subtle.digest("MD5", bytes as BufferSource)));
}

/** Find the 6.7" screenshot set on the version localization, or create it. */
async function ensureSet(versionLocId: string): Promise<string> {
	const sets = (await ascGet(
		`/v1/appStoreVersionLocalizations/${versionLocId}/appScreenshotSets?limit=50`,
	)) as { data: { id: string; attributes: { screenshotDisplayType: string } }[] };
	const existing = sets.data.find((s) => s.attributes.screenshotDisplayType === DISPLAY_TYPE);
	if (existing) return existing.id;
	const created = (await ascPost("/v1/appScreenshotSets", {
		data: {
			type: "appScreenshotSets",
			attributes: { screenshotDisplayType: DISPLAY_TYPE },
			relationships: {
				appStoreVersionLocalization: {
					data: { type: "appStoreVersionLocalizations", id: versionLocId },
				},
			},
		},
	})) as { data: { id: string } };
	return created.data.id;
}

/** Remove any screenshots already in the set (makes re-runs idempotent). */
async function clearSet(setId: string): Promise<void> {
	const shots = (await ascGet(`/v1/appScreenshotSets/${setId}/appScreenshots?limit=50`)) as {
		data: { id: string }[];
	};
	for (const s of shots.data) await ascDelete(`/v1/appScreenshots/${s.id}`);
}

async function uploadOne(setId: string, fileName: string, bytes: Uint8Array): Promise<string> {
	// 1. reserve
	const reserved = (await ascPost("/v1/appScreenshots", {
		data: {
			type: "appScreenshots",
			attributes: { fileName, fileSize: bytes.byteLength },
			relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: setId } } },
		},
	})) as { data: { id: string; attributes: { uploadOperations: UploadOp[] } } };
	const { id, attributes } = reserved.data;

	// 2. PUT each operation's slice to its pre-signed URL
	for (const op of attributes.uploadOperations) {
		const headers = new Headers();
		for (const h of op.requestHeaders) headers.set(h.name, h.value);
		const res = await fetch(op.url, {
			method: op.method,
			headers,
			body: bytes.subarray(op.offset, op.offset + op.length),
		});
		if (!res.ok) throw new Error(`PUT ${fileName} failed: ${res.status} ${await res.text()}`);
	}

	// 3. commit with the checksum
	await ascPatch(`/v1/appScreenshots/${id}`, {
		data: {
			type: "appScreenshots",
			id,
			attributes: { uploaded: true, sourceFileChecksum: await md5Hex(bytes) },
		},
	});
	return id;
}

// ── run ─────────────────────────────────────────────────────────────────────
const appId = await resolveAppId();
const version = await editableVersion(appId);
const vLoc = await enUsVersionLoc(version.id);
console.log(`App ${appId} · version ${version.attributes.versionString} · set ${DISPLAY_TYPE}\n`);

const setId = await ensureSet(vLoc.id);
await clearSet(setId);

const orderedIds: string[] = [];
for (const s of SCREENS) {
	let bytes: Uint8Array;
	try {
		bytes = await Deno.readFile(`${FRAMED}${s.id}.png`);
	} catch {
		console.log(`• skip ${s.id} — no framed image (run: deno task frame)`);
		continue;
	}
	const id = await uploadOne(setId, `${s.id}.png`, bytes);
	orderedIds.push(id);
	console.log(`✓ uploaded ${s.id}.png`);
}

// set display order to match SCREENS
if (orderedIds.length) {
	await ascPatch(`/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, {
		data: orderedIds.map((id) => ({ type: "appScreenshots", id })),
	});
	console.log(`\nOrdered ${orderedIds.length} screenshots. Verify in App Store Connect.`);
}
