<script lang="ts">
	import { page } from '$app/state';
	import { site } from '$lib/config/site';

	let {
		title = site.seo.title,
		description = site.seo.description,
		ogImage = site.seo.ogImage
	}: { title?: string; description?: string; ogImage?: string } = $props();

	const origin = `https://${site.brand.domain}`;
	const canonical = $derived(`${origin}${page.url.pathname}`);
	const ogImageUrl = $derived(
		ogImage ? (ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`) : undefined
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content={site.brand.name} />
	{#if ogImageUrl}
		<meta property="og:image" content={ogImageUrl} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if ogImageUrl}
		<meta name="twitter:image" content={ogImageUrl} />
	{/if}
</svelte:head>
