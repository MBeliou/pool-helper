<script lang="ts">
	import { theme } from '../state/theme.svelte';
	import { LITRES_PER_VOLUME_UNIT, type VolumeUnit } from '../units';
	import { dimensionUnitFor, estimatePoolVolumeLitres } from '../volumeCalculator';
	import { localeTag } from '../localeFormat';

	let {
		shape,
		volumeUnit,
		onapply
	}: {
		shape: string;
		volumeUnit: VolumeUnit;
		/** receives the formatted volume string in the profile's volume unit */
		onapply: (formattedVolume: string) => void;
	} = $props();

	const palette = $derived(theme.palette);
	const dimensionUnit = $derived(dimensionUnitFor(volumeUnit));

	let lengthText = $state('');
	let widthText = $state('');
	let depthText = $state('');

	const fields = [
		{ key: 'length', label: 'Length' },
		{ key: 'width', label: 'Width' },
		{ key: 'depth', label: 'Avg depth' }
	];

	function fieldValue(key: string): string {
		return key === 'length' ? lengthText : key === 'width' ? widthText : depthText;
	}
	function setFieldValue(key: string, newValue: string) {
		const cleaned = newValue.replace(/[^0-9.]/g, '').slice(0, 6);
		if (key === 'length') lengthText = cleaned;
		else if (key === 'width') widthText = cleaned;
		else depthText = cleaned;
	}

	const estimatedLitres = $derived(
		estimatePoolVolumeLitres({
			length: parseFloat(lengthText) || 0,
			width: parseFloat(widthText) || 0,
			averageDepth: parseFloat(depthText) || 0,
			unit: dimensionUnit,
			shape
		})
	);

	const estimateText = $derived.by(() => {
		if (estimatedLitres === null) return null;
		const inVolumeUnit = Math.round(estimatedLitres / LITRES_PER_VOLUME_UNIT[volumeUnit]);
		return `${inVolumeUnit.toLocaleString(localeTag())} ${volumeUnit}`;
	});

	function apply() {
		if (estimatedLitres === null) return;
		const inVolumeUnit = Math.round(estimatedLitres / LITRES_PER_VOLUME_UNIT[volumeUnit]);
		onapply(inVolumeUnit.toLocaleString(localeTag()));
	}
</script>

<div style="display:flex;gap:10px;margin-bottom:14px;">
	{#each fields as field (field.key)}
		<div style="flex:1;">
			<label
				for="dim-{field.key}"
				style="display:block;font-size:11.5px;color:{palette.inkMuted};font-weight:700;margin-bottom:6px;"
				>{field.label} ({dimensionUnit})</label
			>
			<input
				id="dim-{field.key}"
				type="text"
				inputmode="decimal"
				enterkeyhint="next"
				placeholder="—"
				value={fieldValue(field.key)}
				oninput={(event) => setFieldValue(field.key, (event.target as HTMLInputElement).value)}
				style="width:100%;padding:11px 10px;border-radius:12px;border:1.5px solid {palette.line};background:{palette.card};font-family:var(--font-display);font-weight:600;font-size:18px;color:{palette.ink};outline:none;caret-color:{palette.accent};text-align:center;"
			/>
		</div>
	{/each}
</div>
<div style="font-size:12.5px;color:{palette.inkMuted};margin-bottom:12px;">
	{shape} · the shape factor is applied automatically
	{#if estimateText}
		— holds about <b style="color:{palette.ink};">{estimateText}</b>
	{/if}
</div>
<button
	onclick={apply}
	disabled={estimatedLitres === null}
	style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:13px;border-radius:14px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;opacity:{estimatedLitres ===
	null
		? 0.5
		: 1};">Use this volume</button
>
