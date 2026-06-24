<script lang="ts">
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import Icon from '$lib/pool/components/Icon.svelte';

	const palette = $derived(theme.palette);
</script>

<div
	class="screen"
	style="background:{palette.gradient};color:#fff;position:relative;overflow:hidden;"
>
	<!-- faint concentric water rings -->
	<svg
		viewBox="0 0 402 402"
		style="position:absolute;top:-60px;right:-120px;width:420px;opacity:0.13;"
	>
		{#each [180, 140, 100, 60] as ringRadius (ringRadius)}
			<circle cx="201" cy="201" r={ringRadius} fill="none" stroke="#fff" stroke-width="2" />
		{/each}
	</svg>
	<div
		style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 30px;position:relative;"
	>
		<div
			style="width:64px;height:64px;border-radius:20px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center;margin-bottom:26px;"
		>
			<Icon name="drop" size={32} color="#fff" strokeWidth={1.8} />
		</div>
		<div
			style="font-family:var(--font-display);font-weight:600;font-size:38px;letter-spacing:-1px;line-height:1.0;"
		>
			My<br />Pool
		</div>
		<div style="font-size:17px;opacity:0.9;margin-top:16px;line-height:1.4;max-width:280px;">
			Test, know, and fix your water in minutes — no guesswork, no pool-store trips.
		</div>
	</div>
	<div style="flex-shrink:0;padding:0 22px calc(var(--safe-bottom) + 20px);position:relative;">
		<button
			onclick={() => goto('/onboarding/shape')}
			style="width:100%;background:#fff;color:{palette.accent};text-align:center;padding:16px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;"
			>Set up my pool →</button
		>
		<div style="text-align:center;margin-top:14px;font-size:13px;opacity:0.8;font-weight:500;">
			Takes about a minute · everything stays on your device
		</div>
	</div>
</div>
