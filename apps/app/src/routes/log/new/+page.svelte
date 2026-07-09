<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { TESTERS, testerIcon, READING_LABELS } from '$lib/pool/data';
	import { listTesters, type StoredTester } from '$lib/pool/db/testersRepository';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import TesterForm from '$lib/pool/components/TesterForm.svelte';

	const palette = $derived(theme.palette);

	// the user's stored testers; catalogue as fallback for pre-setup installs
	let storedTesters = $state<StoredTester[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		storedTesters = await listTesters();
		loaded = true;
	});

	// stored rows first; catalogue for pre-setup installs; the last-used tester
	// always offered even without a row (demo/migration profiles)
	const testerChoices = $derived.by(() => {
		const choices =
			storedTesters.length > 0
				? storedTesters.map((stored) => ({
						name: stored.name,
						icon: testerIcon(stored.name),
						description:
							TESTERS.find((catalogueTester) => catalogueTester.name === stored.name)
								?.description ?? stored.measures.map((key) => READING_LABELS[key]).join(' · ')
					}))
				: TESTERS.map((catalogueTester) => ({
						name: catalogueTester.name,
						icon: catalogueTester.icon,
						description: catalogueTester.description
					}));
		if (!choices.some((choice) => choice.name === app.tester)) {
			choices.unshift({
				name: app.tester,
				icon: testerIcon(app.tester),
				description:
					TESTERS.find((catalogueTester) => catalogueTester.name === app.tester)?.description ??
					'Current tester'
			});
		}
		return choices;
	});

	function pickTester(testerName: string) {
		app.tester = testerName;
		app.save();
		goto('/log/entry');
	}

	// create a custom tester right from the picker
	let addSheetOpen = $state(false);

	async function onTesterSaved(name: string) {
		addSheetOpen = false;
		storedTesters = await listTesters();
		pickTester(name);
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Log a test" sub="Which tester did you use?" />
	<div class="scroll" style="padding:16px 16px 0;">
		<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
			{#if loaded}
				{#each testerChoices as tester (tester.name)}
					{@const selected = app.tester === tester.name}
					<button
						onclick={() => pickTester(tester.name)}
						style="text-align:left;background:{palette.card};border-radius:18px;padding:14px 13px 15px;box-shadow:{palette.shadow};border:2px solid {selected
							? palette.accent
							: 'transparent'};position:relative;"
					>
						{#if selected}
							<span
								style="position:absolute;top:11px;right:11px;font-size:10px;font-weight:700;color:{palette.accent};background:{palette.accent}1a;padding:3px 7px;border-radius:999px;"
								>LAST USED</span
							>
						{/if}
						<div
							style="width:42px;height:42px;border-radius:13px;background:{palette.accent}17;display:grid;place-items:center;color:{palette.accent};margin-bottom:12px;"
						>
							<Icon name={tester.icon} size={22} strokeWidth={1.8} />
						</div>
						<div style="font-weight:700;font-size:15px;color:{palette.ink};line-height:1.15;">
							{tester.name}
						</div>
						<div style="font-size:12px;color:{palette.inkMuted};margin-top:2px;">
							{tester.description}
						</div>
					</button>
				{/each}
			{/if}
			<!-- add a tester: name it and pick what it reads -->
			<button
				onclick={() => (addSheetOpen = true)}
				style="background:transparent;border-radius:18px;border:2px dashed {palette.inkMuted}66;padding:14px 13px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;color:{palette.inkMuted};min-height:116px;"
			>
				<div
					style="width:38px;height:38px;border-radius:999px;border:2px solid {palette.inkMuted}66;display:grid;place-items:center;"
				>
					<Icon name="plus" size={20} strokeWidth={2} />
				</div>
				<span style="font-size:13px;font-weight:600;">Add a tester</span>
			</button>
		</div>
	</div>
	<TabBar />

	{#if addSheetOpen}
		<!-- scrim -->
		<div
			style="position:fixed;inset:0;background:rgba(8,20,28,.35);z-index:40;"
			onclick={() => (addSheetOpen = false)}
			onkeydown={(event) => event.key === 'Escape' && (addSheetOpen = false)}
			role="button"
			tabindex="-1"
			aria-label="Close"
		></div>
		<!-- sheet -->
		<div
			style="position:fixed;left:0;right:0;bottom:0;z-index:50;background:{palette.card};border-radius:26px 26px 0 0;padding:10px 18px calc(var(--safe-bottom) + 14px);box-shadow:0 -8px 30px rgba(0,0,0,.18);"
		>
			<div
				style="width:40px;height:5px;border-radius:999px;background:{palette.line};margin:0 auto 14px;"
			></div>
			<div
				style="font-family:var(--font-display);font-weight:600;font-size:19px;color:{palette.ink};margin-bottom:12px;"
			>
				Add a tester
			</div>
			<TesterForm onsaved={onTesterSaved} oncancel={() => (addSheetOpen = false)} />
		</div>
	{/if}
</div>
