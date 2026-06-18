<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { formatReading, parameterByKey, type ParameterKey } from '$lib/pool/chemistry';
	import {
		HARDNESS_UNITS,
		TEMPERATURE_UNITS,
		temperatureFromCelsius,
		temperatureToCelsius,
		type HardnessUnit,
		type TemperatureUnit
	} from '$lib/pool/units';
	import { hoursSince } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import UnitSelect from '$lib/pool/components/UnitSelect.svelte';
	import { getLatestTest, insertTest } from '$lib/pool/db/testsRepository';
	import { rescheduleTestReminder } from '$lib/pool/reminders';

	const palette = $derived(theme.palette);

	// ta/ch/temp carry their own unit; the selector declares what the typed number means
	interface EntryRow {
		key: string;
		label: string;
		abbreviation: string;
		value: string;
		unit: string;
		unitOptions?: readonly string[];
	}

	let readings = $state<EntryRow[]>([
		{ key: 'ph', label: 'pH', abbreviation: '', value: '', unit: '' },
		{ key: 'fc', label: 'Free chlorine', abbreviation: 'FC', value: '', unit: 'ppm' },
		{
			key: 'ta',
			label: 'Total alkalinity',
			abbreviation: 'TA',
			value: '',
			unit: 'ppm',
			unitOptions: HARDNESS_UNITS
		},
		{
			key: 'ch',
			label: 'Calcium hardness',
			abbreviation: 'CH',
			value: '',
			unit: 'ppm',
			unitOptions: HARDNESS_UNITS
		},
		{ key: 'cya', label: 'Cyanuric acid', abbreviation: 'CYA', value: '', unit: 'ppm' },
		{
			key: 'temp',
			label: 'Water temp',
			abbreviation: '',
			value: '',
			unit: '°C',
			unitOptions: TEMPERATURE_UNITS
		}
	]);
	let focusedIndex = $state<number | null>(null);
	let inputElements = $state<HTMLInputElement[]>([]);
	/** hours since the previous test, when recent enough to warn about */
	let recentTestHours = $state<number | null>(null);

	onMount(async () => {
		await app.load();
		const taReading = readings[2];
		const chReading = readings[3];
		const tempReading = readings[5];
		taReading.unit = app.hardnessUnit;
		chReading.unit = app.hardnessUnit;
		tempReading.unit = app.temperatureUnit;
		const latestTest = await getLatestTest();
		if (!latestTest) return;
		// prefill with the previous reading as a starting point — TA/CH shown in
		// the unit they were recorded in, never converted; temperature is stored
		// canonical °C and shown in the row's display unit
		const rawValues: Record<string, number | null> = {
			ph: latestTest.ph,
			fc: latestTest.freeChlorine,
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
			reading.value = formatReading(rawValue, parameterByKey[reading.key as ParameterKey].decimals);
		}
		const hours = hoursSince(latestTest.testedAt);
		if (hours < 24) recentTestHours = Math.max(1, Math.round(hours));
	});

	// keep digits and a single decimal point, max 5 characters
	function sanitizeValue(rawValue: string): string {
		let cleaned = rawValue.replace(/[^0-9.]/g, '');
		const firstDot = cleaned.indexOf('.');
		if (firstDot !== -1) {
			cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll('.', '');
		}
		return cleaned.slice(0, 5);
	}

	function focusNext(currentIndex: number) {
		const nextInput = inputElements[currentIndex + 1];
		if (nextInput) nextInput.focus();
		else inputElements[currentIndex]?.blur();
	}

	function readingValue(key: string): number | null {
		const parsed = parseFloat(readings.find((reading) => reading.key === key)?.value ?? '');
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
			totalAlkalinity: readingValue('ta'),
			totalAlkalinityUnit: readings[2].unit as HardnessUnit,
			calciumHardness: readingValue('ch'),
			calciumHardnessUnit: readings[3].unit as HardnessUnit,
			cyanuricAcid: readingValue('cya'),
			temperature:
				enteredTemperature === null
					? null
					: temperatureToCelsius(enteredTemperature, readings[5].unit as TemperatureUnit)
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

<div class="screen" style="background:{palette.page};">
	<NavHeader title={app.tester} sub="Tap a value to type it">
		{#snippet right()}
			<a
				href="/log/new"
				style="font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:7px 12px;border-radius:999px;"
				>Change</a
			>
		{/snippet}
	</NavHeader>
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
		<!-- reading rows -->
		<div style="display:flex;flex-direction:column;">
			{#each readings as reading, readingIndex (reading.key)}
				{@const focused = focusedIndex === readingIndex}
				<div
					style="display:flex;align-items:center;justify-content:space-between;padding:12px 2px;border-bottom:{readingIndex <
					readings.length - 1
						? `1px solid ${palette.line}`
						: 'none'};"
				>
					<label for="reading-{readingIndex}" style="min-width:0;">
						<div style="font-size:15.5px;color:{palette.ink};font-weight:500;">
							{reading.label}
						</div>
						{#if reading.abbreviation}
							<div style="font-size:11.5px;color:{palette.inkMuted};">
								{reading.abbreviation}
							</div>
						{/if}
					</label>
					<div style="display:flex;align-items:center;gap:9px;">
						<input
							id="reading-{readingIndex}"
							type="text"
							inputmode="decimal"
							enterkeyhint="next"
							placeholder="—"
							bind:this={inputElements[readingIndex]}
							bind:value={
								() => reading.value, (newValue) => (reading.value = sanitizeValue(newValue))
							}
							onfocus={() => (focusedIndex = readingIndex)}
							onblur={() => (focusedIndex = focusedIndex === readingIndex ? null : focusedIndex)}
							onkeydown={(event) => event.key === 'Enter' && focusNext(readingIndex)}
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
			{/each}
		</div>
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
