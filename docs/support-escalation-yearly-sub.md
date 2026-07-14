# Support escalation drafts — yearly_sub not returned to the production app

Prepared 2026-07-14 ~22:15 CEST. Send via App Store Connect → Contact Us (choose
"App Store Connect → In-App Purchases and Subscriptions"), and RevenueCat dashboard → Help.

---

## Apple Developer Support

**Subject:** Approved auto-renewable subscription not returned by production StoreKit to the App Store-signed app (one-time IAP works)

My app "My Pool" (Apple ID 6781731215, bundle `care.mypool.app`, v1.0.0 (5), live since
2026-07-13 12:45 UTC) has two in-app products:

- `lifetime_pro` (non-consumable) — works everywhere.
- `yearly_sub` (auto-renewable, subscription id 6782064577, group "My Pool Pro" 22166716) —
  state APPROVED, group localization APPROVED, availability: all territories, complete price
  schedule (175 territories, e.g. USA 29.99, FRA 34.99, all active), 3-day free-trial intro
  offers configured. It is **not returned** by StoreKit product requests made from the App
  Store-signed build, ~34 hours after the app went live.

Evidence gathered 2026-07-14 ~22:10 CEST, on one Mac, one Apple ID, storefront France (143442),
one minute apart:

- **App Store-installed build** (unified log, process App): SK2 `Parsing 1 products in response`;
  RevenueCat SDK logs `Could not find products with identifiers: ["yearly_sub"]`.
- **Development-signed StoreKit 2 test tool**, same machine/account/storefront, calling
  `Product.products(for: ["yearly_sub", "lifetime_pro"])`: returns **both** products
  (`yearly_sub` 34,99 €, `lifetime_pro` 69,99 €), `Storefront.current` = FRA/143442.
- The App Store product page (apps.apple.com/fr, id 6781731215) lists both IAPs, including
  "Premium access 34,99 €".
- Reproduced identically on iPhone (France storefront); app reinstall and device reboot do not
  change the result, so this is not a device cache.

Everything configurable in App Store Connect appears correct and the product is served on the
generic lookup path — only requests from the store-signed app fail to receive it. Please check
why the published catalog served to the production app still omits subscription 6782064577, and
expedite its publication. Happy to provide full logs.

---

## RevenueCat support (shorter, FYI + sanity check)

**Subject:** Production app: StoreKit returns only 1 of 2 products; offering/paywall config verified — Apple-side publication issue?

Project `proje0c601b8` (My Pool), offering `default` (`ofrnge88924e208`), paywall
`pw5ab46a748be243fa`, purchases-capacitor 13.1.7. Since launch (2026-07-13), the paywall on
production builds logs `Could not find package $rc_annual` / `Could not find products with
identifiers: ["yearly_sub"]`. We verified: offerings payload from your API maps `$rc_annual` →
`yearly_sub`; paywall components reference both packages; ASC shows the sub APPROVED with full
pricing/availability; a dev-signed SK2 probe on the same Mac/account/storefront returns both
products while the App Store-signed build's SK2 request parses only one, minutes apart. So this
looks like Apple serving a stale per-app catalog to the signed build (we've escalated to Apple).
Two questions: (1) do you see this pattern often post-launch, and typical time-to-resolve?
(2) anything on RC's side (offering cache/CDN) that could contribute? Diagnostics available.

---

## Status log

- 2026-07-14 22:10 — A/B evidence captured (app: 1 product; CLI: 2 products; FRA storefront).
- 2026-07-14 22:17 — availability re-save "nudge" executed (identical values, 175 territories;
  subscription stayed APPROVED, no re-review triggered).
- 2026-07-14 22:19 — first post-nudge check: app still parses 1 product (expected if publication
  propagates asynchronously). Re-check over the next hours; if still 1 by 2026-07-15 morning,
  send both escalations above.
- 2026-07-14 late — **RESOLVED**: the yearly plan appears on Maxime's devices. The availability
  re-save nudge (22:17) preceded the fix; causation unproven but it's the only event between
  34h of failure and recovery. Escalations were not needed — keeping the drafts for the pattern.
- Next check: relaunch the Mac app under `/usr/bin/log show --predicate 'process == "App"'` and
  watch for `Parsing 2 products in response`.
