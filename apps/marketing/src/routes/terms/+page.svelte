<script lang="ts">
	import { LegalPage, Seo } from '$lib/components/marketing';
	import { site } from '$lib/config/site';
</script>

<Seo
	title={`Terms of Use — ${site.brand.name}`}
	description={`The terms for using ${site.brand.name}.`}
/>

<LegalPage title="Terms of Use" updated="June 2026">
	<p>
		This is placeholder terms-of-use content. Replace it with your product's real terms before
		launch.
	</p>

	<h2>Using the app</h2>
	<p>
		{site.brand.name} provides guidance to help you maintain your pool. It is a helper tool — always follow
		the safety instructions on the chemical products you use.
	</p>

	<h2>Subscriptions</h2>
	<p>
		Paid plans renew automatically through the app store unless cancelled. You can manage or cancel
		a subscription at any time in your app-store account settings.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about these terms? Email
		<a href="mailto:hello@{site.brand.domain}">hello@{site.brand.domain}</a>.
	</p>
</LegalPage>
