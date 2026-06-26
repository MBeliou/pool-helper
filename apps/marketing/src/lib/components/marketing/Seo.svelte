<script lang="ts">
	import { site } from '$lib/config/site';

	let {
		title = site.seo.title,
		description = site.seo.description,
		ogImage = site.seo.ogImage
	}: { title?: string; description?: string; ogImage?: string } = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>
