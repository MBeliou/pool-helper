// App Store Connect API client. Mints an ES256 JWT from the downloaded .p8
// private key (no Fastlane/Ruby) and wraps fetch against api.appstoreconnect.apple.com.
//
// Docs: https://developer.apple.com/documentation/appstoreconnectapi

import { decodeBase64, encodeBase64Url } from "@std/encoding";
import { req } from "./env.ts";

const BASE = "https://api.appstoreconnect.apple.com";

function b64urlJson(obj: unknown): string {
	return encodeBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

/** Import the PKCS#8 EC private key from the .p8 PEM file. */
async function importKey(): Promise<CryptoKey> {
	const pem = await Deno.readTextFile(req("ASC_P8_PATH"));
	const der = decodeBase64(
		pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, ""),
	);
	return crypto.subtle.importKey(
		"pkcs8",
		der,
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"],
	);
}

// Cache the token for its lifetime (ASC allows up to 20 min; we use 15).
let cached: { token: string; exp: number } | null = null;

async function token(): Promise<string> {
	const nowMs = Number(Deno.env.get("__ASC_NOW_MS")) || undefined; // testability hook
	const now = Math.floor((nowMs ?? new Date().getTime()) / 1000);
	if (cached && cached.exp - now > 60) return cached.token;

	const header = { alg: "ES256", kid: req("ASC_KEY_ID"), typ: "JWT" };
	const exp = now + 15 * 60;
	const payload = {
		iss: req("ASC_ISSUER_ID"),
		iat: now,
		exp,
		aud: "appstoreconnect-v1",
	};
	const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;
	const sig = await crypto.subtle.sign(
		{ name: "ECDSA", hash: "SHA-256" },
		await importKey(),
		new TextEncoder().encode(signingInput),
	);
	const jwt = `${signingInput}.${encodeBase64Url(new Uint8Array(sig))}`;
	cached = { token: jwt, exp };
	return jwt;
}

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
	const res = await fetch(path.startsWith("http") ? path : `${BASE}${path}`, {
		method,
		headers: {
			authorization: `Bearer ${await token()}`,
			...(body ? { "content-type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`ASC ${res.status} ${method} ${path}\n${text.slice(0, 1000)}`);
	}
	return text ? JSON.parse(text) : {};
}

export const ascGet = (path: string) => call("GET", path);
export const ascPost = (path: string, body: unknown) => call("POST", path, body);
export const ascPatch = (path: string, body: unknown) => call("PATCH", path, body);
export const ascDelete = (path: string) => call("DELETE", path);
