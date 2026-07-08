<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { billing } from '$lib/pool/billing/revenuecat.svelte';
	import { TESTERS } from '$lib/pool/data';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import ComingSoonSheet from '$lib/pool/components/ComingSoonSheet.svelte';
	import { countTests } from '$lib/pool/db/testsRepository';
	import {
		GUIDANCE_SCENARIOS,
		clearLoggedData,
		seedBalancedPool,
		seedProblemPool,
		seedSingleTest,
		wipeAllData,
		type DemoScenario
	} from '$lib/pool/db/demoData';
	import { cancelTestReminder, sendTestNotificationNow } from '$lib/pool/reminders';
	import { shareExport } from '$lib/pool/dataExport';
	import { formatNumber } from '$lib/pool/localeFormat';

	const palette = $derived(theme.palette);

	let testCount = $state(0);
	let seedStatus = $state('');
	let addPoolSheetOpen = $state(false);

	onMount(async () => {
		await app.load();
		testCount = await countTests();
	});

	const volumeUnitShort: Record<string, string> = { litres: 'L' }; // others are short already
	const presetShort = $derived(app.unitsPreset.split(' ')[0]);

	const profileSummary = $derived(
		[
			app.shape,
			app.surface.toLowerCase(),
			app.sanitiser.toLowerCase(),
			app.filter.toLowerCase()
		].join(' · ')
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

	// scenario seeders also rewrite the profile row — re-hydrate the in-memory state
	function runScenario(seed: () => Promise<void>, label: string) {
		return runSeed(async () => {
			await seed();
			await app.reloadProfile();
		}, label);
	}

	function runGuidanceScenario(scenario: DemoScenario) {
		return runScenario(scenario.load, `${scenario.title} loaded`);
	}

	// Fire a one-off notification ~5s out to verify on-device delivery.
	async function fireTestNotification() {
		const scheduled = await sendTestNotificationNow();
		seedStatus = scheduled
			? 'Notification in ~5s · background the app to see it'
			: 'Allow notifications first (Reminders screen)';
	}

	// Re-run onboarding without losing data: clear the onboarded flag and send the
	// user back to the welcome screen (existing values pre-fill each step).
	async function replayOnboarding() {
		try {
			app.onboarded = false;
			await app.save();
			await goto('/onboarding/welcome');
		} catch (error) {
			console.error('replay onboarding failed', error);
			app.onboarded = true; // revert the in-memory flag so it can't desync from the DB
			seedStatus = 'Could not replay onboarding';
		}
	}

	// Full reset to a fresh-install state, then hard reload so the (now empty) DB
	// re-initializes with no profile → the onboarding gate fires.
	let resetting = $state(false);
	async function deleteAllData() {
		if (resetting) return;
		resetting = true;
		seedStatus = 'Resetting…';
		try {
			await wipeAllData();
			await cancelTestReminder();
			// drop the pre-SQLite localStorage import keys (mirror LEGACY_*_KEY in
			// app.svelte.ts) so the wiped profile isn't re-imported on the next load
			localStorage.removeItem('ph.profile');
			localStorage.removeItem('ph.onboarded');
			// reset the DB single-flight + reload; re-init finds no profile → onboarding
			app.retryLoad();
		} catch (error) {
			console.error('reset failed', error);
			seedStatus = 'Reset failed';
			resetting = false; // re-enable the button so the user can retry
		}
	}

	let restoreStatus = $state('');

	async function restorePurchases() {
		restoreStatus = 'Restoring…';
		const restored = await billing.restore();
		restoreStatus = restored ? 'Pro restored' : 'Nothing to restore';
	}

	let exportStatus = $state('');

	async function exportData() {
		exportStatus = 'Preparing…';
		try {
			await shareExport();
			exportStatus = '';
		} catch (error) {
			console.error('data export failed', error);
			exportStatus = 'Export failed';
		}
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
							{app.volume === null ? '—' : formatNumber(app.volume)}
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
		<!-- My Pool Pro -->
		<div style="display:flex;flex-direction:column;gap:6px;">
			<span
				style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
				>Subscription{restoreStatus ? ` · ${restoreStatus}` : ''}</span
			>
			<div
				style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
			>
				{#if billing.isPro}
					<!-- active subscriber: manage via Customer Center -->
					<div
						style="display:flex;justify-content:space-between;align-items:center;padding:12px 15px;"
					>
						<div>
							<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">My Pool Pro</div>
							<div style="font-size:11.5px;color:{palette.status.ok};font-weight:600;">Active</div>
						</div>
						<Icon name="shield" size={16} color={palette.status.ok} strokeWidth={2} />
					</div>
					<button
						onclick={() => billing.presentCustomerCenter()}
						style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
					>
						<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
							Manage subscription
						</div>
						<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
					</button>
				{:else}
					<!-- not subscribed: open the RevenueCat paywall -->
					<button
						onclick={() => billing.presentPaywall()}
						disabled={!billing.supported}
						style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:none;border:none;text-align:left;font-family:var(--font-sans);opacity:{billing.supported
							? 1
							: 0.55};"
					>
						<div>
							<div style="font-size:14.5px;color:{palette.accent};font-weight:700;">
								Unlock My Pool Pro
							</div>
							<div style="font-size:11.5px;color:{palette.inkMuted};">
								{billing.supported
									? 'Guided rescue plans, coaching & more'
									: 'Available on the iOS app'}
							</div>
						</div>
						<Icon name="chevron" size={15} color={palette.accent} strokeWidth={2} />
					</button>
				{/if}
				{#if billing.supported}
					<button
						onclick={restorePurchases}
						style="width:100%;display:flex;justify-content:flex-start;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
					>
						<div style="font-size:14.5px;color:{palette.inkMuted};font-weight:600;">
							Restore purchases
						</div>
					</button>
				{/if}
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
		<!-- Data -->
		<div style="display:flex;flex-direction:column;gap:6px;">
			<span
				style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
				>Data{exportStatus ? ` · ${exportStatus}` : ''}</span
			>
			<div
				style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
			>
				<button
					onclick={exportData}
					style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:none;border:none;text-align:left;font-family:var(--font-sans);"
				>
					<div>
						<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">Export my data</div>
						<div style="font-size:11.5px;color:{palette.inkMuted};">
							A JSON backup of your profile, tests, log and issues
						</div>
					</div>
					<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
				</button>
			</div>
		</div>
		<!-- Developer — dev builds only; vite strips this from production output -->
		{#if import.meta.env.DEV}
			<div style="display:flex;flex-direction:column;gap:6px;">
				<span
					style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
					>Developer{seedStatus ? ` · ${seedStatus}` : ''}</span
				>
				<div
					style="background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};overflow:hidden;"
				>
					<button
						onclick={() => runScenario(seedProblemPool, 'Problem pool loaded')}
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
						onclick={() => runScenario(seedBalancedPool, 'Balanced pool loaded')}
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
					{#each GUIDANCE_SCENARIOS as scenario (scenario.id)}
						<button
							onclick={() => runGuidanceScenario(scenario)}
							style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
						>
							<div>
								<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
									Load scenario · {scenario.title}
								</div>
								<div style="font-size:11.5px;color:{palette.inkMuted};">
									{scenario.description}
								</div>
							</div>
							<Icon name="beaker" size={15} color={palette.inkMuted} strokeWidth={2} />
						</button>
					{/each}
					<button
						onclick={() => runSeed(seedSingleTest, 'Sample test logged')}
						style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
					>
						<div>
							<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
								Log one sample test (today)
							</div>
							<div style="font-size:11.5px;color:{palette.inkMuted};">
								Appends a single mid-range reading dated now
							</div>
						</div>
						<Icon name="plus" size={15} color={palette.inkMuted} strokeWidth={2} />
					</button>
					<button
						onclick={fireTestNotification}
						style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
					>
						<div>
							<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
								Send a test notification (5s)
							</div>
							<div style="font-size:11.5px;color:{palette.inkMuted};">
								Fires once in ~5s · background the app to see the banner
							</div>
						</div>
						<Icon name="alert" size={15} color={palette.inkMuted} strokeWidth={2} />
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
					<button
						onclick={replayOnboarding}
						style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);"
					>
						<div>
							<div style="font-size:14.5px;color:{palette.ink};font-weight:600;">
								Replay onboarding (keep data)
							</div>
							<div style="font-size:11.5px;color:{palette.inkMuted};">
								Clears the onboarded flag and reopens the welcome flow
							</div>
						</div>
						<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
					</button>
					<button
						onclick={deleteAllData}
						disabled={resetting}
						style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 15px;border:none;border-top:1px solid {palette.line};background:none;text-align:left;font-family:var(--font-sans);opacity:{resetting
							? 0.6
							: 1};"
					>
						<div>
							<div style="font-size:14.5px;color:{palette.status.low};font-weight:600;">
								Delete all my data & restart
							</div>
							<div style="font-size:11.5px;color:{palette.inkMuted};">
								Wipes everything incl. your profile, then replays onboarding
							</div>
						</div>
						<Icon name="close" size={15} color={palette.status.low} strokeWidth={2} />
					</button>
				</div>
			</div>
		{/if}
	</div>
	<TabBar />
	<ComingSoonSheet
		bind:open={addPoolSheetOpen}
		message="Managing several pools (and a hot tub!) is on the roadmap. Everything currently tracks your one active pool."
	/>
</div>
