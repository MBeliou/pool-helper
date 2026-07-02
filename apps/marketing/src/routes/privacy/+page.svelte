<script lang="ts">
	import { LegalPage, Seo } from '$lib/components/marketing';
	import { site } from '$lib/config/site';
</script>

<Seo
	title={`Privacy Policy — ${site.brand.name}`}
	description={`How ${site.brand.name} handles your data.`}
/>

<LegalPage title="Privacy Policy" updated="July 2026">
	<p>
		{site.brand.name} is built to keep your information on your device. This policy explains what the
		app stores, the limited data our providers process, and the choices you have. It applies to the
		{site.brand.name} iOS app and this website.
	</p>

	<h2>What stays on your device</h2>
	<p>
		Your pool profile (size, surface, and settings), your water-test readings, dosing history, and
		reminders are stored <strong>locally on your device</strong>. We do not have accounts, and this
		data is not uploaded to us or synced to our servers. If you delete the app, this data is removed
		with it. You can export a copy of your data at any time from More → Export my data.
	</p>

	<h2>Purchases and subscriptions</h2>
	<p>
		Payments are handled entirely by Apple through the App Store — we never see your payment details.
		To unlock and restore Pro features we use RevenueCat as our subscription provider. RevenueCat
		receives an anonymous, app-generated identifier and the purchase/entitlement status associated
		with it; it does not receive your name, email, or Apple ID. See
		<a href="https://www.revenuecat.com/privacy" rel="noopener" target="_blank">RevenueCat's privacy policy</a>
		and
		<a href="https://www.apple.com/legal/privacy/" rel="noopener" target="_blank">Apple's privacy policy</a>
		for how each handles that information.
	</p>

	<h2>Analytics and tracking</h2>
	<p>
		{site.brand.name} contains no third-party advertising and no cross-app or cross-site tracking. We
		do not sell your data, and we do not use it to track you across apps or websites owned by other
		companies.
	</p>

	<h2>Notifications</h2>
	<p>
		If you enable re-test reminders, they are scheduled locally on your device. You can turn them off
		at any time in the app or in your device's notification settings.
	</p>

	<h2>Children</h2>
	<p>
		{site.brand.name} is intended for a general audience and is not directed to children under 13. We
		do not knowingly collect personal information from children.
	</p>

	<h2>Changes</h2>
	<p>
		If this policy changes, we will update the date above and post the revised version on this page.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about this policy? Email
		<a href="mailto:hello@{site.brand.domain}">hello@{site.brand.domain}</a>.
	</p>
</LegalPage>
