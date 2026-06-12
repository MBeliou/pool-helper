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

	let { children } = $props();

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
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
