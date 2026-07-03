<script lang="ts">
	// Reusable screenshot placeholder. Renders a framed panel with the brand
	// gradient + droplet + caption. Pass `src` later to drop in a real screenshot.
	import dropletRaw from '@my-pool/shared/assets/droplet.svg?raw';
	import { cn } from '$lib/utils';

	let {
		caption,
		src,
		ratio = 'phone',
		class: className
	}: {
		caption?: string;
		src?: string;
		ratio?: 'phone' | 'wide';
		class?: string;
	} = $props();
</script>

<div
	class={cn(
		'relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
		ratio === 'phone' ? 'aspect-[1206/2622]' : 'aspect-[16/10]',
		className
	)}
>
	{#if src}
		<img {src} alt={caption ?? ''} class="size-full object-cover" />
	{:else}
		<div
			class="flex size-full flex-col items-center justify-center gap-4 text-[color:var(--on-gradient)]"
			style="background: var(--gradient)"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- static build-time import of our own brand asset, not user input -->
			<span class="opacity-90 [&_svg]:block [&_svg]:size-16">{@html dropletRaw}</span>
			{#if caption}
				<span class="font-display text-sm font-medium tracking-wide opacity-90">{caption}</span>
			{/if}
		</div>
	{/if}
</div>
