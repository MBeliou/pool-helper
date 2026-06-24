<script lang="ts">
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { VOLUME_UNITS, convertVolume } from '$lib/pool/units';
	import { formatNumber, sanitizeDecimalInput } from '$lib/pool/localeFormat';
	import Icon from '$lib/pool/components/Icon.svelte';
	import UnitSelect from '$lib/pool/components/UnitSelect.svelte';
	import VolumeCalculator from '$lib/pool/components/VolumeCalculator.svelte';
	import OnbTop from '$lib/pool/components/onboarding/OnbTop.svelte';
	import OnbFooter from '$lib/pool/components/onboarding/OnbFooter.svelte';
	import OnbTitle from '$lib/pool/components/onboarding/OnbTitle.svelte';

	const palette = $derived(theme.palette);
	let volumeMode = $state<'known' | 'calculate'>('known');
	// editing buffer for the text field; app.volume holds the parsed number. m³ is
	// shown ungrouped so its decimal can't collide with a thousands separator.
	let previousVolumeUnit = app.volumeUnit;
	const formatVolumeText = (volume: number) => formatNumber(volume, app.volumeUnit !== 'm³');
	let volumeText = $state(app.volume === null ? '' : formatVolumeText(app.volume));

	function applyCalculatedVolume(volume: number) {
		app.volume = volume;
		volumeText = formatVolumeText(volume);
		app.save();
		volumeMode = 'known';
	}

	// m³ allows one decimal (e.g. 9.7); litres/gallons are whole counts where a
	// comma/point is a thousands separator, so strip to digits
	function sanitizeVolume(rawValue: string): string {
		return app.volumeUnit === 'm³'
			? sanitizeDecimalInput(rawValue, 7)
			: rawValue.replace(/[^0-9]/g, '').slice(0, 8);
	}

	function onVolumeInput(rawValue: string) {
		volumeText = sanitizeVolume(rawValue);
		const parsed = parseFloat(volumeText);
		// keep the last good value while the field is transiently empty/invalid
		if (Number.isFinite(parsed)) app.volume = parsed;
	}

	// reformat on blur (restores a number if the field was cleared, so volume is never left unset)
	function formatVolume() {
		volumeText = app.volume === null ? '' : formatVolumeText(app.volume);
		app.save();
	}

	// convert the stored volume to the newly chosen unit so the physical size is
	// preserved and the buffer can't be misread under the new unit
	function changeVolumeUnit() {
		if (app.volume !== null) {
			app.volume = convertVolume(app.volume, previousVolumeUnit, app.volumeUnit);
		}
		previousVolumeUnit = app.volumeUnit;
		volumeText = app.volume === null ? '' : formatVolumeText(app.volume);
		app.save();
	}
</script>

<div class="screen" style="background:{palette.page};">
	<OnbTop step={2} label="Step 2 of 4 · Size" />
	<div class="scroll" style="padding:20px 22px 0;">
		<OnbTitle>How much<br />water?</OnbTitle>
		<!-- segmented -->
		<div
			style="display:flex;background:{palette.card};border-radius:14px;padding:4px;box-shadow:{palette.shadow};margin-bottom:20px;"
		>
			<button
				onclick={() => (volumeMode = 'known')}
				style="flex:1;text-align:center;padding:10px;border-radius:10px;border:none;font-family:var(--font-sans);background:{volumeMode ===
				'known'
					? palette.accent
					: 'transparent'};color:{volumeMode === 'known'
					? '#fff'
					: palette.inkMuted};font-weight:{volumeMode === 'known' ? 700 : 600};font-size:14px;"
				>I know my volume</button
			>
			<button
				onclick={() => (volumeMode = 'calculate')}
				style="flex:1;text-align:center;padding:10px;border-radius:10px;border:none;font-family:var(--font-sans);background:{volumeMode ===
				'calculate'
					? palette.accent
					: 'transparent'};color:{volumeMode === 'calculate'
					? '#fff'
					: palette.inkMuted};font-weight:{volumeMode === 'calculate' ? 700 : 600};font-size:14px;"
				>Calculate it</button
			>
		</div>
		{#if volumeMode === 'known'}
			<label
				for="pool-volume"
				style="display:block;font-size:13px;color:{palette.inkMuted};margin-bottom:7px;font-weight:600;"
				>Total volume</label
			>
			<div
				style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:{palette.card};border:2px solid {palette.accent};border-radius:15px;padding:14px 16px;box-shadow:{palette.shadow};"
			>
				<input
					id="pool-volume"
					type="text"
					inputmode={app.volumeUnit === 'm³' ? 'decimal' : 'numeric'}
					enterkeyhint="done"
					bind:value={() => volumeText, (newValue) => onVolumeInput(newValue)}
					onblur={formatVolume}
					onkeydown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
					style="flex:1;min-width:0;border:none;background:transparent;outline:none;font-family:var(--font-display);font-weight:600;font-size:30px;color:{palette.ink};caret-color:{palette.accent};padding:0;"
				/>
				<UnitSelect
					options={VOLUME_UNITS}
					bind:value={app.volumeUnit}
					onchange={changeVolumeUnit}
					name="volume-unit"
				/>
			</div>
			<div
				style="display:flex;gap:11px;align-items:flex-start;background:{palette.card};border:1px dashed {palette.inkMuted}55;border-radius:14px;padding:13px 14px;margin-top:16px;"
			>
				<div style="color:{palette.accent};flex-shrink:0;margin-top:1px;">
					<Icon name="alert" size={18} strokeWidth={1.8} />
				</div>
				<div style="font-size:12.5px;color:{palette.inkMuted};line-height:1.35;">
					Don't know it? Switch to <b style="color:{palette.ink};">Calculate it</b> and we'll work it
					out from length × width × depth.
				</div>
			</div>
		{:else}
			<VolumeCalculator
				shape={app.shape}
				volumeUnit={app.volumeUnit}
				onapply={applyCalculatedVolume}
			/>
		{/if}
	</div>
	<OnbFooter next="Next →" to="/onboarding/details" />
</div>
