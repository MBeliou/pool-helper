<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import {
		PARAMETERS,
		formatReading,
		readingStatus,
		testValue,
		type ParameterKey
	} from '$lib/pool/chemistry';
	import { formatShortDate, formatTimeCompact, isToday } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getTestById } from '$lib/pool/db/testsRepository';
	import type { TestRow } from '$lib/pool/db/schema';

	const palette = $derived(theme.palette);

	let test = $state<TestRow | undefined>(undefined);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		const requestedId = Number(page.url.searchParams.get('id'));
		if (Number.isFinite(requestedId) && requestedId > 0) test = await getTestById(requestedId);
		loaded = true;
	});

	const headerSubtitle = $derived(
		!test
			? ''
			: `${isToday(test.testedAt) ? 'Today' : formatShortDate(test.testedAt)} · ${formatTimeCompact(test.testedAt)} · ${test.tester}`
	);

	interface ReadingRow {
		key: ParameterKey;
		label: string;
		/** value exactly as entered, with the unit it was recorded in */
		valueText: string;
		status: string;
	}

	// as-entered value + unit per parameter (null readings are skipped)
	const readingRows = $derived.by(() => {
		if (!test) return [] as ReadingRow[];
		const currentTest = test;
		const storedReadings: { key: ParameterKey; value: number | null; unit: string }[] = [
			{ key: 'ph', value: currentTest.ph, unit: '' },
			{ key: 'fc', value: currentTest.freeChlorine, unit: 'ppm' },
			{ key: 'ta', value: currentTest.totalAlkalinity, unit: currentTest.totalAlkalinityUnit },
			{ key: 'ch', value: currentTest.calciumHardness, unit: currentTest.calciumHardnessUnit },
			{ key: 'cya', value: currentTest.cyanuricAcid, unit: 'ppm' },
			{ key: 'temp', value: currentTest.temperature, unit: '°C' }
		];
		const rows: ReadingRow[] = [];
		for (const stored of storedReadings) {
			if (stored.value === null) continue;
			const parameter = PARAMETERS.find((definition) => definition.key === stored.key);
			if (!parameter) continue;
			const canonicalValue = testValue(currentTest, stored.key);
			rows.push({
				key: stored.key,
				label: parameter.label,
				valueText: `${formatReading(stored.value, parameter.decimals)}${stored.unit ? ` ${stored.unit}` : ''}`,
				status: canonicalValue === null ? 'info' : readingStatus(parameter, canonicalValue)
			});
		}
		return rows;
	});
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Water test" sub={headerSubtitle} />
	<div class="scroll" style="padding:16px 16px 0;">
		{#if test}
			<div
				style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
			>
				{#each readingRows as row, rowIndex (row.key)}
					{@const parameter = PARAMETERS.find((definition) => definition.key === row.key)}
					<div
						style="display:flex;align-items:center;gap:12px;padding:13px 15px;border-top:{rowIndex
							? `1px solid ${palette.line}`
							: 'none'};"
					>
						<div
							style="width:36px;height:36px;border-radius:10px;background:{statusColor(
								palette,
								row.status
							)}17;display:grid;place-items:center;color:{statusColor(palette, row.status)};flex-shrink:0;"
						>
							<Icon name={parameter?.icon ?? 'drop'} size={18} strokeWidth={1.8} />
						</div>
						<div style="flex:1;font-size:14.5px;font-weight:600;color:{palette.ink};">
							{row.label}
						</div>
						<span
							style="font-family:var(--font-display);font-weight:600;font-size:17px;color:{palette.ink};"
							>{row.valueText}</span
						>
						<span
							style="width:8px;height:8px;border-radius:999px;background:{statusColor(
								palette,
								row.status
							)};flex-shrink:0;"
						></span>
					</div>
				{/each}
			</div>
			{#if readingRows.length === 0}
				<div
					style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};"
				>
					This test has no readings.
				</div>
			{/if}
		{:else if loaded}
			<div
				style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};"
			>
				Test not found — head back to the log.
			</div>
		{/if}
	</div>
	<TabBar />
</div>
