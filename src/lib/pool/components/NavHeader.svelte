<script lang="ts">
	import type { Snippet } from 'svelte';
	import { theme } from '../state/theme.svelte';
	import Icon from './Icon.svelte';

	let {
		title,
		sub = '',
		right,
		back = true,
		onback,
		large = false
	}: {
		title: string;
		sub?: string;
		right?: Snippet;
		back?: boolean;
		onback?: () => void;
		/** tab-root style: big display title, no back button */
		large?: boolean;
	} = $props();

	const palette = $derived(theme.palette);

	function goBack() {
		if (onback) onback();
		else history.back();
	}
</script>

<!-- the design's water header: gradient, white ink, wave cutout into the page -->
<div
	style="flex-shrink:0;background:{palette.gradient};color:{palette.onGradient};position:relative;padding:0 18px {large ? 30 : 26}px;"
>
	<div class="safe-top"></div>
	<div style="display:flex;align-items:{large ? 'flex-start' : 'center'};gap:12px;padding-top:4px;">
		{#if back && !large}
			<button
				onclick={goBack}
				aria-label="Back"
				style="width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);display:grid;place-items:center;flex-shrink:0;padding:0;"
			>
				<Icon name="chevron" size={18} color="#fff" strokeWidth={2.2} style="transform:rotate(180deg);" />
			</button>
		{/if}
		<div style="flex:1;min-width:0;">
			<div
				style="font-family:var(--font-display);font-weight:600;font-size:{large
					? 28
					: 21}px;letter-spacing:{large ? '-0.5px' : '-0.3px'};"
			>
				{title}
			</div>
			{#if sub}
				<div style="font-size:{large ? 13.5 : 12.5}px;opacity:0.85;margin-top:{large ? 2 : 1}px;">
					{sub}
				</div>
			{/if}
		</div>
		{#if right}{@render right()}{/if}
	</div>
	<svg
		viewBox="0 0 400 26"
		preserveAspectRatio="none"
		style="position:absolute;bottom:-1px;left:0;width:100%;height:26px;display:block;"
	>
		<path d="M0 14 C 60 2 120 24 200 14 C 280 4 340 24 400 12 L400 26 L0 26 Z" fill={palette.page} />
	</svg>
</div>
