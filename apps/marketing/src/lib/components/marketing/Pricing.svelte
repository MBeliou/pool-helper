<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import { site } from '$lib/config/site';
</script>

<Section id="pricing">
	<Container>
		<SectionHeading title={site.pricingHeading.title} subtitle={site.pricingHeading.subtitle} />

		<div class="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
			{#each site.pricing as tier (tier.name)}
				<div
					class={cn(
						'relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm',
						tier.featured ? 'border-primary ring-1 ring-primary' : 'border-border'
					)}
				>
					{#if tier.badge}
						<Badge class="absolute -top-3 left-8">{tier.badge}</Badge>
					{/if}
					<h3 class="font-display text-lg font-semibold">{tier.name}</h3>
					<div class="mt-3 flex items-baseline gap-1">
						<span class="font-display text-4xl font-bold">{tier.price}</span>
						{#if tier.period}
							<span class="text-muted-foreground text-sm">{tier.period}</span>
						{/if}
					</div>
					<p class="text-muted-foreground mt-3 text-sm">{tier.description}</p>

					<ul class="mt-6 flex-1 space-y-3">
						{#each tier.features as feat (feat)}
							<li class="flex items-start gap-3 text-sm">
								<Check class="text-primary mt-0.5 size-4 shrink-0" />
								<span>{feat}</span>
							</li>
						{/each}
					</ul>

					<Button
						class="mt-8 w-full"
						variant={tier.featured ? 'default' : 'outline'}
						href={tier.cta.href}
					>
						{tier.cta.label}
					</Button>
				</div>
			{/each}
		</div>
	</Container>
</Section>
