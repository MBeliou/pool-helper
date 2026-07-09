# Launch checklist — what's left to ship "My Pool"

Status: 2026-06-18. The app is feature-complete in code (see `production-plan.md`). What remains is
mostly **external setup, accounts, artwork, and store admin** — things that can't be done in code.
Legend: 🧑 = you · 🤝 = you provide an input, I do the code · 🤖 = I can do it now · ⏳ = owned elsewhere.

The fastest path to seeing it on your own phone is Phase 1 + 2 (TestFlight). Charging money needs
Phase 3. Public release needs Phase 4.

---

## Phase 0 — Prerequisites (one-time)

- 🧑 **Apple Developer Program membership** — $99/year, https://developer.apple.com/programs/.
  Required for TestFlight and the App Store. Without it you can still run on the simulator and on a
  device via a free personal team (7-day signing), but you can't distribute.
- 🧑 You already have a Mac + Xcode and the app builds (`pnpm cap:prod` → open `ios/App` in Xcode).

## Phase 1 — App identity finish (branding)

- 🤝 **App icon** — design a 1024×1024 PNG (no transparency, no rounded corners — Apple rounds it).
  Send it to me and I'll add it to `ios/App/App/Assets.xcassets/AppIcon.appiconset` (Xcode 14+ takes
  a single 1024 master). Or drop it into Xcode's AppIcon slot yourself.
- ✅ Bundle id `care.mypool.app`, display name **My Pool**, version `1.0.0` (build `1`) — done.
- 🧑 (Decision) Keep the launch screen as the solid brand blue, or commission a splash image? Solid
  blue ships fine today.

## Phase 2 — Get it onto your iPhone (TestFlight)

1. 🧑 In **App Store Connect** (https://appstoreconnect.apple.com) → **My Apps → +** → create the app:
   name "My Pool", bundle id `care.mypool.app`, primary language, SKU (any string).
2. 🧑 In **Xcode** → open `ios/App/App.xcworkspace` → target **App → Signing & Capabilities** →
   check "Automatically manage signing" and pick your Team. Confirm bundle id matches.
3. 🧑 **Add `PrivacyInfo.xcprivacy` to the target** — in Xcode's file navigator, select
   `App/PrivacyInfo.xcprivacy`, and in the File Inspector tick **Target Membership → App**. (The file
   exists in the repo but Capacitor's project doesn't auto-include it.)
4. 🧑 Build a release archive: `pnpm cap:prod`, then in Xcode **Product → Archive** → **Distribute App
   → TestFlight (App Store Connect)** → upload. Bump the build number each upload (`CURRENT_PROJECT_VERSION`).
5. 🧑 In App Store Connect → **TestFlight** → add yourself as an internal tester → install via the
   TestFlight app on your iPhone.
- Note: the app fully works on TestFlight **without** RevenueCat configured — the paywall just won't
  sell anything yet (see Phase 3).

## Phase 3 — Monetization (make the paywall actually sell)

Until these exist, "Start my 3-day free trial" / "Get Pro" open an empty/non-rendering paywall.

1. 🧑 **App Store Connect → your app → Subscriptions / In-App Purchases**, create:
   - an **auto-renewable subscription** (the Annual plan) with a **3-day free introductory offer**, and
   - a **non-consumable** "Lifetime" one-time purchase.
   Fill in pricing, display names, and review info (a screenshot of the paywall is required).
2. 🧑 **RevenueCat dashboard** (https://app.revenuecat.com):
   - Create an **entitlement** whose identifier is **exactly `My Pool Pro`** (that's the string
     the app gates on — `revenuecatConfig.ts` `MY_POOL_PRO_ENTITLEMENT`). Attach both products to it.
     - ✅ (2026-07-09) Renamed from `Pool Doctor Pro` to match the brand — decided & done in code.
   - Add the App Store products to RevenueCat, put them in an **Offering**, and **build a Paywall**
     (annual as trial-default + lifetime). The hosted Paywall is what `presentPaywall()` shows.
3. 🤝 **Real API key** — `revenuecatConfig.ts` currently ships `REVENUECAT_IOS_API_KEY = 'test_…'`.
   Apple App Store public SDK keys are normally `appl_…`. Get it from RevenueCat → Project → API keys
   → Apple App Store, and send it to me (it's a public client key, safe to commit) — I'll swap it in.
4. 🧑 **Sandbox test**: App Store Connect → Users and Access → Sandbox testers → create one; sign into
   it on the device; run the trial purchase and confirm: Apple's confirmation sheet appears, the Home
   "Get Pro" pill flips to the status pill, and More → Subscription shows "Active".

## Phase 4 — App Store listing & submission

- 🤝 **Privacy policy URL** — required. Since all data stays on the device, it's short; I can draft the
  text, you host it (a simple page / GitHub Pages) and paste the URL into App Store Connect.
- 🧑 **Screenshots** — required per device size (6.7" iPhone at minimum). Capture from the simulator
  (⌘S) or device. I can suggest which screens to show.
- 🤝 **Listing copy** — app subtitle, keywords, description, category (Utilities or Lifestyle). I can draft.
- ✅ **Encryption compliance** — `ITSAppUsesNonExemptEncryption = false` is set (HTTPS + SQLCipher's
  standard crypto are exempt). 🧑 confirm the answer in the submission questionnaire.
- 🧑 Submit for review; respond to any reviewer questions (subscriptions get scrutiny — the paywall
  must show price/terms + a privacy & terms link + Restore, which RevenueCat's paywall provides).

## Launch requirements — code 🤖

- [x] **Tester TYPE in tester storage** (done 2026-07-09). `testers` now has a `type` column
  (`strips` | `drops` | `meter`; migration `0013_tester_type` backfills by catalogue + legacy
  names, custom rows default to `strips`). The catalogue (`src/lib/pool/data.ts`) carries the
  type, `TesterForm.svelte` has a kind-of-kit picker (defaults to strips), and
  `resolveTesterType()` is the seam the guidance engine will read when it starts weighting
  readings by tester reliability.
- [x] **Domain change** (done 2026-07-09). Switched to **getmypool.care**: marketing `site.ts`
  domain (drives canonical/og URLs + `hello@getmypool.care` mailtos), `robots.txt`/`sitemap.xml`,
  and App Store metadata (`tools/metadata/urls.txt` support/marketing/privacy URLs + contact email
  in description/release notes — re-run `push-metadata.ts` to sync ASC). Bundle id
  `care.mypool.app` and the `mypool://` deep-link scheme are identifiers, not domains — unchanged.

## Phase 5 — On-device QA (verify what shipped) 🧑

Run these on the TestFlight/device build:
- [ ] Reminders: More → Developer (dev build) "Send a test notification (5s)" → background the app → banner arrives. (DEV-only; in a release build, verify by setting a 1-day cadence and checking it schedules.)
- [ ] Status bar legible (white) over the gradient on every screen; cold-launch shows blue splash → app with no white flash.
- [ ] Volume: enter `9.7` with m³ selected; switch litres↔m³ and confirm the value converts.
- [ ] Diagnose wizard → "Start a fix plan" creates an issue in Care that survives relaunch.
- [ ] Export: More → Export my data → share sheet offers a JSON.
- [ ] Decimal entry with a comma (`7,4`) saves as 7.4.

## Owned elsewhere / decisions ⏳

- **Resolution pipeline** — the real diagnosis ranking, issue content, and dosing-plan logic. Today the
  diagnose wizard's causes are **placeholder** (static); the persistence seam is wired but the chemistry
  intelligence is your separate workstream. Worth landing before a public launch for product quality
  (the app currently gives a fixed "Low chlorine + high pH" diagnosis regardless of inputs).
- **i18n French** — Phase 1 (formatting) is done; actually translating the UI to French (Phase 0 infra +
  string extraction) is deferred until you commit to a French launch.
- **Crash reporting** — decided: none for v1.

## Quick "hand me X, I do Y" list 🤝
- RevenueCat `appl_…` key → I wire it into `revenuecatConfig.ts`.
- Entitlement rename decision → I update the constant.
- App icon PNG → I add it to the asset catalog.
- "draft the privacy policy / listing copy" → I write it.
- Anything that misbehaves in device QA → I fix the code.
