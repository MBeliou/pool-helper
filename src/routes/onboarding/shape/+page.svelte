<script lang="ts">
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import ShapeGrid from '$lib/pool/components/ShapeGrid.svelte';
	import OnbTop from '$lib/pool/components/onboarding/OnbTop.svelte';
	import OnbFooter from '$lib/pool/components/onboarding/OnbFooter.svelte';
	import OnbTitle from '$lib/pool/components/onboarding/OnbTitle.svelte';

	const palette = $derived(theme.palette);
</script>

<div class="screen" style="background:{palette.page};">
	<OnbTop step={1} label="Step 1 of 4 · Shape" />
	<div class="scroll" style="padding:20px 22px 0;">
		<OnbTitle sub="Closest match — it drives the volume math"
			>What shape is<br />your pool?</OnbTitle
		>
		<ShapeGrid bind:value={app.shape} onchange={() => app.save()} />
		<div style="font-size:13px;color:{palette.inkMuted};margin-top:16px;text-align:center;">
			Freeform or odd shape? You'll just type the volume next.
		</div>
	</div>
	<OnbFooter next="Next →" to="/onboarding/size" />
</div>
