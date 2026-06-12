<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import {
		computeFixPlan,
		productDose,
		type FixAction,
		type InRangeReading,
		type ProductOption
	} from '$lib/pool/fixPlan';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getLatestTest } from '$lib/pool/db/testsRepository';

	const palette = $derived(theme.palette);

	interface ActionDisplay extends FixAction {
		expanded: boolean;
		done: boolean;
	}

	let actions = $state<ActionDisplay[]>([]);
	let inRange = $state<InRangeReading[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		const latestTest = await getLatestTest();
		const fixPlan = computeFixPlan(latestTest, {
			volume: app.volume,
			volumeUnit: app.volumeUnit,
			hardnessUnit: app.hardnessUnit
		});
		actions = fixPlan.actions.map((action, actionIndex) => ({
			...action,
			expanded: actionIndex === 0,
			done: false
		}));
		inRange = fixPlan.inRange;
		loaded = true;
	});

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

	function pickProduct(product: ProductOption) {
		if (product.disabledReason || !sheetAction) return;
		sheetAction.productName = product.name;
		sheetAction.doseText = productDose(product, sheetAction.canonicalDelta, sheetAction.cubicMetres);
		sheetAction.mathRows = sheetAction.mathRows.map((row, rowIndex) =>
			rowIndex === 2 ? [product.name, `×${product.dosePerUnitPerCubicMetre} g/m³`] : row
		);
		sheetAction = null;
	}

	function toggleExpanded(action: ActionDisplay) {
		if (!action.done) action.expanded = !action.expanded;
	}

	function toggleDone(action: ActionDisplay) {
		action.done = !action.done;
		if (action.done) action.expanded = false;
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Fix plan" sub={planSubtitle} />
	<div class="scroll" style="padding:14px 16px 0;">
		{#if loaded && actions.length === 0}
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
					{actions.length === 1 ? 'Do this' : actions.length === 2 ? 'Do both' : 'Do these'} and your
					water's <b>balanced</b>. Grab everything in one trip.
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
						{#if action.doseText}
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
					{#if action.expanded && action.productName}
						<div style="padding:2px 14px 15px;border-top:1px solid {palette.line};">
							<div
								style="display:flex;align-items:center;justify-content:space-between;padding:12px 0 11px;"
							>
								<span style="font-size:13px;color:{palette.inkMuted};">Using product</span>
								<button
									onclick={() => (sheetAction = action)}
									style="display:flex;align-items:center;gap:5px;font-family:var(--font-sans);font-weight:700;font-size:13.5px;color:{palette.ink};background:{palette.page};border:1px solid {palette.line};padding:6px 10px;border-radius:9px;"
								>
									{action.productName}<Icon
										name="chevron"
										size={13}
										color={palette.inkMuted}
										strokeWidth={2.2}
										style="transform:rotate(90deg);"
									/>
								</button>
							</div>
							<div
								style="background:{palette.accent}10;border-radius:12px;padding:11px 13px;margin-bottom:11px;"
							>
								<div
									style="font-size:11.5px;color:{palette.inkMuted};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;"
								>
									Add
								</div>
								<div
									style="font-family:var(--font-display);font-weight:600;font-size:26px;color:{palette.accent};"
								>
									{action.doseText?.replace('Add ', '')}
								</div>
							</div>
							{#each action.mathRows as [mathLabel, mathValue] (mathLabel)}
								<div
									style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:{palette.inkMuted};"
								>
									<span>{mathLabel}</span><span
										style="color:{palette.ink};font-family:var(--font-display);">{mathValue}</span
									>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
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
		{#if actions.length > 0}
			<a
				href="/results/needs"
				style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:16px;color:{palette.accent};font-weight:700;font-size:14px;"
			>
				<Icon name="beaker" size={17} strokeWidth={1.8} />What you'll need to buy
				<Icon name="chevron" size={14} color={palette.accent} strokeWidth={2.2} />
			</a>
		{/if}
	</div>
	<div style="padding:10px 16px 12px;flex-shrink:0;">
		<button
			onclick={() => goto('/')}
			style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;"
			>{actions.length === 0 ? 'Back to my pool' : 'Mark all done'}</button
		>
	</div>
	<TabBar />

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
						: productDose(product, sheetAction.canonicalDelta, sheetAction.cubicMetres)}
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
