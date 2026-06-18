// RevenueCat configuration — public SDK keys and the entitlement we gate on.
// Keys live here so there's a single place to swap them per environment.

/**
 * The entitlement identifier configured in the RevenueCat dashboard.
 * Must match EXACTLY (it is the key inside `customerInfo.entitlements.active`),
 * not a product id. Everything Pro-gated checks this one string.
 */
export const POOL_DOCTOR_PRO_ENTITLEMENT = 'Pool Doctor Pro';

// Public SDK keys (safe to ship in the client bundle — these are not secret
// server keys). Find them in RevenueCat → Project → API keys.
//
// NOTE: the value below was supplied as `test_…`. RevenueCat's iOS App Store
// public SDK key is normally prefixed `appl_`. Before shipping, confirm in the
// dashboard (Project → API keys → Apple App Store) and replace if needed —
// configuring with the wrong key surfaces as empty offerings / a paywall that
// won't render.
export const REVENUECAT_IOS_API_KEY = 'test_YGzUJpHHgsZJyyYYrrYGGXrvjox';

// Android isn't a target yet; fill this in when an Android build is added.
export const REVENUECAT_ANDROID_API_KEY = '';
