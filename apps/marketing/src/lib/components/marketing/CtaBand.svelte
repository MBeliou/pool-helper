<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Container from './Container.svelte';
	import Section from './Section.svelte';
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
					<Button size="lg" variant="secondary" href={cta.primaryCta.href} class="w-full sm:w-auto">
						{cta.primaryCta.label}
					</Button>
					{#if cta.secondaryCta}
						<Button
							size="lg"
							variant="outline"
							href={cta.secondaryCta.href}
							class="w-full border-white/40 bg-transparent text-[color:var(--on-gradient)] hover:bg-white/10 hover:text-[color:var(--on-gradient)] sm:w-auto"
						>
							{cta.secondaryCta.label}
						</Button>
					{/if}
				</div>

				{#if cta.note}
					<p class="mt-6 text-sm opacity-80">{cta.note}</p>
				{/if}
			</div>
		</div>
	</Container>
</Section>
