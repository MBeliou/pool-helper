<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button';
	import Container from './Container.svelte';
	import Logo from './Logo.svelte';
	import { site } from '$lib/config/site';

	let open = $state(false);
</script>

<header
	class="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<Container class="flex h-16 items-center justify-between gap-4">
		<a href="#top" class="text-foreground" aria-label={site.brand.name}>
			<Logo />
		</a>

		<nav class="hidden items-center gap-7 md:flex" aria-label="Primary">
			{#each site.nav as link (link.href)}
				<a
					href={link.href}
					class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="hidden md:block">
			<Button href={site.headerCta.href}>{site.headerCta.label}</Button>
		</div>

		<button
			class="text-foreground inline-flex size-10 items-center justify-center rounded-md md:hidden"
			aria-label={open ? 'Close menu' : 'Open menu'}
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			{#if open}<X class="size-5" />{:else}<Menu class="size-5" />{/if}
		</button>
	</Container>

	{#if open}
		<div class="border-t border-border/60 bg-background md:hidden">
			<Container class="flex flex-col gap-1 py-4">
				{#each site.nav as link (link.href)}
					<a
						href={link.href}
						class="text-foreground rounded-md px-2 py-2.5 text-sm font-medium hover:bg-secondary"
						onclick={() => (open = false)}
					>
						{link.label}
					</a>
				{/each}
				<Button class="mt-2 w-full" href={site.headerCta.href} onclick={() => (open = false)}>
					{site.headerCta.label}
				</Button>
			</Container>
		</div>
	{/if}
</header>
