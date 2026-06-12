<script lang="ts">
	import { onMount } from 'svelte';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { buildTrends, type ParameterTrend } from '$lib/pool/trends';
	import Icon from '$lib/pool/components/Icon.svelte';
	import HChart from '$lib/pool/components/HChart.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getTestsSince } from '$lib/pool/db/testsRepository';

	const palette = $derived(theme.palette);

	let trends = $state<ParameterTrend[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		const tests = await getTestsSince(30);
		trends = buildTrends(tests, {
			hardnessUnit: app.hardnessUnit,
			temperatureUnit: app.temperatureUnit
		});
		loaded = true;
	});
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader large title="Trends" sub="Tap a reading to dig in">
		{#snippet right()}
			<span
				style="display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:8px 13px;border-radius:999px;white-space:nowrap;"
				>30 days</span
			>
		{/snippet}
	</NavHeader>
	<div class="scroll" style="padding:16px 18px 0;">
		<div style="display:flex;flex-direction:column;gap:11px;">
			{#each trends as trend (trend.key)}
				{@const trendColor = statusColor(palette, trend.status)}
				<a
					href="/trends/{trend.key}"
					style="display:flex;align-items:center;gap:12px;background:{palette.card};border-radius:16px;padding:13px 15px;box-shadow:{palette.shadow};"
				>
					<div style="width:86px;flex-shrink:0;">
						<div style="display:flex;align-items:center;gap:6px;">
							<span style="width:8px;height:8px;border-radius:999px;background:{trendColor};"
							></span>
							<span style="font-weight:700;font-size:14.5px;color:{palette.ink};"
								>{trend.label}</span
							>
						</div>
						<div
							style="font-size:11.5px;color:{palette.inkMuted};margin-top:2px;display:flex;align-items:center;gap:3px;"
						>
							{#if trend.direction !== 'flat'}
								<Icon
									name={trend.direction === 'up' ? 'arrowUp' : 'arrowDn'}
									size={12}
									color={trendColor}
									strokeWidth={2.4}
								/>
							{/if}{trend.note}
						</div>
					</div>
					<div style="flex:1;min-width:0;height:38px;">
						{#if trend.points.length >= 2}
							<HChart
								series={trend.points}
								timestamps={trend.dates.map((date) => date.getTime())}
								color={trendColor}
								height={38}
								gradientId="spark-{trend.key}"
							/>
						{/if}
					</div>
					<span
						style="font-family:var(--font-display);font-weight:600;font-size:18px;color:{palette.ink};width:38px;text-align:right;flex-shrink:0;"
						>{trend.latestDisplay}</span
					>
					<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
				</a>
			{/each}
			{#if loaded && trends.length === 0}
				<div
					style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};"
				>
					No tests in the last 30 days — log a few to see trends.
				</div>
			{/if}
		</div>
	</div>
	<TabBar />
</div>
