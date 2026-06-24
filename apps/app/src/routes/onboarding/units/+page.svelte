<script lang="ts">
	import { theme } from '$lib/pool/state/theme.svelte';
	import UnitsSettings from '$lib/pool/components/UnitsSettings.svelte';
	import OnbTop from '$lib/pool/components/onboarding/OnbTop.svelte';
	import OnbFooter from '$lib/pool/components/onboarding/OnbFooter.svelte';
	import OnbTitle from '$lib/pool/components/onboarding/OnbTitle.svelte';

	const palette = $derived(theme.palette);
</script>

<div class="screen" style="background:{palette.page};">
	<OnbTop step={4} label="Step 4 of 4 · Units" />
	<div class="scroll" style="padding:20px 22px 0;">
		<OnbTitle sub="So readings &amp; doses match your kit">Units &amp;<br />region</OnbTitle>
		<UnitsSettings />
	</div>
	<OnbFooter next="Finish setup ✓" to="/onboarding/done" />
</div>
