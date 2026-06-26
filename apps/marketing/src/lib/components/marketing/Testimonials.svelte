<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import { site } from '$lib/config/site';

	const stars = [0, 1, 2, 3, 4];

	const initials = (name: string) =>
		name
			.split(' ')
			.map((p) => p[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
</script>

<Section id="reviews">
	<Container>
		<SectionHeading
			title={site.testimonialsHeading.title}
			subtitle={site.testimonialsHeading.subtitle}
		/>

		<div class="mt-14 grid gap-6 md:grid-cols-3">
			{#each site.testimonials as t (t.name)}
				<figure class="bg-card flex flex-col rounded-2xl border border-border p-6 shadow-sm">
					<div class="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
						{#each stars as i (i)}
							<Star
								class={i < t.rating
									? 'size-4 fill-primary text-primary'
									: 'size-4 text-muted-foreground/30'}
							/>
						{/each}
					</div>
					<blockquote class="mt-4 flex-1 text-pretty">"{t.quote}"</blockquote>
					<figcaption class="mt-6 flex items-center gap-3">
						<span
							class="bg-primary/10 text-primary font-display flex size-10 items-center justify-center rounded-full text-sm font-semibold"
						>
							{initials(t.name)}
						</span>
						<span class="text-sm">
							<span class="block font-medium">{t.name}</span>
							<span class="text-muted-foreground block">{t.location}</span>
						</span>
					</figcaption>
				</figure>
			{/each}
		</div>
	</Container>
</Section>
