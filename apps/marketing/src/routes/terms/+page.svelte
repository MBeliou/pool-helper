<script lang="ts">
	import { LegalPage, Seo } from '$lib/components/marketing';
	import { site } from '$lib/config/site';
</script>

<Seo
	title={`Terms of Use — ${site.brand.name}`}
	description={`The terms for using ${site.brand.name}.`}
/>

<LegalPage title="Terms of Use" updated="July 2026">
	<p>
		These terms govern your use of the {site.brand.name} app and website. By using {site.brand
			.name}, you agree to them.
	</p>

	<h2>Using the app</h2>
	<p>
		{site.brand.name} provides guidance to help you test and balance your pool or hot tub. It is a helper
		tool, not professional advice. Dosing plans are estimates based on the readings and pool details you
		enter — always follow the safety instructions and dosages on the chemical products you use, add chemicals
		one at a time, and consult a pool professional if you are unsure. You are responsible for the products
		you handle and add to your water.
	</p>

	<h2>No warranty</h2>
	<p>
		{site.brand.name} is provided "as is," without warranties of any kind. We do not guarantee that the
		app's calculations, diagnoses, or reminders will be accurate or suitable for your specific pool. To
		the fullest extent permitted by law, we are not liable for any damage, loss, or injury arising from
		your use of the app or the chemicals you add based on it.
	</p>

	<h2>Subscriptions and purchases</h2>
	<p>
		{site.brand.name} Pro is available as an auto-renewing annual subscription (with a 3-day free trial
		for eligible accounts) or a one-time Lifetime purchase. Payment is charged to your Apple ID at confirmation.
		A subscription renews automatically unless canceled at least 24 hours before the end of the current
		period; your Apple ID is charged for renewal within 24 hours before the period ends. You can manage
		or cancel a subscription any time in your App Store account settings. Any unused portion of a free
		trial is forfeited when you purchase a subscription.
	</p>

	<h2>Changes</h2>
	<p>We may update these terms; the revised version will be posted on this page with a new date.</p>

	<h2>Contact</h2>
	<p>
		Questions about these terms? Email
		<a href="mailto:hello@{site.brand.domain}">hello@{site.brand.domain}</a>.
	</p>
</LegalPage>
