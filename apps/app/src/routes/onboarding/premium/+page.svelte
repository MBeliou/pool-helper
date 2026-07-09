<script lang="ts">
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { billing } from '$lib/pool/billing/revenuecat.svelte';
	import Icon from '$lib/pool/components/Icon.svelte';

	const palette = $derived(theme.palette);

	// What My Pool Pro unlocks — benefit-led copy for the upsell. The real
	// price and trial terms are rendered by the RevenueCat paywall itself, so we
	// keep numbers out of here to avoid drifting from the dashboard configuration.
	const proFeatures: { title: string; detail: string }[] = [
		{
			title: 'Diagnose by symptom',
			detail: 'Cloudy, green or itchy? Get the likely cause and the exact cure.'
		},
		{
			title: 'Your full history & trends',
			detail: 'Every test charted across months — not just the last couple of weeks.'
		},
		{
			title: 'Smart test reminders',
			detail: 'We watch your chemistry and tell you the best day to test next.'
		},
		{
			title: 'Everything we add next',
			detail: 'New tools land in Pro first — your subscription shapes what we build.'
		}
	];

	let working = $state(false);
	let purchaseMessage = $state('');

	// Setup is already persisted on the previous screen; this step is a pure
	// upsell, so both choices simply land the user on their pool.
	async function finishAndGoHome() {
		if (!app.onboarded) await app.finishOnboarding();
		goto('/');
	}

	async function startTrial() {
		if (working) return;
		working = true;
		purchaseMessage = '';
		// Opens the RevenueCat paywall (real pricing + 3-day trial). On web /
		// simulator without billing this resolves to NOT_PRESENTED. Success is
		// confirmed by StoreKit's own sheet + the Pro state on Home; we only need
		// to surface a hard failure so the user isn't left wondering.
		const result = await billing.presentPaywall();
		working = false;
		if (String(result) === 'ERROR') {
			purchaseMessage =
				"We couldn't open the store. Check your connection and try again, or start anytime from More → Subscription.";
			return; // stay on screen so they can retry or tap "Maybe later"
		}
		await finishAndGoHome();
	}

	async function restore() {
		if (working) return;
		working = true;
		try {
			await billing.restore();
		} finally {
			working = false;
		}
	}
</script>

<div
	class="screen"
	style="background:{palette.gradient};color:#fff;position:relative;overflow:hidden;"
>
	<!-- faint concentric water rings, echoing the welcome screen -->
	<svg
		viewBox="0 0 402 402"
		style="position:absolute;top:-80px;right:-130px;width:430px;opacity:0.12;"
	>
		{#each [180, 140, 100, 60] as ringRadius (ringRadius)}
			<circle cx="201" cy="201" r={ringRadius} fill="none" stroke="#fff" stroke-width="2" />
		{/each}
	</svg>

	<div class="scroll" style="padding:0 26px;position:relative;">
		<div class="safe-top"></div>
		<div style="padding-top:18px;">
			<span
				style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;"
			>
				<Icon name="spark" size={13} color="#fff" strokeWidth={2} />My Pool Pro
			</span>
			<div
				style="font-family:var(--font-display);font-weight:600;font-size:34px;letter-spacing:-0.8px;line-height:1.05;margin-top:18px;"
			>
				3 days free.<br />Then keep your<br />water handled.
			</div>
			<div style="font-size:15px;opacity:0.9;margin-top:12px;line-height:1.4;max-width:300px;">
				Start a free trial and unlock the tools that turn a reading into the right fix — every time.
			</div>

			<div style="display:flex;flex-direction:column;gap:14px;margin-top:26px;">
				{#each proFeatures as feature (feature.title)}
					<div style="display:flex;gap:12px;align-items:flex-start;">
						<div
							style="width:24px;height:24px;border-radius:999px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);display:grid;place-items:center;flex-shrink:0;margin-top:1px;"
						>
							<Icon name="shield" size={14} color="#fff" strokeWidth={2.2} />
						</div>
						<div style="min-width:0;">
							<div style="font-weight:700;font-size:15.5px;">{feature.title}</div>
							<div style="font-size:13px;opacity:0.82;line-height:1.35;margin-top:1px;">
								{feature.detail}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div style="flex-shrink:0;padding:14px 22px calc(var(--safe-bottom) + 16px);position:relative;">
		<button
			onclick={startTrial}
			disabled={working}
			style="width:100%;background:#fff;color:{palette.accent};text-align:center;padding:16px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:800;font-size:16px;opacity:{working
				? 0.7
				: 1};">{working ? 'Opening…' : 'Start my 3-day free trial'}</button
		>
		{#if purchaseMessage}
			<div
				role="alert"
				style="margin-top:11px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:10px 13px;font-size:12.5px;line-height:1.4;text-align:center;"
			>
				{purchaseMessage}
			</div>
		{/if}
		<div style="text-align:center;margin-top:11px;font-size:11.5px;opacity:0.72;line-height:1.4;">
			Free for 3 days, then your plan renews automatically. Cancel anytime.
		</div>
		<div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:13px;">
			<button
				onclick={finishAndGoHome}
				disabled={working}
				style="font-size:14px;opacity:0.9;font-weight:600;background:none;border:none;color:#fff;font-family:var(--font-sans);padding:6px;"
				>Maybe later</button
			>
			{#if billing.supported}
				<span style="opacity:0.4;">·</span>
				<button
					onclick={restore}
					disabled={working}
					style="font-size:14px;opacity:0.9;font-weight:600;background:none;border:none;color:#fff;font-family:var(--font-sans);padding:6px;"
					>Restore</button
				>
			{/if}
		</div>
	</div>
</div>
