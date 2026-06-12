<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { TESTERS } from '$lib/pool/data';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import ComingSoonSheet from '$lib/pool/components/ComingSoonSheet.svelte';
	import { countTests } from '$lib/pool/db/testsRepository';
	import { clearLoggedData, seedBalancedPool, seedProblemPool } from '$lib/pool/db/demoData';

	const palette = $derived(theme.palette);

	let testCount = $state(0);
	let seedStatus = $state('');
	let addPoolSheetOpen = $state(false);

	onMount(async () => {
		await app.load();
		testCount = await countTests();
	});

	const volumeUnitShort: Record<string, string> = { litres: 'L', gallons: 'gal', 'm³': 'm³' };
	const presetShort = $derived(app.unitsPreset.split(' ')[0]);

	const profileSummary = $derived(
		[app.shape, app.surface.toLowerCase(), app.sanitiser.toLowerCase(), app.filter.toLowerCase()].join(' · ')
	);
	const reminderSummary = $derived(
		app.reminderDays === 1 ? 'Test every day' : `Test every ${app.reminderDays} days`
	);

	const settingsGroups: {
		heading: string;
		rows: { title: string; subtitle: string; href: string }[];
	}[] = $derived([
		{
			heading: 'Setup',
			rows: [
				{ title: 'Pool profile', subtitle: profileSummary, href: '/more/profile' },
				{
					title: 'My testers',
					subtitle: `${TESTERS.length} saved · using ${app.tester}`,
					href: '/more/testers'
				},
				{
					title: 'Units & region',
					subtitle: `${presetShort} · ${app.hardnessUnit}`,
					href: '/more/units'
				}
			]
		},
		{
			heading: 'Stock & schedule',
			rows: [
				{ title: 'Reminders', subtitle: reminderSummary, href: '/more/reminders' },
				{
					title: 'History log',
					subtitle: testCount === 1 ? '1 test' : `${testCount} tests`,
					href: '/log'
				},
				{ title: 'Guides & tips', subtitle: '', href: '/more/guides' }
			]
		}
	]);

	async function runSeed(seed: () => Promise<void>, label: string) {
		seedStatus = 'Loading…';
		await seed();
		testCount = await countTests();
		seedStatus = label;
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader large title="More" sub="Pool, settings and tools" />
	<div class="scroll" style="padding:16px 18px 16px;display:flex;flex-direction:column;gap:14px;">
		<!-- My pools -->
		<div style="display:flex;flex-direction:column;gap:6px;">
			<span
				style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
				>My pools</span
			>
			<div
				style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
			>
				<a
					href="/more/profile"
					style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;"
				>
					<div>
						<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">{app.name}</div>
						<div style="font-size:11.5px;color:{palette.inkMuted};">
							{app.volume}
							{volumeUnitShort[app.volumeUnit] ?? app.volumeUnit} · active
						</div>
					</div>
					<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
				</a>
				<button
					onclick={() => (addPoolSheetOpen = true)}
					style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
				>
					<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">Add a pool</div>
					<Icon name="plus" size={15} color={palette.inkMuted} strokeWidth={2} />
				</button>
			</div>
		</div>
		<!-- settings groups -->
		{#each settingsGroups as group (group.heading)}
			<div style="display:flex;flex-direction:column;gap:6px;">
				<span
					style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
					>{group.heading}</span
				>
				<div
					style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
				>
					{#each group.rows as row, rowIndex (row.title)}
						<a
							href={row.href}
							style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border-top:{rowIndex
								? `1px solid ${palette.line}`
								: 'none'};"
						>
							<div>
								<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
									{row.title}
								</div>
								{#if row.subtitle}
									<div style="font-size:11.5px;color:{palette.inkMuted};">{row.subtitle}</div>
								{/if}
							</div>
							<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
						</a>
					{/each}
				</div>
			</div>
		{/each}
		<!-- Developer -->
		<div style="display:flex;flex-direction:column;gap:6px;">
			<span
				style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
				>Developer{seedStatus ? ` · ${seedStatus}` : ''}</span
			>
			<div
				style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
			>
				<button
					onclick={() => runSeed(seedProblemPool, 'Problem pool loaded')}
					style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:none;border:none;text-align:left;font-family:var(--font-sans);"
				>
					<div>
						<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
							Load demo data · problem pool
						</div>
						<div style="font-size:11.5px;color:{palette.inkMuted};">
							A month of drifting chemistry + care issues
						</div>
					</div>
					<Icon name="beaker" size={15} color={palette.inkMuted} strokeWidth={2} />
				</button>
				<button
					onclick={() => runSeed(seedBalancedPool, 'Balanced pool loaded')}
					style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
				>
					<div>
						<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
							Load demo data · balanced pool
						</div>
						<div style="font-size:11.5px;color:{palette.inkMuted};">
							Three steady weeks, nothing to fix
						</div>
					</div>
					<Icon name="shield" size={15} color={palette.inkMuted} strokeWidth={2} />
				</button>
				<button
					onclick={() => runSeed(clearLoggedData, 'Logged data cleared')}
					style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
				>
					<div>
						<div style="font-size:14.5px;color:{palette.status.low};font-weight:600;">
							Clear logged data
						</div>
						<div style="font-size:11.5px;color:{palette.inkMuted};">
							Deletes tests, actions and issues · keeps your profile
						</div>
					</div>
					<Icon name="close" size={15} color={palette.inkMuted} strokeWidth={2} />
				</button>
			</div>
		</div>
	</div>
	<TabBar />
	<ComingSoonSheet
		bind:open={addPoolSheetOpen}
		message="Managing several pools (and a hot tub!) is on the roadmap. Everything currently tracks your one active pool."
	/>
</div>
