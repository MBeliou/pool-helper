<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import Pill from '$lib/pool/components/onboarding/Pill.svelte';

	const palette = $derived(theme.palette);

	onMount(() => app.load());

	const frequencies: { label: string; days: number }[] = [
		{ label: 'Every day', days: 1 },
		{ label: 'Every 2 days', days: 2 },
		{ label: 'Every 3 days', days: 3 },
		{ label: 'Weekly', days: 7 }
	];

	function pickFrequency(days: number) {
		app.reminderDays = days;
		app.save();
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Reminders" sub="How often should we nudge you to test?" />
	<div class="scroll" style="padding:16px 18px 0;">
		<div style="font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:9px;">
			Test frequency
		</div>
		<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
			{#each frequencies as frequency (frequency.days)}
				<Pill
					label={frequency.label}
					selected={app.reminderDays === frequency.days}
					onclick={() => pickFrequency(frequency.days)}
				/>
			{/each}
		</div>
		<div
			style="display:flex;gap:10px;align-items:flex-start;background:{palette.card};border:1px dashed {palette.inkMuted}55;border-radius:14px;padding:13px 14px;"
		>
			<div style="color:{palette.inkMuted};flex-shrink:0;margin-top:1px;">
				<Icon name="alert" size={18} strokeWidth={1.8} />
			</div>
			<div style="font-size:12.5px;color:{palette.inkMuted};line-height:1.35;">
				On-device notifications are coming soon — for now this sets your testing cadence so the app
				knows when readings are getting stale.
			</div>
		</div>
	</div>
	<TabBar />
</div>
