<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { TESTERS } from '$lib/pool/data';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import ComingSoonSheet from '$lib/pool/components/ComingSoonSheet.svelte';

	const palette = $derived(theme.palette);

	onMount(() => app.load());

	function pickTester(testerName: string) {
		app.tester = testerName;
		app.save();
	}

	let comingSoonOpen = $state(false);
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="My testers" sub="The selected one is used for new logs" />
	<div class="scroll" style="padding:16px 16px 0;">
		<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
			{#each TESTERS as tester (tester.name)}
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
							>IN USE</span
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
			<!-- add a tester -->
			<button
				onclick={() => (comingSoonOpen = true)}
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
	<ComingSoonSheet
		bind:open={comingSoonOpen}
		message="Custom testers (your own kit, with its read panels) are on the roadmap. For now, pick the closest match."
	/>
</div>
