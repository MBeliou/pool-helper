<script lang="ts">
	import { onMount } from 'svelte';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { billing } from '$lib/pool/billing/revenuecat.svelte';
	import { buildTrends, type ParameterTrend } from '$lib/pool/trends';
	import { testValue } from '$lib/pool/chemistry';
	import { guidanceConfigFromProfile } from '$lib/pool/fixPlan';
	import { derivedParameterDefinitions } from '$lib/pool/guidance/displayBands';
	import Icon from '$lib/pool/components/Icon.svelte';
	import HChart from '$lib/pool/components/HChart.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import RangeSelector from '$lib/pool/components/RangeSelector.svelte';
	import { getTestsSince } from '$lib/pool/db/testsRepository';

	const palette = $derived(theme.palette);

	// Range gating (14d free, longer = Pro) lives in RangeSelector; the upsell
	// card below offers the same unlock more visibly for gated users.
	let trends = $state<ParameterTrend[]>([]);
	let loaded = $state(false);
	let selectedRange = $state('14d');
	let windowDays = $state(14);
	let gated = $state(false);

	async function loadTrends() {
		const tests = await getTestsSince(windowDays);
		const latestTest = tests.at(-1);
		// ideal bands follow the profile-derived targets, like the home gauges
		trends = buildTrends(
			tests,
			{ hardnessUnit: app.hardnessUnit, temperatureUnit: app.temperatureUnit },
			derivedParameterDefinitions(
				guidanceConfigFromProfile({
					volume: app.volume,
					volumeUnit: app.volumeUnit,
					hardnessUnit: app.hardnessUnit,
					surface: app.surface,
					sanitiser: app.sanitiser,
					location: app.location,
					sunExposure: app.sunExposure
				}),
				latestTest ? testValue(latestTest, 'cya') : null
			)
		);
	}

	onMount(async () => {
		await app.load();
		await billing.configure();
		const unlocked = billing.isPro || !billing.supported || import.meta.env.DEV;
		gated = billing.supported && !billing.isPro && !import.meta.env.DEV;
		if (unlocked) {
			selectedRange = '30d';
			windowDays = 30;
		}
		await loadTrends();
		loaded = true;
	});

	function pickRange(label: string, days: number) {
		selectedRange = label;
		windowDays = days;
		loadTrends();
	}

	async function unlockHistory() {
		await billing.presentPaywall();
		if (billing.isPro) {
			gated = false;
			pickRange('90d', 90);
		}
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader large title="Trends" sub="Tap a reading to dig in" />
	<div class="scroll" style="padding:16px 18px 0;">
		<RangeSelector selected={selectedRange} onpick={pickRange} />
		<div style="display:flex;flex-direction:column;gap:11px;">
			{#if gated && trends.length > 0}
				<!-- free users see a limited window; Pro unlocks the long view -->
				<button
					onclick={unlockHistory}
					style="width:100%;text-align:left;font-family:var(--font-sans);display:flex;align-items:center;gap:12px;background:{palette.accent}0d;border:1px solid {palette.accent}26;border-radius:16px;padding:13px 15px;"
				>
					<div
						style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#FFD56B,#F4A623);display:grid;place-items:center;flex-shrink:0;color:#0F2A36;"
					>
						<Icon name="spark" size={18} strokeWidth={2.2} />
					</div>
					<div style="flex:1;min-width:0;">
						<div style="font-weight:700;font-size:14.5px;color:{palette.ink};">
							Unlock your full history
						</div>
						<div style="font-size:12px;color:{palette.inkMuted};">
							You're seeing the last {windowDays} days · Pro charts every test
						</div>
					</div>
					<Icon name="chevron" size={15} color={palette.accent} strokeWidth={2.2} />
				</button>
			{/if}
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
								ariaLabel="{trend.label} sparkline"
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
					No tests in the last {windowDays} days — log a few to see trends.
				</div>
			{/if}
		</div>
	</div>
	<TabBar />
</div>
