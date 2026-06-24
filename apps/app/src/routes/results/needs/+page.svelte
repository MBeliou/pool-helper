<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { computeFixPlan, type FixAction } from '$lib/pool/fixPlan';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { getLatestTest } from '$lib/pool/db/testsRepository';

	const palette = $derived(theme.palette);

	let dosedActions = $state<FixAction[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		const latestTest = await getLatestTest();
		const fixPlan = computeFixPlan(latestTest, {
			volume: app.volume,
			volumeUnit: app.volumeUnit,
			hardnessUnit: app.hardnessUnit
		});
		dosedActions = fixPlan.actions.filter((action) => action.doseText);
		loaded = true;
	});
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="What you'll need" sub="For today's fix" />
	<div class="scroll" style="padding:16px 16px 0;">
		<div style="display:flex;flex-direction:column;gap:11px;">
			{#each dosedActions as action (action.key)}
				<div
					style="display:flex;align-items:center;gap:13px;background:{palette.card};border-radius:16px;padding:14px 15px;box-shadow:{palette.shadow};"
				>
					<div
						style="width:40px;height:40px;border-radius:11px;background:{palette.accent}15;display:grid;place-items:center;color:{palette.accent};flex-shrink:0;"
					>
						<Icon name={action.icon} size={20} strokeWidth={1.8} />
					</div>
					<div style="flex:1;font-weight:700;font-size:15.5px;color:{palette.ink};">
						{action.productName}
					</div>
					<span
						style="font-family:var(--font-display);font-weight:600;font-size:19px;color:{palette.ink};"
						>{action.doseText?.replace('Add ', '')}</span
					>
				</div>
			{/each}
			{#if loaded && dosedActions.length === 0}
				<div
					style="background:{palette.card};border-radius:16px;padding:14px 15px;box-shadow:{palette.shadow};font-size:14px;color:{palette.inkMuted};text-align:center;"
				>
					Nothing to buy — your water's balanced.
				</div>
			{/if}
		</div>
		<div
			style="display:flex;gap:10px;align-items:flex-start;background:{palette.card};border:1px dashed {palette.inkMuted}55;border-radius:14px;padding:13px 14px;margin-top:14px;"
		>
			<div style="color:{palette.inkMuted};flex-shrink:0;margin-top:1px;">
				<Icon name="alert" size={18} strokeWidth={1.8} />
			</div>
			<div style="font-size:12.5px;color:{palette.inkMuted};line-height:1.35;">
				Amounts assume the products in your plan. We don't track your shelf — tap any dose to switch
				brand or strength.
			</div>
		</div>
	</div>
	<div style="padding:10px 16px 12px;flex-shrink:0;">
		<button
			onclick={() => history.back()}
			style="width:100%;background:{palette.accent};color:#fff;text-align:center;padding:15px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:16px;"
			>Back to fix plan</button
		>
	</div>
	<TabBar />
</div>
