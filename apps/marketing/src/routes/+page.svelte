<script lang="ts">
	import {
		Navbar,
		Hero,
		HowItWorks,
		Features,
		Pricing,
		Screenshots,
		Faq,
		CtaBand,
		Footer
	} from '$lib/components/marketing';
</script>

<div id="top" class="bg-background text-foreground min-h-screen">
	<Navbar />
	<main>
		<Hero />
		<HowItWorks />
		<Features />
		<Pricing />
		<Screenshots />
		<Faq />
		<CtaBand />
	</main>
	<Footer />
</div>
