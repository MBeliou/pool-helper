<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { parameterByKey, type ParameterKey } from '$lib/pool/chemistry';
	import { buildTrends, type ParameterTrend } from '$lib/pool/trends';
	import { formatShortDate } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import HChart from '$lib/pool/components/HChart.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getTestsSince } from '$lib/pool/db/testsRepository';

	const palette = $derived(theme.palette);
	const parameterKey = $derived((page.params.param ?? 'ph') as ParameterKey);
	const parameter = $derived(parameterByKey[parameterKey] ?? parameterByKey.ph);

	const ranges: { label: string; days: number }[] = [
		{ label: '7d', days: 7 },
		{ label: '30d', days: 30 },
		{ label: '90d', days: 90 },
		{ label: '1y', days: 365 }
	];
	let selectedRange = $state('30d');
	let trend = $state<ParameterTrend | undefined>(undefined);
	let loaded = $state(false);

	async function refreshTrend() {
		const days = ranges.find((range) => range.label === selectedRange)?.days ?? 30;
		const tests = await getTestsSince(days);
		trend = buildTrends(tests, {
			hardnessUnit: app.hardnessUnit,
			temperatureUnit: app.temperatureUnit
		}).find((parameterTrend) => parameterTrend.key === parameter.key);
		loaded = true;
	}

	onMount(async () => {
		await app.load();
		await refreshTrend();
	});

	function pickRange(rangeLabel: string) {
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

	// static educational copy — pipeline territory later
	const tips: Partial<Record<ParameterKey, { title: string; body: string }>> = {
		ph: {
			title: 'Why this happens',
			body: 'Fresh plaster leaches lime for ~12 months, nudging pH up about 0.1 a week. Expect frequent small acid doses early on — it settles.'
		},
		fc: {
			title: 'Why this happens',
			body: 'Hot weather and heavy use burn through chlorine faster. Low CYA also lets sunlight strip it — check your stabiliser level.'
		}
	};
	const tip = $derived(tips[parameterKey]);
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title={parameter.shortLabel} sub={subtitle}>
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
				<button
					onclick={() => pickRange(range.label)}
					style="flex:1;text-align:center;padding:8px;border-radius:9px;border:none;font-family:var(--font-sans);font-size:13px;font-weight:{selected
						? 700
						: 600};background:{selected ? palette.accent : 'transparent'};color:{selected
						? '#fff'
						: palette.inkMuted};">{range.label}</button
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
