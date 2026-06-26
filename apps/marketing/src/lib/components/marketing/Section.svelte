<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		id,
		children,
		class: className
	}: { id?: string; children: Snippet; class?: string } = $props();
</script>

<section {id} class={cn('scroll-mt-20 py-16 sm:py-24', className)}>
	{@render children()}
</section>
