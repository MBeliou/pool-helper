<script lang="ts">
	import { LegalPage, Seo } from '$lib/components/marketing';
	import { site } from '$lib/config/site';
</script>

<Seo
	title={`Privacy Policy — ${site.brand.name}`}
	description={`How ${site.brand.name} handles your data.`}
/>

<LegalPage title="Privacy Policy" updated="June 2026">
	<p>
		This is placeholder privacy-policy content. Replace it with your product's real policy before
		launch.
	</p>

	<h2>Data we store</h2>
	<p>
		{site.brand.name} is designed to keep your data on your device. Your profile and history are stored
		locally and are not uploaded to our servers.
	</p>

	<h2>Purchases</h2>
	<p>
		Payments are processed by the app store. We use a subscription-management provider to validate
		entitlements; it receives anonymous purchase information and no personal identity.
	</p>

	<h2>Analytics &amp; tracking</h2>
	<p>The app contains no third-party advertising or cross-app tracking.</p>

	<h2>Contact</h2>
	<p>
		Questions about this policy? Email
		<a href="mailto:hello@{site.brand.domain}">hello@{site.brand.domain}</a>.
	</p>
</LegalPage>
