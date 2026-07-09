<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { TESTERS, resolveTesterType, READING_LABELS, TESTER_TYPE_LABELS } from '$lib/pool/data';
	import { deleteTester, listTesters, type StoredTester } from '$lib/pool/db/testersRepository';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import TesterForm from '$lib/pool/components/TesterForm.svelte';

	const palette = $derived(theme.palette);

	// the user's stored testers; catalogue shown read-only for pre-setup installs
	let storedTesters = $state<StoredTester[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		storedTesters = await listTesters();
		loaded = true;
	});

	// stored rows are the user's kits; the catalogue fills in for pre-setup
	// installs, and the in-use tester always shows even without a row (demo/
	// migration profiles reference catalogue names that were never stored)
	const testerCards = $derived.by(() => {
		const cards =
			storedTesters.length > 0
				? storedTesters.map((stored) => ({
						id: stored.id as number | null,
						name: stored.name,
						typeLabel: TESTER_TYPE_LABELS[stored.type],
						description:
							TESTERS.find((catalogueTester) => catalogueTester.name === stored.name)
								?.description ?? stored.measures.map((key) => READING_LABELS[key]).join(' · ')
					}))
				: TESTERS.map((catalogueTester) => ({
						id: null as number | null,
						name: catalogueTester.name,
						typeLabel: TESTER_TYPE_LABELS[catalogueTester.type],
						description: catalogueTester.description
					}));
		if (!cards.some((card) => card.name === app.tester)) {
			cards.unshift({
				id: null,
				name: app.tester,
				typeLabel: TESTER_TYPE_LABELS[resolveTesterType(app.tester, storedTesters)],
				description:
					TESTERS.find((catalogueTester) => catalogueTester.name === app.tester)?.description ??
					'Current tester'
			});
		}
		return cards;
	});

	function pickTester(testerName: string) {
		app.tester = testerName;
		app.save();
	}

	// only stored rows can be deleted, and never the one in use
	async function removeTester(card: { id: number | null; name: string }) {
		if (card.id === null || app.tester === card.name) return;
		await deleteTester(card.id);
		storedTesters = await listTesters();
	}

	let addSheetOpen = $state(false);

	async function onTesterSaved() {
		addSheetOpen = false;
		storedTesters = await listTesters();
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="My testers" sub="The selected one is used for new logs" />
	<div class="scroll" style="padding:16px 16px 0;">
		<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
			{#if loaded}
				{#each testerCards as tester (tester.name)}
					{@const selected = app.tester === tester.name}
					{@const deletable = tester.id !== null && !selected}
					<div style="position:relative;">
						<button
							onclick={() => pickTester(tester.name)}
							style="width:100%;height:100%;text-align:left;background:{palette.card};border-radius:18px;padding:14px 13px 15px;box-shadow:{palette.shadow};border:2px solid {selected
								? palette.accent
								: 'transparent'};display:flex;flex-direction:column;justify-content:space-between;gap:8px;min-height:96px;"
						>
							{#if selected}
								<span
									style="position:absolute;top:11px;right:11px;font-size:10px;font-weight:700;color:{palette.accent};background:{palette.accent}1a;padding:3px 7px;border-radius:999px;"
									>IN USE</span
								>
							{/if}
							<div
								style="font-weight:700;font-size:15px;color:{palette.ink};line-height:1.15;padding-right:{selected
									? '56px'
									: '26px'};"
							>
								{tester.name}
							</div>
							<div>
								<div style="font-size:12px;color:{palette.inkMuted};">
									{tester.description}
								</div>
								<div style="font-size:11px;font-weight:600;color:{palette.inkMuted};margin-top:3px;">
									{tester.typeLabel}
								</div>
							</div>
						</button>
						{#if deletable && !selected}
							<button
								onclick={() => removeTester(tester)}
								aria-label="Delete {tester.name}"
								style="position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:999px;background:{palette.page};border:1px solid {palette.line};display:grid;place-items:center;color:{palette.inkMuted};padding:0;"
							>
								<Icon name="close" size={13} strokeWidth={2.2} />
							</button>
						{/if}
					</div>
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
