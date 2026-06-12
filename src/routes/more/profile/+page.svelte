<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { VOLUME_UNITS } from '$lib/pool/units';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import ShapeGrid from '$lib/pool/components/ShapeGrid.svelte';
	import UnitSelect from '$lib/pool/components/UnitSelect.svelte';
	import Pill from '$lib/pool/components/onboarding/Pill.svelte';

	const palette = $derived(theme.palette);

	onMount(() => app.load());

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

	function sanitizeVolume(rawValue: string): string {
		return rawValue.replace(/[^0-9]/g, '').slice(0, 7);
	}

	function formatVolume() {
		const digits = app.volume.replace(/[^0-9]/g, '');
		if (digits) app.volume = Number(digits).toLocaleString('en-US');
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
					inputmode="numeric"
					enterkeyhint="done"
					bind:value={() => app.volume, (newValue) => (app.volume = sanitizeVolume(newValue))}
					onblur={formatVolume}
					onkeydown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
					style="flex:1;min-width:0;border:none;background:transparent;outline:none;font-family:var(--font-display);font-weight:600;font-size:24px;color:{palette.ink};caret-color:{palette.accent};padding:0;"
				/>
				<UnitSelect
					options={VOLUME_UNITS}
					bind:value={app.volumeUnit}
					onchange={() => app.save()}
					name="volume-unit"
				/>
			</div>
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
