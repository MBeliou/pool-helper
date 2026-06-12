<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { daysSince, formatShortDate, hoursSince, isToday } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import SymptomGlyph from '$lib/pool/components/SymptomGlyph.svelte';
	import { getLatestTest } from '$lib/pool/db/testsRepository';
	import type { TestRow } from '$lib/pool/db/schema';

	const palette = $derived(theme.palette);
	const step = $derived(Number(page.params.step) || 1);

	// step 3 · freshness of the latest logged test
	let latestTest = $state<TestRow | undefined>(undefined);
	let testLoaded = $state(false);

	onMount(async () => {
		await app.load();
		latestTest = await getLatestTest();
		testLoaded = true;
	});

	const testIsStale = $derived(!latestTest || daysSince(latestTest.testedAt) >= 2);
	const testAgeText = $derived.by(() => {
		if (!latestTest) return '';
		const days = daysSince(latestTest.testedAt);
		if (days >= 1) return `${days} day${days === 1 ? '' : 's'} old`;
		return `${Math.max(1, Math.round(hoursSince(latestTest.testedAt)))}h old`;
	});
	const testDateText = $derived(
		!latestTest ? '' : isToday(latestTest.testedAt) ? 'today' : formatShortDate(latestTest.testedAt)
	);

	// step 1 · symptoms (multi-select)
	const symptoms = [
		{ kind: 'cloudy', label: 'Cloudy' },
		{ kind: 'green', label: 'Green tint' },
		{ kind: 'algae', label: 'Algae' },
		{ kind: 'eye', label: 'Eye sting' },
		{ kind: 'smell', label: 'Strong smell' },
		{ kind: 'foam', label: 'Foamy' }
	];
	let pickedSymptoms = $state<string[]>(['cloudy']);
	function toggleSymptom(kind: string) {
		pickedSymptoms = pickedSymptoms.includes(kind)
			? pickedSymptoms.filter((picked) => picked !== kind)
			: [...pickedSymptoms, kind];
	}

	// step 2 · clarifying questions
	let questions = $state([
		{ prompt: 'Milky-white or hazy-blue?', options: ['Milky white', 'Hazy blue'], selected: 0 },
		{ prompt: 'Shocked in the last 48h?', options: ['Yes', 'No', 'Not sure'], selected: 1 },
		{ prompt: 'How long like this?', options: ['<1 day', '2–4 days', 'A week+'], selected: 1 }
	]);

	// step 4 · ranked causes
	const causes = [
		{
			title: 'Low chlorine + high pH',
			likelihood: 'Most likely',
			percent: 78,
			status: 'low',
			fix: 'Shock + lower pH'
		},
		{
			title: 'Weak filtration',
			likelihood: 'Possible',
			percent: 41,
			status: 'high',
			fix: 'Run pump 8h+'
		},
		{
			title: 'High calcium hardness',
			likelihood: 'Less likely',
			percent: 18,
			status: 'info',
			fix: 'Partial drain'
		}
	];

	const stepHeadings: Record<number, { title: string; sub: string }> = {
		1: { title: 'What do you notice?', sub: 'Pick all that apply' },
		2: { title: 'A few details', sub: 'Cloudy water' },
		3: { title: 'Test first?', sub: 'Cloudy water' },
		4: { title: 'Likely causes', sub: 'Based on a fresh test · ranked' }
	};
</script>

<div class="screen" style="background:{palette.page};">
	<!-- wizard header on the water gradient -->
	<div
		style="flex-shrink:0;background:{palette.gradient};color:{palette.onGradient};position:relative;padding:0 18px 30px;"
	>
		<div class="safe-top"></div>
		<div style="display:flex;align-items:center;gap:14px;padding:2px 0 14px;">
			<button
				onclick={() => goto('/care')}
				aria-label="Close"
				style="width:34px;height:34px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);display:grid;place-items:center;flex-shrink:0;padding:0;"
			>
				<Icon name="close" size={17} color="#fff" strokeWidth={2} />
			</button>
			<div style="flex:1;display:flex;gap:5px;">
				{#each [1, 2, 3, 4] as wizardStep (wizardStep)}
					<div
						style="flex:1;height:5px;border-radius:999px;background:{wizardStep <= step
							? '#fff'
							: 'rgba(255,255,255,.25)'};"
					></div>
				{/each}
			</div>
		</div>
		<div>
			<div
				style="font-family:var(--font-display);font-weight:600;font-size:25px;letter-spacing:-0.4px;"
			>
				{stepHeadings[step].title}
			</div>
			<div style="font-size:13px;opacity:0.85;margin-top:4px;">
				{stepHeadings[step].sub}
			</div>
		</div>
		<svg
			viewBox="0 0 400 26"
			preserveAspectRatio="none"
			style="position:absolute;bottom:-1px;left:0;width:100%;height:26px;display:block;"
		>
			<path
				d="M0 14 C 60 2 120 24 200 14 C 280 4 340 24 400 12 L400 26 L0 26 Z"
				fill={palette.page}
			/>
		</svg>
	</div>

	{#if step === 1}
		<div class="scroll" style="padding:16px 18px 0;">
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;">
				{#each symptoms as symptom (symptom.kind)}
					{@const selected = pickedSymptoms.includes(symptom.kind)}
					<button
						onclick={() => toggleSymptom(symptom.kind)}
						style="display:flex;align-items:center;gap:12px;background:{selected
							? `${palette.accent}10`
							: palette.card};border-radius:16px;padding:16px 15px;box-shadow:{selected
							? 'none'
							: palette.shadow};border:2px solid {selected
							? palette.accent
							: 'transparent'};position:relative;"
					>
						<SymptomGlyph
							kind={symptom.kind}
							color={selected ? palette.accent : palette.inkMuted}
						/>
						<span
							style="font-weight:700;font-size:15px;color:{selected
								? palette.accent
								: palette.ink};">{symptom.label}</span
						>
						{#if selected}
							<div
								style="position:absolute;top:9px;right:9px;width:19px;height:19px;border-radius:999px;background:{palette.accent};color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;"
							>
								✓
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
		<div
			style="flex-shrink:0;display:flex;gap:12px;padding:12px 18px calc(var(--safe-bottom) + 16px);"
		>
			<button
				onclick={() => goto('/care/diagnose/2')}
				style="flex:1;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:#fff;background:{palette.accent};"
				>Next →</button
			>
		</div>
	{:else if step === 2}
		<div class="scroll" style="padding:18px 18px 0;">
			<div style="display:flex;flex-direction:column;gap:20px;">
				{#each questions as question (question.prompt)}
					<div>
						<div style="font-size:15.5px;font-weight:700;color:{palette.ink};margin-bottom:10px;">
							{question.prompt}
						</div>
						<div style="display:flex;flex-wrap:wrap;gap:8px;">
							{#each question.options as option, optionIndex (option)}
								{@const selected = optionIndex === question.selected}
								<button
									onclick={() => (question.selected = optionIndex)}
									style="padding:10px 16px;border-radius:999px;font-family:var(--font-sans);font-size:14px;font-weight:{selected
										? 700
										: 500};background:{selected
										? `${palette.accent}15`
										: palette.card};color:{selected
										? palette.accent
										: palette.ink};border:1.5px solid {selected
										? palette.accent
										: palette.line};box-shadow:{selected ? 'none' : palette.shadow};"
									>{option}</button
								>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div
			style="flex-shrink:0;display:flex;gap:12px;padding:12px 18px calc(var(--safe-bottom) + 16px);"
		>
			<button
				onclick={() => history.back()}
				style="padding:15px 22px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:{palette.inkMuted};background:{palette.card};box-shadow:{palette.shadow};"
				>Back</button
			>
			<button
				onclick={() => goto('/care/diagnose/3')}
				style="flex:1;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:#fff;background:{palette.accent};"
				>Next →</button
			>
		</div>
	{:else if step === 3}
		<div class="scroll" style="padding:18px 18px 0;">
			{#if testLoaded && !latestTest}
				<div
					style="display:flex;align-items:flex-start;gap:12px;background:{palette.status
						.high}16;border:1px solid {palette.status
						.high}40;border-radius:15px;padding:14px 15px;margin-bottom:22px;"
				>
					<div style="color:{palette.status.high};flex-shrink:0;margin-top:1px;">
						<Icon name="alert" size={20} strokeWidth={1.9} />
					</div>
					<div style="font-size:13.5px;color:{palette.ink};line-height:1.35;">
						You haven't logged a test yet — fresh readings make the diagnosis much more accurate.
					</div>
				</div>
			{:else if testLoaded && latestTest && testIsStale}
				<div
					style="display:flex;align-items:flex-start;gap:12px;background:{palette.status
						.high}16;border:1px solid {palette.status
						.high}40;border-radius:15px;padding:14px 15px;margin-bottom:22px;"
				>
					<div style="color:{palette.status.high};flex-shrink:0;margin-top:1px;">
						<Icon name="alert" size={20} strokeWidth={1.9} />
					</div>
					<div style="font-size:13.5px;color:{palette.ink};line-height:1.35;">
						Your last test is <b>{testAgeText}</b>. Diagnosing on stale numbers can point us the
						wrong way.
					</div>
				</div>
			{:else if testLoaded && latestTest}
				<div
					style="display:flex;align-items:flex-start;gap:12px;background:{palette.status
						.ok}14;border:1px solid {palette.status
						.ok}33;border-radius:15px;padding:14px 15px;margin-bottom:22px;"
				>
					<div style="color:{palette.status.ok};flex-shrink:0;margin-top:1px;">
						<Icon name="shield" size={20} strokeWidth={1.9} />
					</div>
					<div style="font-size:13.5px;color:{palette.ink};line-height:1.35;">
						Your last test is <b>{testAgeText}</b> — recent enough to diagnose from.
					</div>
				</div>
			{/if}
			<div
				style="font-size:12.5px;font-weight:700;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;"
			>
				Recommended
			</div>
			{#if testIsStale}
				<button
					onclick={() => goto('/log/new')}
					style="width:100%;display:flex;align-items:center;justify-content:center;gap:9px;background:{palette.accent};color:#fff;padding:16px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;margin-bottom:18px;"
				>
					<Icon name="plus" size={20} color="#fff" strokeWidth={2.2} />Log a fresh test
				</button>
				{#if latestTest}
					<div
						style="display:flex;align-items:center;gap:12px;color:{palette.inkMuted};font-size:12.5px;margin-bottom:18px;"
					>
						<div style="flex:1;height:1px;background:{palette.line};"></div>
						or
						<div style="flex:1;height:1px;background:{palette.line};"></div>
					</div>
					<button
						onclick={() => goto('/care/diagnose/4')}
						style="width:100%;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;color:{palette.ink};background:{palette.card};box-shadow:{palette.shadow};"
						>Continue with test from {testDateText}</button
					>
				{/if}
			{:else}
				<button
					onclick={() => goto('/care/diagnose/4')}
					style="width:100%;display:flex;align-items:center;justify-content:center;gap:9px;background:{palette.accent};color:#fff;padding:16px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;margin-bottom:18px;"
				>
					Continue with test from {testDateText} →
				</button>
				<div
					style="display:flex;align-items:center;gap:12px;color:{palette.inkMuted};font-size:12.5px;margin-bottom:18px;"
				>
					<div style="flex:1;height:1px;background:{palette.line};"></div>
					or
					<div style="flex:1;height:1px;background:{palette.line};"></div>
				</div>
				<button
					onclick={() => goto('/log/new')}
					style="width:100%;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;color:{palette.ink};background:{palette.card};box-shadow:{palette.shadow};"
					>Log a fresh test anyway</button
				>
			{/if}
		</div>
		<div
			style="flex-shrink:0;display:flex;gap:12px;padding:12px 18px calc(var(--safe-bottom) + 16px);"
		>
			<button
				onclick={() => history.back()}
				style="padding:15px 22px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:{palette.inkMuted};background:{palette.card};box-shadow:{palette.shadow};"
				>Back</button
			>
		</div>
	{:else}
		<div class="scroll" style="padding:16px 18px 0;">
			<div style="display:flex;flex-direction:column;gap:11px;">
				{#each causes as cause, causeIndex (cause.title)}
					{@const causeColor = statusColor(palette, cause.status)}
					<div
						style="background:{causeIndex === 0
							? `${palette.accent}0d`
							: palette.card};border-radius:16px;padding:14px 15px;box-shadow:{causeIndex === 0
							? 'none'
							: palette.shadow};border:1.5px solid {causeIndex === 0
							? palette.accent
							: 'transparent'};"
					>
						<div style="display:flex;justify-content:space-between;align-items:center;">
							<span
								style="font-size:11.5px;font-weight:800;color:{causeColor};text-transform:uppercase;letter-spacing:0.5px;"
								>{cause.likelihood}</span
							>
							<span
								style="font-family:var(--font-display);font-weight:600;font-size:17px;color:{causeColor};"
								>{cause.percent}%</span
							>
						</div>
						<div style="font-weight:700;font-size:15.5px;color:{palette.ink};margin:4px 0 8px;">
							{cause.title}
						</div>
						<div style="height:6px;background:{palette.line};border-radius:999px;">
							<div
								style="width:{cause.percent}%;height:100%;background:{causeColor};border-radius:999px;"
							></div>
						</div>
						<div style="display:flex;gap:7px;margin-top:9px;">
							<span style="font-size:12.5px;color:{palette.inkMuted};">Fix:</span><span
								style="font-size:12.5px;font-weight:700;color:{palette.ink};">{cause.fix}</span
							>
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div
			style="flex-shrink:0;display:flex;gap:12px;padding:12px 18px calc(var(--safe-bottom) + 16px);"
		>
			<button
				onclick={() => history.back()}
				style="padding:15px 22px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:{palette.inkMuted};background:{palette.card};box-shadow:{palette.shadow};"
				>Back</button
			>
			<button
				onclick={() => goto('/care/timeline')}
				style="flex:1;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;color:#fff;background:{palette.accent};"
				>Start a fix plan →</button
			>
		</div>
	{/if}
</div>
