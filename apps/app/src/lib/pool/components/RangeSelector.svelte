<script module lang="ts">
	// Longer windows are a My Pool Pro feature; free users get the 14-day
	// view. Enforcement is native-only — the web preview and dev builds leave
	// every range unlocked (the paywall can't present on a bare simulator).
	export const TREND_RANGES: { label: string; days: number; free?: boolean }[] = [
		{ label: '14d', days: 14, free: true },
		{ label: '30d', days: 30 },
		{ label: '90d', days: 90 },
		{ label: '1y', days: 365 }
	];
</script>

<script lang="ts">
	import { theme } from '../state/theme.svelte';
	import { billing } from '../billing/revenuecat.svelte';
	import Icon from './Icon.svelte';

	let {
		selected,
		onpick
	}: {
		selected: string;
		/** called with the picked range once any Pro gate has been passed */
		onpick: (label: string, days: number) => void;
	} = $props();

	const palette = $derived(theme.palette);
	const proUnlocked = $derived(billing.isPro || !billing.supported || import.meta.env.DEV);

	async function pickRange(rangeLabel: string) {
		const range = TREND_RANGES.find((option) => option.label === rangeLabel);
		if (!range) return;
		if (!range.free && !proUnlocked) {
			await billing.presentPaywall();
			if (!billing.isPro) return; // declined — stay on the free window
		}
		onpick(range.label, range.days);
	}
</script>

<div
	style="display:flex;gap:6px;background:{palette.card};border-radius:12px;padding:4px;box-shadow:{palette.shadow};margin-bottom:14px;"
>
	{#each TREND_RANGES as range (range.label)}
		{@const rangeSelected = range.label === selected}
		{@const locked = !range.free && !proUnlocked}
		<button
			onclick={() => pickRange(range.label)}
			style="flex:1;display:flex;align-items:center;justify-content:center;gap:3px;padding:8px;border-radius:9px;border:none;font-family:var(--font-sans);font-size:13px;font-weight:{rangeSelected
				? 700
				: 600};background:{rangeSelected ? palette.accent : 'transparent'};color:{rangeSelected
				? '#fff'
				: palette.inkMuted};"
			>{range.label}{#if locked}<Icon
					name="spark"
					size={11}
					color={rangeSelected ? '#fff' : palette.inkMuted}
					strokeWidth={2.2}
				/>{/if}</button
		>
	{/each}
</div>
