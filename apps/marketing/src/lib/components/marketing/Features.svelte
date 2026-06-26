<script lang="ts">
	import type { Component } from 'svelte';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
	import LineChart from '@lucide/svelte/icons/line-chart';
	import Bell from '@lucide/svelte/icons/bell';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { Badge } from '$lib/components/ui/badge';
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import { site } from '$lib/config/site';

	// Map config icon names → lucide components. Add entries here when the config
	// references a new icon. Falls back to Sparkles for unknown names.
	const ICONS: Record<string, Component> = {
		'flask-conical': FlaskConical,
		calculator: Calculator,
		stethoscope: Stethoscope,
		'line-chart': LineChart,
		bell: Bell,
		'shield-check': ShieldCheck
	};
</script>

<Section id="features" class="bg-secondary/40">
	<Container>
		<SectionHeading title={site.featuresHeading.title} subtitle={site.featuresHeading.subtitle} />

		<div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each site.features as feature (feature.title)}
				{@const Icon = ICONS[feature.icon] ?? Sparkles}
				<div class="bg-card flex flex-col rounded-2xl border border-border p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<span
							class="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl"
						>
							<Icon class="size-5" />
						</span>
						{#if feature.tier}
							<Badge variant={feature.tier === 'Premium' ? 'default' : 'secondary'}>
								{feature.tier}
							</Badge>
						{/if}
					</div>
					<h3 class="font-display mt-5 text-lg font-semibold">{feature.title}</h3>
					<p class="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.description}</p>
				</div>
			{/each}
		</div>
	</Container>
</Section>
