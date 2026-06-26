<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let { children, class: className }: { children: Snippet; class?: string } = $props();
</script>

<div class={cn('mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8', className)}>
	{@render children()}
</div>
