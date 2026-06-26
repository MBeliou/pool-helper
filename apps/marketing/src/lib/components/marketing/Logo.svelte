<script lang="ts">
	// `?raw` + {@html} so the droplet's stroke="currentColor" inherits our text color
	// (brand blue by default, and it adapts automatically in dark mode).
	import dropletRaw from '@my-pool/shared/assets/droplet.svg?raw';
	import { cn } from '$lib/utils';
	import { site } from '$lib/config/site';

	let { class: className, showWordmark = true }: { class?: string; showWordmark?: boolean } =
		$props();
</script>

<span class={cn('inline-flex items-center gap-2 font-display font-semibold', className)}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static build-time import of our own brand asset, not user input -->
	<span class="text-primary [&_svg]:block [&_svg]:size-7">{@html dropletRaw}</span>
	{#if showWordmark}
		<span class="text-lg tracking-tight">{site.brand.name}</span>
	{/if}
</span>
