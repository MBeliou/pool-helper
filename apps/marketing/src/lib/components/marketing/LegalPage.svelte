<script lang="ts">
	import type { Snippet } from 'svelte';
	import Navbar from './Navbar.svelte';
	import Footer from './Footer.svelte';
	import Container from './Container.svelte';

	let { title, updated, children }: { title: string; updated: string; children: Snippet } =
		$props();
</script>

<div class="bg-background text-foreground min-h-screen">
	<Navbar />
	<main>
		<Container class="max-w-2xl py-16 sm:py-24">
			<h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
			<p class="text-muted-foreground mt-2 text-sm">Last updated: {updated}</p>
			<div
				class="mt-8 space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-pretty"
			>
				{@render children()}
			</div>
		</Container>
	</main>
	<Footer />
</div>
