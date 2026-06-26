<script lang="ts">
	import Container from './Container.svelte';
	import Logo from './Logo.svelte';
	import { site } from '$lib/config/site';
</script>

<footer class="border-t border-border bg-background">
	<Container class="py-14">
		<div class="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
			<div class="max-w-xs">
				<Logo />
				<p class="text-muted-foreground mt-3 text-sm text-pretty">{site.brand.tagline}</p>
			</div>

			{#each site.footer.columns as col (col.title)}
				<div>
					<h3 class="text-sm font-semibold">{col.title}</h3>
					<ul class="mt-4 space-y-3">
						{#each col.links as link (link.label)}
							<li>
								<a
									href={link.href}
									class="text-muted-foreground hover:text-foreground text-sm transition-colors"
								>
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div class="text-muted-foreground mt-12 border-t border-border pt-6 text-sm">
			{site.footer.legal}
		</div>
	</Container>
</footer>
