<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { billing } from '$lib/pool/billing/revenuecat.svelte';
	import { parameterByKey, type ParameterKey } from '$lib/pool/chemistry';
	import { buildTrends, type ParameterTrend } from '$lib/pool/trends';
	import { formatShortDate } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import HChart from '$lib/pool/components/HChart.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getTestsSince } from '$lib/pool/db/testsRepository';
	import { testValue } from '$lib/pool/chemistry';
	import { guidanceConfigFromProfile } from '$lib/pool/fixPlan';
	import { derivedParameterDefinitions } from '$lib/pool/guidance/displayBands';
	import { parameterExplainer } from '$lib/pool/parameterInfo';

	const palette = $derived(theme.palette);
	const parameterKey = $derived((page.params.param ?? 'ph') as ParameterKey);
	const parameter = $derived(parameterByKey[parameterKey] ?? parameterByKey.ph);

	// Longer windows are a Pool Doctor Pro feature; free users get the 14-day view.
	// Enforcement is native-only — the web preview leaves every range unlocked, and
	// dev builds too (the paywall can't present on a bare simulator).
	const ranges: { label: string; days: number; free?: boolean }[] = [
		{ label: '14d', days: 14, free: true },
		{ label: '30d', days: 30 },
		{ label: '90d', days: 90 },
		{ label: '1y', days: 365 }
	];
	const proUnlocked = $derived(billing.isPro || !billing.supported || import.meta.env.DEV);
	let selectedRange = $state('14d');
	let trend = $state<ParameterTrend | undefined>(undefined);
	let loaded = $state(false);

	async function refreshTrend() {
		const days = ranges.find((range) => range.label === selectedRange)?.days ?? 14;
		const tests = await getTestsSince(days);
		const latestTest = tests.at(-1);
		// ideal bands follow the profile-derived targets, same as home/trends list
		trend = buildTrends(
			tests,
			{ hardnessUnit: app.hardnessUnit, temperatureUnit: app.temperatureUnit },
			derivedParameterDefinitions(guidanceConfig, latestTest ? testValue(latestTest, 'cya') : null)
		).find((parameterTrend) => parameterTrend.key === parameter.key);
		loaded = true;
	}

	const guidanceConfig = $derived(
		guidanceConfigFromProfile({
			volume: app.volume,
			volumeUnit: app.volumeUnit,
			hardnessUnit: app.hardnessUnit,
			surface: app.surface,
			sanitiser: app.sanitiser,
			location: app.location,
			sunExposure: app.sunExposure
		})
	);

	onMount(async () => {
		await app.load();
		await billing.configure();
		if (proUnlocked) selectedRange = '30d';
		await refreshTrend();
	});

	async function pickRange(rangeLabel: string) {
		const range = ranges.find((option) => option.label === rangeLabel);
		if (range && !range.free && !proUnlocked) {
			await billing.presentPaywall();
			if (!billing.isPro) return; // declined — stay on the free window
		}
		selectedRange = rangeLabel;
		refreshTrend();
	}

	const directionText = $derived(
		!trend || trend.direction === 'flat'
			? 'steady'
			: trend.direction === 'up'
				? 'trending up ↗'
				: 'trending down ↘'
	);
	const subtitle = $derived(trend ? `Avg ${trend.avgDisplay} · ${directionText}` : 'No data yet');
	const axisLabels = $derived.by(() => {
		if (!trend || trend.dates.length === 0) return [];
		const first = trend.dates[0];
		const last = trend.dates[trend.dates.length - 1];
		const middle = trend.dates[Math.floor((trend.dates.length - 1) / 2)];
		return [formatShortDate(first), formatShortDate(middle), formatShortDate(last)];
	});

	// plain-language "what is this parameter" explainer (parameterInfo.ts)
	const tip = $derived(parameterExplainer(parameterKey, guidanceConfig.sanitizer));
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title={trend?.label ?? parameter.shortLabel} sub={subtitle}>
		{#snippet right()}
			<span
				style="display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:7px 11px;border-radius:999px;"
				>{selectedRange}</span
			>
		{/snippet}
	</NavHeader>
	<div class="scroll" style="padding:14px 16px 0;">
		<!-- range segmented -->
		<div
			style="display:flex;gap:6px;background:{palette.card};border-radius:12px;padding:4px;box-shadow:{palette.shadow};margin-bottom:14px;"
		>
			{#each ranges as range (range.label)}
				{@const selected = range.label === selectedRange}
				{@const locked = !range.free && !proUnlocked}
				<button
					onclick={() => pickRange(range.label)}
					style="flex:1;display:flex;align-items:center;justify-content:center;gap:3px;padding:8px;border-radius:9px;border:none;font-family:var(--font-sans);font-size:13px;font-weight:{selected
						? 700
						: 600};background:{selected ? palette.accent : 'transparent'};color:{selected
						? '#fff'
						: palette.inkMuted};"
					>{range.label}{#if locked}<Icon
							name="spark"
							size={11}
							color={selected ? '#fff' : palette.inkMuted}
							strokeWidth={2.2}
						/>{/if}</button
				>
			{/each}
		</div>
		{#if trend && trend.points.length >= 2}
			{@const trendColor = statusColor(palette, trend.status)}
			<!-- chart -->
			<div
				style="background:{palette.card};border-radius:18px;padding:14px 14px 10px;box-shadow:{palette.shadow};margin-bottom:13px;"
			>
				<HChart
					series={trend.points}
					timestamps={trend.dates.map((date) => date.getTime())}
					color={trendColor}
					height={132}
					band={Boolean(trend.idealRangeText)}
					bandLowFraction={trend.idealLowFraction}
					bandHighFraction={trend.idealHighFraction}
					dots
					gradientId="detail-{trend.key}"
					ariaLabel="{parameter.shortLabel} trend over time"
				/>
				<div
					style="display:flex;justify-content:space-between;font-size:10.5px;color:{palette.inkMuted};margin-top:6px;"
				>
					{#each axisLabels as axisLabel, axisIndex (axisIndex)}
						<span>{axisLabel}</span>
					{/each}
				</div>
				{#if trend.idealRangeText}
					<div
						style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;color:{palette.inkMuted};"
					>
						<span
							style="width:14px;height:8px;border-radius:3px;background:{palette.status
								.ok}33;border:1px dashed {palette.status.ok};"
						></span>{trend.idealRangeText}
					</div>
				{/if}
			</div>
			<!-- stats -->
			<div style="display:flex;gap:10px;margin-bottom:13px;">
				{#each [['Low', trend.lowDisplay, palette.ink], ['High', trend.highDisplay, trend.status === 'ok' ? palette.ink : trendColor], ['Now', trend.latestDisplay, palette.ink]] as [statLabel, statValue, statColor] (statLabel)}
					<div
						style="flex:1;background:{palette.card};border-radius:14px;padding:11px 8px;box-shadow:{palette.shadow};text-align:center;"
					>
						<div style="font-size:11.5px;color:{palette.inkMuted};">{statLabel}</div>
						<div
							style="font-family:var(--font-display);font-weight:600;font-size:22px;color:{statColor};margin-top:2px;"
						>
							{statValue}
						</div>
					</div>
				{/each}
			</div>
		{:else if loaded}
			<div
				style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};margin-bottom:13px;"
			>
				Not enough data in this range — log more tests to chart {parameter.shortLabel}.
			</div>
		{/if}
		<!-- tip card -->
		{#if tip}
			<div
				style="background:{palette.accent}0d;border:1px solid {palette.accent}26;border-radius:16px;padding:14px 15px;margin-bottom:14px;"
			>
				<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
					<div
						style="width:28px;height:28px;border-radius:9px;background:{palette.accent}1f;display:grid;place-items:center;color:{palette.accent};"
					>
						<Icon name="spark" size={16} strokeWidth={1.9} />
					</div>
					<span style="font-weight:800;font-size:14.5px;color:{palette.ink};">{tip.title}</span>
				</div>
				<div style="font-size:13px;color:{palette.inkMuted};line-height:1.4;">{tip.body}</div>
			</div>
		{/if}
	</div>
	<TabBar />
</div>
