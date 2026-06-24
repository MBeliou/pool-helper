<script lang="ts">
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import OnbTop from '$lib/pool/components/onboarding/OnbTop.svelte';
	import OnbFooter from '$lib/pool/components/onboarding/OnbFooter.svelte';
	import OnbTitle from '$lib/pool/components/onboarding/OnbTitle.svelte';
	import Pill from '$lib/pool/components/onboarding/Pill.svelte';

	const palette = $derived(theme.palette);

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
</script>

<div class="screen" style="background:{palette.page};">
	<OnbTop step={3} label="Step 3 of 4 · Pool details" />
	<div class="scroll" style="padding:20px 22px 0;">
		<OnbTitle sub="These change the chemistry advice">A few<br />specifics</OnbTitle>
		<div style="display:flex;flex-direction:column;gap:18px;">
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
	</div>
	<OnbFooter next="Next →" to="/onboarding/units" />
</div>
