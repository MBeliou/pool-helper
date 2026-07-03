<script lang="ts">
	// Single source of truth for the "get the app" action. Pre-launch (no
	// `site.appStoreUrl`) it renders a non-interactive "Coming soon" button; set
	// the URL in site.ts and every instance becomes a real App Store link.
	import { Button, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button';
	import { site } from '$lib/config/site';

	let {
		label,
		comingSoonLabel = 'Coming soon to the App Store',
		variant = 'default',
		size = 'lg',
		class: className
	}: {
		/** Label used once the app is live. */
		label?: string;
		/** Label shown pre-launch. */
		comingSoonLabel?: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
	} = $props();
</script>

{#if site.appStoreUrl}
	<Button {variant} {size} href={site.appStoreUrl} target="_blank" rel="noopener" class={className}>
		{label ?? 'Download on the App Store'}
	</Button>
{:else}
	<Button {variant} {size} disabled class={className}>{comingSoonLabel}</Button>
{/if}
