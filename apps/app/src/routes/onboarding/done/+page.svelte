<script lang="ts">
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';

	const palette = $derived(theme.palette);

	const volumeUnitShort: Record<string, string> = { litres: 'L' }; // others are short already

	const poolFacts = $derived([
		['Shape', app.shape],
		['Volume', `${app.volume} ${volumeUnitShort[app.volumeUnit] ?? app.volumeUnit}`],
		['Sanitiser', app.sanitiser],
		['Location', app.location === 'Outdoor' ? `Outdoor · ${app.sunExposure}` : 'Indoor'],
		['Filter', app.filter]
	]);

	// Setup is complete and persisted here; the premium step that follows is a
	// pure upsell, so quitting on it still leaves the user fully onboarded.
	function finishSetup() {
		app.finishOnboarding();
		goto('/onboarding/premium');
	}
</script>

<div class="screen" style="background:{palette.page};">
	<div
		style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 30px;text-align:center;"
	>
		<div
			style="width:76px;height:76px;border-radius:999px;background:{palette.status
				.ok}1a;display:grid;place-items:center;margin:0 auto 22px;"
		>
			<div
				style="width:52px;height:52px;border-radius:999px;background:{palette.status
					.ok};display:grid;place-items:center;color:#fff;font-size:28px;font-weight:800;"
			>
				✓
			</div>
		</div>
		<div
			style="font-family:var(--font-display);font-weight:600;font-size:28px;color:{palette.ink};letter-spacing:-0.5px;"
		>
			You're all set!
		</div>
		<div style="font-size:14px;color:{palette.inkMuted};margin-top:8px;margin-bottom:24px;">
			Here's your pool. Log your first test whenever you're ready.
		</div>
		<div
			style="background:{palette.card};border-radius:18px;box-shadow:{palette.shadow};overflow:hidden;text-align:left;"
		>
			{#each poolFacts as [factLabel, factValue], factIndex (factLabel)}
				<div
					style="display:flex;justify-content:space-between;padding:13px 16px;border-top:{factIndex
						? `1px solid ${palette.line}`
						: 'none'};"
				>
					<span style="font-size:14px;color:{palette.inkMuted};">{factLabel}</span>
					<span
						style="font-size:14px;font-weight:700;color:{palette.ink};font-family:var(--font-display);"
						>{factValue}</span
					>
				</div>
			{/each}
		</div>
	</div>
	<div style="flex-shrink:0;padding:0 22px calc(var(--safe-bottom) + 20px);">
		<button
			onclick={finishSetup}
			style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:16px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;"
			>Continue →</button
		>
	</div>
</div>
