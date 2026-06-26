<script lang="ts">
	import {
		Navbar,
		Hero,
		Stats,
		Features,
		Pricing,
		Screenshots,
		Testimonials,
		Faq,
		CtaBand,
		Footer
	} from '$lib/components/marketing';
</script>

<div id="top" class="bg-background text-foreground min-h-screen">
	<Navbar />
	<main>
		<Hero />
		<div class="-mt-4 pb-8 sm:pb-12">
			<Stats />
		</div>
		<Features />
		<Pricing />
		<Screenshots />
		<Testimonials />
		<Faq />
		<CtaBand />
	</main>
	<Footer />
</div>
