<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import Pill from '$lib/pool/components/onboarding/Pill.svelte';
	import { getLatestTest } from '$lib/pool/db/testsRepository';
	import {
		remindersSupported,
		remindersPermissionGranted,
		requestRemindersPermission,
		rescheduleTestReminder
	} from '$lib/pool/reminders';

	const palette = $derived(theme.palette);

	let notificationsEnabled = $state(false);
	let permissionChecked = $state(false);

	onMount(async () => {
		await app.load();
		notificationsEnabled = await remindersPermissionGranted();
		permissionChecked = true;
	});

	const frequencies: { label: string; days: number }[] = [
		{ label: 'Every day', days: 1 },
		{ label: 'Every 2 days', days: 2 },
		{ label: 'Every 3 days', days: 3 },
		{ label: 'Weekly', days: 7 }
	];

	// Schedule the next nudge relative to the most recent reading (so the cadence
	// is measured from real data), falling back to now if nothing's logged yet.
	async function reschedule() {
		const latest = await getLatestTest();
		await rescheduleTestReminder(app.reminderDays, latest?.testedAt ?? new Date());
	}

	function pickFrequency(days: number) {
		app.reminderDays = days;
		app.save();
		if (notificationsEnabled) reschedule();
	}

	async function enableNotifications() {
		notificationsEnabled = await requestRemindersPermission();
		if (notificationsEnabled) await reschedule();
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

		{#if !remindersSupported}
			<!-- web preview: cadence still tracked, but no OS notifications here -->
			<div
				style="display:flex;gap:10px;align-items:flex-start;background:{palette.card};border:1px dashed {palette.inkMuted}55;border-radius:14px;padding:13px 14px;"
			>
				<div style="color:{palette.inkMuted};flex-shrink:0;margin-top:1px;">
					<Icon name="alert" size={18} strokeWidth={1.8} />
				</div>
				<div style="font-size:12.5px;color:{palette.inkMuted};line-height:1.35;">
					On-device notifications run on the iOS app. This sets your testing cadence so the app
					knows when readings are getting stale.
				</div>
			</div>
		{:else if notificationsEnabled}
			<div
				style="display:flex;gap:10px;align-items:flex-start;background:{palette.status
					.ok}14;border:1px solid {palette.status.ok}33;border-radius:14px;padding:13px 14px;"
			>
				<div style="color:{palette.status.ok};flex-shrink:0;margin-top:1px;">
					<Icon name="shield" size={18} strokeWidth={1.8} />
				</div>
				<div style="font-size:12.5px;color:{palette.ink};line-height:1.35;">
					On-device reminders are on. We'll nudge you {app.reminderDays === 1
						? 'each day'
						: `every ${app.reminderDays} days`} after your latest test.
				</div>
			</div>
		{:else}
			<button
				onclick={enableNotifications}
				style="width:100%;display:flex;align-items:center;justify-content:center;gap:9px;background:{palette.accent};color:#fff;padding:15px;border-radius:14px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;margin-bottom:10px;"
			>
				<Icon name="alert" size={18} color="#fff" strokeWidth={2} />Turn on reminders
			</button>
			{#if permissionChecked}
				<div style="font-size:12px;color:{palette.inkMuted};line-height:1.35;text-align:center;">
					If nothing happens, enable notifications for My Pool in iOS Settings.
				</div>
			{/if}
		{/if}
	</div>
	<TabBar />
</div>
