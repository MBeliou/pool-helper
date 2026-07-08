// Custom URL-scheme deep links (mypool://…), used to drive automated screenshot
// capture from the tooling. No-op on web. Lazy-imports @capacitor/app behind a
// platform guard so the web build never bundles it.
//
//   mypool://go/<route>     → navigate the router (e.g. go/results, go/care/diagnose/1)
//   mypool://seed/problem   → (DEV only) load demo data (profile + history), then go home
//   mypool://seed/balanced  → (DEV only) same, with the balanced-pool scenario
//   mypool://seed/<id>      → (DEV only) a guidance-engine scenario from
//                             demoScenarios.ts (cya-zero, high-ta, corrosive,
//                             bromine-low, swg-nudge, safety-floor)
import { Capacitor } from '@capacitor/core';
import { goto } from '$app/navigation';
import { app } from '$lib/pool/state/app.svelte';

const browser = typeof window !== 'undefined';
const isNative = () => browser && Capacitor.isNativePlatform();

async function handle(url: string): Promise<void> {
	let host: string;
	let path: string;
	try {
		const u = new URL(url);
		host = u.host;
		path = u.pathname; // "/results", "/problem", "/care/diagnose/1", …
	} catch {
		return;
	}

	// DEV-only "feed": load a scenario so a fresh install lands on populated
	// screens. Seeders write the profile row (onboarded: true) themselves;
	// reloadProfile() hydrates it, satisfying the onboarding gate.
	if (host === 'seed' && import.meta.env.DEV) {
		const demo = await import('$lib/pool/db/demoData');
		const slug = path.replace(/^\//, '');
		const scenario = demo.GUIDANCE_SCENARIOS.find((candidate) => candidate.id === slug);
		if (scenario) await scenario.load();
		else await (slug === 'balanced' ? demo.seedBalancedPool() : demo.seedProblemPool());
		await app.reloadProfile();
		await goto('/', { replaceState: true });
		return;
	}

	if (host === 'go') {
		const route = !path || path === '/' || path === '/home' ? '/' : path;
		await goto(route, { replaceState: true });
	}
}

/** Register the mypool:// deep-link listener. Native only; safe to call once on mount. */
export async function registerDeepLinks(): Promise<void> {
	if (!isNative()) return;
	const { App } = await import('@capacitor/app');
	await App.addListener('appUrlOpen', ({ url }) => {
		void handle(url);
	});
}
