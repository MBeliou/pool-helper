<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion';
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import { site } from '$lib/config/site';
</script>

<Section id="faq" class="bg-secondary/40">
	<Container>
		<SectionHeading title={site.faqHeading.title} subtitle={site.faqHeading.subtitle} />

		<div class="mx-auto mt-12 max-w-2xl">
			<Accordion.Root type="single">
				{#each site.faq as item, i (item.question)}
					<Accordion.Item value={`item-${i}`}>
						<Accordion.Trigger class="text-left text-base font-medium">
							{item.question}
						</Accordion.Trigger>
						<Accordion.Content class="text-muted-foreground text-base">
							{item.answer}
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		</div>
	</Container>
</Section>
