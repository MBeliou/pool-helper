<script lang="ts">
	import { theme } from '../state/theme.svelte';
	import { app } from '../state/app.svelte';
	import {
		HARDNESS_UNITS,
		TEMPERATURE_UNITS,
		VOLUME_UNITS,
		convertVolume,
		type HardnessUnit,
		type TemperatureUnit,
		type VolumeUnit
	} from '../units';
	import UnitSelect from './UnitSelect.svelte';
	import Pill from './onboarding/Pill.svelte';

	const palette = $derived(theme.palette);

	const presets: {
		label: string;
		volumeUnit: VolumeUnit;
		hardnessUnit: HardnessUnit;
		temperatureUnit: TemperatureUnit;
	}[] = [
		{ label: 'US', volumeUnit: 'US gal', hardnessUnit: 'ppm', temperatureUnit: '°F' },
		{ label: 'UK / Imperial', volumeUnit: 'imp gal', hardnessUnit: 'ppm', temperatureUnit: '°C' },
		{
			label: 'Metric (most of world)',
			volumeUnit: 'litres',
			hardnessUnit: '°fH',
			temperatureUnit: '°C'
		}
	];

	// convert the stored volume whenever the volume unit changes so the physical
	// pool size is preserved (not silently relabelled under a new unit)
	let previousVolumeUnit = app.volumeUnit;
	function syncVolumeForUnitChange() {
		if (app.volume !== null) {
			app.volume = convertVolume(app.volume, previousVolumeUnit, app.volumeUnit);
		}
		previousVolumeUnit = app.volumeUnit;
	}

	function applyPreset(preset: (typeof presets)[number]) {
		app.unitsPreset = preset.label;
		app.volumeUnit = preset.volumeUnit;
		app.hardnessUnit = preset.hardnessUnit;
		app.temperatureUnit = preset.temperatureUnit;
		syncVolumeForUnitChange();
		app.save();
	}

	function onVolumeUnitChange() {
		syncVolumeForUnitChange();
		app.save();
	}
</script>

<div style="font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:9px;">
	Quick preset
</div>
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
	{#each presets as preset (preset.label)}
		<Pill
			label={preset.label}
			selected={app.unitsPreset === preset.label}
			onclick={() => applyPreset(preset)}
		/>
	{/each}
</div>
<div
	style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
>
	<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 15px;">
		<div>
			<div style="font-size:15px;color:{palette.ink};font-weight:600;">Volume</div>
			<div style="font-size:11.5px;color:{palette.inkMuted};">Litres · gal · m³</div>
		</div>
		<UnitSelect
			options={VOLUME_UNITS}
			bind:value={app.volumeUnit}
			onchange={onVolumeUnitChange}
			name="volume-unit"
		/>
	</div>
	<div
		style="display:flex;justify-content:space-between;align-items:center;padding:14px 15px;border-top:1px solid {palette.line};"
	>
		<div>
			<div style="font-size:15px;color:{palette.ink};font-weight:600;">Hardness / Alk</div>
			<div style="font-size:11.5px;color:{palette.inkMuted};">ppm · °fH · °dH</div>
		</div>
		<UnitSelect
			options={HARDNESS_UNITS}
			bind:value={app.hardnessUnit}
			onchange={() => app.save()}
			name="hardness-unit"
		/>
	</div>
	<div
		style="display:flex;justify-content:space-between;align-items:center;padding:14px 15px;border-top:1px solid {palette.line};"
	>
		<div>
			<div style="font-size:15px;color:{palette.ink};font-weight:600;">Temperature</div>
			<div style="font-size:11.5px;color:{palette.inkMuted};">°C · °F</div>
		</div>
		<UnitSelect
			options={TEMPERATURE_UNITS}
			bind:value={app.temperatureUnit}
			onchange={() => app.save()}
			name="temperature-unit"
		/>
	</div>
</div>
