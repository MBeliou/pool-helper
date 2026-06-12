<script lang="ts">
	import { page } from '$app/state';
	import { theme } from '../state/theme.svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from '../icons';

	const palette = $derived(theme.palette);

	const tabs: { icon: IconName; label: string; href: string }[] = [
		{ icon: 'home', label: 'Home', href: '/' },
		{ icon: 'plus', label: 'Log', href: '/log' },
		{ icon: 'wave', label: 'Trends', href: '/trends' },
		{ icon: 'shield', label: 'Care', href: '/care' },
		{ icon: 'grid', label: 'More', href: '/more' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' || path.startsWith('/results') : path.startsWith(href);
	}
</script>

<nav
	class="tab-bar"
	style="display:flex;justify-content:space-around;align-items:center;padding:10px 8px calc(var(--safe-bottom) + 6px);background:{palette.card};border-top:1px solid {palette.line};flex-shrink:0;"
>
	{#each tabs as tab (tab.href)}
		{@const active = isActive(tab.href)}
		<a
			href={tab.href}
			style="display:flex;flex-direction:column;align-items:center;gap:4px;color:{active
				? palette.accent
				: palette.inkMuted};"
		>
			<Icon name={tab.icon} size={23} strokeWidth={active ? 2.1 : 1.7} />
			<span style="font-size:11px;font-weight:{active ? 700 : 500};">{tab.label}</span>
		</a>
	{/each}
</nav>
