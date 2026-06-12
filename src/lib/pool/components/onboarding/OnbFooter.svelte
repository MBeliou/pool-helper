<script lang="ts">
	import { goto } from '$app/navigation';
	import { theme } from '../../state/theme.svelte';

	let { next, to, back = true }: { next: string; to: string; back?: boolean } = $props();
	const palette = $derived(theme.palette);
</script>

<div style="flex-shrink:0;display:flex;gap:12px;padding:12px 22px calc(var(--safe-bottom) + 14px);">
	{#if back}
		<button
			onclick={() => history.back()}
			style="padding:15px 22px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:{palette.inkMuted};background:{palette.card};box-shadow:{palette.shadow};"
			>Back</button
		>
	{/if}
	<button
		onclick={() => goto(to)}
		style="flex:1;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:#fff;background:{palette.accent};"
		>{next}</button
	>
</div>
