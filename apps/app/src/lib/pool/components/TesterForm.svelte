<script lang="ts">
	import { theme } from '../state/theme.svelte';
	import {
		ALL_READING_KEYS,
		READING_LABELS,
		TESTER_TYPE_LABELS,
		type ReadingKey,
		type TesterType
	} from '../data';
	import { insertTester } from '../db/testersRepository';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		onsaved,
		oncancel
	}: {
		/** called with the new tester's name after it's stored */
		onsaved: (name: string) => void;
		oncancel?: () => void;
	} = $props();

	const palette = $derived(theme.palette);

	let testerName = $state('');
	// strips is the conservative default — the engine will trust its readings least
	let pickedType = $state<TesterType>('strips');
	const pickedKeys = new SvelteSet<ReadingKey>();
	let saving = $state(false);

	const TESTER_TYPES: TesterType[] = ['strips', 'drops', 'meter'];

	const canSave = $derived(testerName.trim().length > 0 && pickedKeys.size > 0 && !saving);

	function toggleKey(key: ReadingKey) {
		if (pickedKeys.has(key)) pickedKeys.delete(key);
		else pickedKeys.add(key);
	}

	async function save() {
		if (!canSave) return;
		saving = true;
		const name = testerName.trim();
		// keep panel order canonical regardless of tap order
		const measures = ALL_READING_KEYS.filter((key) => pickedKeys.has(key));
		await insertTester(name, measures, pickedType);
		onsaved(name);
	}
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
	<div>
		<label
			for="tester-name"
			style="display:block;font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:8px;"
			>Name your tester</label
		>
		<input
			id="tester-name"
			type="text"
			maxlength="30"
			placeholder="e.g. My 4-in-1 strips"
			bind:value={testerName}
			style="width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid {palette.line};background:{palette.card};font-family:var(--font-sans);font-weight:600;font-size:15px;color:{palette.ink};outline:none;caret-color:{palette.accent};"
		/>
	</div>
	<div>
		<div style="font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:8px;">
			What kind of kit is it?
		</div>
		<div style="display:flex;gap:8px;">
			{#each TESTER_TYPES as testerType (testerType)}
				{@const picked = pickedType === testerType}
				<button
					onclick={() => (pickedType = testerType)}
					aria-pressed={picked}
					style="flex:1;padding:9px 10px;border-radius:999px;font-family:var(--font-sans);font-size:13.5px;font-weight:{picked
						? 700
						: 500};background:{picked ? `${palette.accent}15` : palette.card};color:{picked
						? palette.accent
						: palette.ink};border:1.5px solid {picked ? palette.accent : palette.line};"
					>{TESTER_TYPE_LABELS[testerType]}</button
				>
			{/each}
		</div>
	</div>
	<div>
		<div style="font-size:13px;color:{palette.inkMuted};font-weight:700;margin-bottom:8px;">
			What does it read?
		</div>
		<div style="display:flex;flex-wrap:wrap;gap:8px;">
			{#each ALL_READING_KEYS as key (key)}
				{@const picked = pickedKeys.has(key)}
				<button
					onclick={() => toggleKey(key)}
					aria-pressed={picked}
					style="padding:9px 14px;border-radius:999px;font-family:var(--font-sans);font-size:13.5px;font-weight:{picked
						? 700
						: 500};background:{picked ? `${palette.accent}15` : palette.card};color:{picked
						? palette.accent
						: palette.ink};border:1.5px solid {picked ? palette.accent : palette.line};"
					>{READING_LABELS[key]}</button
				>
			{/each}
		</div>
	</div>
	<div style="display:flex;gap:10px;">
		{#if oncancel}
			<button
				onclick={oncancel}
				style="padding:13px 18px;border-radius:13px;border:none;font-family:var(--font-sans);font-weight:700;font-size:14.5px;color:{palette.inkMuted};background:{palette.page};"
				>Cancel</button
			>
		{/if}
		<button
			onclick={save}
			disabled={!canSave}
			style="flex:1;text-align:center;padding:13px;border-radius:13px;border:none;font-family:var(--font-sans);font-weight:700;font-size:14.5px;color:#fff;background:{palette.accent};opacity:{canSave
				? 1
				: 0.5};">Save tester</button
		>
	</div>
</div>
