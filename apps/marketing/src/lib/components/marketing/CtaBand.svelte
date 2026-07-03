<script lang="ts">
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import DownloadCta from './DownloadCta.svelte';
	import { site } from '$lib/config/site';

	const cta = site.ctaBand;
</script>

<Section id="download">
	<Container>
		<div
			class="relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12 sm:py-20"
			style="background: var(--gradient)"
		>
			<div class="mx-auto max-w-2xl text-[color:var(--on-gradient)]">
				<h2 class="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
					{cta.headline}
				</h2>
				<p class="mt-4 text-lg opacity-90 text-pretty">{cta.subhead}</p>

				<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
					<DownloadCta
						label={cta.primaryCta.label}
						variant="secondary"
						size="lg"
						class="w-full sm:w-auto"
					/>
				</div>

				{#if cta.note}
					<p class="mt-6 text-sm opacity-80">{cta.note}</p>
				{/if}
			</div>
		</div>
	</Container>
</Section>
