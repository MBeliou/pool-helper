# Monetization & onboarding-gate plan

Status: 2026-06-17. Covers the RevenueCat trial/paywall flow, the onboarding gate, and the
in-app upgrade surfaces. Read alongside `docs/production-plan.md` (this fills its monetization gap).

Legend: ✅ shipped in code · ⚠️ needs a dashboard/store/product decision before it actually works.

---

## What shipped (code)

### Onboarding now requires a pool (no skip)

- `src/routes/onboarding/welcome/+page.svelte`: removed the "I'll do it later" button and
  `skipSetup()`. The only path forward is **Set up my pool →**; added a reassurance line
  ("Takes about a minute · everything stays on your device"). The layout already redirects any
  not-onboarded user back to `/onboarding/welcome`, so there is no longer a way to reach the app
  without a profile.

### Onboarding ends on a premium upsell

- Flow is now: welcome → shape → size → details → units → **done** → **premium** → home.
- `src/routes/onboarding/done/+page.svelte`: setup is committed here (`app.finishOnboarding()`
  persists `onboarded = true`), then it routes to `/onboarding/premium`. Because onboarding is
  already persisted at "done", quitting on the upsell still leaves the user fully onboarded
  (next launch goes straight home — they don't redo setup).
- `src/routes/onboarding/premium/+page.svelte` (new): branded benefits screen (brand gradient,
  "POOL DOCTOR PRO" badge, "3 days free" headline, four benefit rows, white CTA). Behaviour:
  - **Start my 3-day free trial** → `billing.presentPaywall()` (the RevenueCat-hosted paywall,
    which shows real pricing + the intro trial), then lands on home regardless of outcome.
  - **Maybe later** → home (free).
  - **Restore** → `billing.restore()`; only rendered on native (`billing.supported`).
  - On web / simulator without billing, `presentPaywall()` resolves to `NOT_PRESENTED` and the
    flow still completes — never a dead end.

### Persistent upgrade path on Home

- `src/routes/+page.svelte`: the header's top-right **"All balanced" status pill is replaced by a
  gold "Get Pro" pill for non-subscribers** (`!billing.isPro`), tapping it opens the paywall.
  Pro subscribers keep the balance status pill. (Mirrors the Mojo/Avast "always-visible upgrade
  button" pattern that the brief referenced.) The per-reading status dots and the "What to fix"
  count below still convey balance to free users, so no signal is lost.

### Feature gating (decided 2026-06-17)

Free keeps the core loop — **log a test → see readings → see what's off → guided fix plan**
(`/results` stays free, it's the hook). Pro gates the ongoing value:

- **Diagnose-by-symptom wizard** (`/care/diagnose`) — `src/routes/care/+page.svelte` shows a PRO
  badge and opens the paywall on tap for free users; `[step]/+page.svelte` guards deep links.
- **Full trend history** — free users get a **14-day** window, Pro/preview get 90d+. List page
  (`/trends`) has a dynamic window pill + an "Unlock your full history" nudge; the detail page
  (`/trends/[param]`) leaves `14d` free and Pro-locks `30d / 90d / 1y` (tapping opens the paywall).
- **Smart reminders** — basic fixed-cadence reminders will be **free** (table stakes); the **Pro**
  flavour is a _computed_ next-test date that reacts to how fast the pool's chemistry is drifting.
  Nothing is wired yet — reminders themselves are unbuilt (production-plan #9). Build the free
  cadence first, then layer the computed date as the Pro upgrade.

**Enforcement is native-only.** On web/simulator `billing.supported` is false, so every gate is
open — the web build stays a full preview for development and design. All gates `await
billing.configure()` before reading `isPro`, so a Pro user is never briefly bounced while their
entitlement hydrates.

### Already in place before this pass

- `src/lib/pool/billing/revenuecat.svelte.ts` — `billing` singleton: `configure()` (non-blocking,
  called from the root layout), `isPro`, `supported`, `ready`, `presentPaywall()`,
  `presentPaywallIfNeeded()`, `presentCustomerCenter()`, `restore()`.
- `src/lib/pool/billing/revenuecatConfig.ts` — entitlement id + public API keys.
- `src/routes/more/+page.svelte` — Subscription block: unlock / manage (Customer Center) /
  restore.
- Native packages wired: `@revenuecat/purchases-capacitor` + `-ui` (13.1.7) in `package.json`
  and `ios/App/CapApp-SPM/Package.swift`.

---

## ⚠️ Open items — required before the paywall actually sells anything

1. **RevenueCat dashboard configuration.** `presentPaywall()` renders the paywall attached to the
   **current Offering**. Until an Offering with a Paywall and a product exist in the dashboard,
   the trial CTA and the "Get Pro" button will error/show nothing on device.
   - Create the entitlement **`My Pool Pro`** (must match `MY_POOL_PRO_ENTITLEMENT`
     exactly — it is the key read from `customerInfo.entitlements.active`).
   - Create the subscription product(s) in App Store Connect with a **3-day free introductory
     offer**, attach to the entitlement, build the Paywall.

2. **Real API key.** `revenuecatConfig.ts` ships `REVENUECAT_IOS_API_KEY = 'test_…'`. Apple App
   Store public SDK keys are normally `appl_…`. Confirm in RevenueCat → Project → API keys and
   replace before TestFlight, or offerings come back empty.

3. **Feature gating — DECIDED & wired** (see "Feature gating" above). Diagnose wizard + full
   trend history are gated now; guided fix plan stays free; smart reminders deferred until
   reminders exist. Remaining: build the computed-next-test-date reminder as the Pro reminder tier.

4. **Plan shape — DECIDED: Annual (carries the 3-day free trial) + Lifetime (one-time).** Still
   needs dashboard/store work: create both products in App Store Connect, attach the 3-day intro
   offer to the **annual** product, and build the RC Paywall to show annual (trial-default) +
   lifetime. The onboarding "Start my 3-day free trial" CTA is the trial entry point — it opens
   that paywall. Price is set in App Store Connect / RC and rendered by the paywall (the custom
   screen hardcodes no price by design). Note: Apple only grants intro offers to eligible Apple
   IDs, so some users won't see the free days — RC's paywall reflects eligibility; our static
   onboarding "3 days free" copy does not (acceptable, but be aware).

5. **App name vs. Pro name — ✅ copy aligned 2026-06-18, entitlement renamed 2026-07-09.** The app
   is **"My Pool"** (bundle id `care.mypool.app`, chosen when the expected domain was `mypool.care`;
   the actual domain is now `getmypool.care` — bundle id kept, it's just an identifier;
   production-plan #3) and the user-facing tier copy is **"My Pool Pro"** (updated in
   `more/+page.svelte` and `onboarding/premium`). The RevenueCat entitlement constant is now
   **`My Pool Pro`** (`revenuecatConfig.ts` `MY_POOL_PRO_ENTITLEMENT`) — renamed before the
   dashboard was set up, so create the dashboard entitlement as exactly `My Pool Pro`.

6. **App Store subscription compliance.** Apple guideline 3.1.2 requires the paywall to surface
   price/period, a privacy-policy and terms-of-use link, and Restore (we have Restore). RC's
   hosted paywall covers most of this if configured; verify before submission.

---

## Quick test (once the dashboard is live)

- Sandbox Apple ID → fresh install → finish onboarding → premium screen → Start trial → confirm
  `billing.isPro` flips true, the Home pill changes from "Get Pro" to the status pill, and
  `/more` shows "Active" + Manage subscription.
- Restore on a second device / reinstall.
