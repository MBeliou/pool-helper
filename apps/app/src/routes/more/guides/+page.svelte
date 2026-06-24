<script lang="ts">
	import { theme } from '$lib/pool/state/theme.svelte';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import type { IconName } from '$lib/pool/icons';

	const palette = $derived(theme.palette);

	// static educational copy — the resolution pipeline will own richer content later
	const guides: { title: string; icon: IconName; body: string }[] = [
		{
			title: 'Why pH keeps rising',
			icon: 'drop',
			body: 'Fresh plaster leaches lime for ~12 months, nudging pH up about 0.1 a week. Aeration (waterfalls, jets, splashing) pushes it up too. Expect frequent small acid doses early on — it settles.'
		},
		{
			title: 'Where chlorine goes',
			icon: 'beaker',
			body: 'Sunlight, heat and swimmers all burn through free chlorine. Cyanuric acid (CYA) is sunscreen for chlorine — below ~30 ppm, a sunny afternoon can strip most of it.'
		},
		{
			title: 'When and how to shock',
			icon: 'spark',
			body: "Shock after heavy use, rain, algae or a strong chlorine smell (that's combined chlorine, not too much chlorine). Dose in the evening, run the pump overnight, and don't swim until FC drops back under 5 ppm."
		},
		{
			title: 'Alkalinity is your pH anchor',
			icon: 'wave',
			body: 'Total alkalinity buffers pH swings. Low TA → pH bounces around; high TA → pH drifts up and resists correction. Fix TA first, then chase pH.'
		},
		{
			title: 'Filter care basics',
			icon: 'shield',
			body: 'Backwash sand filters when pressure rises ~0.5 bar over clean baseline. Rinse cartridges monthly in season. A clean filter is half the cure for cloudy water.'
		}
	];

	let expandedTitle = $state<string | null>(null);

	function toggleGuide(title: string) {
		expandedTitle = expandedTitle === title ? null : title;
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Guides &amp; tips" sub="Short reads for common pool questions" />
	<div class="scroll" style="padding:16px 18px 24px;">
		<div style="display:flex;flex-direction:column;gap:10px;">
			{#each guides as guide (guide.title)}
				{@const expanded = expandedTitle === guide.title}
				<div
					style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
				>
					<button
						onclick={() => toggleGuide(guide.title)}
						style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 15px;background:none;border:none;text-align:left;font-family:var(--font-sans);"
					>
						<div
							style="width:36px;height:36px;border-radius:10px;background:{palette.accent}17;display:grid;place-items:center;color:{palette.accent};flex-shrink:0;"
						>
							<Icon name={guide.icon} size={18} strokeWidth={1.8} />
						</div>
						<span style="flex:1;font-weight:700;font-size:14.5px;color:{palette.ink};"
							>{guide.title}</span
						>
						<Icon
							name="chevron"
							size={15}
							color={palette.inkMuted}
							strokeWidth={2}
							style="transform:rotate({expanded ? '-90deg' : '90deg'});"
						/>
					</button>
					{#if expanded}
						<div
							style="padding:0 15px 14px;font-size:13.5px;color:{palette.inkMuted};line-height:1.45;"
						>
							{guide.body}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	<TabBar />
</div>
