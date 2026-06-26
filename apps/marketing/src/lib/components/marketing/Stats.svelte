<script lang="ts">
	import Container from './Container.svelte';
	import { site } from '$lib/config/site';
</script>

<Container>
	<dl
		class="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4"
	>
		{#each site.stats as stat (stat.label)}
			<div class="bg-card flex flex-col items-center gap-1 px-4 py-8 text-center">
				<dt class="font-display text-3xl font-bold sm:text-4xl">{stat.value}</dt>
				<dd class="text-muted-foreground text-sm">{stat.label}</dd>
			</div>
		{/each}
	</dl>
</Container>
