<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		title,
		subtitle,
		align = 'center',
		class: className
	}: {
		title: string;
		subtitle?: string;
		align?: 'center' | 'left';
		class?: string;
	} = $props();
</script>

<div class={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
	<h2 class="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
		{title}
	</h2>
	{#if subtitle}
		<p class="text-muted-foreground mt-4 text-lg text-pretty">{subtitle}</p>
	{/if}
</div>
