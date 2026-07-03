<script lang="ts">
	import Container from './Container.svelte';
	import Section from './Section.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import AppScreenshot from './AppScreenshot.svelte';
	import { site } from '$lib/config/site';
</script>

<Section id="screenshots" class="bg-secondary/40">
	<Container>
		<SectionHeading
			title={site.screenshotsHeading.title}
			subtitle={site.screenshotsHeading.subtitle}
		/>

		<div class="mt-14 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
			{#each site.screenshots as shot (shot.caption)}
				<figure>
					<AppScreenshot caption={shot.caption} src={shot.src} />
					<figcaption class="text-muted-foreground mt-3 text-center text-sm font-medium">
						{shot.caption}
					</figcaption>
				</figure>
			{/each}
		</div>
	</Container>
</Section>
