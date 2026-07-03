<script lang="ts">
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import { site } from '$lib/config/site';
</script>

<Section id="how">
	<Container>
		<SectionHeading
			title={site.howItWorksHeading.title}
			subtitle={site.howItWorksHeading.subtitle}
		/>

		<ol class="mt-14 grid gap-8 md:grid-cols-3">
			{#each site.howItWorks as item (item.step)}
				<li class="flex flex-col items-center text-center">
					<span
						class="bg-primary text-primary-foreground font-display flex size-12 items-center justify-center rounded-full text-lg font-bold"
					>
						{item.step}
					</span>
					<h3 class="font-display mt-5 text-lg font-semibold">{item.title}</h3>
					<p class="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
						{item.description}
					</p>
				</li>
			{/each}
		</ol>
	</Container>
</Section>
