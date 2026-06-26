<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Button } from '$lib/components/ui/button';
	import Container from './Container.svelte';
	import AppScreenshot from './AppScreenshot.svelte';
	import { site } from '$lib/config/site';

	const hero = site.hero;
</script>

<Container class="pt-16 pb-12 sm:pt-24 sm:pb-20">
	<div class="mx-auto max-w-3xl text-center">
		{#if hero.eyebrow}
			<span
				class="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase"
			>
				{hero.eyebrow}
			</span>
		{/if}
		<h1 class="font-display mt-5 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
			{hero.headline}
		</h1>
		<p class="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty sm:text-xl">
			{hero.subhead}
		</p>
		<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<Button size="lg" href={hero.primaryCta.href} class="w-full sm:w-auto">
				{hero.primaryCta.label}
			</Button>
			{#if hero.secondaryCta}
				<Button size="lg" variant="ghost" href={hero.secondaryCta.href} class="w-full sm:w-auto">
					{hero.secondaryCta.label}
					<ArrowRight class="size-4" />
				</Button>
			{/if}
		</div>
	</div>

	<div class="mx-auto mt-14 max-w-xs sm:mt-16 sm:max-w-sm">
		<AppScreenshot caption={hero.screenshotCaption} />
	</div>
</Container>
