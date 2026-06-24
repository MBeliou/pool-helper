<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { VOLUME_UNITS, convertVolume } from '$lib/pool/units';
	import { formatNumber, sanitizeDecimalInput } from '$lib/pool/localeFormat';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import ShapeGrid from '$lib/pool/components/ShapeGrid.svelte';
	import UnitSelect from '$lib/pool/components/UnitSelect.svelte';
	import VolumeCalculator from '$lib/pool/components/VolumeCalculator.svelte';
	import Pill from '$lib/pool/components/onboarding/Pill.svelte';

	const palette = $derived(theme.palette);

	onMount(() => app.load());

	let calculatorOpen = $state(false);
	// editing buffer for the text field; app.volume holds the parsed number. m³ is
	// shown ungrouped so its decimal can't collide with a thousands separator.
	let previousVolumeUnit = app.volumeUnit;
	const formatVolumeText = (volume: number) => formatNumber(volume, app.volumeUnit !== 'm³');
	let volumeText = $state(app.volume === null ? '' : formatVolumeText(app.volume));

	function applyCalculatedVolume(volume: number) {
		app.volume = volume;
		volumeText = formatVolumeText(volume);
		app.save();
		calculatorOpen = false;
	}

	const detailGroups: {
		heading: string;
		options: string[];
		get: () => string;
		set: (selected: string) => void;
	}[] = [
		{
			heading: 'Surface',
			options: ['Plaster', 'Vinyl', 'Fibreglass', 'Tile'],
			get: () => app.surface,
			set: (selected) => (app.surface = selected)
		},
		{
			heading: 'Sanitiser',
			options: ['Chlorine', 'Salt (SWG)', 'Bromine'],
			get: () => app.sanitiser,
			set: (selected) => (app.sanitiser = selected)
		},
		{
			heading: 'Filter media',
			options: ['Sand', 'Glass', 'Cartridge', 'D.E.', 'Cotton balls'],
			get: () => app.filter,
			set: (selected) => (app.filter = selected)
		}
	];

	function pickOption(group: (typeof detailGroups)[number], option: string) {
		group.set(option);
		app.save();
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

	function saveName() {
		if (!app.name.trim()) app.name = 'My pool';
		app.name = app.name.trim();
		app.save();
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Pool profile" sub="Changes apply to advice and doses" />
	<div class="scroll" style="padding:16px 18px 24px;display:flex;flex-direction:column;gap:18px;">
		<!-- name -->
		<div>
			<label
				for="pool-name"
				style="display:block;font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:9px;"
				>Name</label
			>
			<input
				id="pool-name"
				type="text"
				enterkeyhint="done"
				bind:value={app.name}
				onblur={saveName}
				onkeydown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
				maxlength="40"
				style="width:100%;padding:13px 14px;border-radius:13px;border:1.5px solid {palette.line};background:{palette.card};font-family:var(--font-sans);font-weight:600;font-size:15px;color:{palette.ink};outline:none;caret-color:{palette.accent};"
			/>
		</div>
		<!-- shape -->
		<div>
			<div style="font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:9px;">
				Shape
			</div>
			<ShapeGrid bind:value={app.shape} onchange={() => app.save()} />
		</div>
		<!-- volume -->
		<div>
			<label
				for="pool-volume"
				style="display:block;font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:9px;"
				>Total volume</label
			>
			<div
				style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:{palette.card};border:1.5px solid {palette.line};border-radius:15px;padding:12px 14px;box-shadow:{palette.shadow};"
			>
				<input
					id="pool-volume"
					type="text"
					inputmode={app.volumeUnit === 'm³' ? 'decimal' : 'numeric'}
					enterkeyhint="done"
					bind:value={() => volumeText, (newValue) => onVolumeInput(newValue)}
					onblur={formatVolume}
					onkeydown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
					style="flex:1;min-width:0;border:none;background:transparent;outline:none;font-family:var(--font-display);font-weight:600;font-size:24px;color:{palette.ink};caret-color:{palette.accent};padding:0;"
				/>
				<UnitSelect
					options={VOLUME_UNITS}
					bind:value={app.volumeUnit}
					onchange={changeVolumeUnit}
					name="volume-unit"
				/>
			</div>
			<button
				onclick={() => (calculatorOpen = !calculatorOpen)}
				style="background:none;border:none;padding:8px 2px 0;font-family:var(--font-sans);font-size:13px;font-weight:700;color:{palette.accent};"
				>{calculatorOpen ? 'Hide calculator' : 'Calculate from dimensions'}</button
			>
			{#if calculatorOpen}
				<div style="margin-top:10px;">
					<VolumeCalculator
						shape={app.shape}
						volumeUnit={app.volumeUnit}
						onapply={applyCalculatedVolume}
					/>
				</div>
			{/if}
		</div>
		<!-- details -->
		{#each detailGroups as group (group.heading)}
			<div>
				<div style="font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:9px;">
					{group.heading}
				</div>
				<div style="display:flex;flex-wrap:wrap;gap:8px;">
					{#each group.options as option (option)}
						<Pill
							label={option}
							selected={group.get() === option}
							onclick={() => pickOption(group, option)}
						/>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<TabBar />
</div>
