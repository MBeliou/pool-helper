<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import {
		computeFixPlan,
		doseTextFor,
		repriceAction,
		type DeferredFix,
		type FixAction,
		type InRangeReading
	} from '$lib/pool/fixPlan';
	import type { DosingProduct } from '$lib/pool/dosing';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getLatestTest } from '$lib/pool/db/testsRepository';
	import { completedPlanParameterKeys, insertAction } from '$lib/pool/db/actionsRepository';

	const palette = $derived(theme.palette);

	interface ActionDisplay extends FixAction {
		expanded: boolean;
		done: boolean;
		/** the "Show the math" disclosure inside the expanded card */
		mathOpen: boolean;
	}

	let actions = $state<ActionDisplay[]>([]);
	let inRange = $state<InRangeReading[]>([]);
	let deferred = $state<DeferredFix[]>([]);
	let warnings = $state<string[]>([]);
	let requestInput = $state<string[]>([]);
	let loaded = $state(false);
	// the test this plan derives from — keys the persisted step completions
	let planTestId = $state<number | null>(null);

	onMount(async () => {
		await app.load();
		const latestTest = await getLatestTest();
		planTestId = latestTest?.id ?? null;
		const fixPlan = computeFixPlan(latestTest, {
			volume: app.volume,
			volumeUnit: app.volumeUnit,
			hardnessUnit: app.hardnessUnit,
			surface: app.surface,
			sanitiser: app.sanitiser,
			location: app.location,
			sunExposure: app.sunExposure
		});
		// completions persist per (test, parameter) — reopening shows steps still checked
		const completedKeys =
			planTestId === null ? new Set<string>() : await completedPlanParameterKeys(planTestId);
		const firstPendingIndex = fixPlan.actions.findIndex((action) => !completedKeys.has(action.key));
		actions = fixPlan.actions.map((action, actionIndex) => ({
			...action,
			expanded: actionIndex === firstPendingIndex,
			done: completedKeys.has(action.key),
			mathOpen: false
		}));
		inRange = fixPlan.inRange;
		deferred = fixPlan.deferred;
		warnings = fixPlan.warnings;
		requestInput = fixPlan.requestInput;
		loaded = true;
		if (actions.length > 0 && !app.disclaimerAcceptedAt) disclaimerOpen = true;
	});

	// dosing disclaimer — shown once, acceptance stored on the profile
	let disclaimerOpen = $state(false);

	async function acceptDisclaimer() {
		disclaimerOpen = false;
		await app.acceptDoseDisclaimer();
	}

	const pendingCount = $derived(actions.filter((action) => !action.done).length);
	const planSubtitle = $derived(
		!loaded
			? '…'
			: pendingCount === 0
				? 'Nothing to do'
				: `${pendingCount} action${pendingCount === 1 ? '' : 's'} · ~${pendingCount * 5} min`
	);

	// product picker sheet for the action being edited
	let sheetAction = $state<ActionDisplay | null>(null);

	function pickProduct(product: DosingProduct) {
		if (product.disabledReason || !sheetAction) return;
		const repriced = repriceAction(sheetAction, product, app.hardnessUnit);
		sheetAction.productName = repriced.productName;
		sheetAction.doseText = repriced.doseText;
		sheetAction.mathRows = repriced.mathRows;
		sheetAction = null;
	}

	function toggleExpanded(action: ActionDisplay) {
		if (!action.done) action.expanded = !action.expanded;
	}

	// completed plan steps land in the /log journal — keyed by (test, parameter)
	// in the DB, so repeat taps and revisits can never journal a step twice
	async function journalCompletedAction(action: ActionDisplay) {
		await insertAction({
			performedAt: new Date(),
			title: action.doseText
				? `${action.title} · added ${action.doseText.replace('Add ', '')} of ${action.productName}`
				: action.title,
			detail: 'From fix plan',
			sourceTestId: planTestId,
			parameterKey: action.key
		});
	}

	function toggleDone(action: ActionDisplay) {
		action.done = !action.done;
		if (action.done) {
			action.expanded = false;
			journalCompletedAction(action);
		}
	}

	async function markAllDone() {
		for (const action of actions) {
			if (!action.done) {
				action.done = true;
				await journalCompletedAction(action);
			}
		}
		goto('/');
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Fix plan" sub={planSubtitle} />
	<div class="scroll" style="padding:14px 16px 0;">
		{#if loaded && actions.length === 0 && warnings.length === 0}
			<div
				style="display:flex;align-items:center;gap:10px;background:{palette.status
					.ok}14;border-radius:13px;padding:11px 13px;margin-bottom:14px;"
			>
				<div style="color:{palette.status.ok};flex-shrink:0;">
					<Icon name="shield" size={20} strokeWidth={1.8} />
				</div>
				<div style="font-size:13px;color:{palette.ink};line-height:1.3;">
					Your water's <b>balanced</b> — nothing to add today.
				</div>
			</div>
		{:else if loaded}
			<div
				style="display:flex;align-items:center;gap:10px;background:{palette.accent}12;border-radius:13px;padding:11px 13px;margin-bottom:14px;"
			>
				<div style="color:{palette.accent};flex-shrink:0;">
					<Icon name="wave" size={20} strokeWidth={1.8} />
				</div>
				<div style="font-size:13px;color:{palette.ink};line-height:1.3;">
					{actions.length === 1
						? "Today's step — do it, then retest before anything else."
						: 'These are safe to do now. Anything they disturb waits below.'}
				</div>
			</div>
		{/if}
		<div style="display:flex;flex-direction:column;gap:11px;">
			{#each actions as action (action.key)}
				{@const actionColor = statusColor(palette, action.status)}
				<div
					style="background:{palette.card};border-radius:18px;box-shadow:{palette.shadow};border:1.5px solid {action.expanded
						? `${actionColor}55`
						: 'transparent'};overflow:hidden;"
				>
					<div
						style="display:flex;align-items:center;gap:12px;padding:13px 14px;"
						onclick={() => toggleExpanded(action)}
						onkeydown={(event) => event.key === 'Enter' && toggleExpanded(action)}
						role="button"
						tabindex="0"
					>
						<button
							onclick={(event) => {
								event.stopPropagation();
								toggleDone(action);
							}}
							aria-label="Mark done"
							style="width:24px;height:24px;border-radius:999px;border:{action.done
								? 'none'
								: `2px solid ${palette.inkMuted}66`};background:{action.done
								? palette.status.ok
								: 'transparent'};display:grid;place-items:center;flex-shrink:0;padding:0;"
						>
							{#if action.done}<span
									style="color:#fff;font-size:13px;font-weight:800;line-height:1;">✓</span
								>{/if}
						</button>
						<div
							style="width:38px;height:38px;border-radius:11px;background:{actionColor}1f;display:grid;place-items:center;color:{actionColor};flex-shrink:0;"
						>
							<Icon name={action.icon} size={20} strokeWidth={1.8} />
						</div>
						<div style="flex:1;min-width:0;">
							<div
								style="font-weight:700;font-size:15.5px;color:{action.done
									? palette.inkMuted
									: palette.ink};text-decoration:{action.done ? 'line-through' : 'none'};"
							>
								{action.title}
							</div>
							<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:1px;">
								{action.rangeText}
							</div>
						</div>
						{#if action.doseText && !action.expanded}
							<!-- collapsed glance chip; when expanded the dose lives in step 1 -->
							<span
								style="font-family:var(--font-display);font-weight:600;font-size:13.5px;color:#fff;background:{actionColor};padding:6px 11px;border-radius:10px;white-space:nowrap;"
								>{action.doseText}</span
							>
						{/if}
						{#if !action.done}
							<Icon
								name="chevron"
								size={16}
								color={palette.inkMuted}
								strokeWidth={2}
								style="transform:{action.expanded ? 'rotate(90deg)' : 'none'};flex-shrink:0;"
							/>
						{/if}
					</div>
					{#if action.expanded}
						<div style="padding:2px 14px 15px;border-top:1px solid {palette.line};">
							{#if action.why}
								<div
									style="font-size:13px;color:{palette.ink};line-height:1.45;padding:11px 0 4px;"
								>
									{action.why}
								</div>
							{/if}
							<!-- numbered steps: for doses, step 1 welds the amount to the product -->
							<div style="display:flex;flex-direction:column;gap:9px;padding:10px 0 2px;">
								{#if action.doseText && action.productName}
									<div style="display:flex;align-items:center;gap:10px;">
										<div
											style="width:22px;height:22px;border-radius:999px;background:{palette.accent}1a;color:{palette.accent};display:grid;place-items:center;font-size:12px;font-weight:800;flex-shrink:0;"
										>
											1
										</div>
										<div style="flex:1;font-size:13.5px;color:{palette.ink};line-height:1.4;">
											Add <b style="color:{palette.accent};"
												>{action.doseText.replace('Add ', '')}</b
											>
											of
											<button
												onclick={() => (sheetAction = action)}
												style="display:inline-flex;align-items:center;gap:4px;font-family:var(--font-sans);font-weight:700;font-size:13px;color:{palette.ink};background:{palette.page};border:1px solid {palette.line};padding:3px 8px;border-radius:8px;vertical-align:baseline;"
											>
												{action.productName}<Icon
													name="chevron"
													size={11}
													color={palette.inkMuted}
													strokeWidth={2.2}
													style="transform:rotate(90deg);"
												/>
											</button>
										</div>
									</div>
								{/if}
								{#each action.followUpSteps as step, stepIndex (step)}
									<div style="display:flex;align-items:center;gap:10px;">
										<div
											style="width:22px;height:22px;border-radius:999px;background:{palette.inkMuted}18;color:{palette.inkMuted};display:grid;place-items:center;font-size:12px;font-weight:800;flex-shrink:0;"
										>
											{stepIndex + (action.doseText && action.productName ? 2 : 1)}
										</div>
										<div style="flex:1;font-size:13.5px;color:{palette.ink};line-height:1.4;">
											{step}
										</div>
									</div>
								{/each}
							</div>
							{#if action.mathRows.length > 0}
								<button
									onclick={() => (action.mathOpen = !action.mathOpen)}
									style="display:flex;align-items:center;gap:5px;background:none;border:none;padding:10px 0 2px;font-family:var(--font-sans);font-size:12.5px;font-weight:700;color:{palette.inkMuted};"
								>
									Show the math<Icon
										name="chevron"
										size={12}
										color={palette.inkMuted}
										strokeWidth={2.2}
										style="transform:{action.mathOpen ? 'rotate(90deg)' : 'none'};"
									/>
								</button>
								{#if action.mathOpen}
									{#each action.mathRows as [mathLabel, mathValue] (mathLabel + mathValue)}
										<div
											style="display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:4px 0;color:{palette.inkMuted};"
										>
											<span style="flex-shrink:0;">{mathLabel}</span><span
												style="color:{palette.ink};font-family:var(--font-display);text-align:right;"
												>{mathValue}</span
											>
										</div>
									{/each}
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			{/each}
			{#each warnings as warning (warning)}
				<!-- consequence notes: what happens if the water stays like this -->
				<div
					style="display:flex;gap:10px;align-items:flex-start;background:{palette.status
						.high}12;border-radius:13px;padding:11px 13px;"
				>
					<div style="color:{palette.status.high};flex-shrink:0;margin-top:1px;">
						<Icon name="alert" size={18} strokeWidth={1.9} />
					</div>
					<div style="font-size:13px;color:{palette.ink};line-height:1.4;">{warning}</div>
				</div>
			{/each}
			{#if deferred.length > 0}
				<div
					style="font-size:12px;color:{palette.inkMuted};font-weight:800;text-transform:uppercase;letter-spacing:0.6px;margin:6px 2px 0;"
				>
					After you retest
				</div>
				{#each deferred as deferredFix (deferredFix.key + deferredFix.title)}
					<div
						style="display:flex;align-items:flex-start;gap:12px;background:{palette.card};border-radius:16px;box-shadow:{palette.shadow};padding:12px 14px;opacity:0.75;"
					>
						<div
							style="width:34px;height:34px;border-radius:10px;background:{palette.inkMuted}18;display:grid;place-items:center;color:{palette.inkMuted};flex-shrink:0;"
						>
							<Icon name="alert" size={17} strokeWidth={1.8} />
						</div>
						<div style="flex:1;min-width:0;">
							<div style="font-weight:700;font-size:14.5px;color:{palette.ink};">
								{deferredFix.title}
							</div>
							<div
								style="font-size:12.5px;color:{palette.inkMuted};margin-top:2px;line-height:1.35;"
							>
								{deferredFix.reason}
							</div>
						</div>
					</div>
				{/each}
			{/if}
			{#each inRange as reading (reading.key)}
				<div
					style="display:flex;align-items:center;gap:12px;background:{palette.card};border-radius:18px;box-shadow:{palette.shadow};padding:13px 14px;"
				>
					<div
						style="width:24px;height:24px;border-radius:999px;background:{palette.status
							.ok};display:grid;place-items:center;flex-shrink:0;"
					>
						<span style="color:#fff;font-size:13px;font-weight:800;line-height:1;">✓</span>
					</div>
					<div
						style="width:38px;height:38px;border-radius:11px;background:{palette.status
							.ok}1f;display:grid;place-items:center;color:{palette.status.ok};flex-shrink:0;"
					>
						<Icon name={reading.icon} size={20} strokeWidth={1.8} />
					</div>
					<div style="flex:1;min-width:0;">
						<div style="font-weight:700;font-size:15.5px;color:{palette.inkMuted};">
							{reading.title}
						</div>
						<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:1px;">
							{reading.rangeText}
						</div>
					</div>
					<span style="font-size:12.5px;color:{palette.status.ok};font-weight:700;">OK</span>
				</div>
			{/each}
		</div>
		{#if requestInput.length > 0}
			<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
				{#each requestInput as inputHint (inputHint)}
					<div
						style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:{palette.inkMuted};line-height:1.4;"
					>
						<div style="flex-shrink:0;margin-top:1px;">
							<Icon name="beaker" size={15} strokeWidth={1.8} />
						</div>
						<span>Next test: {inputHint}</span>
					</div>
				{/each}
			</div>
		{/if}
		{#if actions.length > 0}
			<div style="font-size:11.5px;color:{palette.inkMuted};line-height:1.35;margin-top:12px;">
				Doses are guidance, not gospel — always check your product's label before adding anything.
			</div>
		{/if}
	</div>
	<div style="padding:10px 16px 12px;flex-shrink:0;">
		<button
			onclick={() => (pendingCount === 0 ? goto('/') : markAllDone())}
			style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;"
			>{pendingCount === 0 ? 'Back to my pool' : 'Mark all done'}</button
		>
	</div>
	<TabBar />

	{#if disclaimerOpen}
		<!-- dosing disclaimer (first visit with actions) -->
		<div style="position:fixed;inset:0;background:rgba(8,20,28,.45);z-index:60;"></div>
		<div
			style="position:fixed;left:0;right:0;bottom:0;z-index:70;background:{palette.card};border-radius:26px 26px 0 0;padding:10px 18px calc(var(--safe-bottom) + 14px);box-shadow:0 -8px 30px rgba(0,0,0,.18);"
		>
			<div
				style="width:40px;height:5px;border-radius:999px;background:{palette.line};margin:0 auto 14px;"
			></div>
			<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
				<div
					style="width:36px;height:36px;border-radius:11px;background:{palette.status
						.high}1f;display:grid;place-items:center;color:{palette.status.high};flex-shrink:0;"
				>
					<Icon name="alert" size={19} strokeWidth={1.9} />
				</div>
				<div
					style="font-family:var(--font-display);font-weight:600;font-size:19px;color:{palette.ink};"
				>
					Before you dose
				</div>
			</div>
			<div style="font-size:13.5px;color:{palette.inkMuted};line-height:1.45;margin-bottom:14px;">
				Suggested amounts are guidance based on your readings and pool volume. Product strengths
				vary — always verify against your product's label, add in stages, and never mix chemicals
				directly.
			</div>
			<button
				onclick={acceptDisclaimer}
				style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:14px;border-radius:14px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;"
				>I understand</button
			>
		</div>
	{/if}

	{#if sheetAction}
		<!-- scrim -->
		<div
			style="position:fixed;inset:0;background:rgba(8,20,28,.35);z-index:40;"
			onclick={() => (sheetAction = null)}
			onkeydown={(event) => event.key === 'Escape' && (sheetAction = null)}
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
				{sheetAction.title}
			</div>
			<div style="font-size:12.5px;color:{palette.inkMuted};margin-bottom:12px;">
				Amount updates to match what you use
			</div>
			<div style="display:flex;flex-direction:column;gap:8px;">
				{#each sheetAction.productOptions as product (product.name)}
					{@const selected = sheetAction.productName === product.name}
					{@const doseLabel = product.disabledReason
						? product.disabledReason
						: (sheetAction.doseRequest && doseTextFor(sheetAction.doseRequest, product)) || '—'}
					<button
						onclick={() => pickProduct(product)}
						disabled={Boolean(product.disabledReason)}
						style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-radius:14px;background:{selected
							? `${palette.accent}12`
							: palette.page};border:1.5px solid {selected
							? palette.accent
							: palette.line};opacity:{product.disabledReason ? 0.5 : 1};"
					>
						<div style="text-align:left;">
							<div style="font-weight:700;font-size:15px;color:{palette.ink};">
								{product.name}
							</div>
							<div
								style="font-size:12.5px;color:{selected
									? palette.accent
									: palette.inkMuted};margin-top:1px;font-family:{product.disabledReason
									? 'var(--font-sans)'
									: 'var(--font-display)'};font-weight:{selected ? 700 : 500};"
							>
								{doseLabel}
							</div>
						</div>
						{#if selected}
							<div
								style="width:24px;height:24px;border-radius:999px;background:{palette.accent};display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;"
							>
								✓
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
