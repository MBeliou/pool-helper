<script lang="ts">
	import { theme } from '../state/theme.svelte';

	let { open = $bindable(), message }: { open: boolean; message: string } = $props();

	const palette = $derived(theme.palette);
</script>

{#if open}
	<!-- scrim -->
	<div
		style="position:fixed;inset:0;background:rgba(8,20,28,.35);z-index:40;"
		onclick={() => (open = false)}
		onkeydown={(event) => event.key === 'Escape' && (open = false)}
		role="button"
		tabindex="-1"
		aria-label="Close"
	></div>
	<!-- sheet -->
	<div
		style="position:fixed;left:0;right:0;bottom:0;z-index:50;background:{palette.card};border-radius:26px 26px 0 0;padding:10px 18px calc(var(--safe-bottom) + 14px);box-shadow:0 -8px 30px rgba(0,0,0,.18);"
	>
		<div
			style="width:40px;height:5px;border-radius:999px;background:{palette.line};margin:0 auto 14px;"
		></div>
		<div
			style="font-family:var(--font-display);font-weight:600;font-size:19px;color:{palette.ink};margin-bottom:3px;"
		>
			Coming soon
		</div>
		<div style="font-size:13px;color:{palette.inkMuted};margin-bottom:14px;line-height:1.4;">
			{message}
		</div>
		<button
			onclick={() => (open = false)}
			style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:14px;border-radius:14px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;"
			>Got it</button
		>
	</div>
{/if}
