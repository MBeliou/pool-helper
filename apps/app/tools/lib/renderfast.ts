// Thin client over the renderfast REST API (https://renderfa.st/api).
// Auth is a Bearer token (RENDERFAST_API_KEY). See /api/openapi/json for the
// full surface; we use: uploads, templates, generate, batches.

import { req } from "./env.ts";

const BASE = "https://renderfa.st/api";

function auth(): HeadersInit {
	// `origin` is required — the API rejects POSTs it deems cross-site (CSRF guard).
	return { authorization: `Bearer ${req("RENDERFAST_API_KEY")}`, origin: "https://renderfa.st" };
}

async function json<T>(res: Response): Promise<T> {
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`renderfast ${res.status} ${res.url}\n${text.slice(0, 800)}`);
	}
	return text ? (JSON.parse(text) as T) : ({} as T);
}

/** GET /api/templates — also serves as an auth/connectivity check. */
export async function listTemplates(): Promise<unknown[]> {
	const res = await fetch(`${BASE}/templates`, { headers: auth() });
	const body = await json<{ templates?: unknown[] } | unknown[]>(res);
	return Array.isArray(body) ? body : (body.templates ?? []);
}

/** POST /api/uploads (multipart) — returns the stored upload (id + url). */
export async function uploadImage(
	bytes: Uint8Array,
	filename: string,
): Promise<{ id: string; url?: string }> {
	const form = new FormData();
	form.append("file", new Blob([bytes as BlobPart], { type: "image/png" }), filename);
	form.append("category", "image");
	const res = await fetch(`${BASE}/uploads`, { method: "POST", headers: auth(), body: form });
	return json(res);
}

/** POST /api/templates — create a template from a jsonData document. */
export async function createTemplate(
	name: string,
	jsonData: unknown,
): Promise<{ id: string }> {
	const res = await fetch(`${BASE}/templates`, {
		method: "POST",
		headers: { ...auth(), "content-type": "application/json" },
		body: JSON.stringify({ name, jsonData }),
	});
	return json(res);
}

// Override values passed to generate(). Keyed by LAYER NAME. Text layers take
// `{ text }`; image layers take `{ image_url, objectFit?, objectPosition? }`.
export type TextOverride = { text: string };
export type ImageOverride = {
	image_url: string;
	objectFit?: "cover" | "contain";
	objectPosition?: string;
};
export type LayerOverride = TextOverride | ImageOverride;

/** POST /api/generate — returns the hosted URL of the rendered image. */
export async function generate(opts: {
	templateId: string;
	layers?: Record<string, LayerOverride>;
	format?: "png" | "jpeg" | "webp";
	scale?: number;
}): Promise<string> {
	const res = await fetch(`${BASE}/generate`, {
		method: "POST",
		headers: { ...auth(), "content-type": "application/json" },
		body: JSON.stringify({ format: "png", ...opts }),
	});
	const body = await json<{ imageUrl?: string; error?: string }>(res);
	if (!body.imageUrl) throw new Error(`renderfast generate: no imageUrl (${JSON.stringify(body)})`);
	return body.imageUrl;
}

/** generate() then download the bytes (hosted images also need the Bearer key). */
export async function render(opts: Parameters<typeof generate>[0]): Promise<Uint8Array> {
	const url = await generate(opts);
	const res = await fetch(url, { headers: auth() });
	if (!res.ok) throw new Error(`renderfast download ${res.status} ${url}`);
	return new Uint8Array(await res.arrayBuffer());
}
