<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import UnitsSettings from '$lib/pool/components/UnitsSettings.svelte';

	const palette = $derived(theme.palette);

	onMount(() => app.load());
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title="Units &amp; region" sub="So readings &amp; doses match your kit" />
	<div class="scroll" style="padding:16px 18px 24px;">
		<UnitsSettings />
		<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:14px;line-height:1.4;">
			Past tests keep the unit they were logged in — these settings only change how readings are
			displayed and which unit new tests default to.
		</div>
	</div>
	<TabBar />
</div>
