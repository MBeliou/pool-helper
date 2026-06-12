<script lang="ts">
	import { page } from '$app/state';
	import { goto, onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import '$lib/pool/pool.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import Icon from '$lib/pool/components/Icon.svelte';

	let { children } = $props();
	const palette = $derived(theme.palette);

	onMount(() => {
		(async () => {
			await app.load(); // initializes SQLite + runs migrations before the redirect decision
			if (!app.onboarded && !page.url.pathname.startsWith('/onboarding')) {
				goto('/onboarding/welcome', { replaceState: true });
			}
		})();
		const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		theme.dark = colorSchemeQuery.matches;
		const onColorSchemeChange = (event: MediaQueryListEvent) => (theme.dark = event.matches);
		colorSchemeQuery.addEventListener('change', onColorSchemeChange);
		return () => colorSchemeQuery.removeEventListener('change', onColorSchemeChange);
	});

	$effect(() => {
		document.body.style.background = theme.palette.page;
	});

	// native-like screen transitions (no-ops where the View Transitions API is missing)
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		const isBack = navigation.type === 'popstate' && navigation.delta < 0;
		document.documentElement.dataset.navDirection = isBack ? 'back' : 'forward';
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if app.ready}
	{@render children()}
{:else if app.loadError}
	<!-- storage failed to initialize — actionable instead of a dead skeleton -->
	<div
		class="screen"
		style="background:{palette.gradient};color:#fff;align-items:center;justify-content:center;padding:0 32px;text-align:center;"
	>
		<div
			style="width:64px;height:64px;border-radius:20px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center;margin-bottom:22px;"
		>
			<Icon name="alert" size={30} color="#fff" strokeWidth={1.8} />
		</div>
		<div
			style="font-family:var(--font-display);font-weight:600;font-size:24px;letter-spacing:-0.4px;"
		>
			Storage didn't start
		</div>
		<div style="font-size:14px;opacity:0.88;margin-top:10px;line-height:1.45;max-width:300px;">
			Your data is safe, but the app couldn't open its database. Restarting usually fixes this.
		</div>
		<div
			style="font-size:11.5px;opacity:0.6;margin-top:10px;font-family:ui-monospace,monospace;max-width:300px;overflow:hidden;text-overflow:ellipsis;"
		>
			{app.loadError}
		</div>
		<button
			onclick={() => app.retryLoad()}
			style="margin-top:22px;background:#fff;color:{palette.accent};padding:14px 36px;border-radius:14px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;"
			>Try again</button
		>
	</div>
{:else}
	<!-- splash while storage initializes (also the prerendered shell) -->
	<div
		class="screen"
		style="background:{palette.gradient};align-items:center;justify-content:center;"
	>
		<div
			style="width:64px;height:64px;border-radius:20px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center;"
		>
			<Icon name="drop" size={32} color="#fff" strokeWidth={1.8} />
		</div>
	</div>
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
