import { Capacitor } from '@capacitor/core';
import type {
	CustomerInfo,
	PurchasesError,
	PURCHASES_ERROR_CODE
} from '@revenuecat/purchases-capacitor';
import type { PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';
import {
	MY_POOL_PRO_ENTITLEMENT,
	REVENUECAT_IOS_API_KEY,
	REVENUECAT_ANDROID_API_KEY
} from './revenuecatConfig';

const browser = typeof window !== 'undefined';

/** The native plugins only do real work on iOS/Android — web is a no-op fallback. */
const isNativePlatform = () => Capacitor.isNativePlatform();

// The RevenueCat packages ship ESM that Node's prerender SSR can't resolve, and
// they only run on-device anyway — so load them lazily (cached) inside the
// native-guarded methods instead of at module evaluation time.
let corePromise: Promise<typeof import('@revenuecat/purchases-capacitor')> | undefined;
const loadCore = () => (corePromise ??= import('@revenuecat/purchases-capacitor'));

let uiPromise: Promise<typeof import('@revenuecat/purchases-capacitor-ui')> | undefined;
const loadUi = () => (uiPromise ??= import('@revenuecat/purchases-capacitor-ui'));

/** A user cancelling a purchase/paywall is normal flow, not an error worth logging. */
function isUserCancellation(error: unknown, cancelledCode: PURCHASES_ERROR_CODE): boolean {
	return (error as PurchasesError)?.code === cancelledCode;
}

/**
 * Subscription/entitlement state, mirroring the `app` state-singleton pattern.
 * `isPro` is the single source of truth for gating premium ("My Pool Pro")
 * features — read it anywhere, and call `presentPaywall()` to sell access.
 *
 * Billing is non-critical: `configure()` never throws, so a RevenueCat outage
 * can't block the app from loading. Failures land in `configureError`.
 */
class BillingState {
	/** True while the current user has the My Pool Pro entitlement active. */
	isPro = $state(false);
	/** True once `configure()` has finished its first customer-info fetch. */
	ready = $state(false);
	/** Set when configuration failed; the rest of the app keeps working. */
	configureError = $state<string | null>(null);
	/** False on web and unsupported platforms — UI can show an "iOS only" note. */
	readonly supported = isNativePlatform();

	// single-flight: layout and any page can all await configure()
	private configurePromise: Promise<void> | undefined;

	/**
	 * Initializes the RevenueCat SDK and hydrates entitlement state. Safe to call
	 * repeatedly (single-flight) and never rejects. No-op on non-native platforms.
	 */
	configure(): Promise<void> {
		if (!browser || !isNativePlatform()) {
			this.ready = true;
			return Promise.resolve();
		}
		this.configurePromise ??= (async () => {
			try {
				const { Purchases, LOG_LEVEL } = await loadCore();
				// setLogLevel must come before configure; quieter in production builds
				await Purchases.setLogLevel({
					level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN
				});
				const apiKey =
					Capacitor.getPlatform() === 'android'
						? REVENUECAT_ANDROID_API_KEY
						: REVENUECAT_IOS_API_KEY;
				await Purchases.configure({ apiKey });

				// keep `isPro` fresh across renewals, restores and cross-device changes
				await Purchases.addCustomerInfoUpdateListener((customerInfo) =>
					this.applyCustomerInfo(customerInfo)
				);

				const { customerInfo } = await Purchases.getCustomerInfo();
				this.applyCustomerInfo(customerInfo);
				this.configureError = null;
			} catch (error) {
				console.error('RevenueCat configuration failed', error);
				this.configureError = error instanceof Error ? error.message : String(error);
				this.configurePromise = undefined; // allow a later retry
			} finally {
				this.ready = true;
			}
		})();
		return this.configurePromise;
	}

	/** Derives `isPro` from the entitlement map keyed by dashboard identifier. */
	private applyCustomerInfo(customerInfo: CustomerInfo): void {
		this.isPro = MY_POOL_PRO_ENTITLEMENT in customerInfo.entitlements.active;
	}

	/**
	 * Presents the RevenueCat-hosted paywall for the current offering and refreshes
	 * entitlement state on purchase/restore. Returns the PAYWALL_RESULT, or
	 * NOT_PRESENTED on unsupported platforms.
	 */
	async presentPaywall(): Promise<PAYWALL_RESULT> {
		// On web, return the "not presented" value without loading the native package.
		if (!isNativePlatform()) return 'NOT_PRESENTED' as PAYWALL_RESULT;
		try {
			const { RevenueCatUI, PAYWALL_RESULT } = await loadUi();
			const { result } = await RevenueCatUI.presentPaywall();
			if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
				await this.refresh();
			}
			return result;
		} catch (error) {
			console.error('presentPaywall failed', error);
			return 'ERROR' as PAYWALL_RESULT;
		}
	}

	/**
	 * Presents the paywall only when the user lacks My Pool Pro — the entry
	 * point for future "tap a locked feature → upsell" flows. Returns NOT_PRESENTED
	 * (treated as "already entitled") when Pro is already active.
	 */
	async presentPaywallIfNeeded(): Promise<PAYWALL_RESULT> {
		if (!isNativePlatform()) return 'NOT_PRESENTED' as PAYWALL_RESULT;
		try {
			const { RevenueCatUI, PAYWALL_RESULT } = await loadUi();
			const { result } = await RevenueCatUI.presentPaywallIfNeeded({
				requiredEntitlementIdentifier: MY_POOL_PRO_ENTITLEMENT
			});
			if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
				await this.refresh();
			}
			return result;
		} catch (error) {
			console.error('presentPaywallIfNeeded failed', error);
			return 'ERROR' as PAYWALL_RESULT;
		}
	}

	/** Opens RevenueCat's Customer Center (manage/cancel/restore). iOS/Android only. */
	async presentCustomerCenter(): Promise<void> {
		if (!isNativePlatform()) return;
		try {
			const { RevenueCatUI } = await loadUi();
			await RevenueCatUI.presentCustomerCenter();
			// the user may have cancelled or restored from inside the center
			await this.refresh();
		} catch (error) {
			console.error('presentCustomerCenter failed', error);
		}
	}

	/**
	 * Restores prior purchases (e.g. after reinstall or on a new device) and
	 * re-applies entitlement state. Returns true if Pro is active afterwards.
	 */
	async restore(): Promise<boolean> {
		if (!isNativePlatform()) return false;
		try {
			const { Purchases } = await loadCore();
			const { customerInfo } = await Purchases.restorePurchases();
			this.applyCustomerInfo(customerInfo);
		} catch (error) {
			const { PURCHASES_ERROR_CODE } = await loadCore();
			if (!isUserCancellation(error, PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)) {
				console.error('restorePurchases failed', error);
			}
		}
		return this.isPro;
	}

	/** Re-reads customer info from RevenueCat and updates `isPro`. */
	private async refresh(): Promise<void> {
		if (!isNativePlatform()) return;
		try {
			const { Purchases } = await loadCore();
			const { customerInfo } = await Purchases.getCustomerInfo();
			this.applyCustomerInfo(customerInfo);
		} catch (error) {
			console.error('getCustomerInfo failed', error);
		}
	}
}

export const billing = new BillingState();
