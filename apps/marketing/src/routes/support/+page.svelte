<script lang="ts">
	import { Navbar, Footer, Container, Seo } from '$lib/components/marketing';
	import { site } from '$lib/config/site';

	const email = `hello@${site.brand.domain}`;
</script>

<Seo
	title={`Support — ${site.brand.name}`}
	description={`Get help with ${site.brand.name}: contact, common questions, and links to our privacy policy and terms.`}
/>

<div class="bg-background text-foreground min-h-screen">
	<Navbar />
	<main>
		<Container class="max-w-2xl py-16 sm:py-24">
			<h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">Help &amp; support</h1>
			<p class="text-muted-foreground mt-4 text-lg text-pretty">
				We’re a small team and we read every message. The fastest way to reach us is email.
			</p>

			<div class="mt-8 rounded-2xl border border-border bg-card p-6">
				<h2 class="font-display text-lg font-semibold">Contact us</h2>
				<p class="text-muted-foreground mt-2 text-pretty">
					Email <a class="text-primary underline" href={`mailto:${email}`}>{email}</a> with your question.
					If it’s about a bug, letting us know your device and iOS version helps us fix it faster.
				</p>
			</div>

			<div
				class="mt-10 space-y-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-pretty [&_p]:leading-relaxed"
			>
				<div>
					<h2>Managing your subscription</h2>
					<p class="text-muted-foreground mt-2">
						My Pool Pro is billed through your Apple ID. To view, change, or cancel your plan, open
						the App Store app → tap your profile → Subscriptions. You can also restore a previous
						purchase from More → Restore purchases inside the app.
					</p>
				</div>

				<div>
					<h2>Your data</h2>
					<p class="text-muted-foreground mt-2">
						Everything stays on your device — there’s no account. You can export your full history
						at any time from More → Export my data. Deleting the app removes your data with it.
					</p>
				</div>

				<div>
					<h2>Is my dosing plan safe to follow?</h2>
					<p class="text-muted-foreground mt-2">
						My Pool gives guidance, not professional advice. Always follow the safety instructions
						on your chemical products, add chemicals one at a time, and consult a pool professional
						if you’re unsure. See our <a class="text-primary underline" href="/terms">Terms</a> for details.
					</p>
				</div>
			</div>

			<p class="text-muted-foreground mt-12 border-t border-border pt-6 text-sm">
				See also our <a class="text-primary underline" href="/privacy">Privacy Policy</a> and
				<a class="text-primary underline" href="/terms">Terms of Use</a>.
			</p>
		</Container>
	</main>
	<Footer />
</div>
