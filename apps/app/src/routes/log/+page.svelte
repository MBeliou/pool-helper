<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { formatReading, parameterByKey } from '$lib/pool/chemistry';
	import { dayLabel, formatTimeCompact } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { listTests } from '$lib/pool/db/testsRepository';
	import { insertAction, listActions } from '$lib/pool/db/actionsRepository';
	import { listIssues } from '$lib/pool/db/issuesRepository';
	import { goto } from '$app/navigation';
	import {
		deleteTester,
		insertTester,
		listTesters,
		type StoredTester
	} from '$lib/pool/db/testersRepository';
	import { TESTERS, TESTER_TYPE_LABELS } from '$lib/pool/data';
	import TesterForm from '$lib/pool/components/TesterForm.svelte';
	import type { TestRow } from '$lib/pool/db/schema';
	import { SvelteSet } from 'svelte/reactivity';

	const palette = $derived(theme.palette);

	// ── first-visit tester setup — replaces the journal until confirmed ──
	let storedTesters = $state<StoredTester[]>([]);
	const pickedCatalogue = new SvelteSet<string>();
	let customFormOpen = $state(false);

	const canConfirmSetup = $derived(pickedCatalogue.size > 0 || storedTesters.length > 0);

	function toggleCatalogueTester(testerName: string) {
		if (pickedCatalogue.has(testerName)) pickedCatalogue.delete(testerName);
		else pickedCatalogue.add(testerName);
	}

	async function onCustomTesterSaved() {
		customFormOpen = false;
		storedTesters = await listTesters();
	}

	async function removeStoredTester(testerId: number) {
		await deleteTester(testerId);
		storedTesters = await listTesters();
	}

	async function confirmTesterSetup() {
		if (!canConfirmSetup) return;
		// picked catalogue kits become rows too — one list, one source of truth
		for (const catalogueTester of TESTERS) {
			if (pickedCatalogue.has(catalogueTester.name)) {
				await insertTester(catalogueTester.name, catalogueTester.measures, catalogueTester.type);
			}
		}
		storedTesters = await listTesters();
		app.tester = storedTesters[0]?.name ?? app.tester;
		app.testerSetupDone = true;
		await app.save();
		// straight into logging the first test — the journal is empty at this point
		await goto('/log/new');
	}

	interface JournalEntry {
		kind: 'test' | 'action';
		at: Date;
		title: string;
		summary: string;
		testId?: number;
	}

	let entries = $state<JournalEntry[]>([]);
	let loaded = $state(false);

	function testSummary(test: TestRow): string {
		const parts: string[] = [];
		if (test.ph !== null) parts.push(`pH ${formatReading(test.ph, parameterByKey.ph.decimals)}`);
		if (test.freeChlorine !== null) parts.push(`FC ${formatReading(test.freeChlorine, 1)} ppm`);
		if (test.totalAlkalinity !== null)
			parts.push(`TA ${formatReading(test.totalAlkalinity, 0)} ${test.totalAlkalinityUnit}`);
		if (test.calciumHardness !== null)
			parts.push(`CH ${formatReading(test.calciumHardness, 0)} ${test.calciumHardnessUnit}`);
		if (test.cyanuricAcid !== null) parts.push(`CYA ${formatReading(test.cyanuricAcid, 0)} ppm`);
		return parts.length ? parts.join(' · ') : 'No readings';
	}

	async function refreshJournal() {
		const [tests, actions, issues] = await Promise.all([listTests(), listActions(), listIssues()]);
		const issueTitleById = new Map(issues.map((issue) => [issue.id, issue.title]));
		const testEntries: JournalEntry[] = tests.map((test) => ({
			kind: 'test',
			at: test.testedAt,
			title: `Water test · ${test.tester}`,
			summary: testSummary(test),
			testId: test.id
		}));
		const actionEntries: JournalEntry[] = actions.map((action) => ({
			kind: 'action',
			at: action.performedAt,
			title: action.title,
			summary: action.issueId
				? `Fixing: ${issueTitleById.get(action.issueId) ?? 'an issue'}`
				: (action.detail ?? 'Action')
		}));
		entries = [...testEntries, ...actionEntries].sort(
			(left, right) => right.at.getTime() - left.at.getTime()
		);
		loaded = true;
	}

	onMount(async () => {
		await app.load();
		storedTesters = await listTesters();
		await refreshJournal();
	});

	/** group consecutive entries by calendar day for section headers */
	const groupedByDay = $derived.by(() => {
		const groups: { label: string; entries: JournalEntry[] }[] = [];
		for (const entry of entries) {
			const label = dayLabel(entry.at);
			const lastGroup = groups[groups.length - 1];
			if (lastGroup && lastGroup.label === label) lastGroup.entries.push(entry);
			else groups.push({ label, entries: [entry] });
		}
		return groups;
	});

	// "add an action" sheet
	let sheetOpen = $state(false);
	let actionTitle = $state('');

	async function saveAction() {
		const title = actionTitle.trim();
		if (!title) return;
		await insertAction({ performedAt: new Date(), title });
		actionTitle = '';
		sheetOpen = false;
		await refreshJournal();
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader
		large
		title="Log"
		sub={loaded && !app.testerSetupDone
			? 'First, tell us what you test with'
			: 'Tests and actions on your pool'}
	/>
	{#if loaded && !app.testerSetupDone}
		<!-- first visit: which testers does the user own? (incl. custom kits) -->
		<div class="scroll" style="padding:16px 18px 16px;">
			<div style="font-size:14px;color:{palette.inkMuted};line-height:1.4;margin-bottom:14px;">
				Pick the kits you own — the test form will show exactly what each one reads.
			</div>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
				<!-- the user's own kits come first — already saved, shown as owned -->
				{#each storedTesters as stored (stored.id)}
					<div
						style="position:relative;text-align:left;background:{palette.card};border-radius:18px;padding:14px 13px 15px;box-shadow:{palette.shadow};border:2px solid {palette.accent};display:flex;flex-direction:column;justify-content:space-between;gap:8px;min-height:96px;"
					>
						<span
							style="position:absolute;top:11px;right:11px;width:20px;height:20px;border-radius:999px;background:{palette.accent};color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;"
							>✓</span
						>
						<div
							style="font-weight:700;font-size:15px;color:{palette.ink};line-height:1.15;padding-right:26px;"
						>
							{stored.name}
						</div>
						<div style="font-size:12px;color:{palette.inkMuted};padding-right:30px;">
							{stored.measures.length} readings · {TESTER_TYPE_LABELS[stored.type]}
						</div>
						<button
							onclick={() => removeStoredTester(stored.id)}
							aria-label="Remove {stored.name}"
							style="position:absolute;bottom:8px;right:8px;width:26px;height:26px;border-radius:999px;background:{palette.page};border:1px solid {palette.line};display:grid;place-items:center;color:{palette.inkMuted};padding:0;"
						>
							<Icon name="close" size={13} strokeWidth={2.2} />
						</button>
					</div>
				{/each}
				{#each TESTERS as catalogueTester (catalogueTester.name)}
					{@const picked = pickedCatalogue.has(catalogueTester.name)}
					<button
						onclick={() => toggleCatalogueTester(catalogueTester.name)}
						aria-pressed={picked}
						style="text-align:left;background:{palette.card};border-radius:18px;padding:14px 13px 15px;box-shadow:{palette.shadow};border:2px solid {picked
							? palette.accent
							: 'transparent'};position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:8px;min-height:96px;"
					>
						{#if picked}
							<span
								style="position:absolute;top:11px;right:11px;width:20px;height:20px;border-radius:999px;background:{palette.accent};color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;"
								>✓</span
							>
						{/if}
						<div
							style="font-weight:700;font-size:15px;color:{palette.ink};line-height:1.15;padding-right:26px;"
						>
							{catalogueTester.name}
						</div>
						<div style="font-size:12px;color:{palette.inkMuted};">
							{catalogueTester.description}
						</div>
					</button>
				{/each}
			</div>
			{#if customFormOpen}
				<div
					style="background:{palette.card};border-radius:18px;padding:16px 15px;box-shadow:{palette.shadow};margin-bottom:16px;"
				>
					<TesterForm onsaved={onCustomTesterSaved} oncancel={() => (customFormOpen = false)} />
				</div>
			{:else}
				<button
					onclick={() => (customFormOpen = true)}
					style="width:100%;background:transparent;border-radius:16px;border:2px dashed {palette.inkMuted}66;padding:14px;display:flex;justify-content:center;align-items:center;gap:8px;color:{palette.inkMuted};font-family:var(--font-sans);font-weight:600;font-size:14px;margin-bottom:16px;"
				>
					<Icon name="plus" size={17} strokeWidth={2} />Create your own tester
				</button>
			{/if}
			<button
				onclick={confirmTesterSetup}
				disabled={!canConfirmSetup}
				style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;opacity:{canConfirmSetup
					? 1
					: 0.5};">Save my testers →</button
			>
		</div>
		<TabBar />
	{:else}
		<div class="scroll" style="padding:16px 18px 16px;">
			<!-- log new results CTA -->
			<a
				href="/log/new"
				style="display:flex;align-items:center;gap:13px;background:{palette.accent};border-radius:18px;padding:15px 16px;margin-bottom:10px;"
			>
				<div
					style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.2);display:grid;place-items:center;color:#fff;flex-shrink:0;"
				>
					<Icon name="beaker" size={22} strokeWidth={1.8} />
				</div>
				<div style="flex:1;">
					<div style="font-weight:800;font-size:16px;color:#fff;">Log new results</div>
					<div style="font-size:12.5px;color:rgba(255,255,255,.85);">Strips, drops or meter</div>
				</div>
				<Icon name="plus" size={22} color="#fff" strokeWidth={2.2} />
			</a>
			<!-- add an action -->
			<button
				onclick={() => (sheetOpen = true)}
				style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:{palette.card};border:none;border-radius:15px;padding:13px;box-shadow:{palette.shadow};font-family:var(--font-sans);font-weight:700;font-size:14px;color:{palette.ink};margin-bottom:20px;"
			>
				<Icon name="spark" size={17} color={palette.accent} strokeWidth={1.9} />Add an action
			</button>

			{#each groupedByDay as group (group.label)}
				<div
					style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin:14px 2px 8px;"
				>
					{group.label}
				</div>
				<div style="display:flex;flex-direction:column;gap:9px;">
					{#each group.entries as entry (entry.kind + '-' + (entry.testId ?? entry.at.getTime()))}
						{#if entry.kind === 'test'}
							<a
								href="/log/test?id={entry.testId}"
								style="display:flex;align-items:center;gap:12px;background:{palette.card};border-radius:16px;padding:12px 14px;box-shadow:{palette.shadow};"
							>
								<div
									style="width:38px;height:38px;border-radius:11px;background:{palette.accent}17;display:grid;place-items:center;color:{palette.accent};flex-shrink:0;"
								>
									<Icon name="beaker" size={19} strokeWidth={1.8} />
								</div>
								<div style="flex:1;min-width:0;">
									<div style="font-weight:700;font-size:14.5px;color:{palette.ink};">
										{entry.title}
									</div>
									<div
										style="font-size:12px;color:{palette.inkMuted};margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
									>
										{entry.summary}
									</div>
								</div>
								<span style="font-size:11.5px;color:{palette.inkMuted};flex-shrink:0;"
									>{formatTimeCompact(entry.at)}</span
								>
								<Icon name="chevron" size={15} color={palette.inkMuted} strokeWidth={2} />
							</a>
						{:else}
							<div
								style="display:flex;align-items:center;gap:12px;background:{palette.card};border-radius:16px;padding:12px 14px;box-shadow:{palette.shadow};"
							>
								<div
									style="width:38px;height:38px;border-radius:11px;background:{palette.status
										.ok}17;display:grid;place-items:center;color:{palette.status.ok};flex-shrink:0;"
								>
									<Icon name="check" size={19} strokeWidth={1.8} />
								</div>
								<div style="flex:1;min-width:0;">
									<div style="font-weight:700;font-size:14.5px;color:{palette.ink};">
										{entry.title}
									</div>
									<div style="font-size:12px;color:{palette.inkMuted};margin-top:1px;">
										{entry.summary}
									</div>
								</div>
								<span style="font-size:11.5px;color:{palette.inkMuted};flex-shrink:0;"
									>{formatTimeCompact(entry.at)}</span
								>
							</div>
						{/if}
					{/each}
				</div>
			{/each}
			{#if loaded && entries.length === 0}
				<div
					style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};"
				>
					Nothing logged yet — run your first test or note an action.
				</div>
			{/if}
		</div>
		<TabBar />
	{/if}

	{#if sheetOpen}
		<!-- scrim -->
		<div
			style="position:fixed;inset:0;background:rgba(8,20,28,.35);z-index:40;"
			onclick={() => (sheetOpen = false)}
			onkeydown={(event) => event.key === 'Escape' && (sheetOpen = false)}
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
				style="font-family:var(--font-display);font-weight:600;font-size:19px;color:{palette.ink};margin-bottom:3px;"
			>
				Add an action
			</div>
			<div style="font-size:12.5px;color:{palette.inkMuted};margin-bottom:12px;">
				What did you do? e.g. "Added 1 kg Cal-Hypo", "Backwashed filter"
			</div>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				autofocus
				enterkeyhint="done"
				placeholder="Describe the action"
				bind:value={actionTitle}
				onkeydown={(event) => event.key === 'Enter' && saveAction()}
				style="width:100%;padding:13px 14px;border-radius:13px;border:1.5px solid {palette.line};background:{palette.page};font-family:var(--font-sans);font-size:15px;color:{palette.ink};outline:none;caret-color:{palette.accent};margin-bottom:12px;"
			/>
			<button
				onclick={saveAction}
				disabled={!actionTitle.trim()}
				style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:14px;border-radius:14px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;opacity:{actionTitle.trim()
					? 1
					: 0.5};">Save action</button
			>
		</div>
	{/if}
</div>
