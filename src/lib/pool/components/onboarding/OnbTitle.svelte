<script lang="ts">
	import type { Snippet } from 'svelte';
	import { theme } from '../../state/theme.svelte';

	let { sub = '', children }: { sub?: string; children: Snippet } = $props();
	const palette = $derived(theme.palette);
</script>

<div style="margin-bottom:18px;">
	<div
		style="font-family:var(--font-display);font-weight:600;font-size:27px;color:{palette.ink};letter-spacing:-0.5px;line-height:1.1;"
	>
		{@render children()}
	</div>
	{#if sub}
		<div style="font-size:13.5px;color:{palette.inkMuted};margin-top:6px;">{sub}</div>
	{/if}
</div>
