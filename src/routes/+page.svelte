<script lang="ts">
	import { onMount } from 'svelte';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { billing } from '$lib/pool/billing/revenuecat.svelte';
	import { gaugeReadings, type GaugeReading } from '$lib/pool/chemistry';
	import { computeFixPlan, type FixAction } from '$lib/pool/fixPlan';
	import { formatShortDate, formatTimeCompact, isToday } from '$lib/pool/format';
	import { getLatestTest } from '$lib/pool/db/testsRepository';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import SemiGauge from '$lib/pool/components/SemiGauge.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';

	const palette = $derived(theme.palette);

	let testedSubtitle = $state('Loading…');
	let readings = $state<GaugeReading[]>(
		gaugeReadings(undefined, { hardnessUnit: '°fH', temperatureUnit: '°C' })
	);
	let fixActions = $state<FixAction[]>([]);
	let hasTest = $state(false);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		const latestTest = await getLatestTest();
		hasTest = Boolean(latestTest);
		readings = gaugeReadings(latestTest, {
			hardnessUnit: app.hardnessUnit,
			temperatureUnit: app.temperatureUnit
		});
		fixActions = computeFixPlan(latestTest, {
			volume: app.volume,
			volumeUnit: app.volumeUnit,
			hardnessUnit: app.hardnessUnit
		}).actions;
		if (!latestTest) {
			testedSubtitle = 'No tests yet';
		} else if (isToday(latestTest.testedAt)) {
			testedSubtitle = `Tested today · ${formatTimeCompact(latestTest.testedAt)}`;
		} else {
			testedSubtitle = `Tested ${formatShortDate(latestTest.testedAt)}`;
		}
		loaded = true;
	});

	// pill only means something once there's a test to judge
	const statusPillText = $derived(
		!loaded || !hasTest ? '' : fixActions.length > 0 ? 'Action needed' : 'All balanced'
	);
</script>

<div class="screen" style="background:{palette.page};">
	<div class="scroll">
		<NavHeader large title={app.name} sub={testedSubtitle}>
			{#snippet right()}
				{#if !billing.isPro}
					<!-- persistent, high-visibility path to upgrade (replaces the status pill for free users) -->
					<button
						onclick={() => billing.presentPaywall()}
						style="display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#FFD56B,#F4A623);color:#0F2A36;border:none;padding:8px 13px;border-radius:999px;font-family:var(--font-sans);font-weight:800;font-size:12.5px;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.18);"
					>
						<Icon name="spark" size={14} color="#0F2A36" strokeWidth={2.2} />Get Pro
					</button>
				{:else if statusPillText}
					<div
						style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);color:#fff;padding:7px 12px;border-radius:999px;font-weight:700;font-size:12.5px;white-space:nowrap;"
					>
						<span style="width:8px;height:8px;border-radius:999px;background:#fff;"
						></span>{statusPillText}
					</div>
				{/if}
			{/snippet}
		</NavHeader>

		<div style="padding:16px 18px 16px;">
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
				{#each readings as reading (reading.key)}
					<div
						style="background:{palette.card};border-radius:18px;padding:11px 8px 8px;box-shadow:{palette.shadow};"
					>
						<div
							style="display:flex;justify-content:space-between;align-items:center;padding:0 4px 2px;"
						>
							<span style="font-size:11.5px;font-weight:700;color:{palette.inkMuted};"
								>{reading.label}</span
							>
							<span
								style="width:7px;height:7px;border-radius:999px;background:{statusColor(
									palette,
									reading.status
								)};"
							></span>
						</div>
						<SemiGauge
							radius={42}
							value={reading.value}
							unit={reading.unit}
							label={reading.label}
							fraction={reading.fraction}
							idealLow={reading.idealLowFraction}
							idealHigh={reading.idealHighFraction}
							statusColor={statusColor(palette, reading.status)}
							track={palette.track}
							ticks
						/>
					</div>
				{/each}
			</div>
			{#if !loaded || hasTest}
				<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:11px;">
					<span
						style="font-family:var(--font-display);font-weight:600;font-size:17px;color:{palette.ink};"
						>What to fix</span
					>
					<span style="font-size:13px;color:{palette.inkMuted};"
						>{fixActions.length === 1 ? '1 thing' : `${fixActions.length} things`}</span
					>
				</div>
			{/if}
			<div style="display:flex;flex-direction:column;gap:10px;">
				{#each fixActions as action (action.key)}
					{@const actionColor = statusColor(palette, action.status)}
					<a
						href="/results"
						style="display:flex;align-items:center;gap:13px;background:{palette.card};border-radius:18px;padding:13px 14px;box-shadow:{palette.shadow};"
					>
						<div
							style="width:40px;height:40px;border-radius:12px;background:{actionColor}1f;display:grid;place-items:center;flex-shrink:0;color:{actionColor};"
						>
							<Icon name={action.icon} size={21} strokeWidth={1.8} />
						</div>
						<div style="flex:1;min-width:0;">
							<div style="font-weight:700;font-size:15.5px;color:{palette.ink};">
								{action.title}
							</div>
							<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:1px;">
								{action.rangeText}
							</div>
						</div>
						<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
							{#if action.doseText}
								<span
									style="font-family:var(--font-display);font-weight:600;font-size:13px;color:{palette.ink};background:{palette.page};border:1px solid {palette.line};padding:5px 9px;border-radius:9px;white-space:nowrap;"
									>{action.doseText}</span
								>
							{/if}
							<Icon name="chevron" size={16} color={palette.inkMuted} strokeWidth={2} />
						</div>
					</a>
				{/each}
				{#if loaded && !hasTest}
					<!-- first-run: nothing measured yet -->
					<a
						href="/log/new"
						style="display:flex;align-items:center;gap:13px;background:{palette.accent};border-radius:18px;padding:15px 16px;"
					>
						<div
							style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.2);display:grid;place-items:center;color:#fff;flex-shrink:0;"
						>
							<Icon name="beaker" size={21} strokeWidth={1.8} />
						</div>
						<div style="flex:1;">
							<div style="font-weight:800;font-size:16px;color:#fff;">
								Log a test to get started
							</div>
							<div style="font-size:12.5px;color:rgba(255,255,255,.85);">
								Your readings, advice and trends all start here
							</div>
						</div>
						<Icon name="chevron" size={18} color="#fff" strokeWidth={2.2} />
					</a>
				{:else if loaded && fixActions.length === 0}
					<div
						style="display:flex;align-items:center;gap:13px;background:{palette.card};border-radius:18px;padding:13px 14px;box-shadow:{palette.shadow};"
					>
						<div
							style="width:40px;height:40px;border-radius:12px;background:{palette.status
								.ok}1f;display:grid;place-items:center;flex-shrink:0;color:{palette.status.ok};"
						>
							<Icon name="shield" size={21} strokeWidth={1.8} />
						</div>
						<div style="flex:1;">
							<div style="font-weight:700;font-size:15.5px;color:{palette.ink};">
								Water's balanced
							</div>
							<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:1px;">
								Nothing to add today — keep testing regularly
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<TabBar />
</div>
