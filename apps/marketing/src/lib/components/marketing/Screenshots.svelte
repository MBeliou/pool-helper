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
				<AppScreenshot caption={shot.caption} />
			{/each}
		</div>
	</Container>
</Section>
