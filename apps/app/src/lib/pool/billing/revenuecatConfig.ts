// RevenueCat configuration — public SDK keys and the entitlement we gate on.
// Keys live here so there's a single place to swap them per environment.

/**
 * The entitlement identifier configured in the RevenueCat dashboard.
 * Must match EXACTLY (it is the key inside `customerInfo.entitlements.active`),
 * not a product id. Everything Pro-gated checks this one string.
 */
export const MY_POOL_PRO_ENTITLEMENT = 'My Pool Pro';

// Public SDK keys (safe to ship in the client bundle — these are not secret
// server keys). Find them in RevenueCat → Project Settings → API Keys → your
// Apple App Store app (the public key is prefixed `appl_`).
//
// We switch on the Vite build mode so dev builds use the sandbox/test key and
// release builds use the real production key.
export const REVENUECAT_IOS_API_KEY = import.meta.env.DEV
	? 'test_YGzUJpHHgsZJyyYYrrYGGXrvjox'
	: 'appl_AAXTKVouYCBuBLOdlvDfTxhUKmv';

// Android isn't a target yet; fill this in when an Android build is added.
export const REVENUECAT_ANDROID_API_KEY = '';
