<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { formatReading, parameterByKey, type ParameterKey } from '$lib/pool/chemistry';
	import { TESTERS, type ReadingKey } from '$lib/pool/data';
	import {
		HARDNESS_UNITS,
		TEMPERATURE_UNITS,
		temperatureFromCelsius,
		temperatureToCelsius,
		type HardnessUnit,
		type TemperatureUnit
	} from '$lib/pool/units';
	import { hoursSince } from '$lib/pool/format';
	import { sanitizeDecimalInput } from '$lib/pool/localeFormat';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import UnitSelect from '$lib/pool/components/UnitSelect.svelte';
	import { getLatestTest, insertTest } from '$lib/pool/db/testsRepository';
	import { rescheduleTestReminder } from '$lib/pool/reminders';

	const palette = $derived(theme.palette);

	// ta/ch/temp carry their own unit; the selector declares what the typed number means
	interface EntryRow {
		key: ReadingKey;
		label: string;
		abbreviation: string;
		value: string;
		unit: string;
		unitOptions?: readonly string[];
		/** previous reading shown as a placeholder — blanks stay genuinely unset */
		lastText: string;
		/** one-line explainer under the label */
		hint?: string;
	}

	let readings = $state<EntryRow[]>([
		{ key: 'ph', label: 'pH', abbreviation: '', value: '', unit: '', lastText: '' },
		{ key: 'fc', label: 'Free chlorine', abbreviation: 'FC', value: '', unit: 'ppm', lastText: '' },
		{
			key: 'tc',
			label: 'Total chlorine',
			abbreviation: 'TC',
			value: '',
			unit: 'ppm',
			lastText: '',
			hint: 'Free protects you now; total also counts used-up chlorine'
		},
		{
			key: 'ta',
			label: 'Total alkalinity',
			abbreviation: 'TA',
			value: '',
			unit: 'ppm',
			unitOptions: HARDNESS_UNITS,
			lastText: ''
		},
		{
			key: 'ch',
			label: 'Calcium hardness',
			abbreviation: 'CH',
			value: '',
			unit: 'ppm',
			unitOptions: HARDNESS_UNITS,
			lastText: ''
		},
		{
			key: 'cya',
			label: 'Cyanuric acid',
			abbreviation: 'CYA',
			value: '',
			unit: 'ppm',
			lastText: ''
		},
		{
			key: 'temp',
			label: 'Water temp',
			abbreviation: '',
			value: '',
			unit: '°C',
			unitOptions: TEMPERATURE_UNITS,
			lastText: ''
		}
	]);

	function rowByKey(key: ReadingKey): EntryRow {
		return readings.find((reading) => reading.key === key)!;
	}

	// the selected tester's readings first (its order), the rest below the divider
	const measuredKeys = $derived(
		TESTERS.find((tester) => tester.name === app.tester)?.measures ??
			readings.map((reading) => reading.key)
	);
	const measuredRows = $derived(measuredKeys.map((key) => rowByKey(key)));
	const extraRows = $derived(readings.filter((reading) => !measuredKeys.includes(reading.key)));

	let focusedIndex = $state<number | null>(null);
	let inputElements = $state<HTMLInputElement[]>([]);
	/** hours since the previous test, when recent enough to warn about */
	let recentTestHours = $state<number | null>(null);

	onMount(async () => {
		await app.load();
		const taReading = rowByKey('ta');
		const chReading = rowByKey('ch');
		const tempReading = rowByKey('temp');
		taReading.unit = app.hardnessUnit;
		chReading.unit = app.hardnessUnit;
		tempReading.unit = app.temperatureUnit;
		const latestTest = await getLatestTest();
		if (!latestTest) return;
		// previous readings become PLACEHOLDERS, not values — an untouched field
		// saves as "not measured", which is what a blank means (temp especially).
		// TA/CH keep the unit they were recorded in; temp shows the display unit.
		const rawValues: Record<ReadingKey, number | null> = {
			ph: latestTest.ph,
			fc: latestTest.freeChlorine,
			tc: latestTest.totalChlorine,
			ta: latestTest.totalAlkalinity,
			ch: latestTest.calciumHardness,
			cya: latestTest.cyanuricAcid,
			temp:
				latestTest.temperature === null
					? null
					: temperatureFromCelsius(latestTest.temperature, tempReading.unit as TemperatureUnit)
		};
		taReading.unit = latestTest.totalAlkalinityUnit;
		chReading.unit = latestTest.calciumHardnessUnit;
		for (const reading of readings) {
			const rawValue = rawValues[reading.key];
			if (rawValue === null) continue;
			const decimals =
				reading.key === 'tc' ? 1 : parameterByKey[reading.key as ParameterKey].decimals;
			reading.lastText = formatReading(rawValue, decimals);
		}
		const hours = hoursSince(latestTest.testedAt);
		if (hours < 24) recentTestHours = Math.max(1, Math.round(hours));
	});

	// keep digits and a single decimal separator (',' or '.'), max 5 characters
	const sanitizeValue = (rawValue: string) => sanitizeDecimalInput(rawValue, 5);

	function focusNext(currentIndex: number) {
		const nextInput = inputElements[currentIndex + 1];
		if (nextInput) nextInput.focus();
		else inputElements[currentIndex]?.blur();
	}

	function readingValue(key: ReadingKey): number | null {
		// normalize a French comma before parseFloat (parseFloat("7,4") === 7)
		const raw = (rowByKey(key).value ?? '').replace(',', '.');
		const parsed = parseFloat(raw);
		return Number.isFinite(parsed) ? parsed : null;
	}

	async function saveTestAndShowAdvice() {
		// values stored as entered, with the unit each row declares;
		// temperature is normalized to canonical °C at this boundary
		const enteredTemperature = readingValue('temp');
		const testedAt = new Date();
		await insertTest({
			testedAt,
			tester: app.tester,
			ph: readingValue('ph'),
			freeChlorine: readingValue('fc'),
			totalChlorine: readingValue('tc'),
			totalAlkalinity: readingValue('ta'),
			totalAlkalinityUnit: rowByKey('ta').unit as HardnessUnit,
			calciumHardness: readingValue('ch'),
			calciumHardnessUnit: rowByKey('ch').unit as HardnessUnit,
			cyanuricAcid: readingValue('cya'),
			temperature:
				enteredTemperature === null
					? null
					: temperatureToCelsius(enteredTemperature, rowByKey('temp').unit as TemperatureUnit)
		});
		// push the next test nudge out from this fresh reading (native, if enabled)
		await rescheduleTestReminder(app.reminderDays, testedAt);
		goto('/results');
	}

	// keep the CTA bar above the on-screen keyboard (WKWebView + browsers)
	let keyboardOffset = $state(0);
	onMount(() => {
		const visualViewport = window.visualViewport;
		if (!visualViewport) return;
		const updateKeyboardOffset = () => {
			keyboardOffset = Math.max(
				0,
				window.innerHeight - visualViewport.height - visualViewport.offsetTop
			);
		};
		visualViewport.addEventListener('resize', updateKeyboardOffset);
		visualViewport.addEventListener('scroll', updateKeyboardOffset);
		return () => {
			visualViewport.removeEventListener('resize', updateKeyboardOffset);
			visualViewport.removeEventListener('scroll', updateKeyboardOffset);
		};
	});
</script>

{#snippet entryRow(reading: EntryRow, rowIndex: number, showDivider: boolean)}
	{@const focused = focusedIndex === rowIndex}
	<div
		style="display:flex;align-items:center;justify-content:space-between;padding:12px 2px;border-bottom:{showDivider
			? `1px solid ${palette.line}`
			: 'none'};"
	>
		<label for="reading-{rowIndex}" style="min-width:0;padding-right:10px;">
			<div style="font-size:15.5px;color:{palette.ink};font-weight:500;">
				{reading.label}
			</div>
			{#if reading.abbreviation}
				<div style="font-size:11.5px;color:{palette.inkMuted};">
					{reading.abbreviation}
				</div>
			{/if}
			{#if reading.hint}
				<div style="font-size:11px;color:{palette.inkMuted};line-height:1.3;margin-top:2px;">
					{reading.hint}
				</div>
			{/if}
		</label>
		<div style="display:flex;align-items:center;gap:9px;flex-shrink:0;">
			<input
				id="reading-{rowIndex}"
				type="text"
				inputmode="decimal"
				enterkeyhint="next"
				placeholder={reading.lastText ? `last: ${reading.lastText}` : '—'}
				bind:this={inputElements[rowIndex]}
				bind:value={() => reading.value, (newValue) => (reading.value = sanitizeValue(newValue))}
				onfocus={() => (focusedIndex = rowIndex)}
				onblur={() => (focusedIndex = focusedIndex === rowIndex ? null : focusedIndex)}
				onkeydown={(event) => event.key === 'Enter' && focusNext(rowIndex)}
				style="width:90px;text-align:right;padding:8px 12px;border-radius:11px;border:{focused
					? `2px solid ${palette.accent}`
					: `1.5px solid ${palette.line}`};background:{focused
					? `${palette.accent}0d`
					: palette.card};font-family:var(--font-display);font-weight:600;font-size:19px;color:{palette.ink};outline:none;caret-color:{palette.accent};"
			/>
			{#if reading.unitOptions}
				<UnitSelect
					options={reading.unitOptions}
					bind:value={reading.unit}
					name="{reading.key}-unit"
				/>
			{:else}
				<span style="font-size:12.5px;color:{palette.inkMuted};width:34px;">
					{reading.unit}
				</span>
			{/if}
		</div>
	</div>
{/snippet}

<div class="screen" style="background:{palette.page};">
	<NavHeader title={app.tester} sub="Tap a value to type it" />
	<div class="scroll" style="padding:13px 16px 110px;">
		{#if recentTestHours !== null}
			<!-- too-soon warning -->
			<div
				style="display:flex;align-items:center;gap:11px;background:{palette.status
					.high}16;border:1px solid {palette.status
					.high}40;border-radius:13px;padding:11px 13px;margin-bottom:14px;"
			>
				<div style="color:{palette.status.high};flex-shrink:0;">
					<Icon name="alert" size={20} strokeWidth={1.9} />
				</div>
				<div style="font-size:12.5px;color:{palette.ink};line-height:1.3;">
					Last test was <b>{recentTestHours}h ago</b> — readings may not have settled. Test anyway?
				</div>
			</div>
		{/if}
		<!-- the selected kit's readings -->
		<div style="display:flex;flex-direction:column;">
			{#each measuredRows as reading, rowIndex (reading.key)}
				{@render entryRow(reading, rowIndex, rowIndex < measuredRows.length - 1)}
			{/each}
		</div>
		{#if extraRows.length > 0}
			<!-- readings this kit doesn't do — enter them from another kit if you have one -->
			<div
				style="display:flex;align-items:center;gap:12px;color:{palette.inkMuted};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:18px 0 4px;"
			>
				<div style="flex:1;height:1px;background:{palette.line};"></div>
				Not on this kit? Add from another
				<div style="flex:1;height:1px;background:{palette.line};"></div>
			</div>
			<div style="display:flex;flex-direction:column;">
				{#each extraRows as reading, extraIndex (reading.key)}
					{@render entryRow(
						reading,
						measuredRows.length + extraIndex,
						extraIndex < extraRows.length - 1
					)}
				{/each}
			</div>
		{/if}
	</div>
	<!-- accessory CTA bar — rides above the system keyboard -->
	<div
		style="position:fixed;left:0;right:0;bottom:0;z-index:30;transform:translateY(-{keyboardOffset}px);display:flex;justify-content:space-between;align-items:center;padding:8px 14px {keyboardOffset >
		0
			? '8px'
			: 'calc(var(--safe-bottom) + 8px)'};background:{palette.card};border-top:1px solid {palette.line};"
	>
		<span style="font-size:13px;color:{palette.inkMuted};">Blanks are fine</span>
		<button
			onclick={saveTestAndShowAdvice}
			style="background:{palette.accent};color:#fff;padding:9px 16px;border-radius:11px;border:none;font-weight:700;font-size:14px;font-family:var(--font-sans);white-space:nowrap;"
			>Save &amp; get advice →</button
		>
	</div>
</div>
